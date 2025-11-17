// Unit tests for ElementLastCompletedProvider (REQ-FN-004, CSV EO-005)

import { ElementLastCompletedProvider } from './element-last-completed.provider';
import { xAPIStatement } from '../../data-access';

describe('ElementLastCompletedProvider (REQ-FN-004, CSV EO-005)', () => {
  let provider: ElementLastCompletedProvider;

  beforeEach(() => {
    provider = new ElementLastCompletedProvider();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('element-last-completed');
    });

    it('should have correct dashboard level', () => {
      expect(provider.dashboardLevel).toBe('element');
    });

    it('should have CSV-compliant description', () => {
      expect(provider.description).toBe(
        'Last three learning elements of a topic completed by a student',
      );
    });

    it('should require userId and topicId', () => {
      expect(provider.requiredParams).toEqual(['userId', 'topicId']);
    });

    it('should have array output type', () => {
      expect(provider.outputType).toBe('array');
    });
  });

  describe('compute', () => {
    it('should return last 3 completed elements sorted by timestamp', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { completion: true },
          timestamp: '2025-11-15T10:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-2' },
          result: { completion: true },
          timestamp: '2025-11-14T09:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-3' },
          result: { completion: true },
          timestamp: '2025-11-13T08:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-4' },
          result: { completion: true },
          timestamp: '2025-11-12T07:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-5' },
          result: { completion: true },
          timestamp: '2025-11-11T06:00:00Z',
        },
      ];

      const result = await provider.compute(
        { userId: 'user-1', topicId: 'topic-1' },
        statements,
      );

      expect(result.value).toHaveLength(3);
      expect(result.value).toEqual([
        { elementId: 'element-1', completedAt: '2025-11-15T10:00:00Z' },
        { elementId: 'element-2', completedAt: '2025-11-14T09:00:00Z' },
        { elementId: 'element-3', completedAt: '2025-11-13T08:00:00Z' },
      ]);
      expect(result.metadata!.totalCompletions).toBe(5);
    });

    it('should filter out non-completed statements', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { completion: true },
          timestamp: '2025-11-15T10:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-2' },
          result: { completion: false },
          timestamp: '2025-11-14T09:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-3' },
          result: { score: { raw: 85 } }, // No completion flag
          timestamp: '2025-11-13T08:00:00Z',
        },
      ];

      const result = await provider.compute(
        { userId: 'user-1', topicId: 'topic-1' },
        statements,
      );

      expect(result.value).toHaveLength(1);
      expect((result.value as any[])[0].elementId).toBe('element-1');
      expect(result.metadata!.totalCompletions).toBe(1);
    });

    it('should return fewer than 3 if not enough completions', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { completion: true },
          timestamp: '2025-11-15T10:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-2' },
          result: { completion: true },
          timestamp: '2025-11-14T09:00:00Z',
        },
      ];

      const result = await provider.compute(
        { userId: 'user-1', topicId: 'topic-1' },
        statements,
      );

      expect(result.value).toHaveLength(2);
      expect(result.metadata!.totalCompletions).toBe(2);
    });

    it('should return empty array when no completions', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-1' },
          result: { completion: false },
          timestamp: '2025-11-15T10:00:00Z',
        },
      ];

      const result = await provider.compute(
        { userId: 'user-1', topicId: 'topic-1' },
        statements,
      );

      expect(result.value).toEqual([]);
      expect(result.metadata!.totalCompletions).toBe(0);
    });

    it('should handle empty statements array', async () => {
      const result = await provider.compute(
        { userId: 'user-1', topicId: 'topic-1' },
        [],
      );

      expect(result.value).toEqual([]);
      expect(result.metadata!.totalCompletions).toBe(0);
    });

    it('should sort by most recent first', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-old' },
          result: { completion: true },
          timestamp: '2025-11-10T10:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'element-new' },
          result: { completion: true },
          timestamp: '2025-11-20T10:00:00Z',
        },
      ];

      const result = await provider.compute(
        { userId: 'user-1', topicId: 'topic-1' },
        statements,
      );

      expect((result.value as any[])[0].elementId).toBe('element-new');
      expect((result.value as any[])[1].elementId).toBe('element-old');
    });
  });

  describe('validateParams', () => {
    it('should throw error when userId is missing', () => {
      expect(() => {
        provider.validateParams({ topicId: 'topic-1' });
      }).toThrow('userId is required for element-last-completed metric');
    });

    it('should throw error when topicId is missing', () => {
      expect(() => {
        provider.validateParams({ userId: 'user-1' });
      }).toThrow('topicId is required for element-last-completed metric');
    });

    it('should not throw when both userId and topicId are provided', () => {
      expect(() => {
        provider.validateParams({ userId: 'user-1', topicId: 'topic-1' });
      }).not.toThrow();
    });
  });
});
