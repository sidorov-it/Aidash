import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../stores/app.store';

export function LogsViewer() {
  const { logsProcessId, processes, setView, setLogsProcessId } =
    useAppStore();
  const proc = processes.find((p) => p.id === logsProcessId);

  const [logs, setLogs] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!logsProcessId) return;

    const fetchLogs = async () => {
      try {
        const content = await window.lao.processes.getLogs(logsProcessId);
        setLogs(content);
      } catch {
        // Process may have been deleted
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 1500);
    return () => clearInterval(interval);
  }, [logsProcessId]);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  if (!proc) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No process selected
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setLogsProcessId(null);
              setView('processes');
            }}
            className="text-gray-500 hover:text-gray-300 text-xs"
          >
            &larr; Processes
          </button>
          <span className="text-gray-200 font-medium">{proc.name}</span>
          <span className="text-xs font-mono text-gray-500">
            {proc.command}
          </span>
          <span
            className={`text-xs ${proc.status === 'running' ? 'text-green-400' : 'text-gray-500'}`}
          >
            {proc.status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            Auto-scroll
          </label>
          <button
            onClick={() => setLogs('')}
            className="px-2.5 py-1 text-xs bg-surface-2 border border-border rounded hover:bg-surface-3 text-gray-400"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Log output */}
      <pre
        ref={containerRef}
        className="flex-1 overflow-auto p-4 text-xs font-mono text-gray-300 bg-black/30 leading-5 whitespace-pre-wrap break-all"
      >
        {logs || (
          <span className="text-gray-600">Waiting for output...</span>
        )}
      </pre>
    </div>
  );
}
