import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/app.store';

interface Props {
  onClose: () => void;
}

export function AddProcessModal({ onClose }: Props) {
  const { projects, selectedProjectId, startProcess } = useAppStore();
  const [projectId, setProjectId] = useState(selectedProjectId ?? '');
  const [scripts, setScripts] = useState<Record<string, string>>({});
  const [selectedScript, setSelectedScript] = useState('');
  const [loading, setLoading] = useState(false);

  const project = projects.find((p) => p.id === projectId);
  const pm = project?.packageManager ?? 'npm';

  useEffect(() => {
    if (!projectId) {
      setScripts({});
      return;
    }
    setLoading(true);
    setSelectedScript('');
    window.lao.projects
      .getScripts(projectId)
      .then(setScripts)
      .catch(() => setScripts({}))
      .finally(() => setLoading(false));
  }, [projectId]);

  const scriptNames = Object.keys(scripts);

  const handleSubmit = async () => {
    if (!selectedScript || !projectId) return;
    const command = `${pm} run ${selectedScript}`;
    // Temporarily select this project for startProcess
    const store = useAppStore.getState();
    const prev = store.selectedProjectId;
    if (projectId !== prev) {
      useAppStore.setState({ selectedProjectId: projectId });
    }
    await startProcess(selectedScript, command);
    if (projectId !== prev && prev) {
      useAppStore.setState({ selectedProjectId: prev });
      store.fetchProcesses();
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-surface-1 border border-border rounded-xl w-[440px] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-4">
          Start Process
        </h2>

        <div className="space-y-4">
          {/* Project selector */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-sm focus:outline-none focus:border-blue-500 text-gray-200"
            >
              <option value="">Select project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Script selector */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Script
            </label>
            {loading ? (
              <div className="px-3 py-2 text-xs text-gray-500">
                Loading scripts...
              </div>
            ) : scriptNames.length === 0 && projectId ? (
              <div className="px-3 py-2 text-xs text-gray-500">
                No scripts found in package.json
              </div>
            ) : (
              <div className="max-h-[240px] overflow-y-auto border border-border rounded-md bg-surface-2">
                {scriptNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => setSelectedScript(name)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-3 border-b border-border last:border-b-0 ${
                      selectedScript === name
                        ? 'bg-blue-600/20 text-blue-300'
                        : 'text-gray-300'
                    }`}
                  >
                    <span className="font-mono">{name}</span>
                    <span className="block text-xs text-gray-500 truncate mt-0.5">
                      {scripts[name]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          {selectedScript && (
            <div className="px-3 py-2 bg-surface-2 border border-border rounded-md">
              <span className="text-xs text-gray-500">Command: </span>
              <span className="text-xs text-gray-300 font-mono">
                {pm} run {selectedScript}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs bg-surface-2 border border-border rounded-md hover:bg-surface-3 text-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedScript || !projectId}
            className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-white"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
