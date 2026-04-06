# LAO Spec Review and Next Implementation Plan

## Review Scope

Reviewed artifacts:
- `docs/lao-technical-spec.md`
- `README.md`

No inline diff comments were present in the provided context, so this review focuses on architectural completeness, implementation risk, and MVP execution order.

## Executive Summary

The specification is strong at product intent and module boundaries, but not yet implementation-ready in a few critical areas:

1. **Run state machine is underspecified** (no transition rules, retries, cancelation semantics).
2. **Patch trust/safety model is incomplete** (no explicit validation pipeline before apply).
3. **Sandbox performance strategy is open-ended** (copy strategy and dependency reuse need concrete defaults).
4. **Process manager lacks resilience details** (restart policy, orphan process handling, log rotation).
5. **QA pipeline lacks deterministic contract** (timeouts, flake handling, artifact schema).

These are normal gaps for a first technical spec. The next step should be converting MVP into a concrete delivery plan with strict interfaces and acceptance criteria.

## What Is Good Already

- Clear local-first architecture and non-goals.
- Correct focus on patch-first workflow and approval gate.
- Good module decomposition (Project, Run, Sandbox, Agent, Patch, QA, Process, Sync).
- Explicitly includes offline behavior requirement.

## Gaps to Close Before Heavy Implementation

## 1) Define the Run State Machine Contract

Add explicit transitions and errors, for example:

- `queued -> running`
- `running -> qa`
- `qa -> waiting_review | failed`
- `waiting_review -> done | failed`
- `running|qa|waiting_review -> failed` (fatal)
- `queued|running|qa -> canceled`

Also define:
- who can trigger transitions
- idempotency rules
- max retry policy per stage

## 2) Lock Patch Safety Pipeline

Before `approved -> applied`, require:

1. patch format validation
2. target repo cleanliness check
3. dry-run apply
4. conflict detection
5. post-apply verification snapshot

Add rollback path on apply failure.

## 3) Choose Sandbox Baseline Strategy

For MVP, pick one deterministic default:
- Linux/macOS: `rsync -a --exclude=node_modules`
- Optional optimization flags behind feature toggles

Define cleanup policy:
- keep last `N` sandboxes
- TTL-based deletion

## 4) Harden Process Manager

Specify:
- restart policy (`never` for MVP, manual restart only)
- SIGTERM grace timeout then SIGKILL
- orphan cleanup on app start
- log rotation limits (e.g., 10 MB per process)

## 5) Formalize QA Contract

Need deterministic run envelope:
- command timeouts
- environment variables
- artifact paths and naming contract
- flaky test policy (MVP: no retries)

## Recommended Next Features (Implementation Order)

## Phase 1 — Core backend skeleton (highest priority)

1. SQLite schema + migrations for five models.
2. Run Orchestrator with explicit state transitions.
3. Project Manager CRUD API.
4. Process Manager (`spawn`, pid tracking, log streaming).

**Definition of done:**
- Can register project, start/stop a process, and persist status after restart.

## Phase 2 — Sandbox + Patch pipeline

1. Sandbox creation/removal service.
2. Agent Executor abstraction (`provider: codex | claude`).
3. Patch generation (`git diff`) and metadata persistence.
4. Patch apply service with dry-run safety checks.

**Definition of done:**
- A run produces a patch artifact without touching main repo.

## Phase 3 — QA and review gate

1. Unit/E2E runner with artifact collector.
2. Gate logic: cannot apply patch when QA fails.
3. Run view API to expose patch files + QA results.

**Definition of done:**
- End-to-end: run -> patch -> QA -> waiting_review.

## Phase 4 — Minimal UI

1. Dashboard (projects/runs/processes).
2. Process view controls + logs.
3. Run view with patch + QA status + apply/reject actions.

**Definition of done:**
- Non-terminal operator flow works for one project.

## Concrete Backlog (Ready-to-Implement Tickets)

1. `db/init`: Prisma schema + migration scripts.
2. `run/state-machine`: typed transition map + tests.
3. `process/spawn`: start/stop/restart API + websocket log stream.
4. `sandbox/create`: deterministic copy + cleanup worker.
5. `agent/adapter`: provider interface + command execution.
6. `patch/generate`: generate/store diff + changed-files index.
7. `qa/runner`: execute test/e2e commands + artifact manifest.
8. `review/apply`: patch dry-run, apply, rollback hook.
9. `ui/dashboard`: project/run/process cards.
10. `ui/run-view`: diff viewer + QA panel + actions.

## Suggested Acceptance Metrics for MVP

- Start a run in under **3 clicks**.
- Process logs appear in UI with < **500 ms** latency.
- Sandbox creation success rate > **99%** on supported environments.
- Patch apply blocked 100% when QA status != `passed`.
- Full local run (agent + patch + unit tests) completes without manual terminal usage.

## Final Recommendation

Proceed immediately with **Phase 1** and **Phase 2** in parallel (different modules, low coupling), then integrate in Phase 3. Delay CRM sync/UI polish until the backend execution pipeline is stable.
