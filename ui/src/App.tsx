import { useEffect } from 'react';
import { useAppStore } from './stores/app.store';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { RunsList } from './components/RunsList';
import { RunDetails } from './components/RunDetails';
import { ProcessManager } from './components/ProcessManager';
import { LogsViewer } from './components/LogsViewer';

export default function App() {
  const { view, error, clearError, fetchProjects } = useAppStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard />;
      case 'runs':
        return <RunsList />;
      case 'run-details':
        return <RunDetails />;
      case 'processes':
        return <ProcessManager />;
      case 'logs':
        return <LogsViewer />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-surface text-gray-200 text-sm">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {error && (
          <div className="mx-3 mt-3 p-3 bg-red-900/40 border border-red-800 rounded-lg flex items-center justify-between flex-shrink-0">
            <span className="text-red-300 text-xs">{error}</span>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-300 ml-4 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="flex-1 overflow-auto">{renderView()}</div>
      </main>
    </div>
  );
}
