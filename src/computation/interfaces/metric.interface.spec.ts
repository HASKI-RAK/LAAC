// REQ-FN-010: Metric Computation Interface Tests
// Unit tests verifying interface compliance and type safety

import { IMetricComputation } from './metric.interface';
import { MetricParams } from './metric-params.interface';
import { MetricResult } from './metric-result.interface';
import { DashboardLevel } from '../types/dashboard-level.type';
import { ExampleMetricProvider } from '../providers/example.provider';
import { xAPIStatement } from '../../data-access';

describe('REQ-FN-010: Metric Computation Interface', () => {
  describe('Interface Type Checking', () => {
    it('should compile when all required properties are present', () => {
      // This test verifies TypeScript compilation
      const metric: IMetricComputation = {
        id: 'test-metric',
        dashboardLevel: 'course',
        description: 'Test metric',

        compute: (): Promise<MetricResult> => {
          return Promise.resolve({
            metricId: 'test-metric',
            value: 42,
            computed: new Date().toISOString(),
          });
        },
      };

      expect(metric).toBeDefined();
      expect(metric.id).toBe('test-metric');
      expect(metric.dashboardLevel).toBe('course');
      expect(metric.description).toBe('Test metric');
    });

    it('should compile with optional version property', () => {
      const metric: IMetricComputation = {
        id: 'test-metric',
        dashboardLevel: 'topic',
        description: 'Test metric',
        version: '1.0.0',
        compute: (): Promise<MetricResult> => {
          return Promise.resolve({
            metricId: 'test-metric',
            value: 42,
            computed: new Date().toISOString(),
          });
        },
      };

      expect(metric.version).toBe('1.0.0');
    });

    it('should compile with optional validateParams method', () => {
      const metric: IMetricComputation = {
        id: 'test-metric',
        dashboardLevel: 'element',
        description: 'Test metric',
        compute: (): Promise<MetricResult> => {
          return Promise.resolve({
            metricId: 'test-metric',
            value: 42,
            computed: new Date().toISOString(),
          });
        },
        validateParams: (params: MetricParams): void => {
          if (!params.courseId) {
            throw new Error('courseId required');
          }
        },
      };

      // Test that validateParams exists by calling it inline
      expect(() => {
        const params: MetricParams = { courseId: 'test' };
        metric.validateParams?.(params);
      }).not.toThrow();
    });

    it('should accept all valid dashboard levels', () => {
      const levels: DashboardLevel[] = ['course', 'topic', 'element'];

      levels.forEach((level) => {
        const metric: IMetricComputation = {
          id: `test-${level}`,
          dashboardLevel: level,
          description: `Test ${level} metric`,
          compute: (): Promise<MetricResult> => {
            return Promise.resolve({
              metricId: `test-${level}`,
              value: 0,
              computed: new Date().toISOString(),
            });
          },
        };

        expect(metric.dashboardLevel).toBe(level);
      });
    });
  });

  describe('ExampleMetricProvider Implementation', () => {
    let provider: ExampleMetricProvider;

    beforeEach(() => {
      provider = new ExampleMetricProvider();
    });

    it('should satisfy IMetricComputation interface', () => {
      // Type assertion verifies interface compliance
      const metric: IMetricComputation = provider;
      expect(metric).toBeDefined();
    });

    it('should have required properties', () => {
      expect(provider.id).toBe('example-metric');
      expect(provider.dashboardLevel).toBe('course');
      expect(provider.description).toBe(
        'Example metric that counts xAPI statements',
      );
      expect(provider.version).toBe('1.0.0');
      expect(provider.title).toBe('Example Statement Count');
      expect(provider.requiredParams).toEqual(['courseId']);
      expect(provider.outputType).toBe('scalar');
      expect(provider.example).toBeDefined();
    });

    it('should have compute method', () => {
      const boundCompute = provider.compute.bind(provider);
      expect(boundCompute).toBeDefined();
      expect(typeof boundCompute).toBe('function');
    });

    it('should have validateParams method', () => {
      const boundValidateParams = provider.validateParams?.bind(provider);
      expect(boundValidateParams).toBeDefined();
      expect(typeof boundValidateParams).toBe('function');
    });

    describe('compute method', () => {
      it('should return MetricResult with correct structure', async () => {
        const params: MetricParams = { courseId: 'course-123' };
        const statements: xAPIStatement[] = [
          {
            actor: {
              account: { homePage: 'https://example.com', name: 'user1' },
            },
            verb: { id: 'http://adlnet.gov/expapi/verbs/completed' },
            object: { id: 'http://example.com/activity/1' },
          },
        ];

        const result = await provider.compute(params, statements);

        expect(result).toBeDefined();
        expect(result.metricId).toBe('example-metric');
        expect(result.value).toBe(1);
        expect(result.computed).toBeDefined();
        expect(result.metadata).toBeDefined();
      });

      it('should count all statements when no verb filter', async () => {
        const params: MetricParams = { courseId: 'course-123' };
        const statements: xAPIStatement[] = [
          {
            actor: {
              account: { homePage: 'https://example.com', name: 'user1' },
            },
            verb: { id: 'http://adlnet.gov/expapi/verbs/completed' },
            object: { id: 'http://example.com/activity/1' },
          },
          {
            actor: {
              account: { homePage: 'https://example.com', name: 'user2' },
            },
            verb: { id: 'http://adlnet.gov/expapi/verbs/attempted' },
            object: { id: 'http://example.com/activity/2' },
          },
        ];

        const result = await provider.compute(params, statements);

        expect(result.value).toBe(2);
        expect(result.metadata?.totalStatements).toBe(2);
        expect(result.metadata?.matchingStatements).toBe(2);
      });

      it('should filter statements by verb when provided', async () => {
        const params: MetricParams = {
          courseId: 'course-123',
          filters: { verbId: 'http://adlnet.gov/expapi/verbs/completed' },
        };
        const statements: xAPIStatement[] = [
          {
            actor: {
              account: { homePage: 'https://example.com', name: 'user1' },
            },
            verb: { id: 'http://adlnet.gov/expapi/verbs/completed' },
            object: { id: 'http://example.com/activity/1' },
          },
          {
            actor: {
              account: { homePage: 'https://example.com', name: 'user2' },
            },
            verb: { id: 'http://adlnet.gov/expapi/verbs/attempted' },
            object: { id: 'http://example.com/activity/2' },
          },
        ];

        const result = await provider.compute(params, statements);

        expect(result.value).toBe(1);
        expect(result.metadata?.totalStatements).toBe(2);
        expect(result.metadata?.matchingStatements).toBe(1);
      });

      it('should handle empty statement array', async () => {
        const params: MetricParams = { courseId: 'course-123' };
        const statements: xAPIStatement[] = [];

        const result = await provider.compute(params, statements);

        expect(result.value).toBe(0);
        expect(result.metadata?.totalStatements).toBe(0);
      });

      it('should include timestamp in ISO 8601 format', async () => {
        const params: MetricParams = { courseId: 'course-123' };
        const statements: xAPIStatement[] = [];

        const result = await provider.compute(params, statements);

        // Verify ISO 8601 format
        expect(result.computed).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
        // Verify timestamp is recent (within last 5 seconds)
        const timestamp = new Date(result.computed);
        const now = new Date();
        const diff = now.getTime() - timestamp.getTime();
        expect(diff).toBeLessThan(5000);
      });
    });

    describe('validateParams method', () => {
      it('should pass validation with valid courseId', () => {
        const params: MetricParams = { courseId: 'course-123' };
        const validateFn = provider.validateParams?.bind(provider);

        expect(() => validateFn?.(params)).not.toThrow();
      });

      it('should throw error when courseId is missing', () => {
        const params: MetricParams = {};
        const validateFn = provider.validateParams?.bind(provider);

        expect(() => validateFn?.(params)).toThrow('courseId is required');
      });

      it('should validate time range when both since and until provided', () => {
        const validParams: MetricParams = {
          courseId: 'course-123',
          since: '2024-01-01T00:00:00Z',
          until: '2024-12-31T23:59:59Z',
        };
        const validateFn = provider.validateParams?.bind(provider);

        expect(() => validateFn?.(validParams)).not.toThrow();
      });

      it('should throw error when since is after until', () => {
        const invalidParams: MetricParams = {
          courseId: 'course-123',
          since: '2024-12-31T23:59:59Z',
          until: '2024-01-01T00:00:00Z',
        };
        const validateFn = provider.validateParams?.bind(provider);

        expect(() => validateFn?.(invalidParams)).toThrow(
          'since timestamp must be before until timestamp',
        );
      });
    });
  });

  describe('MetricParams Interface', () => {
    it('should accept all optional fields', () => {
      const params: MetricParams = {
        courseId: 'course-123',
        topicId: 'topic-456',
        elementId: 'element-789',
        userId: 'user-abc',
        groupId: 'group-xyz',
        since: '2024-01-01T00:00:00Z',
        until: '2024-12-31T23:59:59Z',
        filters: { key: 'value' },
      };

      expect(params.courseId).toBe('course-123');
      expect(params.topicId).toBe('topic-456');
      expect(params.elementId).toBe('element-789');
      expect(params.userId).toBe('user-abc');
      expect(params.groupId).toBe('group-xyz');
      expect(params.since).toBe('2024-01-01T00:00:00Z');
      expect(params.until).toBe('2024-12-31T23:59:59Z');
      expect(params.filters).toEqual({ key: 'value' });
    });

    it('should compile with empty object', () => {
      const params: MetricParams = {};
      expect(params).toBeDefined();
    });
  });

  describe('MetricResult Interface', () => {
    it('should accept numeric value', () => {
      const result: MetricResult = {
        metricId: 'test-metric',
        value: 42.5,
        computed: '2024-11-12T17:30:00Z',
      };

      expect(result.value).toBe(42.5);
    });

    it('should accept string value', () => {
      const result: MetricResult = {
        metricId: 'test-metric',
        value: 'high',
        computed: '2024-11-12T17:30:00Z',
      };

      expect(result.value).toBe('high');
    });

    it('should accept boolean value', () => {
      const result: MetricResult = {
        metricId: 'test-metric',
        value: true,
        computed: '2024-11-12T17:30:00Z',
      };

      expect(result.value).toBe(true);
    });

    it('should accept object value', () => {
      const result: MetricResult = {
        metricId: 'test-metric',
        value: { min: 0, max: 100, avg: 75 },
        computed: '2024-11-12T17:30:00Z',
      };

      expect(result.value).toEqual({ min: 0, max: 100, avg: 75 });
    });

    it('should accept array value', () => {
      const result: MetricResult = {
        metricId: 'test-metric',
        value: [1, 2, 3, 4, 5],
        computed: '2024-11-12T17:30:00Z',
      };

      expect(result.value).toEqual([1, 2, 3, 4, 5]);
    });

    it('should accept optional metadata', () => {
      const result: MetricResult = {
        metricId: 'test-metric',
        value: 100,
        computed: '2024-11-12T17:30:00Z',
        metadata: {
          unit: 'percentage',
          confidence: 0.95,
        },
      };

      expect(result.metadata).toEqual({
        unit: 'percentage',
        confidence: 0.95,
      });
    });
  });

  describe('DashboardLevel Type', () => {
    it('should accept course level', () => {
      const level: DashboardLevel = 'course';
      expect(level).toBe('course');
    });

    it('should accept topic level', () => {
      const level: DashboardLevel = 'topic';
      expect(level).toBe('topic');
    });

    it('should accept element level', () => {
      const level: DashboardLevel = 'element';
      expect(level).toBe('element');
    });

    // TypeScript compile-time check: uncomment to verify type safety
    // it('should reject invalid level', () => {
    //   const level: DashboardLevel = 'invalid'; // Should cause compile error
    // });
  });
});
