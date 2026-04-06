import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import prisma from '../../db/client';
import { createLogger } from '../../lib/logger';

const log = createLogger('patch');

const ARTIFACTS_DIR = path.resolve(process.cwd(), 'artifacts', 'patches');

export class PatchService {
  /**
   * Generate a patch (diff) from the sandbox for a given run.
   */
  async generate(runId: string) {
    const run = await prisma.localRun.findUniqueOrThrow({
      where: { id: runId },
      include: { project: true },
    });

    if (!run.sandboxPath) {
      throw new Error(`Run ${runId} has no sandbox path`);
    }

    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    const patchPath = path.join(ARTIFACTS_DIR, `${runId}.patch`);

    // Generate diff inside sandbox
    log.info('Running git diff in sandbox...', runId);
    let diff = '';
    try {
      execSync('git add -A', { cwd: run.sandboxPath, stdio: 'pipe' });
      diff = execSync('git diff --cached', {
        cwd: run.sandboxPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err: any) {
      log.warn('git diff failed, falling back to unix diff', runId);
      diff = '';
      try {
        diff = execSync(
          `diff -ruN "${run.project.repoPath}" "${run.sandboxPath}" --exclude=node_modules --exclude=.git`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        );
      } catch (diffErr: any) {
        // diff returns exit code 1 when files differ — that's expected
        diff = diffErr.stdout ?? '';
      }
    }

    fs.writeFileSync(patchPath, diff);
    log.info(`Patch saved to ${patchPath} (${(diff.length / 1024).toFixed(1)} KB)`, runId);

    // Extract changed file paths
    const changedFiles = diff
      .split('\n')
      .filter((l: string) => l.startsWith('diff --git') || l.startsWith('---') || l.startsWith('+++'))
      .filter((l: string) => l.startsWith('+++ b/') || l.startsWith('--- a/'))
      .map((l: string) => l.replace(/^(\+\+\+|\-\-\-) [ab]\//, ''))
      .filter((f: string) => f && f !== '/dev/null');
    const uniqueFiles = [...new Set(changedFiles)];

    const patch = await prisma.patchSet.create({
      data: {
        runId,
        patchPath,
        status: 'draft',
        changedFiles: JSON.stringify(uniqueFiles),
      },
    });

    return { ...patch, changedFiles: uniqueFiles };
  }

  /**
   * Dry-run apply a patch to the target repo to check for conflicts.
   */
  async dryRun(patchId: string): Promise<{ success: boolean; output: string }> {
    const patch = await prisma.patchSet.findUniqueOrThrow({
      where: { id: patchId },
      include: { run: { include: { project: true } } },
    });

    const repoPath = patch.run.project.repoPath;

    // Check repo cleanliness
    try {
      const status = execSync('git status --porcelain', {
        cwd: repoPath,
        encoding: 'utf-8',
      });
      if (status.trim()) {
        return { success: false, output: 'Target repo has uncommitted changes. Clean working tree required.' };
      }
    } catch {
      return { success: false, output: 'Failed to check target repo git status.' };
    }

    // Dry-run apply
    try {
      const output = execSync(`git apply --check "${patch.patchPath}"`, {
        cwd: repoPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { success: true, output: output || 'Patch applies cleanly.' };
    } catch (err: any) {
      return { success: false, output: err.stderr || err.message };
    }
  }

  /**
   * Apply a patch to the target repo (only if approved).
   */
  async apply(patchId: string): Promise<{ success: boolean; output: string }> {
    const patch = await prisma.patchSet.findUniqueOrThrow({
      where: { id: patchId },
      include: { run: { include: { project: true } } },
    });

    if (patch.status !== 'approved' && patch.status !== 'qa_passed') {
      throw new Error(`Cannot apply patch with status "${patch.status}". Must be "approved" or "qa_passed".`);
    }

    // Dry-run first
    const check = await this.dryRun(patchId);
    if (!check.success) {
      return { success: false, output: `Dry-run failed: ${check.output}` };
    }

    const repoPath = patch.run.project.repoPath;

    try {
      const output = execSync(`git apply "${patch.patchPath}"`, {
        cwd: repoPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      await prisma.patchSet.update({
        where: { id: patchId },
        data: { status: 'applied' },
      });

      return { success: true, output: output || 'Patch applied successfully.' };
    } catch (err: any) {
      return { success: false, output: err.stderr || err.message };
    }
  }

  /** Get patch by ID */
  async getById(id: string) {
    const patch = await prisma.patchSet.findUnique({ where: { id } });
    if (patch) {
      return { ...patch, changedFiles: JSON.parse(patch.changedFiles) };
    }
    return null;
  }

  /** Get patch content */
  async getContent(id: string): Promise<string> {
    const patch = await prisma.patchSet.findUniqueOrThrow({ where: { id } });
    if (!fs.existsSync(patch.patchPath)) return '';
    return fs.readFileSync(patch.patchPath, 'utf-8');
  }

  /** Update patch status */
  async updateStatus(id: string, status: string) {
    return prisma.patchSet.update({ where: { id }, data: { status } });
  }

  /** List patches for a run */
  async listByRun(runId: string) {
    const patches = await prisma.patchSet.findMany({
      where: { runId },
      orderBy: { createdAt: 'desc' },
    });
    return patches.map((p) => ({ ...p, changedFiles: JSON.parse(p.changedFiles) }));
  }
}

export const patchService = new PatchService();
