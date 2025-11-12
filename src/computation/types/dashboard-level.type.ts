// Implements REQ-FN-010: Dashboard Level Type
// Defines the hierarchy levels at which metrics can be computed

/**
 * Dashboard Level Type
 * Represents the three levels of the dashboard hierarchy where metrics are displayed
 *
 * @remarks
 * - 'course': Top-level metrics aggregated across the entire course
 * - 'topic': Mid-level metrics for specific topics/modules within a course
 * - 'element': Fine-grained metrics for individual learning elements
 *
 * These levels correspond to the HASKI dashboard hierarchy and determine
 * the scope of data aggregation for each metric.
 */
export type DashboardLevel = 'course' | 'topic' | 'element';
