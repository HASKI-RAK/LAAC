// Implements REQ-FN-002: xAPI Query Builder
// Builds xAPI-compliant query parameters for Statement API

import { xAPIQueryFilters, xAPIAgent } from '../interfaces/lrs.interface';

/**
 * xAPI Query Builder
 * Constructs query parameters for GET /xapi/statements endpoint
 * Follows xAPI 1.0.3 specification
 *
 * @remarks
 * - Handles agent JSON serialization for filtering
 * - Supports all common xAPI query parameters
 * - Validates parameter formats
 * - URL-encodes values properly
 */
export class LRSQueryBuilder {
  private params: Record<string, string> = {};

  /**
   * Create a new query builder with optional initial filters
   */
  constructor(filters?: xAPIQueryFilters) {
    if (filters) {
      this.applyFilters(filters);
    }
  }

  /**
   * Apply all filters from xAPIQueryFilters object
   */
  applyFilters(filters: xAPIQueryFilters): this {
    if (filters.agent) {
      this.agent(filters.agent);
    }
    if (filters.verb) {
      this.verb(filters.verb);
    }
    if (filters.activity) {
      this.activity(filters.activity);
    }
    if (filters.registration) {
      this.registration(filters.registration);
    }
    if (filters.related_activities !== undefined) {
      this.relatedActivities(filters.related_activities);
    }
    if (filters.related_agents !== undefined) {
      this.relatedAgents(filters.related_agents);
    }
    if (filters.since) {
      this.since(filters.since);
    }
    if (filters.until) {
      this.until(filters.until);
    }
    if (filters.limit) {
      this.limit(filters.limit);
    }
    if (filters.format) {
      this.format(filters.format);
    }
    if (filters.attachments !== undefined) {
      this.attachments(filters.attachments);
    }
    if (filters.ascending !== undefined) {
      this.ascending(filters.ascending);
    }
    return this;
  }

  /**
   * Filter by agent (actor)
   * Agent is JSON-serialized per xAPI spec
   */
  agent(agent: xAPIAgent): this {
    this.params['agent'] = JSON.stringify(agent);
    return this;
  }

  /**
   * Filter by verb IRI
   */
  verb(verbId: string): this {
    this.params['verb'] = verbId;
    return this;
  }

  /**
   * Filter by activity IRI
   */
  activity(activityId: string): this {
    this.params['activity'] = activityId;
    return this;
  }

  /**
   * Filter by registration UUID
   */
  registration(registrationId: string): this {
    this.params['registration'] = registrationId;
    return this;
  }

  /**
   * Include statements with related activities
   */
  relatedActivities(related: boolean): this {
    this.params['related_activities'] = String(related);
    return this;
  }

  /**
   * Include statements with related agents
   */
  relatedAgents(related: boolean): this {
    this.params['related_agents'] = String(related);
    return this;
  }

  /**
   * Filter by timestamp (since)
   * ISO 8601 timestamp
   */
  since(timestamp: string): this {
    this.params['since'] = timestamp;
    return this;
  }

  /**
   * Filter by timestamp (until)
   * ISO 8601 timestamp
   */
  until(timestamp: string): this {
    this.params['until'] = timestamp;
    return this;
  }

  /**
   * Limit number of statements per page
   * Max 1000 per xAPI spec (LRS may have lower limit)
   */
  limit(count: number): this {
    if (count < 0 || count > 1000) {
      throw new Error('Limit must be between 0 and 1000');
    }
    this.params['limit'] = String(count);
    return this;
  }

  /**
   * Statement format
   * - ids: Returns only statement IDs
   * - exact: Returns statements exactly as stored
   * - canonical: Returns statements in canonical format
   */
  format(format: 'ids' | 'exact' | 'canonical'): this {
    this.params['format'] = format;
    return this;
  }

  /**
   * Include attachments
   */
  attachments(include: boolean): this {
    this.params['attachments'] = String(include);
    return this;
  }

  /**
   * Sort order
   * - false: Descending (newest first, default)
   * - true: Ascending (oldest first)
   */
  ascending(asc: boolean): this {
    this.params['ascending'] = String(asc);
    return this;
  }

  /**
   * Build query string for URL
   * Returns URLSearchParams object ready for Axios
   */
  build(): URLSearchParams {
    return new URLSearchParams(this.params);
  }

  /**
   * Build query string as string
   * Useful for logging and debugging
   */
  buildString(): string {
    return this.build().toString();
  }

  /**
   * Get raw parameters object
   */
  getParams(): Record<string, string> {
    return { ...this.params };
  }

  /**
   * Clear all parameters
   */
  clear(): this {
    this.params = {};
    return this;
  }

  /**
   * Static helper: Build query from filters
   */
  static fromFilters(filters: xAPIQueryFilters): LRSQueryBuilder {
    return new LRSQueryBuilder(filters);
  }

  /**
   * Static helper: Create query for actor (learner) statements
   * HASKI uses account-based identification
   */
  static forActor(homePage: string, userId: string): LRSQueryBuilder {
    return new LRSQueryBuilder().agent({
      objectType: 'Agent',
      account: {
        homePage,
        name: userId,
      },
    });
  }

  /**
   * Static helper: Create query for course statements
   * Filters by activity (course ID)
   */
  static forCourse(courseId: string): LRSQueryBuilder {
    return new LRSQueryBuilder().activity(courseId);
  }

  /**
   * Static helper: Create query for date range
   */
  static forDateRange(since: string, until?: string): LRSQueryBuilder {
    const builder = new LRSQueryBuilder().since(since);
    if (until) {
      builder.until(until);
    }
    return builder;
  }

  /**
   * Static helper: Create query for verb
   */
  static forVerb(verbId: string): LRSQueryBuilder {
    return new LRSQueryBuilder().verb(verbId);
  }
}
