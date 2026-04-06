import { useState } from 'react';
import { useAppStore } from '../stores/app.store';
import { AddProcessModal } from './AddProcessModal';

const STATUS_CFG: Record<
  string,
  { icon: string; color: string; bg: string }
> = {
  running: { icon: '\u25CF', color: 'text-green-400', bg: 'bg-green-600/10' },
  stopped: { icon: '\u25CB', color: 'text-gray-500', bg: '' },
  error: { icon: '\u2715', color: 'text-red-400', bg: 'bg-red-600/10' },
};

export function ProcessManager() {
  const {
    processes,
    selectedProjectId,
    projects,
    stopProcess,
    restartProcess,
    deleteProcess,
    fetchProcesses,
    setLogsProcessId,
    startProcess,
  } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const project = projects.find((p) => p.id === selectedProjectId);

  if (!selectedProjectId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select a project first
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Process Manager</h1>
          {project && (
            <p className="text-xs text-gray-500 mt-1">{project.name}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchProcesses()}
            className="px-3 py-1.5 text-xs bg-surface-2 border border-border rounded-md hover:bg-surface-3 text-gray-300"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 rounded-md text-white"
          >
            Start Process
          </button>
        </div>
      </div>

      {processes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No processes</p>
          <p className="text-xs mt-1">
            Start a process to manage your dev environment
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {processes.map((proc) => {
            const cfg = STATUS_CFG[proc.status] ?? STATUS_CFG.stopped;
            return (
              <div
                key={proc.id}
                className={`flex items-center justify-between bg-surface-1 border border-border rounded-lg px-4 py-3 ${cfg.bg}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-sm ${cfg.color}`}>{cfg.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-200 font-medium">
                        {proc.name}
                      </span>
                      <span className={`text-xs ${cfg.color}`}>
                        {proc.status}
                      </span>
                      {proc.pid && (
                        <span className="text-xs text-gray-600 font-mono">
                          PID {proc.pid}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-mono truncate">
                      {proc.command}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                  {proc.status === 'running' ? (
                    <>
                      <button
                        onClick={() => setLogsProcessId(proc.id)}
                        className="px-2.5 py-1 text-xs bg-surface-2 border border-border rounded hover:bg-surface-3 text-gray-300"
                      >
                        Logs
                      </button>
                      <button
                        onClick={() => stopProcess(proc.id)}
                        className="px-2.5 py-1 text-xs bg-surface-2 border border-border rounded hover:bg-red-900/30 hover:border-red-800 text-gray-300"
                      >
                        Stop
                      </button>
                      <button
                        onClick={() => restartProcess(proc.id)}
                        className="px-2.5 py-1 text-xs bg-surface-2 border border-border rounded hover:bg-surface-3 text-gray-300"
                      >
                        Restart
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => restartProcess(proc.id)}
                        className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded text-white"
                      >
                        Start
                      </button>
                      <button
                        onClick={() => deleteProcess(proc.id)}
                        className="px-2.5 py-1 text-xs bg-surface-2 border border-border rounded hover:bg-red-900/30 hover:border-red-800 text-gray-300"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick-start from project devCommands */}
      {project && project.devCommands.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3">
            Quick Start
          </h2>
          <div className="flex flex-wrap gap-2">
            {project.devCommands.map((cmd: string, i: number) => (
              <button
                key={i}
                onClick={() =>
                  startProcess(cmd.split(' ').pop() ?? cmd, cmd)
                }
                className="px-3 py-1.5 text-xs bg-surface-2 border border-border rounded-md hover:bg-surface-3 text-gray-300 font-mono"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      )}

      {showAdd && <AddProcessModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
