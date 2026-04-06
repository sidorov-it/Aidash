import { useState, useMemo } from 'react';

interface Props {
  diff: string;
  changedFiles: string[];
}

interface DiffFile {
  path: string;
  hunks: DiffHunk[];
}

interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

interface DiffLine {
  type: 'context' | 'add' | 'remove';
  content: string;
  oldLine: number | null;
  newLine: number | null;
}

function parseDiff(raw: string): DiffFile[] {
  const files: DiffFile[] = [];
  const fileChunks = raw.split(/^diff --git /m).filter(Boolean);

  for (const chunk of fileChunks) {
    const lines = chunk.split('\n');

    const pppLine = lines.find((l) => l.startsWith('+++ '));
    const path =
      pppLine?.replace(/^\+\+\+ [ab]\//, '').replace(/^\+\+\+ /, '') ??
      'unknown';

    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;
    let oldLine = 0;
    let newLine = 0;

    for (const line of lines) {
      const hunkMatch = line.match(
        /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/
      );
      if (hunkMatch) {
        currentHunk = { header: line, lines: [] };
        hunks.push(currentHunk);
        oldLine = parseInt(hunkMatch[1], 10);
        newLine = parseInt(hunkMatch[2], 10);
        continue;
      }

      if (!currentHunk) continue;

      if (line.startsWith('+')) {
        currentHunk.lines.push({
          type: 'add',
          content: line.slice(1),
          oldLine: null,
          newLine: newLine++,
        });
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({
          type: 'remove',
          content: line.slice(1),
          oldLine: oldLine++,
          newLine: null,
        });
      } else if (line.startsWith(' ') || (line === '' && currentHunk.lines.length > 0)) {
        currentHunk.lines.push({
          type: 'context',
          content: line.startsWith(' ') ? line.slice(1) : '',
          oldLine: oldLine++,
          newLine: newLine++,
        });
      }
    }

    if (hunks.length > 0) {
      files.push({ path, hunks });
    }
  }

  return files;
}

function buildSideBySide(
  lines: DiffLine[]
): { left: DiffLine | null; right: DiffLine | null }[] {
  const result: { left: DiffLine | null; right: DiffLine | null }[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.type === 'context') {
      result.push({ left: line, right: line });
      i++;
    } else if (line.type === 'remove') {
      const removes: DiffLine[] = [];
      while (i < lines.length && lines[i].type === 'remove') {
        removes.push(lines[i]);
        i++;
      }
      const adds: DiffLine[] = [];
      while (i < lines.length && lines[i].type === 'add') {
        adds.push(lines[i]);
        i++;
      }
      const max = Math.max(removes.length, adds.length);
      for (let j = 0; j < max; j++) {
        result.push({
          left: removes[j] ?? null,
          right: adds[j] ?? null,
        });
      }
    } else if (line.type === 'add') {
      result.push({ left: null, right: line });
      i++;
    } else {
      i++;
    }
  }

  return result;
}

const LINE_BG: Record<string, string> = {
  add: 'bg-green-950/40',
  remove: 'bg-red-950/40',
  context: '',
};

const LINE_TEXT: Record<string, string> = {
  add: 'text-green-300',
  remove: 'text-red-300',
  context: 'text-gray-300',
};

const LINE_NUM_BG: Record<string, string> = {
  add: 'bg-green-950/30',
  remove: 'bg-red-950/30',
  context: '',
};

export function DiffViewer({ diff, changedFiles }: Props) {
  const files = useMemo(() => parseDiff(diff), [diff]);
  const [selectedFile, setSelectedFile] = useState<string>(
    files[0]?.path ?? ''
  );

  const currentFile =
    files.find((f) => f.path === selectedFile) ?? files[0];

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        No changes in diff
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* File list */}
      <div className="w-56 flex-shrink-0 border-r border-border overflow-auto bg-surface-1">
        <div className="p-2">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 py-1.5 mb-1">
            Files ({files.length})
          </div>
          {files.map((file) => (
            <button
              key={file.path}
              onClick={() => setSelectedFile(file.path)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                selectedFile === file.path
                  ? 'bg-surface-3 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-surface-2'
              }`}
              title={file.path}
            >
              <span className="block truncate">
                {file.path.split('/').pop()}
              </span>
              <span className="block text-[10px] text-gray-600 truncate">
                {file.path}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto">
        {currentFile && (
          <div>
            <div className="sticky top-0 z-10 bg-surface-1 border-b border-border px-4 py-2 text-xs font-mono text-gray-400">
              {currentFile.path}
            </div>
            {currentFile.hunks.map((hunk, hi) => {
              const pairs = buildSideBySide(hunk.lines);
              return (
                <div key={hi} className="mb-1">
                  <div className="px-4 py-1 bg-blue-950/20 text-xs font-mono text-blue-400 border-y border-border/50">
                    {hunk.header}
                  </div>
                  <table className="w-full text-xs font-mono border-collapse table-fixed">
                    <tbody>
                      {pairs.map((pair, pi) => (
                        <tr key={pi} className="leading-5">
                          {/* Old side */}
                          <td
                            className={`w-10 text-right pr-2 select-none text-gray-600 border-r border-border/40 ${pair.left ? LINE_NUM_BG[pair.left.type] : 'bg-surface-2/50'}`}
                          >
                            {pair.left?.oldLine ?? ''}
                          </td>
                          <td
                            className={`pl-2 pr-4 whitespace-pre-wrap break-all ${pair.left ? `${LINE_BG[pair.left.type]} ${LINE_TEXT[pair.left.type]}` : 'bg-surface-2/50'}`}
                            style={{ width: 'calc(50% - 20px)' }}
                          >
                            {pair.left?.content ?? ''}
                          </td>
                          {/* New side */}
                          <td
                            className={`w-10 text-right pr-2 select-none text-gray-600 border-r border-l border-border/40 ${pair.right ? LINE_NUM_BG[pair.right.type] : 'bg-surface-2/50'}`}
                          >
                            {pair.right?.newLine ?? ''}
                          </td>
                          <td
                            className={`pl-2 pr-4 whitespace-pre-wrap break-all ${pair.right ? `${LINE_BG[pair.right.type]} ${LINE_TEXT[pair.right.type]}` : 'bg-surface-2/50'}`}
                            style={{ width: 'calc(50% - 20px)' }}
                          >
                            {pair.right?.content ?? ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
