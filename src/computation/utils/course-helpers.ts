// Shared utility functions for extracting course IDs from xAPI statements
// Used by course-level CSV v3 metrics (REQ-FN-032)

import { xAPIStatement, xAPIObject } from '../../data-access';

/**
 * Activity types that indicate a course in xAPI statements
 * Based on HASKI xAPI structure documentation
 */
const COURSE_ACTIVITY_TYPES = [
  'http://id.tincanapi.com/activitytype/lms/course',
  'http://id.tincanapi.com/activitytype/course',
  'http://adlnet.gov/expapi/activities/course',
];

/**
 * Extracts all course IDs from an xAPI statement's context activities
 * Searches both parent and grouping context activities for course references
 *
 * @param statement - xAPI statement
 * @returns Array of course IDs (may be empty if no courses found)
 *
 * @remarks
 * - Searches context.contextActivities.parent and context.contextActivities.grouping
 * - Identifies courses by activity type (lms/course) or URL pattern (/course/view.php)
 * - Returns the full course URL as the ID for consistent matching
 * - Returns unique course IDs (no duplicates)
 * - Used by courses-* metrics for course-level aggregation
 *
 * @example
 * ```typescript
 * const statement = {
 *   context: {
 *     contextActivities: {
 *       parent: [{
 *         id: 'https://moodle.example.com/course/view.php?id=10',
 *         definition: { type: 'http://id.tincanapi.com/activitytype/lms/course' }
 *       }]
 *     }
 *   }
 * };
 * const courseIds = extractCourseIds(statement);
 * console.log(courseIds); // ['https://moodle.example.com/course/view.php?id=10']
 * ```
 */
export function extractCourseIds(statement: xAPIStatement): string[] {
  const contextActivities = statement.context?.contextActivities;
  if (!contextActivities) return [];

  const ids = new Set<string>();
  const parents = contextActivities.parent ?? [];
  const groupings = contextActivities.grouping ?? [];

  // Check both parent and grouping activities for course references
  [...parents, ...groupings].forEach((activity) => {
    if (isCourseActivity(activity)) {
      ids.add(activity.id);
    }
  });

  return Array.from(ids);
}

/**
 * Determines if an activity is a course based on its type or URL pattern
 *
 * @param activity - xAPI activity object
 * @returns true if the activity represents a course
 */
function isCourseActivity(activity: xAPIObject): boolean {
  if (!activity?.id) return false;

  // Check by activity type first (most reliable)
  const activityType = activity.definition?.type;
  if (activityType && COURSE_ACTIVITY_TYPES.includes(activityType)) {
    return true;
  }

  // Check URL patterns for course references:
  // - Moodle: /course/view.php?id=X
  // - Generic: /course/{courseId} or /courses/{courseId}
  // Exclude URLs that contain other resource types like /mod/ or /topic/
  const id = activity.id;

  // Skip activity IDs that are clearly not courses (modules, topics, etc.)
  if (
    id.includes('/mod/') ||
    id.includes('/topic/') ||
    id.includes('/topics/') ||
    id.includes('/element/') ||
    id.includes('/activity/')
  ) {
    return false;
  }

  // Match Moodle course URLs: /course/view.php?id=X
  if (id.includes('/course/view.php')) {
    return true;
  }

  // Match generic course URLs: /course/{id} or /courses/{id}
  // But only if not followed by another path segment like /topic/
  if (id.match(/\/courses?\/[^/]+$/)) {
    return true;
  }

  return false;
}

/**
 * Checks if a course ID matches a target course
 * Handles both exact matches and Moodle URL parameter matching
 *
 * @param courseId - The course ID from an xAPI statement
 * @param targetCourseId - The course ID to match against
 * @returns true if the course IDs match
 *
 * @remarks
 * - Supports exact URL matching
 * - Supports matching by course ID parameter (e.g., "10" matches ".../course/view.php?id=10")
 * - Case-sensitive comparison
 *
 * @example
 * ```typescript
 * matchesCourse('https://moodle.example.com/course/view.php?id=10', 'https://moodle.example.com/course/view.php?id=10'); // true
 * matchesCourse('https://moodle.example.com/course/view.php?id=10', '10'); // true
 * matchesCourse('https://moodle.example.com/course/view.php?id=10', '11'); // false
 * ```
 */
export function matchesCourse(
  courseId: string,
  targetCourseId: string,
): boolean {
  if (!courseId || !targetCourseId) return false;

  // Exact match
  if (courseId === targetCourseId) return true;

  // Extract the course identifier from both URLs for comparison
  const extractedCourseId = extractCourseIdFromUrl(courseId);
  const extractedTargetId = extractCourseIdFromUrl(targetCourseId);

  // If target is a simple ID (not a URL), try to match against extracted course ID
  if (!targetCourseId.includes('://')) {
    if (extractedCourseId === targetCourseId) return true;
  }

  // If courseId is a simple ID, try to match against extracted target ID
  if (!courseId.includes('://')) {
    if (courseId === extractedTargetId) return true;
  }

  // Compare extracted IDs if both are URLs
  if (extractedCourseId && extractedTargetId) {
    return extractedCourseId === extractedTargetId;
  }

  return false;
}

/**
 * Extracts the course ID from a course URL
 * Handles both Moodle URLs (query parameters) and path-based URLs
 *
 * @param url - URL potentially containing a course ID
 * @returns The course ID or null if not found
 *
 * @example
 * ```typescript
 * extractCourseIdFromUrl('https://moodle.example.com/course/view.php?id=10'); // '10'
 * extractCourseIdFromUrl('https://lms.example.com/course/course-1'); // 'course-1'
 * extractCourseIdFromUrl('simple-id'); // null
 * ```
 */
export function extractCourseIdFromUrl(url: string): string | null {
  if (!url) return null;

  // Try to extract id parameter from Moodle-style URL
  const idMatch = url.match(/[?&]id=(\d+)/);
  if (idMatch) {
    return idMatch[1];
  }

  // Try to extract course ID from path-based URL: /course/{courseId} or /courses/{courseId}
  const pathMatch = url.match(/\/courses?\/([^/?#]+)/);
  if (pathMatch) {
    return pathMatch[1];
  }

  return null;
}

/**
 * Extracts the course ID parameter from a Moodle course URL
 * @deprecated Use extractCourseIdFromUrl instead
 */
export function extractCourseIdParam(url: string): string | null {
  return extractCourseIdFromUrl(url);
}

/**
 * @deprecated Use extractCourseIds instead - this function does not correctly
 * handle Moodle xAPI statement structure
 */
export function parseCourseId(id: string): string | null {
  if (!id) return null;

  // For backwards compatibility, return the ID as-is
  // New code should use extractCourseIds which checks activity types
  return id;
}
