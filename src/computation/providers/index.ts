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
import { TopicTotalScoreProvider } from './topic-total-score.provider';
import { TopicMaxScoreProvider } from './topic-max-score.provider';
import { TopicTimeSpentProvider } from './topic-time-spent.provider';
import { TopicLastElementsProvider } from './topic-last-elements.provider';
import { TopicCompletionDatesProvider } from './topic-completion-dates.provider';
import { ElementCompletionStatusProvider } from './element-completion-status.provider';
import { ElementBestAttemptDateProvider } from './element-best-attempt-date.provider';
import { ElementBestAttemptScoreProvider } from './element-best-attempt-score.provider';
import { ElementTimeSpentProvider } from './element-time-spent.provider';
import { ElementLastCompletedProvider } from './element-last-completed.provider';
import { ElementCompletionDatesProvider } from './element-completion-dates.provider';
import { ElementClicksProvider } from './element-clicks.provider';
import { ElementTypeTimeSpentProvider } from './element-type-time-spent.provider';

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
  TopicTotalScoreProvider,
  TopicMaxScoreProvider,
  TopicTimeSpentProvider,
  TopicLastElementsProvider,
  TopicCompletionDatesProvider,
  ElementCompletionStatusProvider,
  ElementBestAttemptDateProvider,
  ElementBestAttemptScoreProvider,
  ElementTimeSpentProvider,
  ElementLastCompletedProvider,
  ElementCompletionDatesProvider,
  ElementClicksProvider,
  ElementTypeTimeSpentProvider,
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
  TopicTotalScoreProvider,
  TopicMaxScoreProvider,
  TopicTimeSpentProvider,
  TopicLastElementsProvider,
  TopicCompletionDatesProvider,
  ElementCompletionStatusProvider,
  ElementBestAttemptDateProvider,
  ElementBestAttemptScoreProvider,
  ElementTimeSpentProvider,
  ElementLastCompletedProvider,
  ElementCompletionDatesProvider,
  ElementClicksProvider,
  ElementTypeTimeSpentProvider,
] as const;
