import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import prisma from '../../db/client';

const QA_ARTIFACTS_DIR = path.resolve(process.cwd(), 'artifacts', 'qa');
const DEFAULT_TIMEOUT_MS = 300_000; // 5 min

interface QaResult {
  type: string;
  status: 'passed' | 'failed';
  exitCode: number;
  stdout: string;
  stderr: string;
  reportPath: string;
}

function runCommand(
  command: string,
  cwd: string,
  timeoutMs: number
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = exec(command, {
      cwd,
      timeout: timeoutMs,
      env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (d) => (stdout += d));
    child.stderr?.on('data', (d) => (stderr += d));

    child.on('exit', (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });

    child.on('error', (err) => {
      resolve({ exitCode: 1, stdout, stderr: stderr + '\n' + err.message });
    });
  });
}

export class QaService {
  /**
   * Run QA checks (unit tests and/or e2e) inside the sandbox.
   * Returns verification records.
   */
  async runChecks(runId: string): Promise<QaResult[]> {
    const run = await prisma.localRun.findUniqueOrThrow({
      where: { id: runId },
      include: { project: true },
    });

    if (!run.sandboxPath) {
      throw new Error(`Run ${runId} has no sandbox path`);
    }

    const artifactDir = path.join(QA_ARTIFACTS_DIR, runId);
    fs.mkdirSync(artifactDir, { recursive: true });

    const results: QaResult[] = [];

    // Install dependencies in sandbox first
    const pm = run.project.packageManager || 'npm';
    const installCmd = pm === 'yarn' ? 'yarn install --frozen-lockfile' : `${pm} install`;
    try {
      await runCommand(installCmd, run.sandboxPath, 120_000);
    } catch {
      // non-fatal — dependencies may already exist
    }

    // Run unit tests
    if (run.project.testCommand) {
      const result = await this.executeCheck(
        runId,
        'unit',
        run.project.testCommand,
        run.sandboxPath,
        artifactDir
      );
      results.push(result);
    }

    // Run e2e tests
    if (run.project.e2eCommand) {
      const result = await this.executeCheck(
        runId,
        'playwright',
        run.project.e2eCommand,
        run.sandboxPath,
        artifactDir
      );
      results.push(result);
    }

    // Update patch status based on QA results
    const allPassed = results.length > 0 && results.every((r) => r.status === 'passed');
    if (allPassed) {
      await prisma.patchSet.updateMany({
        where: { runId, status: 'draft' },
        data: { status: 'qa_passed' },
      });
    }

    return results;
  }

  private async executeCheck(
    runId: string,
    type: string,
    command: string,
    cwd: string,
    artifactDir: string
  ): Promise<QaResult> {
    const verification = await prisma.verificationRun.create({
      data: {
        runId,
        type,
        status: 'running',
        startedAt: new Date(),
      },
    });

    const { exitCode, stdout, stderr } = await runCommand(command, cwd, DEFAULT_TIMEOUT_MS);
    const status = exitCode === 0 ? 'passed' : 'failed';

    const reportDir = path.join(artifactDir, type);
    fs.mkdirSync(reportDir, { recursive: true });

    const reportPath = path.join(reportDir, 'report.txt');
    fs.writeFileSync(reportPath, `EXIT CODE: ${exitCode}\n\n--- STDOUT ---\n${stdout}\n\n--- STDERR ---\n${stderr}`);
    fs.writeFileSync(path.join(reportDir, 'stdout.log'), stdout);
    fs.writeFileSync(path.join(reportDir, 'stderr.log'), stderr);

    await prisma.verificationRun.update({
      where: { id: verification.id },
      data: {
        status,
        exitCode,
        stdout,
        stderr,
        reportPath,
        finishedAt: new Date(),
      },
    });

    return { type, status, exitCode, stdout, stderr, reportPath };
  }

  /**
   * Gate check: can the patch be applied?
   * Returns true only if all verifications for the run passed.
   */
  async canApplyPatch(runId: string): Promise<boolean> {
    const verifications = await prisma.verificationRun.findMany({
      where: { runId },
    });
    if (verifications.length === 0) return false;
    return verifications.every((v) => v.status === 'passed');
  }

  /** Get verification results for a run */
  async getByRun(runId: string) {
    return prisma.verificationRun.findMany({
      where: { runId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const qaService = new QaService();
