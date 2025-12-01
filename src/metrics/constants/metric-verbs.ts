// Central verb mapping per metric
// Ensures LRS queries request the verbs that are relevant for each metric

const COMPLETION_VERBS = [
  'http://adlnet.gov/expapi/verbs/completed',
  'https://wiki.haski.app/variables/xapi.completed',
  'https://wiki.haski.app/variables/services.completed',
];

const ANSWER_VERBS = [
  'http://adlnet.gov/expapi/verbs/answered',
  'https://wiki.haski.app/variables/xapi.answered',
  'https://wiki.haski.app/variables/services.answered',
];

const SCORE_VERBS = [
  ...ANSWER_VERBS,
  ...COMPLETION_VERBS,
  'http://adlnet.gov/expapi/verbs/passed',
  'http://adlnet.gov/expapi/verbs/failed',
];

const ENGAGEMENT_VERBS = [
  'http://adlnet.gov/expapi/verbs/experienced',
  'http://activitystrea.ms/schema/1.0/open',
  'https://wiki.haski.app/variables/xapi.viewed',
  'https://wiki.haski.app/variables/xapi.interacted',
  'http://adlnet.gov/expapi/verbs/attempted',
  'https://wiki.haski.app/variables/xapi.clicked',
  'https://wiki.haski.app/variables/services.clicked',
  'https://wiki.haski.app/variables/services.changed',
  'https://wiki.haski.app/variables/services.selected',
  'https://wiki.haski.app/variables/services.pressed',
  'https://wiki.haski.app/variables/services.started',
];

/**
 * Map of metricId → list of verb IRIs that should be requested from the LRS.
 * If a metricId is not present or the list is empty, no verb filter is applied.
 */
export const METRIC_VERB_MAP: Record<string, string[]> = {
  // Scoring / mastery metrics
  'topic-mastery': SCORE_VERBS,
  'topic-total-score': SCORE_VERBS,
  'topic-max-score': SCORE_VERBS,
  'course-total-score': SCORE_VERBS,
  'course-max-score': SCORE_VERBS,
  'element-best-attempt-score': SCORE_VERBS,
  'element-best-attempt-date': SCORE_VERBS,

  // Completion-oriented metrics
  'course-completion': COMPLETION_VERBS,
  'course-completion-dates': COMPLETION_VERBS,
  'topic-completion-dates': COMPLETION_VERBS,
  'element-completion-dates': COMPLETION_VERBS,
  'element-completion-status': COMPLETION_VERBS,
  'element-last-completed': COMPLETION_VERBS,
  'course-last-elements': COMPLETION_VERBS,
  'topic-last-elements': COMPLETION_VERBS,

  // Engagement metrics
  'learning-engagement': ENGAGEMENT_VERBS,
};
