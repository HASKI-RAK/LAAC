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
import { CoursesTotalScoresProvider } from './courses-total-scores.provider';

// CSV v3 metric providers (REQ-FN-032)
import { CoursesScoresProvider } from './courses-scores.provider';
import { CoursesMaxScoresProvider } from './courses-max-scores.provider';
import { CoursesTimeSpentProvider } from './courses-time-spent.provider';
import { UserLastElementsProvider } from './user-last-elements.provider';
import { CourseTopicsScoresProvider } from './course-topics-scores.provider';
import { CourseTopicsMaxScoresProvider } from './course-topics-max-scores.provider';
import { CourseTopicsTimeSpentProvider } from './course-topics-time-spent.provider';
import { TopicElementsBestAttemptsProvider } from './topic-elements-best-attempts.provider';
import { TopicElementsMaxScoresProvider } from './topic-elements-max-scores.provider';
import { TopicElementsTimeSpentProvider } from './topic-elements-time-spent.provider';

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
  CoursesTotalScoresProvider,
  // CSV v3 providers (REQ-FN-032)
  CoursesScoresProvider,
  CoursesMaxScoresProvider,
  CoursesTimeSpentProvider,
  UserLastElementsProvider,
  CourseTopicsScoresProvider,
  CourseTopicsMaxScoresProvider,
  CourseTopicsTimeSpentProvider,
  TopicElementsBestAttemptsProvider,
  TopicElementsMaxScoresProvider,
  TopicElementsTimeSpentProvider,
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
  CoursesTotalScoresProvider,
  // CSV v3 providers (REQ-FN-032)
  CoursesScoresProvider,
  CoursesMaxScoresProvider,
  CoursesTimeSpentProvider,
  UserLastElementsProvider,
  CourseTopicsScoresProvider,
  CourseTopicsMaxScoresProvider,
  CourseTopicsTimeSpentProvider,
  TopicElementsBestAttemptsProvider,
  TopicElementsMaxScoresProvider,
  TopicElementsTimeSpentProvider,
] as const;
