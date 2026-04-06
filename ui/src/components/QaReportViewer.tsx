import type { Verification } from '../types';

interface Props {
  verifications: Verification[];
}

const STATUS_ICON: Record<string, string> = {
  running: '\u23F3',
  passed: '\u2713',
  failed: '\u2715',
};

const STATUS_STYLE: Record<string, string> = {
  running: 'text-blue-400 border-blue-800/40 bg-blue-950/20',
  passed: 'text-green-400 border-green-800/40 bg-green-950/20',
  failed: 'text-red-400 border-red-800/40 bg-red-950/20',
};

export function QaReportViewer({ verifications }: Props) {
  if (verifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        No QA results available
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      {verifications.map((v) => (
        <div
          key={v.id}
          className={`border rounded-lg overflow-hidden ${STATUS_STYLE[v.status]}`}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-inherit">
            <div className="flex items-center gap-2">
              <span className="text-base">{STATUS_ICON[v.status]}</span>
              <span className="font-medium capitalize">{v.type} Tests</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="uppercase font-medium">{v.status}</span>
              {v.exitCode !== null && (
                <span className="text-gray-500">
                  Exit code: {v.exitCode}
                </span>
              )}
              {v.finishedAt && v.startedAt && (
                <span className="text-gray-500">
                  {(
                    (new Date(v.finishedAt).getTime() -
                      new Date(v.startedAt).getTime()) /
                    1000
                  ).toFixed(1)}
                  s
                </span>
              )}
            </div>
          </div>

          {/* Output */}
          {(v.stdout || v.stderr) && (
            <div className="max-h-80 overflow-auto">
              {v.stdout && (
                <pre className="px-4 py-3 text-xs font-mono text-gray-300 whitespace-pre-wrap break-all leading-5">
                  {v.stdout}
                </pre>
              )}
              {v.stderr && (
                <pre className="px-4 py-3 text-xs font-mono text-red-300/80 whitespace-pre-wrap break-all leading-5 border-t border-inherit">
                  {v.stderr}
                </pre>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
