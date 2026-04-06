import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import prisma from '../../db/client';

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

    // Ensure trailing slash for rsync source
    const source = repoPath.endsWith('/') ? repoPath : `${repoPath}/`;

    execSync(
      `rsync -a --exclude=node_modules --exclude=.git/objects "${source}" "${sandboxPath}/"`,
      { stdio: 'pipe', timeout: 120_000 }
    );

    // Initialize git in sandbox if .git exists in source
    const sourceGit = path.join(repoPath, '.git');
    if (fs.existsSync(sourceGit)) {
      try {
        execSync('git init && git add -A && git commit -m "sandbox baseline" --allow-empty', {
          cwd: sandboxPath,
          stdio: 'pipe',
          timeout: 30_000,
        });
      } catch {
        // git init may fail in some environments — non-fatal
      }
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
      fs.rmSync(sandboxPath, { recursive: true, force: true });
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
    return removed;
  }

  /** Check if sandbox exists */
  exists(runId: string): boolean {
    return fs.existsSync(path.join(SANDBOXES_DIR, runId));
  }
}

export const sandboxService = new SandboxService();
