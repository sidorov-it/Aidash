import { execSync, spawn as cpSpawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import prisma from '../../db/client';
import { createLogger } from '../../lib/logger';

const log = createLogger('agent');

export type AgentProvider = 'claude' | 'codex';

interface AgentRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Resolve full path to a CLI binary.
 * Electron doesn't inherit the user's shell PATH, so we check common locations.
 */
function resolveBinary(name: string): string {
  // Try shell-resolved path first (works when launched from terminal)
  try {
    const resolved = execSync(`which ${name}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    if (resolved) return resolved;
  } catch {
    // not found via which
  }

  const home = process.env.HOME ?? '';

  // Common install locations on macOS/Linux
  const searchPaths = [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    path.join(home, '.local', 'bin'),
    path.join(home, '.npm-global', 'bin'),
    path.join(home, '.cargo', 'bin'),
  ];

  // For nvm, search all installed node versions
  const nvmBase = path.join(home, '.nvm', 'versions', 'node');
  if (fs.existsSync(nvmBase)) {
    try {
      const versions = fs.readdirSync(nvmBase);
      for (const v of versions) {
        searchPaths.push(path.join(nvmBase, v, 'bin'));
      }
    } catch {
      // ignore
    }
  }

  for (const dir of searchPaths) {
    const candidate = path.join(dir, name);
    if (fs.existsSync(candidate)) return candidate;
  }

  // Fallback: return bare name and let execSync fail with a clear error
  return name;
}

/**
 * Build the CLI command for each agent provider.
 * claude: uses `claude -p` (print mode — non-interactive, no confirmations)
 * codex: uses `codex run --prompt`
 */
function buildCommand(provider: AgentProvider, prompt: string): string {
  switch (provider) {
    case 'claude': {
      // Try 'claude' first, then 'claude-code'
      let bin = resolveBinary('claude');
      if (bin === 'claude') {
        const alt = resolveBinary('claude-code');
        if (alt !== 'claude-code') bin = alt;
      }
      return `${bin} -p --dangerously-skip-permissions ${JSON.stringify(prompt)}`;
    }
    case 'codex':
      return `${resolveBinary('codex')} run --prompt ${JSON.stringify(prompt)}`;
    default:
      throw new Error(`Unknown agent provider: ${provider}`);
  }
}

export class AgentExecutor {
  /**
   * Execute an AI agent in the sandbox context for a given run.
   */
  async execute(runId: string): Promise<AgentRunResult> {
    const run = await prisma.localRun.findUniqueOrThrow({
      where: { id: runId },
      include: { project: true },
    });

    if (!run.sandboxPath) {
      throw new Error(`Run ${runId} has no sandbox path. Create sandbox first.`);
    }

    const provider = (run.agentProvider ?? 'claude') as AgentProvider;
    const prompt = run.taskPrompt ?? `Complete task: ${run.taskId ?? 'unspecified'}`;

    log.info(`Provider: ${provider}`, runId);
    log.info(`Prompt: "${prompt.length > 120 ? prompt.slice(0, 120) + '...' : prompt}"`, runId);
    log.info(`Sandbox: ${run.sandboxPath}`, runId);

    const command = buildCommand(provider, prompt);
    log.info(`Resolved command: ${command.length > 200 ? command.slice(0, 200) + '...' : command}`, runId);

    // Build a PATH that includes common binary locations so Electron can find CLIs
    const home = process.env.HOME ?? '';
    const extraPaths = [
      '/usr/local/bin',
      '/opt/homebrew/bin',
      path.join(home, '.local', 'bin'),
      path.join(home, '.npm-global', 'bin'),
    ];
    const currentPath = process.env.PATH ?? '';
    const fullPath = [...extraPaths, currentPath].join(':');

    const spawnEnv = {
      ...process.env,
      PATH: fullPath,
      LAO_RUN_ID: runId,
      LAO_PROJECT_NAME: run.project.name,
    };

    // Save agent output as artifact (stream to files in real-time)
    const artifactsDir = path.resolve(process.cwd(), 'artifacts', 'agent', runId);
    fs.mkdirSync(artifactsDir, { recursive: true });
    const stdoutLogPath = path.join(artifactsDir, 'stdout.log');
    const stderrLogPath = path.join(artifactsDir, 'stderr.log');
    log.info(`Artifacts dir: ${artifactsDir}`, runId);

    log.info('Spawning agent process...', runId);

    const { exitCode, stdout, stderr } = await new Promise<AgentRunResult>((resolve) => {
      const child: ChildProcess = cpSpawn('sh', ['-c', command], {
        cwd: run.sandboxPath!,
        env: spawnEnv,
      });

      log.info(`Agent process spawned (PID: ${child.pid})`, runId);

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      const stdoutStream = fs.createWriteStream(stdoutLogPath);
      const stderrStream = fs.createWriteStream(stderrLogPath);

      let lastActivityLog = Date.now();

      child.stdout?.on('data', (chunk: Buffer) => {
        stdoutChunks.push(chunk);
        stdoutStream.write(chunk);
        // Log activity periodically (not every chunk — too noisy)
        const now = Date.now();
        if (now - lastActivityLog > 10_000) {
          const totalBytes = stdoutChunks.reduce((s, c) => s + c.length, 0);
          log.debug(`Agent stdout: ${(totalBytes / 1024).toFixed(0)} KB received so far`, runId);
          lastActivityLog = now;
        }
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        stderrChunks.push(chunk);
        stderrStream.write(chunk);
        // Log stderr lines immediately — they're usually important
        const text = chunk.toString('utf-8').trim();
        if (text) {
          log.warn(`Agent stderr: ${text.length > 300 ? text.slice(0, 300) + '...' : text}`, runId);
        }
      });

      // 10 min timeout
      const timer = setTimeout(() => {
        log.error('Agent timed out after 10 minutes — killing process', runId);
        child.kill('SIGTERM');
      }, 600_000);

      child.on('close', (code: number | null) => {
        clearTimeout(timer);
        stdoutStream.end();
        stderrStream.end();
        const totalStdout = Buffer.concat(stdoutChunks);
        log.info(`Agent process exited with code ${code ?? 'null'} (stdout: ${(totalStdout.length / 1024).toFixed(0)} KB)`, runId);
        resolve({
          exitCode: code ?? 1,
          stdout: totalStdout.toString('utf-8'),
          stderr: Buffer.concat(stderrChunks).toString('utf-8'),
        });
      });

      child.on('error', (err: Error) => {
        clearTimeout(timer);
        stdoutStream.end();
        stderrStream.end();
        log.error(`Agent process error: ${err.message}`, runId);
        resolve({
          exitCode: 1,
          stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
          stderr: err.message,
        });
      });
    });

    return { exitCode, stdout, stderr };
  }
}

export const agentExecutor = new AgentExecutor();
