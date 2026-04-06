# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

LAO (Local AI Dev Orchestrator) — a local-first Electron desktop app for managing AI coding agents. Backend: Express/TypeScript/Prisma/SQLite. Desktop UI: Electron + React + Zustand + TailwindCSS. IPC bridge connects renderer to backend services directly (no HTTP in desktop mode).

## Commands

```bash
# Backend
npm run build            # Compile TypeScript to dist/
npm run dev              # Start API server only (ts-node, port 3000)
npm start                # Run compiled API server
npm test                 # Run Jest tests

# Desktop UI
npm run build:ui         # Build React UI with Vite → ui/dist/
npm run build:all        # Build backend + UI
npm run dev:desktop      # Dev mode: Vite dev server + Electron (hot reload)
npm run start:desktop    # Production: build all, launch Electron

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run Prisma migrations
npm run db:push          # Push schema changes to DB
```

Run a single test file:
```bash
npx jest src/modules/run/run.state-machine.test.ts
```

## Architecture

### Electron App Structure

- `src/electron/main.ts` — Electron main process, creates window, sets up IPC
- `src/electron/preload.ts` — Context bridge exposing `window.lao` API to renderer
- `src/electron/ipc-handlers.ts` — Maps IPC channels to backend service methods
- `src/app.ts` — Express app setup (routes, no server start)
- `src/index.ts` — Standalone API server entry (imports app.ts, calls listen)
- `ui/` — React renderer (Vite project with own tsconfig)

### UI Layer (`ui/src/`)

- **State**: Zustand store (`stores/app.store.ts`) — single store for all app state
- **Types**: `types.ts` — shared TypeScript interfaces + `window.lao` declaration
- **Components**: `components/` — Sidebar, Dashboard, RunsList, RunDetails, ProcessManager, LogsViewer, DiffViewer, QaReportViewer, CreateRunModal, AddProcessModal

### IPC Communication

Renderer calls `window.lao.<domain>.<method>()` → preload bridges to `ipcRenderer.invoke` → main process handles via `ipcMain.handle` → calls backend service singletons directly. No HTTP overhead in desktop mode.

### Backend Module Pattern

Each feature lives in `src/modules/<name>/` with a consistent structure:
- `<name>.router.ts` — Express route handlers (for API-only mode)
- `<name>.service.ts` — Business logic + Prisma queries (singleton export)
- Specialized files: `*.executor.ts`, `*.state-machine.ts`, `*.orchestrator.ts`

Modules: **project**, **run**, **patch**, **qa**, **process**, **sandbox**, **agent**

### Run Pipeline (Orchestrator)

The core flow in `run.orchestrator.ts`:
1. Transition run → `running`
2. Create sandbox (rsync of project repo, excluding node_modules/.git/objects)
3. Execute AI agent CLI in sandbox (claude-code or codex)
4. Generate patch via `git diff` (fallback: unix `diff`)
5. Transition → `qa`, run unit + e2e tests in sandbox
6. Transition → `waiting_review` or `failed`
7. On approval: apply patch to target repo, cleanup sandbox

### Run State Machine

`run.state-machine.ts` — validates status transitions:
```
queued → running | canceled | failed
running → qa | failed | canceled
qa → waiting_review | failed | canceled
waiting_review → done | failed
done, failed, canceled → (terminal)
```

### Data Layer

SQLite database via Prisma (`prisma/schema.prisma`). Models: `LocalProject`, `LocalRun`, `LocalProcess`, `PatchSet`, `VerificationRun`. All IDs are UUIDs.

### Artifact Storage (gitignored)

```
artifacts/patches/{runId}.patch
artifacts/qa/{runId}/{unit|playwright}/
artifacts/agent/{runId}/{stdout|stderr}.log
artifacts/logs/{processId}.log
sandboxes/{runId}/
```

## Environment

- `DATABASE_URL` — Prisma SQLite path (default: `file:./dev.db`)
- `PORT` — API server port (default: 3000, standalone mode only)
- `VITE_DEV_SERVER_URL` — Set automatically in dev:desktop, tells Electron to load Vite HMR
- `LAO_RUN_ID`, `LAO_PROJECT_NAME` — passed to agent executor at runtime
