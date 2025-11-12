// REQ-FN-002: Unit tests for LRS Query Builder
// Tests xAPI query parameter construction

import { LRSQueryBuilder } from './lrs-query.builder';
import { xAPIQueryFilters } from '../interfaces/lrs.interface';

describe('REQ-FN-002: LRSQueryBuilder', () => {
  describe('constructor', () => {
    it('should create empty query builder', () => {
      const builder = new LRSQueryBuilder();
      expect(builder.getParams()).toEqual({});
    });

    it('should apply filters in constructor', () => {
      const filters: xAPIQueryFilters = {
        verb: 'http://adlnet.gov/expapi/verbs/completed',
        limit: 100,
      };

      const builder = new LRSQueryBuilder(filters);
      const params = builder.getParams();

      expect(params.verb).toBe('http://adlnet.gov/expapi/verbs/completed');
      expect(params.limit).toBe('100');
    });
  });

  describe('agent', () => {
    it('should JSON-serialize agent', () => {
      const builder = new LRSQueryBuilder().agent({
        objectType: 'Agent',
        account: {
          homePage: 'https://ke.moodle.haski.app',
          name: '123',
        },
      });

      const params = builder.getParams();
      const agent = JSON.parse(params.agent);

      expect(agent.objectType).toBe('Agent');
      expect(agent.account.homePage).toBe('https://ke.moodle.haski.app');
      expect(agent.account.name).toBe('123');
    });

    it('should handle agent with mbox', () => {
      const builder = new LRSQueryBuilder().agent({
        mbox: 'mailto:user@example.com',
      });

      const params = builder.getParams();
      const agent = JSON.parse(params.agent);

      expect(agent.mbox).toBe('mailto:user@example.com');
    });
  });

  describe('verb', () => {
    it('should set verb IRI', () => {
      const builder = new LRSQueryBuilder().verb(
        'http://adlnet.gov/expapi/verbs/completed',
      );

      expect(builder.getParams().verb).toBe(
        'http://adlnet.gov/expapi/verbs/completed',
      );
    });
  });

  describe('activity', () => {
    it('should set activity IRI', () => {
      const builder = new LRSQueryBuilder().activity(
        'https://course.example.com/course/101',
      );

      expect(builder.getParams().activity).toBe(
        'https://course.example.com/course/101',
      );
    });
  });

  describe('registration', () => {
    it('should set registration UUID', () => {
      const builder = new LRSQueryBuilder().registration(
        '12345678-1234-1234-1234-123456789012',
      );

      expect(builder.getParams().registration).toBe(
        '12345678-1234-1234-1234-123456789012',
      );
    });
  });

  describe('relatedActivities', () => {
    it('should set related_activities to true', () => {
      const builder = new LRSQueryBuilder().relatedActivities(true);
      expect(builder.getParams().related_activities).toBe('true');
    });

    it('should set related_activities to false', () => {
      const builder = new LRSQueryBuilder().relatedActivities(false);
      expect(builder.getParams().related_activities).toBe('false');
    });
  });

  describe('relatedAgents', () => {
    it('should set related_agents to true', () => {
      const builder = new LRSQueryBuilder().relatedAgents(true);
      expect(builder.getParams().related_agents).toBe('true');
    });

    it('should set related_agents to false', () => {
      const builder = new LRSQueryBuilder().relatedAgents(false);
      expect(builder.getParams().related_agents).toBe('false');
    });
  });

  describe('since', () => {
    it('should set since timestamp', () => {
      const timestamp = '2025-01-01T00:00:00Z';
      const builder = new LRSQueryBuilder().since(timestamp);
      expect(builder.getParams().since).toBe(timestamp);
    });
  });

  describe('until', () => {
    it('should set until timestamp', () => {
      const timestamp = '2025-12-31T23:59:59Z';
      const builder = new LRSQueryBuilder().until(timestamp);
      expect(builder.getParams().until).toBe(timestamp);
    });
  });

  describe('limit', () => {
    it('should set limit', () => {
      const builder = new LRSQueryBuilder().limit(100);
      expect(builder.getParams().limit).toBe('100');
    });

    it('should accept 0 as limit', () => {
      const builder = new LRSQueryBuilder().limit(0);
      expect(builder.getParams().limit).toBe('0');
    });

    it('should accept 1000 as limit (max)', () => {
      const builder = new LRSQueryBuilder().limit(1000);
      expect(builder.getParams().limit).toBe('1000');
    });

    it('should throw error if limit < 0', () => {
      expect(() => new LRSQueryBuilder().limit(-1)).toThrow(
        'Limit must be between 0 and 1000',
      );
    });

    it('should throw error if limit > 1000', () => {
      expect(() => new LRSQueryBuilder().limit(1001)).toThrow(
        'Limit must be between 0 and 1000',
      );
    });
  });

  describe('format', () => {
    it('should set format to ids', () => {
      const builder = new LRSQueryBuilder().format('ids');
      expect(builder.getParams().format).toBe('ids');
    });

    it('should set format to exact', () => {
      const builder = new LRSQueryBuilder().format('exact');
      expect(builder.getParams().format).toBe('exact');
    });

    it('should set format to canonical', () => {
      const builder = new LRSQueryBuilder().format('canonical');
      expect(builder.getParams().format).toBe('canonical');
    });
  });

  describe('attachments', () => {
    it('should set attachments to true', () => {
      const builder = new LRSQueryBuilder().attachments(true);
      expect(builder.getParams().attachments).toBe('true');
    });

    it('should set attachments to false', () => {
      const builder = new LRSQueryBuilder().attachments(false);
      expect(builder.getParams().attachments).toBe('false');
    });
  });

  describe('ascending', () => {
    it('should set ascending to true', () => {
      const builder = new LRSQueryBuilder().ascending(true);
      expect(builder.getParams().ascending).toBe('true');
    });

    it('should set ascending to false', () => {
      const builder = new LRSQueryBuilder().ascending(false);
      expect(builder.getParams().ascending).toBe('false');
    });
  });

  describe('build', () => {
    it('should return URLSearchParams', () => {
      const builder = new LRSQueryBuilder()
        .verb('http://adlnet.gov/expapi/verbs/completed')
        .limit(100);

      const params = builder.build();

      expect(params).toBeInstanceOf(URLSearchParams);
      expect(params.get('verb')).toBe(
        'http://adlnet.gov/expapi/verbs/completed',
      );
      expect(params.get('limit')).toBe('100');
    });
  });

  describe('buildString', () => {
    it('should return query string', () => {
      const builder = new LRSQueryBuilder()
        .verb('http://adlnet.gov/expapi/verbs/completed')
        .limit(100);

      const queryString = builder.buildString();

      expect(queryString).toContain('verb=');
      expect(queryString).toContain('limit=100');
    });
  });

  describe('clear', () => {
    it('should clear all parameters', () => {
      const builder = new LRSQueryBuilder()
        .verb('http://adlnet.gov/expapi/verbs/completed')
        .limit(100)
        .clear();

      expect(builder.getParams()).toEqual({});
    });
  });

  describe('chaining', () => {
    it('should support method chaining', () => {
      const builder = new LRSQueryBuilder()
        .verb('http://adlnet.gov/expapi/verbs/completed')
        .activity('https://course.example.com/course/101')
        .since('2025-01-01T00:00:00Z')
        .until('2025-12-31T23:59:59Z')
        .limit(100)
        .ascending(false);

      const params = builder.getParams();

      expect(params.verb).toBe('http://adlnet.gov/expapi/verbs/completed');
      expect(params.activity).toBe('https://course.example.com/course/101');
      expect(params.since).toBe('2025-01-01T00:00:00Z');
      expect(params.until).toBe('2025-12-31T23:59:59Z');
      expect(params.limit).toBe('100');
      expect(params.ascending).toBe('false');
    });
  });

  describe('static helpers', () => {
    describe('fromFilters', () => {
      it('should build query from filters object', () => {
        const filters: xAPIQueryFilters = {
          verb: 'http://adlnet.gov/expapi/verbs/completed',
          activity: 'https://course.example.com/course/101',
          since: '2025-01-01T00:00:00Z',
          limit: 100,
        };

        const builder = LRSQueryBuilder.fromFilters(filters);
        const params = builder.getParams();

        expect(params.verb).toBe('http://adlnet.gov/expapi/verbs/completed');
        expect(params.activity).toBe('https://course.example.com/course/101');
        expect(params.since).toBe('2025-01-01T00:00:00Z');
        expect(params.limit).toBe('100');
      });
    });

    describe('forActor', () => {
      it('should create query for actor', () => {
        const builder = LRSQueryBuilder.forActor(
          'https://ke.moodle.haski.app',
          '123',
        );

        const params = builder.getParams();
        const agent = JSON.parse(params.agent);

        expect(agent.objectType).toBe('Agent');
        expect(agent.account.homePage).toBe('https://ke.moodle.haski.app');
        expect(agent.account.name).toBe('123');
      });
    });

    describe('forCourse', () => {
      it('should create query for course', () => {
        const builder = LRSQueryBuilder.forCourse(
          'https://course.example.com/course/101',
        );

        expect(builder.getParams().activity).toBe(
          'https://course.example.com/course/101',
        );
      });
    });

    describe('forDateRange', () => {
      it('should create query for date range with both since and until', () => {
        const builder = LRSQueryBuilder.forDateRange(
          '2025-01-01T00:00:00Z',
          '2025-12-31T23:59:59Z',
        );

        const params = builder.getParams();

        expect(params.since).toBe('2025-01-01T00:00:00Z');
        expect(params.until).toBe('2025-12-31T23:59:59Z');
      });

      it('should create query for date range with only since', () => {
        const builder = LRSQueryBuilder.forDateRange('2025-01-01T00:00:00Z');

        const params = builder.getParams();

        expect(params.since).toBe('2025-01-01T00:00:00Z');
        expect(params.until).toBeUndefined();
      });
    });

    describe('forVerb', () => {
      it('should create query for verb', () => {
        const builder = LRSQueryBuilder.forVerb(
          'http://adlnet.gov/expapi/verbs/completed',
        );

        expect(builder.getParams().verb).toBe(
          'http://adlnet.gov/expapi/verbs/completed',
        );
      });
    });
  });
});
