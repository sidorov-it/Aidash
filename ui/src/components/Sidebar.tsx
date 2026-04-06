import { useState } from 'react';
import { useAppStore } from '../stores/app.store';
import type { View } from '../types';

export function Sidebar() {
  const {
    projects,
    selectedProjectId,
    selectProject,
    view,
    setView,
    runs,
    processes,
    createProject,
  } = useAppStore();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [repoPath, setRepoPath] = useState('');

  const waitingReview = runs.filter((r) => r.status === 'waiting_review').length;
  const activeRuns = runs.filter((r) =>
    ['running', 'qa', 'queued'].includes(r.status)
  ).length;
  const runningProcs = processes.filter((p) => p.status === 'running').length;

  const navItems: { label: string; target: View; badge?: number }[] = [
    { label: 'Dashboard', target: 'dashboard' },
    { label: 'Runs', target: 'runs', badge: activeRuns || undefined },
    { label: 'Processes', target: 'processes', badge: runningProcs || undefined },
  ];

  const handleCreate = async () => {
    if (name && repoPath) {
      await createProject({ name, repoPath });
      setName('');
      setRepoPath('');
      setShowForm(false);
    }
  };

  return (
    <aside className="w-60 bg-surface-1 border-r border-border flex flex-col h-full flex-shrink-0">
      {/* macOS title bar drag region */}
      <div
        className="h-9 flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      {/* Project selector */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Project
          </span>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-gray-500 hover:text-gray-300 text-lg leading-none"
          >
            +
          </button>
        </div>

        {showForm && (
          <div className="mb-2 space-y-2">
            <input
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2 py-1.5 bg-surface-2 border border-border rounded text-xs focus:outline-none focus:border-blue-500"
            />
            <input
              placeholder="/path/to/repo"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              className="w-full px-2 py-1.5 bg-surface-2 border border-border rounded text-xs font-mono focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleCreate}
              className="w-full px-2 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs text-white"
            >
              Add Project
            </button>
          </div>
        )}

        <select
          value={selectedProjectId ?? ''}
          onChange={(e) => e.target.value && selectProject(e.target.value)}
          className="w-full px-2 py-1.5 bg-surface-2 border border-border rounded text-xs focus:outline-none focus:border-blue-500"
        >
          <option value="" disabled>
            Select project...
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map((item) => (
          <button
            key={item.target}
            onClick={() => setView(item.target)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors ${
              view === item.target ||
              (item.target === 'runs' && view === 'run-details')
                ? 'bg-surface-3 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-surface-2'
            }`}
          >
            <span>{item.label}</span>
            {item.badge != null && (
              <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Review notification */}
      {waitingReview > 0 && (
        <div className="px-3 py-3 border-t border-border">
          <button
            onClick={() => setView('runs')}
            className="w-full px-3 py-2 bg-amber-600/20 border border-amber-600/40 rounded-md text-amber-400 text-xs text-left hover:bg-amber-600/30 transition-colors"
          >
            {waitingReview} awaiting review
          </button>
        </div>
      )}
    </aside>
  );
}
