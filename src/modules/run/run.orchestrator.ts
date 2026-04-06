import { runService } from './run.service';
import { sandboxService } from '../sandbox/sandbox.service';
import { agentExecutor } from '../agent/agent.executor';
import { patchService } from '../patch/patch.service';
import { qaService } from '../qa/qa.service';
import { createLogger } from '../../lib/logger';

const log = createLogger('orchestrator');

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
    log.info('Pipeline started', runId);
    const startTime = Date.now();

    try {
      // 1. Transition to running
      log.info('Transitioning to "running"', runId);
      await runService.transition(runId, 'running');

      // 2. Create sandbox
      log.info('Creating sandbox...', runId);
      const sandboxStart = Date.now();
      await sandboxService.create(runId);
      log.info(`Sandbox created in ${((Date.now() - sandboxStart) / 1000).toFixed(1)}s`, runId);

      // 3. Execute agent in sandbox
      log.info('Starting agent execution...', runId);
      const agentStart = Date.now();
      const agentResult = await agentExecutor.execute(runId);
      const agentDuration = ((Date.now() - agentStart) / 1000).toFixed(1);

      if (agentResult.exitCode === 127) {
        log.error(`Agent binary not found (exit 127) after ${agentDuration}s. stderr: ${agentResult.stderr}`, runId);
        throw new Error(
          `Agent binary not found (exit 127). Ensure 'claude' CLI is installed and in PATH.\nstderr: ${agentResult.stderr}`
        );
      }

      if (agentResult.exitCode !== 0) {
        log.warn(`Agent exited with code ${agentResult.exitCode} after ${agentDuration}s (may have partial changes)`, runId);
      } else {
        log.info(`Agent completed successfully in ${agentDuration}s`, runId);
      }

      // 4. Generate patch from sandbox changes
      log.info('Generating patch from sandbox diff...', runId);
      const patch = await patchService.generate(runId);
      const fileCount = Array.isArray(patch.changedFiles) ? patch.changedFiles.length : 0;
      log.info(`Patch generated: ${fileCount} file(s) changed`, runId);

      if (fileCount === 0) {
        log.warn('Agent produced no file changes — marking as failed', runId);
        await runService.transition(runId, 'failed');
        return;
      }

      // 5. Transition to QA
      log.info('Transitioning to "qa"', runId);
      await runService.transition(runId, 'qa');

      // 6. Run QA checks
      log.info('Running QA checks...', runId);
      const qaStart = Date.now();
      const qaResults = await qaService.runChecks(runId);
      const qaDuration = ((Date.now() - qaStart) / 1000).toFixed(1);
      const allPassed = qaResults.length === 0 || qaResults.every((r) => r.status === 'passed');

      if (qaResults.length === 0) {
        log.info(`No QA checks configured, skipping (${qaDuration}s)`, runId);
      } else {
        const passed = qaResults.filter((r) => r.status === 'passed').length;
        const failed = qaResults.filter((r) => r.status === 'failed').length;
        log.info(`QA completed in ${qaDuration}s: ${passed} passed, ${failed} failed`, runId);
      }

      if (allPassed) {
        // 7. Transition to waiting_review
        log.info('Transitioning to "waiting_review"', runId);
        await runService.transition(runId, 'waiting_review');
      } else {
        log.warn('QA failed — transitioning to "failed"', runId);
        await runService.transition(runId, 'failed');
      }

      const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
      log.info(`Pipeline finished in ${totalDuration}s — status: ${allPassed ? 'waiting_review' : 'failed'}`, runId);
    } catch (err) {
      const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
      const errMsg = err instanceof Error ? err.message : String(err);
      log.error(`Pipeline failed after ${totalDuration}s: ${errMsg}`, runId);
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
    log.info(`Applying patch ${patchId.slice(0, 8)}...`, runId);

    // Ensure QA gate passes
    const canApply = await qaService.canApplyPatch(runId);
    if (!canApply) {
      log.warn('QA gate not passed — cannot apply patch', runId);
      return { success: false, output: 'QA gate not passed. Cannot apply patch.' };
    }

    // Approve and apply
    await patchService.updateStatus(patchId, 'approved');
    const result = await patchService.apply(patchId);

    if (result.success) {
      await runService.transition(runId, 'done');
      await sandboxService.remove(runId);
      log.info('Patch applied successfully, sandbox cleaned up', runId);
    } else {
      log.error(`Patch apply failed: ${result.output}`, runId);
    }

    return result;
  }

  /**
   * Reject the patch for a run and mark as done.
   */
  async rejectPatch(runId: string): Promise<void> {
    log.info('Patch rejected, cleaning up', runId);
    await runService.transition(runId, 'done');
    await sandboxService.remove(runId);
  }
}

export const runOrchestrator = new RunOrchestrator();
