// REQ-FN-002: E2E tests for LRS Client
// Tests LRS client and query builder integration

import { LRSQueryBuilder } from '../src/data-access/clients/lrs-query.builder';
import { xAPIStatement } from '../src/data-access/interfaces/lrs.interface';

describe('REQ-FN-002: LRS Client Integration (e2e)', () => {
  describe('Query Builder Integration', () => {
    it('should build query for actor', () => {
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

    it('should build query for course', () => {
      const builder = LRSQueryBuilder.forCourse(
        'https://course.example.com/course/101',
      );

      expect(builder.getParams().activity).toBe(
        'https://course.example.com/course/101',
      );
    });

    it('should build query for date range', () => {
      const builder = LRSQueryBuilder.forDateRange(
        '2025-01-01T00:00:00Z',
        '2025-12-31T23:59:59Z',
      );

      const params = builder.getParams();

      expect(params.since).toBe('2025-01-01T00:00:00Z');
      expect(params.until).toBe('2025-12-31T23:59:59Z');
    });

    it('should build complex query', () => {
      const builder = LRSQueryBuilder.forActor(
        'https://ke.moodle.haski.app',
        '123',
      )
        .verb('http://adlnet.gov/expapi/verbs/completed')
        .since('2025-01-01T00:00:00Z')
        .limit(100);

      const params = builder.getParams();

      expect(params.agent).toBeDefined();
      expect(params.verb).toBe('http://adlnet.gov/expapi/verbs/completed');
      expect(params.since).toBe('2025-01-01T00:00:00Z');
      expect(params.limit).toBe('100');
    });
  });

  describe('xAPI Interface Types', () => {
    it('should export xAPI types for use in application', () => {
      // This test verifies that the xAPI types can be imported and used
      const statement: xAPIStatement = {
        actor: {
          objectType: 'Agent',
          account: {
            homePage: 'https://ke.moodle.haski.app',
            name: '123',
          },
        },
        verb: {
          id: 'http://adlnet.gov/expapi/verbs/completed',
          display: { en: 'completed' },
        },
        object: {
          id: 'https://course.example.com/course/101',
        },
      };

      expect(statement.actor.account?.homePage).toBe(
        'https://ke.moodle.haski.app',
      );
      expect(statement.verb.id).toBe(
        'http://adlnet.gov/expapi/verbs/completed',
      );
    });
  });

  describe('HASKI xAPI Patterns', () => {
    it('should support account-based actor identification', () => {
      const builder = LRSQueryBuilder.forActor(
        'https://ke.moodle.haski.app',
        '463',
      );

      const params = builder.getParams();
      const agent = JSON.parse(params.agent);

      expect(agent.account).toBeDefined();
      expect(agent.account.homePage).toBe('https://ke.moodle.haski.app');
      expect(agent.account.name).toBe('463');
    });

    it('should support HASKI custom verbs', () => {
      const builder = new LRSQueryBuilder().verb(
        'https://wiki.haski.app/variables/xapi.clicked',
      );

      expect(builder.getParams().verb).toBe(
        'https://wiki.haski.app/variables/xapi.clicked',
      );
    });

    it('should support complex filtering', () => {
      const builder = LRSQueryBuilder.forActor(
        'https://ke.moodle.haski.app',
        '463',
      )
        .verb('https://wiki.haski.app/variables/xapi.completed')
        .activity('https://ke.moodle.haski.app/course/101')
        .since('2025-01-01T00:00:00Z')
        .until('2025-12-31T23:59:59Z')
        .limit(1000);

      const params = builder.getParams();

      expect(params.agent).toBeDefined();
      expect(params.verb).toBe(
        'https://wiki.haski.app/variables/xapi.completed',
      );
      expect(params.activity).toBe('https://ke.moodle.haski.app/course/101');
      expect(params.since).toBe('2025-01-01T00:00:00Z');
      expect(params.until).toBe('2025-12-31T23:59:59Z');
      expect(params.limit).toBe('1000');
    });
  });
});
