# Metrics Catalog Migration — CSV v2 to v3

**Scope**: Migrate analytics requirements and providers from the CSV v2 catalog ([docs/resources/LAAC_Learning_Analytics_Requirements.v2.csv](../resources/LAAC_Learning_Analytics_Requirements.v2.csv)) to the new CSV v3 baseline ([docs/resources/LAAC_Learning_Analytics_Requirements.v3.csv](../resources/LAAC_Learning_Analytics_Requirements.v3.csv)).

**Requirements**: REQ-FN-031 is deprecated; REQ-FN-032 is the authoritative requirement for v3 metrics. Follow REQ-FN-016 for versioning/deprecation policy.

---

## What Changed

- **Metric naming restructured**: Names now follow a hierarchical pattern (`courses-*`, `course-topics-*`, `topic-elements-*`, `user-*`) instead of the v2 plural prefix scheme (`courses-*`, `topics-*`, `elements-*`).
- **Input parameter changes**: Topic-level metrics now require `topicId` directly (not `courseId` + selection); course-level metrics require `courseId` for topic breakdowns.
- **Semantic alignment**: Metrics now explicitly distinguish between "scores" (sum of best-attempt scores) and "max-scores" (configured maximum achievable scores).
- **New cross-course metric**: `user-last-elements` returns the 3 most recently completed elements across all courses.
- **Output field naming**: Standardized to `score`, `maxScore`, `timeSpent`, `completedAt` across all metrics.

## Mapping (v2 → v3)

| CSV v2 metric (legacy)     | Description (v2)                                                  | v3 replacement               | Notes                                                                                  |
| -------------------------- | ----------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| courses-total-scores       | Total scores earned by a student in each course                   | courses-scores               | Direct successor; renamed for clarity. Now uses `score` field instead of `totalScore`. |
| courses-max-scores         | Max score of each course the student is enrolled in               | courses-max-scores           | Direct successor; no semantic change.                                                  |
| courses-time-spent         | Total time spent by a student in each course                      | courses-time-spent           | Direct successor; no semantic change.                                                  |
| courses-last-elements      | Last three learning elements completed by a student               | user-last-elements           | Renamed and promoted to user-level; now returns across all courses.                    |
| topics-total-scores        | Total scores earned by a student in each topic                    | course-topics-scores         | Renamed; requires `courseId`; returns per-topic scores within that course.             |
| topics-max-scores          | Max score of each topic within the selected course                | course-topics-max-scores     | Renamed; semantic alignment with v3 schema.                                            |
| topics-time-spent          | Total time spent by a student in each topic                       | course-topics-time-spent     | Renamed; requires `courseId`.                                                          |
| topics-last-elements       | Last three learning elements completed within the selected course | course-last-elements         | Renamed; now explicitly scoped to a course.                                            |
| elements-completion-status | Completion status of the best attempt on each learning element    | topic-elements-best-attempts | Renamed; returns score, completionStatus, and completedAt for each element.            |
| elements-max-scores        | Max score of each learning element within the selected topic      | topic-elements-max-scores    | Renamed; semantic alignment with v3 schema.                                            |
| elements-time-spent        | Total time spent on each learning element                         | topic-elements-time-spent    | Renamed; requires `topicId`.                                                           |
| elements-last-elements     | Last three learning elements completed within the selected topic  | topic-last-elements          | Renamed; now explicitly scoped to a topic.                                             |

## New v3 Metrics Summary

| Order | CSV v3 Name                  | Dashboard Level | Description                                                                     | Inputs                                   | Output                                              |
| ----- | ---------------------------- | --------------- | ------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------- |
| 1     | courses-scores               | course          | Sum of best-attempt scores per element, per course                              | userId; since/until (optional)           | [{courseId, score}]                                 |
| 2     | courses-max-scores           | course          | Sum of configured max scores per element, per course                            | userId                                   | [{courseId, maxScore}]                              |
| 3     | courses-time-spent           | course          | Total time across all attempts of all elements, per course                      | userId; since/until (optional)           | [{courseId, timeSpent}]                             |
| 4     | user-last-elements           | user            | 3 most recently completed elements across all courses                           | userId; since/until (optional)           | [{elementId, completedAt}]                          |
| 5     | course-topics-scores         | topic           | Sum of best-attempt scores per element, per topic within a course               | userId, courseId; since/until (optional) | [{topicId, score}]                                  |
| 6     | course-topics-max-scores     | topic           | Sum of configured max scores per element, per topic within a course             | userId, courseId                         | [{topicId, maxScore}]                               |
| 7     | course-topics-time-spent     | topic           | Total time across all attempts of all elements, per topic within a course       | userId, courseId; since/until (optional) | [{topicId, timeSpent}]                              |
| 8     | course-last-elements         | course          | 3 most recently completed elements within a course                              | userId, courseId; since/until (optional) | [{elementId, completedAt}]                          |
| 9     | topic-elements-best-attempts | element         | Best attempt (score, completionStatus, completedAt) for each element in a topic | userId, topicId                          | [{elementId, score, completionStatus, completedAt}] |
| 10    | topic-elements-max-scores    | element         | Configured max score for each element in a topic                                | userId, topicId                          | [{elementId, score}]                                |
| 11    | topic-elements-time-spent    | element         | Total time across all attempts, per element in a topic                          | userId, topicId; since/until (optional)  | [{elementId, timeSpent}]                            |
| 12    | topic-last-elements          | topic           | 3 most recently completed elements within a topic                               | userId, topicId; since/until (optional)  | [{elementId, completedAt}]                          |

## Client Impact & Action Items

1. **Update metric IDs**: Replace v2 metric slugs with v3 equivalents in API calls (see mapping table above).
2. **Adjust input parameters**: Topic-level metrics now require `topicId` instead of implicit topic selection; course-level metrics require `courseId`.
3. **Update response parsing**: Field names have changed (e.g., `totalScore` → `score`); verify JSON schema alignment.
4. **New user-level metric**: Consider adopting `user-last-elements` for cross-course dashboards.
5. **Plan deprecation**: Keep v2 endpoints/providers available only for a compatibility window defined by REQ-FN-016; new development should target v3 only.
6. **Validate test data** against the v3 definitions in [docs/Metrics-Specification.md](../Metrics-Specification.md).

## Deprecation Timeline

| Phase        | Date             | Action                                                               |
| ------------ | ---------------- | -------------------------------------------------------------------- |
| Announcement | February 4, 2026 | v3 metrics released; v2 providers deprecated and removed immediately |
| Live         | February 4, 2026 | v3 is sole catalog on `/api/v1/metrics` endpoint                     |

## Migration Decisions (Resolved)

The following decisions were made on February 4, 2026:

1. **v2 providers removed immediately**: Legacy v1/v2 providers have been removed from the codebase. No backward compatibility aliases are maintained.
2. **No versioned catalog endpoint specifially for v3**: v3 metrics are served on the existing `/api/v1/metrics` endpoint. No header-based version negotiation is implemented. The URL versioning (`/v1/`) refers to the API version, not the metrics catalog version.
3. **Clean break**: Clients must update to v3 metric IDs and parameters immediately. See the mapping table above for migration guidance.

---

**Migration Guide Author**: GitHub Copilot  
**Last Updated**: February 4, 2026
