// Implements REQ-FN-032: Metric Provider Exports (CSV v3)
// Central export point for all metric providers
// Legacy v1/v2 providers removed per migration decision (2026-02-04)

// CSV v3 metric providers (REQ-FN-032) — Authoritative catalog
import { CoursesScoresProvider } from './courses-scores.provider';
import { CoursesMaxScoresProvider } from './courses-max-scores.provider';
import { CoursesTimeSpentProvider } from './courses-time-spent.provider';
import { UserLastElementsProvider } from './user-last-elements.provider';
import { CourseTopicsScoresProvider } from './course-topics-scores.provider';
import { CourseTopicsMaxScoresProvider } from './course-topics-max-scores.provider';
import { CourseTopicsTimeSpentProvider } from './course-topics-time-spent.provider';
import { CourseLastElementsProvider } from './course-last-elements.provider';
import { TopicElementsBestAttemptsProvider } from './topic-elements-best-attempts.provider';
import { TopicElementsMaxScoresProvider } from './topic-elements-max-scores.provider';
import { TopicElementsTimeSpentProvider } from './topic-elements-time-spent.provider';
import { TopicLastElementsProvider } from './topic-last-elements.provider';

export {
  // CSV v3 providers (REQ-FN-032)
  CoursesScoresProvider,
  CoursesMaxScoresProvider,
  CoursesTimeSpentProvider,
  UserLastElementsProvider,
  CourseTopicsScoresProvider,
  CourseTopicsMaxScoresProvider,
  CourseTopicsTimeSpentProvider,
  CourseLastElementsProvider,
  TopicElementsBestAttemptsProvider,
  TopicElementsMaxScoresProvider,
  TopicElementsTimeSpentProvider,
  TopicLastElementsProvider,
};

/**
 * All metric provider classes for dependency injection
 * Contains only CSV v3 metrics per REQ-FN-032 (authoritative catalog)
 * Available via GET /api/v1/metrics endpoint
 */
export const METRIC_PROVIDER_CLASSES = [
  // Course-level metrics (v3)
  CoursesScoresProvider,
  CoursesMaxScoresProvider,
  CoursesTimeSpentProvider,
  // User-level metrics (v3)
  UserLastElementsProvider,
  // Course-topic metrics (v3)
  CourseTopicsScoresProvider,
  CourseTopicsMaxScoresProvider,
  CourseTopicsTimeSpentProvider,
  CourseLastElementsProvider,
  // Topic-element metrics (v3)
  TopicElementsBestAttemptsProvider,
  TopicElementsMaxScoresProvider,
  TopicElementsTimeSpentProvider,
  TopicLastElementsProvider,
] as const;
