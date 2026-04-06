import { contextBridge, ipcRenderer } from 'electron';

const api = {
  onRunLog: (callback: (entry: unknown) => void) => {
    const handler = (_event: unknown, entry: unknown) => callback(entry);
    ipcRenderer.on('run:log', handler);
    return () => ipcRenderer.removeListener('run:log', handler);
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    getById: (id: string) => ipcRenderer.invoke('projects:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('projects:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('projects:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('projects:delete', id),
    getScripts: (id: string) => ipcRenderer.invoke('projects:getScripts', id),
  },
  runs: {
    listByProject: (projectId: string) => ipcRenderer.invoke('runs:listByProject', projectId),
    getById: (id: string) => ipcRenderer.invoke('runs:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('runs:create', data),
    transition: (id: string, status: string) => ipcRenderer.invoke('runs:transition', id, status),
    delete: (id: string) => ipcRenderer.invoke('runs:delete', id),
  },
  processes: {
    listByProject: (projectId: string) =>
      ipcRenderer.invoke('processes:listByProject', projectId),
    start: (projectId: string, name: string, command: string) =>
      ipcRenderer.invoke('processes:start', projectId, name, command),
    stop: (id: string) => ipcRenderer.invoke('processes:stop', id),
    restart: (id: string) => ipcRenderer.invoke('processes:restart', id),
    getLogs: (id: string, tail?: number) => ipcRenderer.invoke('processes:getLogs', id, tail),
    delete: (id: string) => ipcRenderer.invoke('processes:delete', id),
  },
  patches: {
    listByRun: (runId: string) => ipcRenderer.invoke('patches:listByRun', runId),
    getContent: (id: string) => ipcRenderer.invoke('patches:getContent', id),
    getById: (id: string) => ipcRenderer.invoke('patches:getById', id),
    dryRun: (id: string) => ipcRenderer.invoke('patches:dryRun', id),
  },
  qa: {
    runChecks: (runId: string) => ipcRenderer.invoke('qa:runChecks', runId),
    getByRun: (runId: string) => ipcRenderer.invoke('qa:getByRun', runId),
    canApplyPatch: (runId: string) => ipcRenderer.invoke('qa:canApplyPatch', runId),
  },
  orchestrator: {
    execute: (runId: string) => ipcRenderer.invoke('orchestrator:execute', runId),
    applyPatch: (runId: string, patchId: string) =>
      ipcRenderer.invoke('orchestrator:applyPatch', runId, patchId),
    rejectPatch: (runId: string) => ipcRenderer.invoke('orchestrator:rejectPatch', runId),
  },
};

contextBridge.exposeInMainWorld('lao', api);
