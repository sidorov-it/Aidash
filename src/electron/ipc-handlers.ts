import { ipcMain, BrowserWindow } from 'electron';
import { projectService } from '../modules/project/project.service';
import { runService } from '../modules/run/run.service';
import { processService } from '../modules/process/process.service';
import { patchService } from '../modules/patch/patch.service';
import { qaService } from '../modules/qa/qa.service';
import { runOrchestrator } from '../modules/run/run.orchestrator';
import { onLog } from '../lib/logger';

export function registerIpcHandlers() {
  // Forward all log entries to renderer
  onLog((entry) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('run:log', entry);
    }
  });

  // --- Projects ---
  ipcMain.handle('projects:list', () => projectService.list());
  ipcMain.handle('projects:getById', (_, id: string) => projectService.getById(id));
  ipcMain.handle('projects:create', (_, data) => projectService.create(data));
  ipcMain.handle('projects:update', (_, id: string, data) => projectService.update(id, data));
  ipcMain.handle('projects:delete', (_, id: string) => projectService.delete(id));
  ipcMain.handle('projects:getScripts', (_, id: string) => projectService.getScripts(id));

  // --- Runs ---
  ipcMain.handle('runs:listByProject', (_, projectId: string) =>
    runService.listByProject(projectId)
  );
  ipcMain.handle('runs:getById', (_, id: string) => runService.getById(id));
  ipcMain.handle('runs:create', (_, data) => runService.create(data));
  ipcMain.handle('runs:transition', (_, id: string, status) =>
    runService.transition(id, status)
  );
  ipcMain.handle('runs:delete', (_, id: string) => runService.delete(id));

  // --- Processes ---
  ipcMain.handle('processes:listByProject', (_, projectId: string) =>
    processService.listByProject(projectId)
  );
  ipcMain.handle('processes:start', (_, projectId: string, name: string, command: string) =>
    processService.start(projectId, name, command)
  );
  ipcMain.handle('processes:stop', (_, id: string) => processService.stop(id));
  ipcMain.handle('processes:restart', (_, id: string) => processService.restart(id));
  ipcMain.handle('processes:getLogs', (_, id: string, tail?: number) =>
    processService.getLogs(id, tail)
  );
  ipcMain.handle('processes:delete', (_, id: string) => processService.delete(id));

  // --- Patches ---
  ipcMain.handle('patches:listByRun', (_, runId: string) => patchService.listByRun(runId));
  ipcMain.handle('patches:getContent', (_, id: string) => patchService.getContent(id));
  ipcMain.handle('patches:getById', (_, id: string) => patchService.getById(id));
  ipcMain.handle('patches:dryRun', (_, id: string) => patchService.dryRun(id));

  // --- QA ---
  ipcMain.handle('qa:runChecks', (_, runId: string) => qaService.runChecks(runId));
  ipcMain.handle('qa:getByRun', (_, runId: string) => qaService.getByRun(runId));
  ipcMain.handle('qa:canApplyPatch', (_, runId: string) => qaService.canApplyPatch(runId));

  // --- Orchestrator ---
  ipcMain.handle('orchestrator:execute', (_, runId: string) => {
    runOrchestrator.execute(runId).catch((err) => {
      console.error(`Orchestrator error for run ${runId}:`, err);
    });
    return { message: `Run ${runId} execution started.` };
  });
  ipcMain.handle('orchestrator:applyPatch', (_, runId: string, patchId: string) =>
    runOrchestrator.applyPatch(runId, patchId)
  );
  ipcMain.handle('orchestrator:rejectPatch', (_, runId: string) =>
    runOrchestrator.rejectPatch(runId)
  );
}
