import { create } from 'zustand';
import type { Project, Run, LaoProcess, View } from '../types';

const api = () => window.lao;

interface AppState {
  projects: Project[];
  runs: Run[];
  processes: LaoProcess[];

  selectedProjectId: string | null;
  selectedRunId: string | null;
  logsProcessId: string | null;

  view: View;
  loading: boolean;
  error: string | null;

  setView: (view: View) => void;
  selectProject: (id: string) => void;
  selectRun: (id: string) => void;
  setLogsProcessId: (id: string | null) => void;
  clearError: () => void;

  fetchProjects: () => Promise<void>;
  fetchRuns: () => Promise<void>;
  fetchProcesses: () => Promise<void>;

  createProject: (data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  createRun: (data: Record<string, unknown>) => Promise<void>;
  executeRun: (runId: string) => Promise<void>;

  startProcess: (name: string, command: string) => Promise<void>;
  stopProcess: (id: string) => Promise<void>;
  restartProcess: (id: string) => Promise<void>;
  deleteProcess: (id: string) => Promise<void>;

  applyPatch: (runId: string, patchId: string) => Promise<void>;
  rejectPatch: (runId: string) => Promise<void>;

  refreshRun: (runId: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  runs: [],
  processes: [],

  selectedProjectId: null,
  selectedRunId: null,
  logsProcessId: null,

  view: 'dashboard',
  loading: false,
  error: null,

  setView: (view) => set({ view }),

  selectProject: (id) => {
    set({ selectedProjectId: id, selectedRunId: null });
    setTimeout(() => {
      get().fetchRuns();
      get().fetchProcesses();
    }, 0);
  },

  selectRun: (id) => set({ selectedRunId: id, view: 'run-details' }),

  setLogsProcessId: (id) =>
    set({ logsProcessId: id, view: id ? 'logs' : get().view }),

  clearError: () => set({ error: null }),

  fetchProjects: async () => {
    try {
      const projects = await api().projects.list();
      set({ projects });
      const state = get();
      if (!state.selectedProjectId && projects.length > 0) {
        state.selectProject(projects[0].id);
      }
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    }
  },

  fetchRuns: async () => {
    const projectId = get().selectedProjectId;
    if (!projectId) return;
    try {
      const runs = await api().runs.listByProject(projectId);
      set({ runs });
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    }
  },

  fetchProcesses: async () => {
    const projectId = get().selectedProjectId;
    if (!projectId) return;
    try {
      const processes = await api().processes.listByProject(projectId);
      set({ processes });
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    }
  },

  createProject: async (data) => {
    try {
      await api().projects.create(data);
      await get().fetchProjects();
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    }
  },

  deleteProject: async (id) => {
    try {
      await api().projects.delete(id);
      set({ selectedProjectId: null });
      await get().fetchProjects();
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    }
  },

  createRun: async (data) => {
    const projectId = get().selectedProjectId;
    if (!projectId) return;
    try {
      const run = await api().runs.create({ ...data, projectId });
      await get().fetchRuns();
      await api().orchestrator.execute(run.id);
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    }
  },

  executeRun: async (runId) => {
    try {
      await api().orchestrator.execute(runId);
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    }
  },

  startProcess: async (name, command) => {
    const projectId = get().selectedProjectId;
    if (!projectId) return;
    try {
      await api().processes.start(projectId, name, command);
      await get().fetchProcesses();
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    }
  },

  stopProcess: async (id) => {
    try {
      await api().processes.stop(id);
      await get().fetchProcesses();
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    }
  },

  restartProcess: async (id) => {
    try {
      await api().processes.restart(id);
      await get().fetchProcesses();
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    }
  },

  deleteProcess: async (id) => {
    try {
      await api().processes.delete(id);
      await get().fetchProcesses();
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    }
  },

  applyPatch: async (runId, patchId) => {
    try {
      const result = await api().orchestrator.applyPatch(runId, patchId);
      if (!result.success) {
        set({ error: result.output });
        return;
      }
      await get().refreshRun(runId);
      await get().fetchRuns();
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    }
  },

  rejectPatch: async (runId) => {
    try {
      await api().orchestrator.rejectPatch(runId);
      await get().refreshRun(runId);
      await get().fetchRuns();
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    }
  },

  refreshRun: async (runId) => {
    try {
      const run = await api().runs.getById(runId);
      if (run) {
        set((state) => ({
          runs: state.runs.map((r) => (r.id === runId ? run : r)),
        }));
      }
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    }
  },
}));
