import { Router, Request, Response } from 'express';
import { projectService } from './project.service';

const router = Router();

// Create project
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, repoPath } = req.body;
    if (!name || !repoPath) {
      return res.status(400).json({ error: 'name and repoPath are required' });
    }
    const project = await projectService.create(req.body);
    res.status(201).json(project);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// List all projects
router.get('/', async (_req: Request, res: Response) => {
  try {
    const projects = await projectService.list();
    res.json(projects);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get project by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const project = await projectService.getById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update project
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const project = await projectService.update(req.params.id, req.body);
    res.json(project);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete project
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await projectService.delete(req.params.id);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
