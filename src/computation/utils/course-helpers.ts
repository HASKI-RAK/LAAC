// Shared utility functions for extracting course IDs from xAPI statements
// Used by course-level CSV v3 metrics (REQ-FN-032)

import { xAPIStatement } from '../../data-access';

/**
 * Extracts all course IDs from an xAPI statement's context activities
 * Searches both parent and grouping context activities for course references
 *
 * @param statement - xAPI statement
 * @returns Array of course IDs (may be empty if no courses found)
 *
 * @remarks
 * - Searches context.contextActivities.parent and context.contextActivities.grouping
 * - Parses course IDs from URLs containing /course/ or /courses/
 * - Returns unique course IDs (no duplicates)
 * - Used by courses-* metrics for course-level aggregation
 *
 * @example
 * ```typescript
 * const statement = {
 *   context: {
 *     contextActivities: {
 *       parent: [{ id: 'http://example.com/course/math-101' }],
 *       grouping: [{ id: 'http://example.com/courses/science-201' }]
 *     }
 *   }
 * };
 * const courseIds = extractCourseIds(statement);
 * console.log(courseIds); // ['math-101', 'science-201']
 * ```
 */
export function extractCourseIds(statement: xAPIStatement): string[] {
  const contextActivities = statement.context?.contextActivities;
  if (!contextActivities) return [];

  const ids = new Set<string>();
  const parents = contextActivities.parent ?? [];
  const groupings = contextActivities.grouping ?? [];

  parents.forEach((parent) => maybeAddCourseId(ids, parent.id));
  groupings.forEach((grouping) => maybeAddCourseId(ids, grouping.id));

  return Array.from(ids);
}

/**
 * Helper to parse and add a course ID to a set if valid
 * Internal function used by extractCourseIds
 *
 * @param target - Set to add course ID to
 * @param id - Activity ID to parse
 */
function maybeAddCourseId(target: Set<string>, id?: string): void {
  if (!id) return;

  const parsed = parseCourseId(id);
  if (parsed) {
    target.add(parsed);
  }
}

/**
 * Parses a course ID from an activity ID URL
 * Handles common URL patterns: /course/ and /courses/
 *
 * @param id - Activity ID (typically a URL)
 * @returns Parsed course ID or null if not a course reference
 *
 * @remarks
 * - Extracts course ID from URLs containing /course/ or /courses/
 * - Returns the portion after /course/ or /courses/
 * - Falls back to returning the full ID if no pattern matches
 * - Returns null for empty/undefined IDs
 *
 * @example
 * ```typescript
 * parseCourseId('http://example.com/course/math-101'); // 'math-101'
 * parseCourseId('http://example.com/courses/science-201'); // 'science-201'
 * parseCourseId('simple-id'); // 'simple-id'
 * parseCourseId(''); // null
 * ```
 */
export function parseCourseId(id: string): string | null {
  if (!id) return null;

  if (id.includes('/course/')) {
    const [, course] = id.split('/course/');
    return course || null;
  }

  if (id.includes('/courses/')) {
    const [, course] = id.split('/courses/');
    return course || null;
  }

  return id;
}
