import { EventEmitter } from 'events';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  runId?: string;
  message: string;
}

const bus = new EventEmitter();
bus.setMaxListeners(50);

/** Subscribe to all log entries (used by IPC to forward to renderer) */
export function onLog(handler: (entry: LogEntry) => void): () => void {
  bus.on('log', handler);
  return () => bus.off('log', handler);
}

function emit(level: LogLevel, module: string, message: string, runId?: string) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    module,
    runId,
    message,
  };

  // Console output
  const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${module}]${runId ? ` [run:${runId.slice(0, 8)}]` : ''}`;
  switch (level) {
    case 'error':
      console.error(prefix, message);
      break;
    case 'warn':
      console.warn(prefix, message);
      break;
    case 'debug':
      console.debug(prefix, message);
      break;
    default:
      console.log(prefix, message);
  }

  bus.emit('log', entry);
}

/** Create a scoped logger for a module */
export function createLogger(module: string) {
  return {
    debug: (msg: string, runId?: string) => emit('debug', module, msg, runId),
    info: (msg: string, runId?: string) => emit('info', module, msg, runId),
    warn: (msg: string, runId?: string) => emit('warn', module, msg, runId),
    error: (msg: string, runId?: string) => emit('error', module, msg, runId),
  };
}
