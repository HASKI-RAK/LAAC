// Implements REQ-FN-003: Metric Provider Exports
// Central export point for all metric providers

import { ExampleMetricProvider } from './example.provider';
import { CourseCompletionProvider } from './course-completion.provider';
import { LearningEngagementProvider } from './learning-engagement.provider';
import { TopicMasteryProvider } from './topic-mastery.provider';
import { CourseTotalScoreProvider } from './course-total-score.provider';
import { CourseMaxScoreProvider } from './course-max-score.provider';
import { CourseTimeSpentProvider } from './course-time-spent.provider';
import { CourseLastElementsProvider } from './course-last-elements.provider';
import { CourseCompletionDatesProvider } from './course-completion-dates.provider';

export {
  ExampleMetricProvider,
  CourseCompletionProvider,
  LearningEngagementProvider,
  TopicMasteryProvider,
  CourseTotalScoreProvider,
  CourseMaxScoreProvider,
  CourseTimeSpentProvider,
  CourseLastElementsProvider,
  CourseCompletionDatesProvider,
};

export const METRIC_PROVIDER_CLASSES = [
  ExampleMetricProvider,
  CourseCompletionProvider,
  LearningEngagementProvider,
  TopicMasteryProvider,
  CourseTotalScoreProvider,
  CourseMaxScoreProvider,
  CourseTimeSpentProvider,
  CourseLastElementsProvider,
  CourseCompletionDatesProvider,
] as const;
