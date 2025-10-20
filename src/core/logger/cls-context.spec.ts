// REQ-FN-020: Unit tests for CLS context utilities
// Verifies correlation ID storage and retrieval across async boundaries

import {
  getNamespace,
  setCorrelationId,
  getCorrelationId,
  runInContext,
} from './cls-context';

describe('REQ-FN-020: CLS Context', () => {
  describe('namespace management', () => {
    it('should create or retrieve CLS namespace', () => {
      const namespace = getNamespace();
      expect(namespace).toBeDefined();
    });

    it('should return the same namespace on multiple calls', () => {
      const namespace1 = getNamespace();
      const namespace2 = getNamespace();
      expect(namespace1).toBe(namespace2);
    });
  });

  describe('correlation ID storage and retrieval', () => {
    it('should store and retrieve correlation ID within context', () => {
      const testCorrelationId = 'test-correlation-id-123';

      runInContext(() => {
        setCorrelationId(testCorrelationId);
        const retrievedId = getCorrelationId();
        expect(retrievedId).toBe(testCorrelationId);
      });
    });

    it('should return undefined when no correlation ID is set', () => {
      runInContext(() => {
        const retrievedId = getCorrelationId();
        expect(retrievedId).toBeUndefined();
      });
    });

    it('should maintain separate correlation IDs in different contexts', async () => {
      const correlationId1 = 'correlation-id-1';
      const correlationId2 = 'correlation-id-2';

      const promise1 = new Promise<string | undefined>((resolve) => {
        runInContext(() => {
          setCorrelationId(correlationId1);
          // Simulate async operation
          setTimeout(() => {
            resolve(getCorrelationId());
          }, 10);
        });
      });

      const promise2 = new Promise<string | undefined>((resolve) => {
        runInContext(() => {
          setCorrelationId(correlationId2);
          // Simulate async operation
          setTimeout(() => {
            resolve(getCorrelationId());
          }, 5);
        });
      });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe(correlationId1);
      expect(result2).toBe(correlationId2);
    });
  });

  describe('async context propagation', () => {
    it('should propagate correlation ID through async operations', async () => {
      const testCorrelationId = 'async-test-id';

      const result = await runInContext(async () => {
        setCorrelationId(testCorrelationId);

        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Correlation ID should still be available after async operation
        return getCorrelationId();
      });

      expect(result).toBe(testCorrelationId);
    });

    it('should propagate correlation ID through nested async calls', async () => {
      const testCorrelationId = 'nested-async-id';

      const nestedAsyncFunction = async (): Promise<string | undefined> => {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 5));
        return getCorrelationId();
      };

      const result = await runInContext(async () => {
        setCorrelationId(testCorrelationId);
        const nestedResult = await nestedAsyncFunction();
        return nestedResult;
      });

      expect(result).toBe(testCorrelationId);
    });
  });

  describe('context isolation', () => {
    it('should not leak correlation ID outside of context', () => {
      const testCorrelationId = 'isolated-id';

      runInContext(() => {
        setCorrelationId(testCorrelationId);
      });

      // Outside the context, correlation ID should not be accessible
      // Note: This test creates a new context, so it won't have the ID
      runInContext(() => {
        const retrievedId = getCorrelationId();
        expect(retrievedId).toBeUndefined();
      });
    });
  });
});
