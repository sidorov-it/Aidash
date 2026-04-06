import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import prisma from '../../db/client';

const ARTIFACTS_DIR = path.resolve(process.cwd(), 'artifacts', 'logs');
const SIGTERM_GRACE_MS = 5000;

// In-memory registry of running child processes
const activeProcesses = new Map<string, ChildProcess>();

export class ProcessService {
  async start(projectId: string, name: string, command: string) {
    // Ensure artifacts/logs directory exists
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

    const record = await prisma.localProcess.create({
      data: {
        projectId,
        name,
        command,
        status: 'stopped',
      },
    });

    const logPath = path.join(ARTIFACTS_DIR, `${record.id}.log`);
    const logStream = fs.createWriteStream(logPath, { flags: 'a' });

    const project = await prisma.localProject.findUniqueOrThrow({
      where: { id: projectId },
    });

    const child = spawn(command, {
      cwd: project.repoPath,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (child.stdout) child.stdout.pipe(logStream);
    if (child.stderr) child.stderr.pipe(logStream);

    activeProcesses.set(record.id, child);

    await prisma.localProcess.update({
      where: { id: record.id },
      data: { status: 'running', pid: child.pid, logPath },
    });

    child.on('exit', async (code) => {
      activeProcesses.delete(record.id);
      logStream.end();
      try {
        await prisma.localProcess.update({
          where: { id: record.id },
          data: { status: code === 0 ? 'stopped' : 'error', pid: null },
        });
      } catch {
        // record may have been deleted
      }
    });

    return prisma.localProcess.findUniqueOrThrow({ where: { id: record.id } });
  }

  async stop(processId: string) {
    const child = activeProcesses.get(processId);
    if (child && !child.killed) {
      child.kill('SIGTERM');
      // Force kill after grace period
      setTimeout(() => {
        if (!child.killed) child.kill('SIGKILL');
      }, SIGTERM_GRACE_MS);
    }

    await prisma.localProcess.update({
      where: { id: processId },
      data: { status: 'stopped', pid: null },
    });

    activeProcesses.delete(processId);
    return prisma.localProcess.findUniqueOrThrow({ where: { id: processId } });
  }

  async restart(processId: string) {
    const record = await prisma.localProcess.findUniqueOrThrow({
      where: { id: processId },
    });

    await this.stop(processId);
    // Delete old record and start fresh with same name/command
    await prisma.localProcess.delete({ where: { id: processId } });
    return this.start(record.projectId, record.name, record.command);
  }

  async listByProject(projectId: string) {
    return prisma.localProcess.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string) {
    return prisma.localProcess.findUnique({ where: { id } });
  }

  async getLogs(processId: string, tail?: number): Promise<string> {
    const record = await prisma.localProcess.findUniqueOrThrow({
      where: { id: processId },
    });
    if (!record.logPath || !fs.existsSync(record.logPath)) return '';
    const content = fs.readFileSync(record.logPath, 'utf-8');
    if (tail) {
      const lines = content.split('\n');
      return lines.slice(-tail).join('\n');
    }
    return content;
  }

  async delete(processId: string) {
    await this.stop(processId).catch(() => {});
    return prisma.localProcess.delete({ where: { id: processId } });
  }

  /** Clean up orphan processes on app startup */
  async cleanupOrphans() {
    await prisma.localProcess.updateMany({
      where: { status: 'running' },
      data: { status: 'stopped', pid: null },
    });
  }
}

export const processService = new ProcessService();
