import { readFile } from 'fs/promises';
import { join } from 'path';
import prisma from '../../db/client';

export interface CreateProjectInput {
  name: string;
  repoPath: string;
  packageManager?: string;
  devCommands?: string[];
  testCommand?: string;
  e2eCommand?: string;
  defaultBranch?: string;
}

export interface UpdateProjectInput {
  name?: string;
  repoPath?: string;
  packageManager?: string;
  devCommands?: string[];
  testCommand?: string;
  e2eCommand?: string;
  defaultBranch?: string;
}

export class ProjectService {
  async create(input: CreateProjectInput) {
    return prisma.localProject.create({
      data: {
        name: input.name,
        repoPath: input.repoPath,
        packageManager: input.packageManager ?? 'npm',
        devCommands: JSON.stringify(input.devCommands ?? []),
        testCommand: input.testCommand,
        e2eCommand: input.e2eCommand,
        defaultBranch: input.defaultBranch ?? 'main',
      },
    });
  }

  async getById(id: string) {
    const project = await prisma.localProject.findUnique({ where: { id } });
    if (project) {
      return { ...project, devCommands: JSON.parse(project.devCommands) };
    }
    return null;
  }

  async list() {
    const projects = await prisma.localProject.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return projects.map((p) => ({
      ...p,
      devCommands: JSON.parse(p.devCommands),
    }));
  }

  async update(id: string, input: UpdateProjectInput) {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.repoPath !== undefined) data.repoPath = input.repoPath;
    if (input.packageManager !== undefined) data.packageManager = input.packageManager;
    if (input.devCommands !== undefined) data.devCommands = JSON.stringify(input.devCommands);
    if (input.testCommand !== undefined) data.testCommand = input.testCommand;
    if (input.e2eCommand !== undefined) data.e2eCommand = input.e2eCommand;
    if (input.defaultBranch !== undefined) data.defaultBranch = input.defaultBranch;

    const project = await prisma.localProject.update({ where: { id }, data });
    return { ...project, devCommands: JSON.parse(project.devCommands) };
  }

  async getScripts(id: string): Promise<Record<string, string>> {
    const project = await prisma.localProject.findUnique({ where: { id } });
    if (!project) return {};
    try {
      const raw = await readFile(join(project.repoPath, 'package.json'), 'utf-8');
      const pkg = JSON.parse(raw);
      return pkg.scripts ?? {};
    } catch {
      return {};
    }
  }

  async delete(id: string) {
    return prisma.localProject.delete({ where: { id } });
  }
}

export const projectService = new ProjectService();
