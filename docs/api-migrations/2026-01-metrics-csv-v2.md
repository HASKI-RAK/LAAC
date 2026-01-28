# Metrics Catalog Migration — CSV v1 to v2

**Scope**: Migrate analytics requirements and providers from the legacy CSV v1 catalog ([docs/resources/LAAC_Learning_Analytics_Requirements.csv](../resources/LAAC_Learning_Analytics_Requirements.csv)) to the new CSV v2 baseline ([docs/resources/LAAC_Learning_Analytics_Requirements.v2.csv](../resources/LAAC_Learning_Analytics_Requirements.v2.csv)).

**Requirements**: REQ-FN-004 is deprecated; REQ-FN-031 is the authoritative requirement for v2 metrics. Follow REQ-FN-016 for versioning/deprecation policy.

---

## What Changed

- Catalog is now keyed by slugged metric names (e.g., `courses-total-scores`) instead of CO/TO/EO identifiers.
- Metric set reduced/simplified from 19 (v1) to 12 (v2); several "possible total", "completion date" and click/time-by-type metrics are removed.
- Inputs clarified (`userId` is mandatory; `since`/`until` optional where indicated). Topic-level metrics now always receive `courseId` for scoping.

## Mapping (v1 → v2)

| CSV v1 metric (legacy)              | Description (v1)                                                                         | v2 replacement             | Notes                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------ |
| CO-001 `course-total-score`         | Total score earned by a student on learning elements in each course                      | courses-total-scores       | Direct successor; aggregates best attempts per element.                  |
| CO-002 `course-max-score`           | Possible total score for all learning elements in each course                            | No direct replacement      | If needed, propose a new v2 metric; not in current catalog.              |
| CO-003 `course-time-spent`          | Total time spent by a student in each course in a given time period                      | courses-time-spent         | Direct successor.                                                        |
| CO-004 `course-last-elements`       | Last three learning elements of any course completed by a student                        | courses-last-elements      | Direct successor; completion timestamps included.                        |
| CO-005 `course-completion-dates`    | Completion date of the last three learning elements of any course                        | courses-last-elements      | Dates now delivered inside the same payload; no separate metric.         |
| TO-001 `topic-total-score`          | Total score earned by a student on learning elements in each topic                       | topics-total-scores        | Direct successor; requires `courseId`.                                   |
| TO-002 `topic-max-score`            | Possible total score for all learning elements in each topic                             | No direct replacement      | Consider proposing new v2 metric if needed.                              |
| TO-003 `topic-time-spent`           | Total time spent by a student in each topic in a given time period                       | topics-time-spent          | Direct successor.                                                        |
| TO-004 `topic-last-elements`        | Last three learning elements of any topic in a course completed by a student             | topics-last-elements       | Direct successor.                                                        |
| TO-005 `topic-completion-dates`     | Completion date of the last three learning elements of any course completed by a student | topics-last-elements       | Dates now delivered inside the same payload; no separate metric.         |
| EO-001 `element-completion-status`  | Current completion status of the best attempt for each learning element                  | elements-completion-status | Direct successor; now also returns score and completedAt.                |
| EO-002 `element-best-attempt-date`  | Date of the best attempt of a student for each learning element                          | elements-completion-status | Best-attempt completion timestamp included in `completedAt`.             |
| EO-003 `element-best-attempt-score` | Score for the best attempt of a student at each learning element                         | elements-max-scores        | Closest successor; returns max/best score per element.                   |
| EO-004 `element-time-spent`         | Total time spent by a student on each learning element in a given time period            | elements-time-spent        | Direct successor.                                                        |
| EO-005 `element-last-elements`      | Last three learning elements of a topic completed by a student                           | elements-last-elements     | Direct successor.                                                        |
| EO-006 `element-completion-dates`   | Completion date of the last three learning elements of a topic completed by a student    | elements-last-elements     | Dates now delivered inside the same payload.                             |
| EO-007 `element-clicks`             | Average/total clicks on learning element type                                            | No replacement             | Click-based metrics removed from v2; consider new requirement if needed. |
| EO-008 `element-type-time-spent`    | Total/average time per learning element type                                             | No replacement             | Removed from v2; propose new v2 metric if required.                      |
| ST-001 `element-clicks` (student)   | Total clicks by a student for a learning element type                                    | No replacement             | Removed from v2; propose new v2 metric if required.                      |

## Client Impact & Action Items

1. Update client calls to use v2 metric IDs (slugs) and the v2 CSV input parameters.
2. Adjust response parsing: completion timestamps are embedded in the respective "last-elements" payloads; no separate completion-date metrics.
3. Remove or replace dependencies on click/time-by-type metrics; they are not part of the v2 catalog.
4. Plan deprecation: keep v1 endpoints/providers available only for a compatibility window defined by REQ-FN-016; new development should target v2 only.
5. Validate test data against the v2 definitions in [docs/Metrics-Specification.md](../Metrics-Specification.md).

## Open Decisions

- Do we need a new v2 metric for "possible total score" (course/topic) or is the max-score semantics sufficient?
- Should click-based metrics return in a future v2.x revision? If yes, author new requirement IDs instead of repurposing v1 semantics.
