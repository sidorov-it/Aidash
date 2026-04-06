# Local AI Dev Orchestrator (LAO) — Technical Specification

## 1) Overview

**Local AI Dev Orchestrator (LAO)** is a local-first desktop application that:

- Runs and manages AI coding agents (for example, Claude Code and Codex)
- Creates isolated sandboxes per run
- Produces reviewable patches/diffs
- Executes automated QA (unit + Playwright)
- Manages local development processes (npm/pnpm/yarn scripts)
- Replaces multi-terminal workflows with a unified UI

The system runs **locally** and only depends on remote connectivity for optional synchronization with `personal-crm`.

## 2) Product Goals

### Primary

- Replace terminal-heavy workflows with one local interface
- Enable parallel execution via isolated sandboxes (without branch overhead)
- Enforce patch-first output instead of direct repo mutation
- Automate verification before human approval

### Non-goals (MVP)

- Multi-machine orchestration
- GitHub workflows (PR/CI integration)
- Cloud execution
- n8n integration

## 3) High-Level Architecture

```text
[ React UI ]
      ↓
[ Node.js Local Backend ]
      ↓
------------------------------------------------
| File System | Git | Processes | AI Agents |
------------------------------------------------
      ↓
[ SQLite (Local State) ]
      ↓
[ personal-crm (Remote API) ]
```

## 4) Core Modules

1. **Project Manager** – local project registration and command configuration.
2. **Run Orchestrator** – run lifecycle state machine and coordination.
3. **Sandbox Manager** – per-run isolated working directory management.
4. **Agent Executor** – invokes AI agent CLIs in sandbox context.
5. **Patch Engine** – generates and applies diffs.
6. **QA Runner** – runs unit/e2e checks and stores artifacts.
7. **Process Manager** – controls local long-running commands.
8. **Sync Service** – optional status/task synchronization with `personal-crm`.

## 5) Technology Stack

### Backend

- Node.js
- TypeScript
- `child_process` (or `execa`)
- `simple-git`

### Frontend

- React
- Zustand (or Redux)

### Desktop Shell

- Electron (preferred) or Tauri

### Local Data

- SQLite
- Prisma (optional)

## 6) SQLite Data Models

```ts
type LocalProject = {
  id: string
  name: string
  repoPath: string
  packageManager: 'npm' | 'pnpm' | 'yarn'
  devCommands: string[]
  testCommand?: string
  e2eCommand?: string
  defaultBranch: string
}

type LocalRun = {
  id: string
  projectId: string
  taskId?: string
  mode: 'AUTONOM' | 'QA' | 'INTAKE'
  status: 'queued' | 'running' | 'qa' | 'waiting_review' | 'done' | 'failed'
  sandboxPath: string
  startedAt?: Date
  finishedAt?: Date
}

type LocalProcess = {
  id: string
  projectId: string
  name: string
  command: string
  status: 'running' | 'stopped' | 'error'
  pid?: number
  logPath?: string
}

type PatchSet = {
  id: string
  runId: string
  patchPath: string
  status: 'draft' | 'qa_passed' | 'approved' | 'applied'
}

type VerificationRun = {
  id: string
  runId: string
  type: 'unit' | 'playwright'
  status: 'running' | 'passed' | 'failed'
  reportPath?: string
}
```

## 7) Feature Requirements

### 7.1 Project Management

- Add/remove local projects
- Pick repository folder
- Configure commands for dev/test/e2e

### 7.2 Process Manager (Critical)

- Start/stop/restart project processes
- Persist process metadata + PID
- Stream stdout/stderr to UI in real time
- Write logs to `/artifacts/logs/<process-id>.log`

**API**

```ts
startProcess(projectId: string, command: string): ProcessId
stopProcess(processId: string): void
restartProcess(processId: string): void
```

**UI**

- Process list per project
- Status indicator (`running` / `stopped` / `error`)
- Controls: Start, Stop, Restart, View logs

### 7.3 Sandbox Manager

- Create ephemeral per-run sandbox at `/sandboxes/<run-id>/`
- Preferred copy strategy:

```bash
rsync -a --exclude=node_modules <repo>/ <sandbox>/
```

- Optional optimizations: hardlinks/reflinks/shared `node_modules`
- Hard requirement: never mutate source repo during run execution

### 7.4 Agent Executor

Inputs:
- `runId`
- mode
- task prompt/description

Execution example:

```bash
claude-code run --prompt "<task prompt>"
```

Context includes:
- sandbox path
- project config
- CLAUDE.md (or equivalent run instructions)

### 7.5 Patch Engine

Patch generation:

```bash
git diff > patch.diff
# or
diff -ruN base/ sandbox/ > patch.diff
```

Patch apply:

```bash
git apply patch.diff
```

Requirements:
- Include all modified files
- Apply to main repo only after explicit approval

### 7.6 QA Runner

Supported checks:
- unit tests
- Playwright e2e

Example commands:

```bash
npm run test
npm run test:e2e
npx playwright test
```

Artifacts path:

```text
/artifacts/qa/<run-id>/
  report.html
  screenshots/
  logs/
```

Requirements:
- Auto-run after agent execution
- Block patch apply if QA fails

### 7.7 Run Lifecycle

```text
create run
↓
create sandbox
↓
execute agent
↓
generate patch
↓
run QA
↓
store artifacts
↓
waiting for review
↓
apply / reject
```

## 8) UI Requirements

### Dashboard

Displays:
- projects
- active runs
- running processes

### Run View

Displays:
- run status
- changed files
- patch diff
- QA results
- artifacts

Actions:
- apply patch
- reject patch

### Process View

Displays:
- all processes per project
- status indicators
- controls
- log viewer

## 9) `personal-crm` Integration

Pull:
- tasks
- epics

Push:
- run status
- run summary
- artifact references (local paths or URLs)

Requirements:
- use REST or MCP
- local execution must continue if sync is unavailable

## 10) Optional CLI

```bash
lao run <task-id>
lao start <project>
lao qa <run-id>
```

## 11) MVP Scope

### Required

- project registry
- process manager
- single-agent run flow
- sandbox creation
- patch generation
- QA execution
- minimal UI

### Excluded

- multi-agent orchestration
- advanced scheduling
- distributed execution

## 12) Critical Constraints

- No direct modifications to main repo without approval
- Sandbox isolation is mandatory
- Patch is the only valid agent output
- QA must complete (and pass) before patch apply
- Must work offline except `personal-crm` sync

## 13) UX Principles

- Replace terminal usage
- Favor one-click actions
- Keep run status visible and understandable
- Remove manual sandbox handling
- Minimize cognitive load

## 14) Post-MVP Extensions

- parallel agent runs
- priority scheduling
- automatic safe patch apply
- profiling and performance instrumentation
- advanced diff visualization

## 15) Final Positioning

LAO is **not** a task manager.

It is:

```text
A local execution operating system for AI-driven software development
```
