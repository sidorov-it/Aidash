import { useAppStore } from '../stores/app.store';

const STATUS_COLOR: Record<string, string> = {
  queued: 'text-gray-400',
  running: 'text-blue-400',
  qa: 'text-yellow-400',
  waiting_review: 'text-amber-400',
  done: 'text-green-400',
  failed: 'text-red-400',
  canceled: 'text-gray-500',
};

const PROC_ICON: Record<string, string> = {
  running: '\u25CF',
  stopped: '\u25CB',
  error: '\u2715',
};

const PROC_COLOR: Record<string, string> = {
  running: 'text-green-400',
  stopped: 'text-gray-500',
  error: 'text-red-400',
};

export function Dashboard() {
  const {
    projects,
    runs,
    processes,
    selectedProjectId,
    selectRun,
    setView,
    setLogsProcessId,
  } = useAppStore();
  const project = projects.find((p) => p.id === selectedProjectId);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">No project selected</p>
          <p className="text-xs">Add a project from the sidebar to get started</p>
        </div>
      </div>
    );
  }

  const activeRuns = runs.filter((r) =>
    ['running', 'qa', 'queued'].includes(r.status)
  );
  const waitingReview = runs.filter((r) => r.status === 'waiting_review');
  const runningProcesses = processes.filter((p) => p.status === 'running');
  const recentRuns = runs.slice(0, 5);

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">{project.name}</h1>
        <p className="text-xs text-gray-500 mt-1 font-mono">{project.repoPath}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => setView('runs')}
          className="bg-surface-1 border border-border rounded-lg p-4 text-left hover:bg-surface-2 transition-colors"
        >
          <div className="text-2xl font-bold text-white">{activeRuns.length}</div>
          <div className="text-xs text-gray-500 mt-1">Active Runs</div>
        </button>
        <button
          onClick={() => setView('processes')}
          className="bg-surface-1 border border-border rounded-lg p-4 text-left hover:bg-surface-2 transition-colors"
        >
          <div className="text-2xl font-bold text-white">
            {runningProcesses.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Running Processes</div>
        </button>
        <button
          onClick={() => setView('runs')}
          className="bg-surface-1 border border-border rounded-lg p-4 text-left hover:bg-surface-2 transition-colors"
        >
          <div className="text-2xl font-bold text-amber-400">
            {waitingReview.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Awaiting Review</div>
        </button>
      </div>

      {/* Waiting for review */}
      {waitingReview.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3">
            Waiting for Review
          </h2>
          <div className="space-y-2">
            {waitingReview.map((run) => (
              <button
                key={run.id}
                onClick={() => selectRun(run.id)}
                className="w-full flex items-center justify-between bg-amber-900/10 border border-amber-600/30 rounded-lg px-4 py-3 hover:bg-amber-900/20 transition-colors text-left"
              >
                <div>
                  <span className="text-xs font-mono text-gray-500">
                    {run.id.slice(0, 8)}
                  </span>
                  <p className="text-gray-200 mt-0.5">
                    {run.taskPrompt || run.taskId || 'No description'}
                  </p>
                </div>
                <span className="text-xs text-amber-400 font-medium">
                  Review &rarr;
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Active runs */}
      {activeRuns.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3">Active Runs</h2>
          <div className="space-y-2">
            {activeRuns.map((run) => (
              <button
                key={run.id}
                onClick={() => selectRun(run.id)}
                className="w-full flex items-center justify-between bg-surface-1 border border-border rounded-lg px-4 py-3 hover:bg-surface-2 transition-colors text-left"
              >
                <div>
                  <span className="text-xs font-mono text-gray-500">
                    {run.id.slice(0, 8)}
                  </span>
                  <p className="text-gray-200 mt-0.5">
                    {run.taskPrompt || run.taskId || 'No description'}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs font-medium ${STATUS_COLOR[run.status]}`}
                  >
                    {run.status}
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">{run.mode}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Processes */}
      {processes.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3">Processes</h2>
          <div className="space-y-1">
            {processes.map((proc) => (
              <div
                key={proc.id}
                className="flex items-center justify-between bg-surface-1 border border-border rounded-lg px-4 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className={PROC_COLOR[proc.status]}>
                    {PROC_ICON[proc.status]}
                  </span>
                  <span className="text-gray-200">{proc.name}</span>
                  <span className="text-xs text-gray-500 font-mono">
                    {proc.command}
                  </span>
                </div>
                {proc.status === 'running' && (
                  <button
                    onClick={() => setLogsProcessId(proc.id)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Logs
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent runs */}
      {recentRuns.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-400 mb-3">Recent Runs</h2>
          <div className="space-y-1">
            {recentRuns.map((run) => (
              <button
                key={run.id}
                onClick={() => selectRun(run.id)}
                className="w-full flex items-center justify-between bg-surface-1 border border-border rounded-lg px-4 py-2 hover:bg-surface-2 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-500">
                    {run.id.slice(0, 8)}
                  </span>
                  <span className="text-gray-300 truncate max-w-sm">
                    {run.taskPrompt || run.taskId || '\u2014'}
                  </span>
                </div>
                <span className={`text-xs ${STATUS_COLOR[run.status]}`}>
                  {run.status}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
