import { Router, Request, Response } from 'express';
import { runService } from './run.service';

const router = Router();

// Create a new run
router.post('/', async (req: Request, res: Response) => {
  try {
    const run = await runService.create(req.body);
    res.status(201).json(run);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get run by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const run = await runService.getById(req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List runs by project
router.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const runs = await runService.listByProject(req.params.projectId);
    res.json(runs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Transition run status
router.post('/:id/transition', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });
    const run = await runService.transition(req.params.id, status);
    res.json(run);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a run
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await runService.delete(req.params.id);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
