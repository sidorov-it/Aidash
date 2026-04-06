import { useState } from 'react';
import { useAppStore } from '../stores/app.store';

interface Props {
  onClose: () => void;
}

export function CreateRunModal({ onClose }: Props) {
  const { createRun } = useAppStore();
  const [taskPrompt, setTaskPrompt] = useState('');
  const [mode, setMode] = useState('AUTONOM');
  const [agentProvider, setAgentProvider] = useState('claude');

  const handleSubmit = async () => {
    if (!taskPrompt.trim()) return;
    await createRun({ taskPrompt, mode, agentProvider });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-surface-1 border border-border rounded-xl w-[480px] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-4">New Run</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Task Prompt
            </label>
            <textarea
              value={taskPrompt}
              onChange={(e) => setTaskPrompt(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-sm resize-none focus:outline-none focus:border-blue-500"
              placeholder="Describe the task for the AI agent..."
              autoFocus
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1.5">Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="AUTONOM">AUTONOM</option>
                <option value="QA">QA</option>
                <option value="INTAKE">INTAKE</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1.5">
                Agent Provider
              </label>
              <select
                value={agentProvider}
                onChange={(e) => setAgentProvider(e.target.value)}
                className="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="claude">Claude</option>
                <option value="codex">Codex</option>
              </select>
            </div>
          </div>
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
            disabled={!taskPrompt.trim()}
            className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-white"
          >
            Run
          </button>
        </div>
      </div>
    </div>
  );
}
