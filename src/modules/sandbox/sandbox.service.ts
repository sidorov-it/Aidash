import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import prisma from '../../db/client';
import { createLogger } from '../../lib/logger';

const execAsync = promisify(exec);
const log = createLogger('sandbox');

const SANDBOXES_DIR = path.resolve(process.cwd(), 'sandboxes');
const MAX_KEPT_SANDBOXES = 10;

export class SandboxService {
  /**
   * Create an isolated sandbox copy of the project repo for a given run.
   * Uses rsync to copy, excluding node_modules.
   */
  async create(runId: string): Promise<string> {
    const run = await prisma.localRun.findUniqueOrThrow({
      where: { id: runId },
      include: { project: true },
    });

    const sandboxPath = path.join(SANDBOXES_DIR, runId);
    fs.mkdirSync(sandboxPath, { recursive: true });

    const repoPath = run.project.repoPath;
    log.info(`Copying project from ${repoPath}`, runId);

    // Ensure trailing slash for rsync source
    const source = repoPath.endsWith('/') ? repoPath : `${repoPath}/`;

    await execAsync(
      `rsync -a --exclude=node_modules --exclude=.git --exclude=sandboxes --exclude=artifacts "${source}" "${sandboxPath}/"`,
      { timeout: 120_000 }
    );
    log.info(`rsync complete → ${sandboxPath}`, runId);

    // Initialize a clean git repo in sandbox for diff tracking
    try {
      await execAsync('git init && git add -A && git commit -m "sandbox baseline" --allow-empty', {
        cwd: sandboxPath,
        timeout: 30_000,
      });
      log.info('Git baseline commit created in sandbox', runId);
    } catch {
      log.warn('Git init in sandbox failed (non-fatal)', runId);
    }

    await prisma.localRun.update({
      where: { id: runId },
      data: { sandboxPath },
    });

    return sandboxPath;
  }

  /**
   * Remove a sandbox directory.
   */
  async remove(runId: string): Promise<void> {
    const sandboxPath = path.join(SANDBOXES_DIR, runId);
    if (fs.existsSync(sandboxPath)) {
      await execAsync(`rm -rf ${JSON.stringify(sandboxPath)}`, { timeout: 30_000 });
      log.info('Sandbox removed', runId);
    }
  }

  /**
   * Cleanup old sandboxes, keeping only the most recent N.
   */
  async cleanup(): Promise<number> {
    if (!fs.existsSync(SANDBOXES_DIR)) return 0;

    const entries = fs.readdirSync(SANDBOXES_DIR)
      .map((name) => ({
        name,
        fullPath: path.join(SANDBOXES_DIR, name),
        mtime: fs.statSync(path.join(SANDBOXES_DIR, name)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    let removed = 0;
    for (const entry of entries.slice(MAX_KEPT_SANDBOXES)) {
      fs.rmSync(entry.fullPath, { recursive: true, force: true });
      removed++;
    }
    if (removed > 0) {
      log.info(`Cleaned up ${removed} old sandbox(es)`);
    }
    return removed;
  }

  /** Check if sandbox exists */
  exists(runId: string): boolean {
    return fs.existsSync(path.join(SANDBOXES_DIR, runId));
  }
}

export const sandboxService = new SandboxService();
