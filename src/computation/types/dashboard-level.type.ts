// Implements REQ-FN-010: Dashboard Level Type
// Defines the hierarchy levels at which metrics can be computed

/**
 * Dashboard Level Type
 * Represents the levels of the dashboard hierarchy where metrics are displayed
 *
 * @remarks
 * - 'course': Top-level metrics aggregated across the entire course
 * - 'element': Fine-grained metrics for individual learning elements within a course
 *
 * Topic-level removed in v4 — topic IDs are not present in Moodle xAPI statements.
 */
export type DashboardLevel = 'course' | 'element';
