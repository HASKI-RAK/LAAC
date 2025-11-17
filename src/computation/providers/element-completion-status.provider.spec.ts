// Unit tests for ElementCompletionStatusProvider (REQ-FN-004, CSV EO-001)

import { ElementCompletionStatusProvider } from './element-completion-status.provider';
import { xAPIStatement } from '../../data-access';

describe('ElementCompletionStatusProvider (REQ-FN-004, CSV EO-001)', () => {
  let provider: ElementCompletionStatusProvider;

  beforeEach(() => {
    provider = new ElementCompletionStatusProvider();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('element-completion-status');
    });

    it('should have correct dashboard level', () => {
      expect(provider.dashboardLevel).toBe('element');
    });

    it('should have CSV-compliant description', () => {
      expect(provider.description).toBe(
        'Current completion status of the best attempt by a student for each learning element',
      );
    });

    it('should require userId and elementId', () => {
      expect(provider.requiredParams).toEqual(['userId', 'elementId']);
    });

    it('should have scalar output type', () => {
      expect(provider.outputType).toBe('scalar');
    });
  });

  describe('compute', () => {
    it('should return completion status from best attempt (highest score)', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { score: { raw: 85 }, completion: false },
          timestamp: '2025-11-15T10:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { score: { raw: 92 }, completion: true },
          timestamp: '2025-11-15T11:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { score: { raw: 78 }, completion: false },
          timestamp: '2025-11-15T12:00:00Z',
        },
      ];

      const result = await provider.compute(
        { userId: 'user-1', elementId: 'element-1' },
        statements,
      );

      expect(result.value).toBe(true); // Best attempt (score 92) is completed
      expect(result.metricId).toBe('element-completion-status');
      expect(result.metadata!.attemptCount).toBe(3);
      expect(result.metadata!.bestScore).toBe(92);
      expect(result.metadata!.bestAttemptDate).toBe('2025-11-15T11:00:00Z');
    });

    it('should return false when best attempt is not completed', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { score: { raw: 85 }, completion: false },
          timestamp: '2025-11-15T10:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { score: { raw: 92 }, completion: false },
          timestamp: '2025-11-15T11:00:00Z',
        },
      ];

      const result = await provider.compute(
        { userId: 'user-1', elementId: 'element-1' },
        statements,
      );

      expect(result.value).toBe(false); // Best attempt not completed
      expect(result.metadata!.bestScore).toBe(92);
    });

    it('should return null when no attempts found', async () => {
      const result = await provider.compute(
        { userId: 'user-1', elementId: 'element-1' },
        [],
      );

      expect(result.value).toBeNull();
      expect(result.metadata!.status).toBe('no_attempts');
      expect(result.metadata!.attemptCount).toBe(0);
    });

    it('should include attempt count in metadata', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { score: { raw: 85 } },
          timestamp: '2025-11-15T10:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { score: { raw: 92 } },
          timestamp: '2025-11-15T11:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { score: { raw: 78 } },
          timestamp: '2025-11-15T12:00:00Z',
        },
      ];

      const result = await provider.compute(
        { userId: 'user-1', elementId: 'element-1' },
        statements,
      );

      expect(result.metadata!.attemptCount).toBe(3);
    });

    it('should handle single attempt', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { score: { raw: 85 }, completion: true },
          timestamp: '2025-11-15T10:00:00Z',
        },
      ];

      const result = await provider.compute(
        { userId: 'user-1', elementId: 'element-1' },
        statements,
      );

      expect(result.value).toBe(true);
      expect(result.metadata!.attemptCount).toBe(1);
      expect(result.metadata!.bestScore).toBe(85);
    });

    it('should handle missing completion flag as false', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { score: { raw: 92 } },
          timestamp: '2025-11-15T11:00:00Z',
        },
      ];

      const result = await provider.compute(
        { userId: 'user-1', elementId: 'element-1' },
        statements,
      );

      expect(result.value).toBe(false); // Missing completion flag defaults to false
    });

    it('should handle attempts with no scores', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { completion: true },
          timestamp: '2025-11-15T10:00:00Z',
        },
      ];

      const result = await provider.compute(
        { userId: 'user-1', elementId: 'element-1' },
        statements,
      );

      expect(result.value).toBe(true);
      expect(result.metadata!.bestScore).toBeNull();
    });
  });

  describe('validateParams', () => {
    it('should throw error when userId is missing', () => {
      expect(() => {
        provider.validateParams({ elementId: 'element-1' });
      }).toThrow('userId is required for element-completion-status metric');
    });

    it('should throw error when elementId is missing', () => {
      expect(() => {
        provider.validateParams({ userId: 'user-1' });
      }).toThrow('elementId is required for element-completion-status metric');
    });

    it('should not throw when both userId and elementId are provided', () => {
      expect(() => {
        provider.validateParams({ userId: 'user-1', elementId: 'element-1' });
      }).not.toThrow();
    });
  });
});
