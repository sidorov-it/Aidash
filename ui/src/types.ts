export interface Project {
  id: string;
  name: string;
  repoPath: string;
  packageManager: string;
  devCommands: string[];
  testCommand: string | null;
  e2eCommand: string | null;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
}

export interface Run {
  id: string;
  projectId: string;
  taskId: string | null;
  taskPrompt: string | null;
  mode: string;
  status: string;
  sandboxPath: string | null;
  agentProvider: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  patches: Patch[];
  verifications: Verification[];
}

export interface Patch {
  id: string;
  runId: string;
  patchPath: string;
  status: string;
  changedFiles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Verification {
  id: string;
  runId: string;
  type: string;
  status: string;
  reportPath: string | null;
  stdout: string | null;
  stderr: string | null;
  exitCode: number | null;
  startedAt: string;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LaoProcess {
  id: string;
  projectId: string;
  name: string;
  command: string;
  status: string;
  pid: number | null;
  logPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export type View = 'dashboard' | 'runs' | 'run-details' | 'processes' | 'logs';

export interface LaoApi {
  projects: {
    list: () => Promise<Project[]>;
    getById: (id: string) => Promise<Project | null>;
    create: (data: Partial<Project>) => Promise<Project>;
    update: (id: string, data: Partial<Project>) => Promise<Project>;
    delete: (id: string) => Promise<void>;
    getScripts: (id: string) => Promise<Record<string, string>>;
  };
  runs: {
    listByProject: (projectId: string) => Promise<Run[]>;
    getById: (id: string) => Promise<Run | null>;
    create: (data: Record<string, unknown>) => Promise<Run>;
    transition: (id: string, status: string) => Promise<Run>;
    delete: (id: string) => Promise<void>;
  };
  processes: {
    listByProject: (projectId: string) => Promise<LaoProcess[]>;
    start: (projectId: string, name: string, command: string) => Promise<LaoProcess>;
    stop: (id: string) => Promise<LaoProcess>;
    restart: (id: string) => Promise<LaoProcess>;
    getLogs: (id: string, tail?: number) => Promise<string>;
    delete: (id: string) => Promise<void>;
  };
  patches: {
    listByRun: (runId: string) => Promise<Patch[]>;
    getContent: (id: string) => Promise<string>;
    getById: (id: string) => Promise<Patch | null>;
    dryRun: (id: string) => Promise<{ success: boolean; output: string }>;
  };
  qa: {
    runChecks: (runId: string) => Promise<Verification[]>;
    getByRun: (runId: string) => Promise<Verification[]>;
    canApplyPatch: (runId: string) => Promise<boolean>;
  };
  orchestrator: {
    execute: (runId: string) => Promise<{ message: string }>;
    applyPatch: (runId: string, patchId: string) => Promise<{ success: boolean; output: string }>;
    rejectPatch: (runId: string) => Promise<void>;
  };
}

declare global {
  interface Window {
    lao: LaoApi;
  }
}
