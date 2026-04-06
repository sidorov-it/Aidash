import { Router, Request, Response } from 'express';
import { patchService } from './patch.service';

const router = Router();

// Generate patch for a run
router.post('/generate/:runId', async (req: Request, res: Response) => {
  try {
    const patch = await patchService.generate(req.params.runId);
    res.status(201).json(patch);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get patch by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const patch = await patchService.getById(req.params.id);
    if (!patch) return res.status(404).json({ error: 'Patch not found' });
    res.json(patch);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get patch diff content
router.get('/:id/content', async (req: Request, res: Response) => {
  try {
    const content = await patchService.getContent(req.params.id);
    res.type('text/plain').send(content);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List patches for a run
router.get('/run/:runId', async (req: Request, res: Response) => {
  try {
    const patches = await patchService.listByRun(req.params.runId);
    res.json(patches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dry-run patch apply
router.post('/:id/dry-run', async (req: Request, res: Response) => {
  try {
    const result = await patchService.dryRun(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Apply patch
router.post('/:id/apply', async (req: Request, res: Response) => {
  try {
    const result = await patchService.apply(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update patch status (approve/reject)
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });
    const patch = await patchService.updateStatus(req.params.id, status);
    res.json(patch);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
