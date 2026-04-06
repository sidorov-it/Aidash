import { useState } from 'react';
import { useAppStore } from '../stores/app.store';
import { CreateRunModal } from './CreateRunModal';

const STATUS_DOT: Record<string, string> = {
  queued: 'bg-gray-500',
  running: 'bg-blue-500',
  qa: 'bg-yellow-500',
  waiting_review: 'bg-amber-500',
  done: 'bg-green-500',
  failed: 'bg-red-500',
  canceled: 'bg-gray-600',
};

export function RunsList() {
  const { runs, selectRun, fetchRuns, selectedProjectId } = useAppStore();
  const [showCreate, setShowCreate] = useState(false);

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
        <h1 className="text-xl font-semibold text-white">Runs</h1>
        <div className="flex gap-2">
          <button
            onClick={() => fetchRuns()}
            className="px-3 py-1.5 text-xs bg-surface-2 border border-border rounded-md hover:bg-surface-3 text-gray-300"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 rounded-md text-white"
          >
            New Run
          </button>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No runs yet</p>
          <p className="text-xs mt-1">Create a new run to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <button
              key={run.id}
              onClick={() => selectRun(run.id)}
              className="w-full flex items-center bg-surface-1 border border-border rounded-lg px-4 py-3 hover:bg-surface-2 transition-colors text-left"
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 mr-3 ${STATUS_DOT[run.status] ?? 'bg-gray-600'}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-500">
                    {run.id.slice(0, 8)}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-surface-3 text-gray-400">
                    {run.mode}
                  </span>
                  {run.agentProvider && (
                    <span className="text-xs text-gray-600">
                      {run.agentProvider}
                    </span>
                  )}
                </div>
                <p className="text-gray-200 mt-0.5 truncate">
                  {run.taskPrompt || run.taskId || 'No description'}
                </p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <span className="text-xs text-gray-400">{run.status}</span>
                <p className="text-xs text-gray-600 mt-0.5">
                  {new Date(run.createdAt).toLocaleString()}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreate && <CreateRunModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
