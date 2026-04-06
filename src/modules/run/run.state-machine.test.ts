import {
  canTransition,
  assertTransition,
  isTerminal,
  getAllowedTransitions,
  RunStatus,
} from './run.state-machine';

describe('Run State Machine', () => {
  describe('canTransition', () => {
    const validTransitions: [RunStatus, RunStatus][] = [
      ['queued', 'running'],
      ['queued', 'canceled'],
      ['queued', 'failed'],
      ['running', 'qa'],
      ['running', 'failed'],
      ['running', 'canceled'],
      ['qa', 'waiting_review'],
      ['qa', 'failed'],
      ['qa', 'canceled'],
      ['waiting_review', 'done'],
      ['waiting_review', 'failed'],
    ];

    test.each(validTransitions)('%s -> %s should be valid', (from, to) => {
      expect(canTransition(from, to)).toBe(true);
    });

    const invalidTransitions: [RunStatus, RunStatus][] = [
      ['queued', 'qa'],
      ['queued', 'done'],
      ['queued', 'waiting_review'],
      ['running', 'queued'],
      ['running', 'done'],
      ['qa', 'running'],
      ['qa', 'queued'],
      ['waiting_review', 'running'],
      ['waiting_review', 'qa'],
      ['waiting_review', 'canceled'],
      ['done', 'running'],
      ['done', 'failed'],
      ['failed', 'running'],
      ['failed', 'done'],
      ['canceled', 'running'],
      ['canceled', 'queued'],
    ];

    test.each(invalidTransitions)('%s -> %s should be invalid', (from, to) => {
      expect(canTransition(from, to)).toBe(false);
    });
  });

  describe('assertTransition', () => {
    it('should not throw for valid transition', () => {
      expect(() => assertTransition('queued', 'running')).not.toThrow();
    });

    it('should throw for invalid transition', () => {
      expect(() => assertTransition('done', 'running')).toThrow(
        /Invalid run status transition/
      );
    });

    it('error message should list allowed transitions', () => {
      expect(() => assertTransition('queued', 'done')).toThrow(
        /running, canceled, failed/
      );
    });
  });

  describe('isTerminal', () => {
    it('done is terminal', () => expect(isTerminal('done')).toBe(true));
    it('failed is terminal', () => expect(isTerminal('failed')).toBe(true));
    it('canceled is terminal', () => expect(isTerminal('canceled')).toBe(true));
    it('queued is not terminal', () => expect(isTerminal('queued')).toBe(false));
    it('running is not terminal', () => expect(isTerminal('running')).toBe(false));
    it('qa is not terminal', () => expect(isTerminal('qa')).toBe(false));
    it('waiting_review is not terminal', () => expect(isTerminal('waiting_review')).toBe(false));
  });

  describe('getAllowedTransitions', () => {
    it('queued allows running, canceled, failed', () => {
      expect(getAllowedTransitions('queued')).toEqual(['running', 'canceled', 'failed']);
    });

    it('done allows nothing', () => {
      expect(getAllowedTransitions('done')).toEqual([]);
    });

    it('waiting_review allows done, failed', () => {
      expect(getAllowedTransitions('waiting_review')).toEqual(['done', 'failed']);
    });
  });
});
