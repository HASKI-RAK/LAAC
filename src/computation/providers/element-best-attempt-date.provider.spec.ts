// Unit tests for ElementBestAttemptDateProvider (REQ-FN-004, CSV EO-002)

import { ElementBestAttemptDateProvider } from './element-best-attempt-date.provider';
import { xAPIStatement } from '../../data-access';

describe('ElementBestAttemptDateProvider (REQ-FN-004, CSV EO-002)', () => {
  let provider: ElementBestAttemptDateProvider;

  beforeEach(() => {
    provider = new ElementBestAttemptDateProvider();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('element-best-attempt-date');
    });

    it('should have correct dashboard level', () => {
      expect(provider.dashboardLevel).toBe('element');
    });

    it('should have CSV-compliant description', () => {
      expect(provider.description).toBe(
        'Date of the best attempt of a student for each learning element',
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
    it('should return timestamp from best attempt (highest score)', async () => {
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

      expect(result.value).toBe('2025-11-15T11:00:00Z'); // Best attempt (score 92)
      expect(result.metricId).toBe('element-best-attempt-date');
      expect(result.metadata!.attemptCount).toBe(3);
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

      expect(result.value).toBe('2025-11-15T10:00:00Z');
      expect(result.metadata!.attemptCount).toBe(1);
      expect(result.metadata!.bestScore).toBe(85);
    });

    it('should handle missing timestamp as null', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { score: { raw: 92 } },
        },
      ];

      const result = await provider.compute(
        { userId: 'user-1', elementId: 'element-1' },
        statements,
      );

      expect(result.value).toBeNull();
    });

    it('should tie-break by most recent when scores equal', async () => {
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
          result: { score: { raw: 85 } },
          timestamp: '2025-11-15T11:00:00Z',
        },
      ];

      const result = await provider.compute(
        { userId: 'user-1', elementId: 'element-1' },
        statements,
      );

      expect(result.value).toBe('2025-11-15T11:00:00Z'); // Most recent with same score
    });
  });

  describe('validateParams', () => {
    it('should throw error when userId is missing', () => {
      expect(() => {
        provider.validateParams({ elementId: 'element-1' });
      }).toThrow('userId is required for element-best-attempt-date metric');
    });

    it('should throw error when elementId is missing', () => {
      expect(() => {
        provider.validateParams({ userId: 'user-1' });
      }).toThrow('elementId is required for element-best-attempt-date metric');
    });

    it('should not throw when both userId and elementId are provided', () => {
      expect(() => {
        provider.validateParams({ userId: 'user-1', elementId: 'element-1' });
      }).not.toThrow();
    });
  });
});
