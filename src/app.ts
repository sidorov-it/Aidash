import express from 'express';
import projectRouter from './modules/project/project.router';
import runRouter from './modules/run/run.router';
import processRouter from './modules/process/process.router';
import patchRouter from './modules/patch/patch.router';
import qaRouter from './modules/qa/qa.router';
import { runOrchestrator } from './modules/run/run.orchestrator';

const app = express();

app.use(express.json());

// --- API Routes ---
app.use('/api/projects', projectRouter);
app.use('/api/runs', runRouter);
app.use('/api/processes', processRouter);
app.use('/api/patches', patchRouter);
app.use('/api/qa', qaRouter);

// --- Orchestrator endpoints ---
app.post('/api/orchestrator/execute/:runId', (req, res) => {
  const { runId } = req.params;
  runOrchestrator.execute(runId).catch((err) => {
    console.error(`Orchestrator error for run ${runId}:`, err);
  });
  res.json({ message: `Run ${runId} execution started.` });
});

app.post('/api/orchestrator/apply/:runId/:patchId', async (req, res) => {
  try {
    const result = await runOrchestrator.applyPatch(req.params.runId, req.params.patchId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/orchestrator/reject/:runId', async (req, res) => {
  try {
    await runOrchestrator.rejectPatch(req.params.runId);
    res.json({ message: 'Patch rejected, run marked as done.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Health check ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
