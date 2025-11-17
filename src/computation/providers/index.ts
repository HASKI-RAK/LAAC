// Implements REQ-FN-003: Metric Provider Exports
// Central export point for all metric providers

import { ExampleMetricProvider } from './example.provider';
import { CourseCompletionProvider } from './course-completion.provider';
import { LearningEngagementProvider } from './learning-engagement.provider';
import { TopicMasteryProvider } from './topic-mastery.provider';

export {
  ExampleMetricProvider,
  CourseCompletionProvider,
  LearningEngagementProvider,
  TopicMasteryProvider,
};

export const METRIC_PROVIDER_CLASSES = [
  ExampleMetricProvider,
  CourseCompletionProvider,
  LearningEngagementProvider,
  TopicMasteryProvider,
] as const;
