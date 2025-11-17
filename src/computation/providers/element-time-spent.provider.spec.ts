// Unit tests for ElementTimeSpentProvider (REQ-FN-004, CSV EO-004)

import { ElementTimeSpentProvider } from './element-time-spent.provider';
import { xAPIStatement } from '../../data-access';

describe('ElementTimeSpentProvider (REQ-FN-004, CSV EO-004)', () => {
  let provider: ElementTimeSpentProvider;

  beforeEach(() => {
    provider = new ElementTimeSpentProvider();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('element-time-spent');
    });

    it('should have correct dashboard level', () => {
      expect(provider.dashboardLevel).toBe('element');
    });

    it('should have CSV-compliant description', () => {
      expect(provider.description).toBe(
        'Total time spent by a student on each learning element in a given time period',
      );
    });

    it('should require userId and elementId', () => {
      expect(provider.requiredParams).toEqual(['userId', 'elementId']);
    });

    it('should have optional since and until params', () => {
      expect(provider.optionalParams).toEqual(['since', 'until']);
    });

    it('should have scalar output type', () => {
      expect(provider.outputType).toBe('scalar');
    });
  });

  describe('compute', () => {
    it('should aggregate durations from all attempts', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { duration: 'PT30M' }, // 1800 seconds
          timestamp: '2025-11-15T10:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { duration: 'PT15M' }, // 900 seconds
          timestamp: '2025-11-15T11:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { duration: 'PT45S' }, // 45 seconds
          timestamp: '2025-11-15T12:00:00Z',
        },
      ];

      const result = await provider.compute(
        { userId: 'user-1', elementId: 'element-1' },
        statements,
      );

      expect(result.value).toBe(2745); // 1800 + 900 + 45
      expect(result.metricId).toBe('element-time-spent');
      expect(result.metadata!.unit).toBe('seconds');
      expect(result.metadata!.attemptCount).toBe(3);
    });

    it('should return 0 when no durations found', async () => {
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

      expect(result.value).toBe(0);
      expect(result.metadata!.attemptCount).toBe(0);
    });

    it('should return 0 for empty statements', async () => {
      const result = await provider.compute(
        { userId: 'user-1', elementId: 'element-1' },
        [],
      );

      expect(result.value).toBe(0);
      expect(result.metadata!.attemptCount).toBe(0);
    });

    it('should skip statements with invalid duration', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { duration: 'PT30M' }, // 1800 seconds (valid)
          timestamp: '2025-11-15T10:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { duration: 'invalid' }, // Invalid format
          timestamp: '2025-11-15T11:00:00Z',
        },
      ];

      const result = await provider.compute(
        { userId: 'user-1', elementId: 'element-1' },
        statements,
      );

      expect(result.value).toBe(1800); // Only valid duration counted
      expect(result.metadata!.attemptCount).toBe(1);
    });

    it('should handle complex duration format', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { duration: 'PT1H30M45S' }, // 5445 seconds
          timestamp: '2025-11-15T10:00:00Z',
        },
      ];

      const result = await provider.compute(
        { userId: 'user-1', elementId: 'element-1' },
        statements,
      );

      expect(result.value).toBe(5445);
    });

    it('should include time range in metadata when provided', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { duration: 'PT30M' },
          timestamp: '2025-11-15T10:00:00Z',
        },
      ];

      const result = await provider.compute(
        {
          userId: 'user-1',
          elementId: 'element-1',
          since: '2025-11-01T00:00:00Z',
          until: '2025-11-30T23:59:59Z',
        },
        statements,
      );

      expect(result.metadata!.timeRange).toEqual({
        since: '2025-11-01T00:00:00Z',
        until: '2025-11-30T23:59:59Z',
      });
    });
  });

  describe('validateParams', () => {
    it('should throw error when userId is missing', () => {
      expect(() => {
        provider.validateParams({ elementId: 'element-1' });
      }).toThrow('userId is required for element-time-spent metric');
    });

    it('should throw error when elementId is missing', () => {
      expect(() => {
        provider.validateParams({ userId: 'user-1' });
      }).toThrow('elementId is required for element-time-spent metric');
    });

    it('should throw error when since is after until', () => {
      expect(() => {
        provider.validateParams({
          userId: 'user-1',
          elementId: 'element-1',
          since: '2025-11-30T00:00:00Z',
          until: '2025-11-01T00:00:00Z',
        });
      }).toThrow('since timestamp must be before until timestamp');
    });

    it('should not throw when all required params are provided', () => {
      expect(() => {
        provider.validateParams({ userId: 'user-1', elementId: 'element-1' });
      }).not.toThrow();
    });

    it('should not throw when valid time range provided', () => {
      expect(() => {
        provider.validateParams({
          userId: 'user-1',
          elementId: 'element-1',
          since: '2025-11-01T00:00:00Z',
          until: '2025-11-30T23:59:59Z',
        });
      }).not.toThrow();
    });
  });
});
