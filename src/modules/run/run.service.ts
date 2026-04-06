import prisma from '../../db/client';
import { assertTransition, RunStatus, isTerminal } from './run.state-machine';

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
    return prisma.localRun.create({
      data: {
        projectId: input.projectId,
        taskId: input.taskId,
        taskPrompt: input.taskPrompt,
        mode: input.mode ?? 'AUTONOM',
        agentProvider: input.agentProvider,
        status: 'queued',
      },
    });
  }

  async getById(id: string) {
    return prisma.localRun.findUnique({
      where: { id },
      include: { patches: true, verifications: true },
    });
  }

  async listByProject(projectId: string) {
    return prisma.localRun.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: { patches: true, verifications: true },
    });
  }

  async transition(id: string, to: RunStatus) {
    const run = await prisma.localRun.findUniqueOrThrow({ where: { id } });
    assertTransition(run.status as RunStatus, to);

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
