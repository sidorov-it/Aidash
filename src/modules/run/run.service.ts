import prisma from '../../db/client';
import { assertTransition, RunStatus, isTerminal } from './run.state-machine';
import { createLogger } from '../../lib/logger';

const log = createLogger('run');

export type RunMode = 'AUTONOM' | 'QA' | 'INTAKE';

export interface CreateRunInput {
  projectId: string;
  taskId?: string;
  taskPrompt?: string;
  mode?: RunMode;
  agentProvider?: string;
}

export class RunService {
  async create(input: CreateRunInput) {
    const run = await prisma.localRun.create({
      data: {
        projectId: input.projectId,
        taskId: input.taskId,
        taskPrompt: input.taskPrompt,
        mode: input.mode ?? 'AUTONOM',
        agentProvider: input.agentProvider,
        status: 'queued',
      },
    });
    log.info(`Run created: mode=${run.mode}, agent=${input.agentProvider ?? 'claude'}`, run.id);
    return run;
  }

  async getById(id: string) {
    const run = await prisma.localRun.findUnique({
      where: { id },
      include: { patches: true, verifications: true },
    });
    if (!run) return null;
    return {
      ...run,
      patches: run.patches.map((p) => ({
        ...p,
        changedFiles: JSON.parse(p.changedFiles),
      })),
    };
  }

  async listByProject(projectId: string) {
    const runs = await prisma.localRun.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: { patches: true, verifications: true },
    });
    return runs.map((run) => ({
      ...run,
      patches: run.patches.map((p) => ({
        ...p,
        changedFiles: JSON.parse(p.changedFiles),
      })),
    }));
  }

  async transition(id: string, to: RunStatus) {
    const run = await prisma.localRun.findUniqueOrThrow({ where: { id } });
    assertTransition(run.status as RunStatus, to);
    log.info(`Status: ${run.status} → ${to}`, id);

    const data: Record<string, unknown> = { status: to };
    if (to === 'running' && !run.startedAt) {
      data.startedAt = new Date();
    }
    if (isTerminal(to)) {
      data.finishedAt = new Date();
    }

    return prisma.localRun.update({ where: { id }, data });
  }

  async updateSandboxPath(id: string, sandboxPath: string) {
    return prisma.localRun.update({
      where: { id },
      data: { sandboxPath },
    });
  }

  async delete(id: string) {
    return prisma.localRun.delete({ where: { id } });
  }
}

export const runService = new RunService();
