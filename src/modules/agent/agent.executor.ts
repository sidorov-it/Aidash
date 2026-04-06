import { execSync, ExecSyncOptionsWithStringEncoding } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import prisma from '../../db/client';

export type AgentProvider = 'claude' | 'codex';

interface AgentRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Build the CLI command for each agent provider.
 */
function buildCommand(provider: AgentProvider, prompt: string): string {
  switch (provider) {
    case 'claude':
      return `claude-code run --prompt ${JSON.stringify(prompt)}`;
    case 'codex':
      return `codex run --prompt ${JSON.stringify(prompt)}`;
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
    const command = buildCommand(provider, prompt);

    const execOpts: ExecSyncOptionsWithStringEncoding = {
      cwd: run.sandboxPath,
      encoding: 'utf-8',
      timeout: 600_000, // 10 min max
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        LAO_RUN_ID: runId,
        LAO_PROJECT_NAME: run.project.name,
      },
    };

    let stdout = '';
    let stderr = '';
    let exitCode = 0;

    try {
      stdout = execSync(command, execOpts);
    } catch (err: any) {
      exitCode = err.status ?? 1;
      stdout = err.stdout ?? '';
      stderr = err.stderr ?? '';
    }

    // Save agent output as artifact
    const artifactsDir = path.resolve(process.cwd(), 'artifacts', 'agent', runId);
    fs.mkdirSync(artifactsDir, { recursive: true });
    fs.writeFileSync(path.join(artifactsDir, 'stdout.log'), stdout);
    fs.writeFileSync(path.join(artifactsDir, 'stderr.log'), stderr);

    return { exitCode, stdout, stderr };
  }
}

export const agentExecutor = new AgentExecutor();
