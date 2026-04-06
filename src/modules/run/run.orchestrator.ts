import { runService } from './run.service';
import { sandboxService } from '../sandbox/sandbox.service';
import { agentExecutor } from '../agent/agent.executor';
import { patchService } from '../patch/patch.service';
import { qaService } from '../qa/qa.service';

/**
 * Run Orchestrator — coordinates the full run lifecycle:
 *   create run → create sandbox → execute agent → generate patch → run QA → waiting_review
 */
export class RunOrchestrator {
  /**
   * Execute the full run pipeline for a given run ID.
   * Transitions through states: queued → running → qa → waiting_review (or failed).
   */
  async execute(runId: string): Promise<void> {
    try {
      // 1. Transition to running
      await runService.transition(runId, 'running');

      // 2. Create sandbox
      await sandboxService.create(runId);

      // 3. Execute agent in sandbox
      const agentResult = await agentExecutor.execute(runId);

      if (agentResult.exitCode !== 0) {
        console.warn(`Agent exited with code ${agentResult.exitCode} for run ${runId}`);
        // Non-zero exit is not necessarily fatal — agent may have made partial changes
      }

      // 4. Generate patch from sandbox changes
      await patchService.generate(runId);

      // 5. Transition to QA
      await runService.transition(runId, 'qa');

      // 6. Run QA checks
      const qaResults = await qaService.runChecks(runId);
      const allPassed = qaResults.length === 0 || qaResults.every((r) => r.status === 'passed');

      if (allPassed) {
        // 7. Transition to waiting_review
        await runService.transition(runId, 'waiting_review');
      } else {
        await runService.transition(runId, 'failed');
      }
    } catch (err) {
      console.error(`Run ${runId} failed:`, err);
      try {
        await runService.transition(runId, 'failed');
      } catch {
        // Already in a terminal state — ignore
      }
    }
  }

  /**
   * Apply the approved patch for a run and mark done.
   */
  async applyPatch(runId: string, patchId: string): Promise<{ success: boolean; output: string }> {
    // Ensure QA gate passes
    const canApply = await qaService.canApplyPatch(runId);
    if (!canApply) {
      return { success: false, output: 'QA gate not passed. Cannot apply patch.' };
    }

    // Approve and apply
    await patchService.updateStatus(patchId, 'approved');
    const result = await patchService.apply(patchId);

    if (result.success) {
      await runService.transition(runId, 'done');
      // Cleanup sandbox after successful apply
      await sandboxService.remove(runId);
    }

    return result;
  }

  /**
   * Reject the patch for a run and mark as done.
   */
  async rejectPatch(runId: string): Promise<void> {
    await runService.transition(runId, 'done');
    await sandboxService.remove(runId);
  }
}

export const runOrchestrator = new RunOrchestrator();
