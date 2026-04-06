import { Router, Request, Response } from 'express';
import { processService } from './process.service';

const router = Router();

// Start a new process
router.post('/', async (req: Request, res: Response) => {
  try {
    const { projectId, name, command } = req.body;
    if (!projectId || !command) {
      return res.status(400).json({ error: 'projectId and command are required' });
    }
    const proc = await processService.start(projectId, name ?? command, command);
    res.status(201).json(proc);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// List processes by project
router.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const procs = await processService.listByProject(req.params.projectId);
    res.json(procs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get process by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const proc = await processService.getById(req.params.id);
    if (!proc) return res.status(404).json({ error: 'Process not found' });
    res.json(proc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get process logs
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const tail = req.query.tail ? parseInt(req.query.tail as string, 10) : undefined;
    const logs = await processService.getLogs(req.params.id, tail);
    res.type('text/plain').send(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Stop a process
router.post('/:id/stop', async (req: Request, res: Response) => {
  try {
    const proc = await processService.stop(req.params.id);
    res.json(proc);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Restart a process
router.post('/:id/restart', async (req: Request, res: Response) => {
  try {
    const proc = await processService.restart(req.params.id);
    res.json(proc);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a process
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await processService.delete(req.params.id);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
