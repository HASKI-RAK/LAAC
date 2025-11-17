// Unit tests for ElementBestAttemptScoreProvider (REQ-FN-004, CSV EO-003)

import { ElementBestAttemptScoreProvider } from './element-best-attempt-score.provider';
import { xAPIStatement } from '../../data-access';

describe('ElementBestAttemptScoreProvider (REQ-FN-004, CSV EO-003)', () => {
  let provider: ElementBestAttemptScoreProvider;

  beforeEach(() => {
    provider = new ElementBestAttemptScoreProvider();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('element-best-attempt-score');
    });

    it('should have correct dashboard level', () => {
      expect(provider.dashboardLevel).toBe('element');
    });

    it('should have CSV-compliant description', () => {
      expect(provider.description).toBe(
        'Score for the best attempt of a student at each learning element',
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
    it('should return score from best attempt (highest score)', async () => {
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

      expect(result.value).toBe(92); // Best attempt score
      expect(result.metricId).toBe('element-best-attempt-score');
      expect(result.metadata!.attemptCount).toBe(3);
      expect(result.metadata!.bestAttemptDate).toBe('2025-11-15T11:00:00Z');
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

    it('should handle single attempt', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { score: { raw: 85 } },
          timestamp: '2025-11-15T10:00:00Z',
        },
      ];

      const result = await provider.compute(
        { userId: 'user-1', elementId: 'element-1' },
        statements,
      );

      expect(result.value).toBe(85);
      expect(result.metadata!.attemptCount).toBe(1);
    });

    it('should return null when best attempt has no score', async () => {
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

      expect(result.value).toBeNull();
      expect(result.metadata!.attemptCount).toBe(1);
    });

    it('should prioritize raw score over scaled score', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { score: { raw: 92, scaled: 0.92 } },
          timestamp: '2025-11-15T11:00:00Z',
        },
      ];

      const result = await provider.compute(
        { userId: 'user-1', elementId: 'element-1' },
        statements,
      );

      expect(result.value).toBe(92); // Raw score, not scaled
    });

    it('should use scaled score when raw not available', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { score: { scaled: 0.85 } },
          timestamp: '2025-11-15T11:00:00Z',
        },
      ];

      const result = await provider.compute(
        { userId: 'user-1', elementId: 'element-1' },
        statements,
      );

      expect(result.value).toBe(0.85);
    });
  });

  describe('validateParams', () => {
    it('should throw error when userId is missing', () => {
      expect(() => {
        provider.validateParams({ elementId: 'element-1' });
      }).toThrow('userId is required for element-best-attempt-score metric');
    });

    it('should throw error when elementId is missing', () => {
      expect(() => {
        provider.validateParams({ userId: 'user-1' });
      }).toThrow('elementId is required for element-best-attempt-score metric');
    });

    it('should not throw when both userId and elementId are provided', () => {
      expect(() => {
        provider.validateParams({ userId: 'user-1', elementId: 'element-1' });
      }).not.toThrow();
    });
  });
});
