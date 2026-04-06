import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/app.store';
import { DiffViewer } from './DiffViewer';
import { QaReportViewer } from './QaReportViewer';
import type { Patch, Verification } from '../types';

const STATUS_BADGE: Record<string, string> = {
  queued: 'text-gray-400 bg-gray-600/20',
  running: 'text-blue-400 bg-blue-600/20',
  qa: 'text-yellow-400 bg-yellow-600/20',
  waiting_review: 'text-amber-400 bg-amber-600/20',
  done: 'text-green-400 bg-green-600/20',
  failed: 'text-red-400 bg-red-600/20',
  canceled: 'text-gray-500 bg-gray-700/20',
};

export function RunDetails() {
  const { selectedRunId, runs, applyPatch, rejectPatch, setView, fetchRuns } =
    useAppStore();
  const run = runs.find((r) => r.id === selectedRunId);

  const [patchContent, setPatchContent] = useState('');
  const [selectedPatch, setSelectedPatch] = useState<Patch | null>(null);
  const [qaResults, setQaResults] = useState<Verification[]>([]);
  const [canApply, setCanApply] = useState(false);
  const [tab, setTab] = useState<'diff' | 'qa'>('diff');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!run) return;

    // Load patch content
    if (run.patches.length > 0) {
      const patch = run.patches[0];
      setSelectedPatch(patch);
      window.lao.patches.getContent(patch.id).then(setPatchContent);
    } else {
      setSelectedPatch(null);
      setPatchContent('');
    }

    // Load QA results
    setQaResults(run.verifications);

    // Check QA gate
    window.lao.qa.canApplyPatch(run.id).then(setCanApply);
  }, [run]);

  // Poll for updates on active runs
  useEffect(() => {
    if (!run) return;
    if (['done', 'failed', 'canceled'].includes(run.status)) return;

    const interval = setInterval(() => {
      useAppStore.getState().refreshRun(run.id);
    }, 3000);

    return () => clearInterval(interval);
  }, [run?.id, run?.status]);

  if (!run) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Run not found
      </div>
    );
  }

  const handleApply = async () => {
    if (!selectedPatch) return;
    setApplying(true);
    await applyPatch(run.id, selectedPatch.id);
    setApplying(false);
  };

  const handleReject = async () => {
    await rejectPatch(run.id);
    await fetchRuns();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => setView('runs')}
            className="text-gray-500 hover:text-gray-300 text-xs"
          >
            &larr; Runs
          </button>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[run.status]}`}
          >
            {run.status}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-surface-3 text-gray-400">
            {run.mode}
          </span>
        </div>
        <p className="text-gray-200">
          {run.taskPrompt || run.taskId || 'No description'}
        </p>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span className="font-mono">{run.id.slice(0, 8)}</span>
          {run.agentProvider && <span>Agent: {run.agentProvider}</span>}
          {run.startedAt && (
            <span>
              Started: {new Date(run.startedAt).toLocaleString()}
            </span>
          )}
          {run.finishedAt && (
            <span>
              Finished: {new Date(run.finishedAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Changed files summary + actions */}
      {selectedPatch && (
        <div className="flex-shrink-0 border-b border-border px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">
              {selectedPatch.changedFiles.length} file
              {selectedPatch.changedFiles.length !== 1 ? 's' : ''} changed
            </span>
            <span className="text-xs text-gray-600">
              Patch: {selectedPatch.status}
            </span>
          </div>
          {run.status === 'waiting_review' && (
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                className="px-3 py-1.5 text-xs bg-surface-2 border border-border rounded-md hover:bg-red-900/30 hover:border-red-800 text-gray-300"
              >
                Reject
              </button>
              <button
                onClick={handleApply}
                disabled={!canApply || applying}
                className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-white"
              >
                {applying ? 'Applying...' : 'Apply Patch'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex-shrink-0 border-b border-border px-6 flex gap-0">
        <button
          onClick={() => setTab('diff')}
          className={`px-4 py-2.5 text-xs border-b-2 transition-colors ${
            tab === 'diff'
              ? 'border-blue-500 text-white'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Diff
          {selectedPatch && (
            <span className="ml-1.5 text-gray-600">
              {selectedPatch.changedFiles.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('qa')}
          className={`px-4 py-2.5 text-xs border-b-2 transition-colors ${
            tab === 'qa'
              ? 'border-blue-500 text-white'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          QA Results
          {qaResults.length > 0 && (
            <span
              className={`ml-1.5 ${
                qaResults.every((v) => v.status === 'passed')
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}
            >
              {qaResults.filter((v) => v.status === 'passed').length}/
              {qaResults.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'diff' ? (
          patchContent ? (
            <DiffViewer
              diff={patchContent}
              changedFiles={selectedPatch?.changedFiles ?? []}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              {['queued', 'running'].includes(run.status)
                ? 'Waiting for agent to complete...'
                : 'No patch generated'}
            </div>
          )
        ) : (
          <div className="overflow-auto h-full">
            <QaReportViewer verifications={qaResults} />
          </div>
        )}
      </div>
    </div>
  );
}
