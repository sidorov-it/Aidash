/**
 * Run State Machine — typed transition map for LocalRun.status.
 *
 * Valid statuses: queued | running | qa | waiting_review | done | failed | canceled
 *
 * Transitions:
 *   queued          -> running | canceled | failed
 *   running         -> qa | failed | canceled
 *   qa              -> waiting_review | failed | canceled
 *   waiting_review  -> done | failed
 *   done            -> (terminal)
 *   failed          -> (terminal)
 *   canceled        -> (terminal)
 */

export type RunStatus =
  | 'queued'
  | 'running'
  | 'qa'
  | 'waiting_review'
  | 'done'
  | 'failed'
  | 'canceled';

const TRANSITIONS: Record<RunStatus, RunStatus[]> = {
  queued: ['running', 'canceled', 'failed'],
  running: ['qa', 'failed', 'canceled'],
  qa: ['waiting_review', 'failed', 'canceled'],
  waiting_review: ['done', 'failed'],
  done: [],
  failed: [],
  canceled: [],
};

export function canTransition(from: RunStatus, to: RunStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: RunStatus, to: RunStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid run status transition: "${from}" -> "${to}". Allowed transitions from "${from}": [${TRANSITIONS[from].join(', ')}]`
    );
  }
}

export function isTerminal(status: RunStatus): boolean {
  return TRANSITIONS[status]?.length === 0;
}

export function getAllowedTransitions(status: RunStatus): RunStatus[] {
  return TRANSITIONS[status] ?? [];
}
