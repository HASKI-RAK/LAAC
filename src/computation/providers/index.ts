// Implements REQ-FN-032: Metric Provider Exports (CSV v4)
// Central export point for all metric providers
// Topic-related providers removed in v4 — topic IDs not present in Moodle xAPI data

// CSV v4 metric providers (REQ-FN-032) — Authoritative catalog
import { CoursesScoresProvider } from './courses-scores.provider';
import { CoursesMaxScoresProvider } from './courses-max-scores.provider';
import { CoursesTimeSpentProvider } from './courses-time-spent.provider';
import { UserLastElementsProvider } from './user-last-elements.provider';
import { CourseLastElementsProvider } from './course-last-elements.provider';
import { CourseElementsBestAttemptsProvider } from './course-elements-best-attempts.provider';
import { CourseElementsMaxScoresProvider } from './course-elements-max-scores.provider';
import { CourseElementsTimeSpentProvider } from './course-elements-time-spent.provider';

export {
  // CSV v4 providers (REQ-FN-032)
  CoursesScoresProvider,
  CoursesMaxScoresProvider,
  CoursesTimeSpentProvider,
  UserLastElementsProvider,
  CourseLastElementsProvider,
  CourseElementsBestAttemptsProvider,
  CourseElementsMaxScoresProvider,
  CourseElementsTimeSpentProvider,
};

/**
 * All metric provider classes for dependency injection
 * Contains only CSV v4 metrics per REQ-FN-032 (authoritative catalog)
 * Available via GET /api/v1/metrics endpoint
 */
export const METRIC_PROVIDER_CLASSES = [
  // Course-level aggregate metrics
  CoursesScoresProvider,
  CoursesMaxScoresProvider,
  CoursesTimeSpentProvider,
  // User-level metrics
  UserLastElementsProvider,
  // Course-scoped element metrics
  CourseLastElementsProvider,
  CourseElementsBestAttemptsProvider,
  CourseElementsMaxScoresProvider,
  CourseElementsTimeSpentProvider,
] as const;
