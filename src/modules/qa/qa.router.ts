import { Router, Request, Response } from 'express';
import { qaService } from './qa.service';

const router = Router();

// Run QA checks for a run
router.post('/run/:runId', async (req: Request, res: Response) => {
  try {
    const results = await qaService.runChecks(req.params.runId);
    res.json(results);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get QA results for a run
router.get('/run/:runId', async (req: Request, res: Response) => {
  try {
    const results = await qaService.getByRun(req.params.runId);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Check if patch can be applied (gate check)
router.get('/gate/:runId', async (req: Request, res: Response) => {
  try {
    const canApply = await qaService.canApplyPatch(req.params.runId);
    res.json({ canApply });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
