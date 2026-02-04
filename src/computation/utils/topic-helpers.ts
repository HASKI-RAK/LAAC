// Shared utility functions for extracting topic IDs from xAPI statements
// Used by topic-level CSV v3 metrics (REQ-FN-032)

import { xAPIStatement, xAPIObject } from '../../data-access';

/**
 * Activity types that indicate a topic in xAPI statements
 * Based on HASKI xAPI structure documentation
 *
 * Topics are primarily from HASKI Frontend statements with:
 * - URL pattern: /course/{courseId}/topic/{topicId}
 * - Activity type: https://wiki.haski.app/functions/pages.Topic
 */
const TOPIC_ACTIVITY_TYPES = [
  'https://wiki.haski.app/functions/pages.Topic',
  'http://adlnet.gov/expapi/activities/topic',
];

/**
 * Extracts all topic IDs from an xAPI statement's context activities
 * Searches parent and grouping context activities for topic references
 *
 * @param statement - xAPI statement
 * @returns Array of topic IDs (may be empty if no topics found)
 *
 * @remarks
 * - Searches context.contextActivities.parent and context.contextActivities.grouping
 * - Identifies topics by activity type (pages.Topic) or URL pattern (/topic/)
 * - Returns the full topic URL as the ID for consistent matching
 * - Returns unique topic IDs (no duplicates)
 *
 * @example
 * ```typescript
 * const statement = {
 *   context: {
 *     contextActivities: {
 *       parent: [{
 *         id: 'https://ke.haski.app/course/2/topic/18',
 *         definition: { type: 'https://wiki.haski.app/functions/pages.Topic' }
 *       }]
 *     }
 *   }
 * };
 * const topicIds = extractTopicIds(statement);
 * console.log(topicIds); // ['https://ke.haski.app/course/2/topic/18']
 * ```
 */
export function extractTopicIds(statement: xAPIStatement): string[] {
  const contextActivities = statement.context?.contextActivities;
  if (!contextActivities) return [];

  const ids = new Set<string>();
  const parents = contextActivities.parent ?? [];
  const groupings = contextActivities.grouping ?? [];

  // Check both parent and grouping activities for topic references
  [...parents, ...groupings].forEach((activity) => {
    if (isTopicActivity(activity)) {
      ids.add(activity.id);
    }
  });

  return Array.from(ids);
}

/**
 * Determines if an activity is a topic based on its type or URL pattern
 *
 * @param activity - xAPI activity object
 * @returns true if the activity represents a topic
 */
function isTopicActivity(activity: xAPIObject): boolean {
  if (!activity?.id) return false;

  // Check by activity type first (most reliable)
  const activityType = activity.definition?.type;
  if (activityType && TOPIC_ACTIVITY_TYPES.includes(activityType)) {
    return true;
  }

  // Check URL patterns for topic references:
  // - HASKI Frontend: /course/{courseId}/topic/{topicId}
  // - Generic: /topic/{topicId} or /topics/{topicId}
  const id = activity.id;

  // Match topic URLs
  if (id.includes('/topic/') || id.includes('/topics/')) {
    return true;
  }

  return false;
}

/**
 * Checks if a topic ID matches a target topic
 * Handles both exact matches and topic ID parameter matching
 *
 * @param topicId - The topic ID from an xAPI statement
 * @param targetTopicId - The topic ID to match against
 * @returns true if the topic IDs match
 *
 * @example
 * ```typescript
 * matchesTopic('https://ke.haski.app/course/2/topic/18', 'https://ke.haski.app/course/2/topic/18'); // true
 * matchesTopic('https://ke.haski.app/course/2/topic/18', '18'); // true
 * matchesTopic('https://ke.haski.app/course/2/topic/18', '19'); // false
 * ```
 */
export function matchesTopic(topicId: string, targetTopicId: string): boolean {
  if (!topicId || !targetTopicId) return false;

  // Exact match
  if (topicId === targetTopicId) return true;

  // If target is a simple ID (not a URL), try to match against URL path
  if (!targetTopicId.includes('://')) {
    const topicIdPart = extractTopicIdFromUrl(topicId);
    if (topicIdPart === targetTopicId) return true;
  }

  // If topicId is a simple ID, try to match against target URL path
  if (!topicId.includes('://')) {
    const targetIdPart = extractTopicIdFromUrl(targetTopicId);
    if (topicId === targetIdPart) return true;
  }

  return false;
}

/**
 * Extracts the topic ID from a HASKI Frontend topic URL
 *
 * @param url - URL potentially containing a topic ID
 * @returns The topic ID or null if not found
 *
 * @example
 * ```typescript
 * extractTopicIdFromUrl('https://ke.haski.app/course/2/topic/18'); // '18'
 * extractTopicIdFromUrl('https://ke.haski.app/course/2/topic/18#element'); // '18'
 * extractTopicIdFromUrl('simple-id'); // null
 * ```
 */
export function extractTopicIdFromUrl(url: string): string | null {
  if (!url) return null;

  // Match /topic/{id} pattern, handling optional hash fragments
  const topicMatch = url.match(/\/topic\/(\d+)/);
  if (topicMatch) {
    return topicMatch[1];
  }

  return null;
}

/**
 * Extracts the course ID from a HASKI Frontend topic URL
 * Topics in Frontend have URLs like /course/{courseId}/topic/{topicId}
 *
 * @param topicUrl - Topic URL
 * @returns The course ID or null if not found
 *
 * @example
 * ```typescript
 * extractCourseIdFromTopicUrl('https://ke.haski.app/course/2/topic/18'); // '2'
 * ```
 */
export function extractCourseIdFromTopicUrl(topicUrl: string): string | null {
  if (!topicUrl) return null;

  // Match /course/{id}/topic/ pattern
  const courseMatch = topicUrl.match(/\/course\/(\d+)\/topic\//);
  if (courseMatch) {
    return courseMatch[1];
  }

  return null;
}
