# Metrics Specification

## Purpose

This document provides formal definitions for all learning analytics metrics specified in the v2 catalog [docs/resources/LAAC_Learning_Analytics_Requirements.v2.csv](docs/resources/LAAC_Learning_Analytics_Requirements.v2.csv). It eliminates ambiguity by defining precise semantics, calculation methods, and data requirements for each metric. Legacy v1 definitions (CSV without the v2 suffix) remain valid for backward compatibility and are documented in prior revisions.

## References

- [LAAC_Learning_Analytics_Requirements.v2.csv](./resources/LAAC_Learning_Analytics_Requirements.v2.csv)
- Legacy: [LAAC_Learning_Analytics_Requirements.csv](./resources/LAAC_Learning_Analytics_Requirements.csv)
- xAPI Specification: https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md
- Yetanalytics LRS API: https://github.com/yetanalytics/lrsql/blob/main/doc/endpoints.md

## General Definitions

### Core Concepts

#### Learning Element

A discrete learning activity or assessment that generates xAPI statements. Examples: quiz, video, assignment, interactive content.

- **xAPI Representation**: `statement.object` with `objectType: "Activity"`
- **Identifier**: `statement.object.id` (IRI)

#### Topic

A logical grouping of learning elements within a course. Represented as a parent activity in xAPI context.

- **xAPI Representation**: `statement.context.contextActivities.parent[]` where type indicates topic-level grouping
- **Identifier**: Activity IRI in parent context

#### Course

The top-level container for learning content. Represented as a parent or grouping activity.

- **xAPI Representation**: `statement.context.contextActivities.parent[]` or `grouping[]` where type indicates course-level
- **Identifier**: Activity IRI in parent/grouping context
- **Instance Identification**: Extracted from `context.platform`, `context.extensions["https://wiki.haski.app/"].domain`, or `context.contextActivities.parent[].definition.name`

#### Student (Actor)

The learner performing activities. Identified by pseudonymous identifiers only.

- **xAPI Representation**: `statement.actor`
- **Identifier**: `actor.account.name` or `actor.mbox_sha1sum` (pseudonymous only, no clear PII)

#### Attempt

A single execution of a learning element by a student, represented by a sequence of xAPI statements sharing the same registration.

- **xAPI Representation**: `statement.context.registration` (UUID) groups statements into an attempt
- **Ordering**: `statement.timestamp` determines chronological order within an attempt

#### Best Attempt

The attempt with the highest score for a given learning element. If multiple attempts have the same highest score, the most recent one is considered best.

- **Selection Criteria**:
  1. Primary: Highest `result.score.scaled` or `result.score.raw`
  2. Tie-breaker: Most recent `timestamp`
  3. If no scores present: Most recent attempt by timestamp

#### Completion Status

Indicates whether a learning element attempt has been completed.

- **xAPI Representation**: `statement.result.completion` (boolean)
- **Semantics**:
  - `true`: Student has completed the learning element
  - `false`: Student started but not completed
  - `undefined`: Ambiguous; treat as incomplete unless a subsequent statement in the same registration indicates completion
- **Determination**: Use the latest statement for a given registration with `result.completion` present

#### Score

Numeric value representing performance on a learning element.

- **xAPI Representation**: `statement.result.score`
- **Types**:
  - **scaled**: Normalized score between -1.0 and 1.0 (preferred)
  - **raw**: Absolute score value
  - **min/max**: Bounds for raw scores
- **Preference**: Use `scaled` if available; otherwise calculate `scaled = (raw - min) / (max - min)` if bounds present
- **Missing Scores**: If no score present, treat as 0 for aggregations or exclude from score-based computations depending on metric

#### Time Spent

Duration of engagement with a learning element.

- **xAPI Representation**: `statement.result.duration` (ISO 8601 duration format, e.g., `PT1H30M`)
- **Aggregation**: Sum durations across all statements for a given scope (element, topic, course) within the time period
- **Filtering**: Exclude negative durations or durations exceeding reasonable bounds (e.g., > 24 hours for a single session; configurable)

#### Time Period

A date/time range for filtering statements.

- **Representation**: `start` and `end` timestamps (ISO 8601)
- **Filtering**: Include statements where `start ≤ statement.timestamp < end` (inclusive start, exclusive end)
- **Default**: If not specified, include all available statements

---

## Metric Definitions (CSV v2)

### Course Metrics (v2)

#### courses-total-scores

- **CSV Description**: Total scores earned by a student in each course.
- **Inputs**: `userId`; optional `since`, `until`.
- **Definition**: For each course the student appears in, sum the best-attempt scores of all learning elements within that course during the time window (if provided). Best attempt selection follows the global definition.
- **Output**: Array of `{ courseId, totalScore }` sorted by `courseId`.
- **Units**: Normalized score (scaled where available; derive from raw/min/max otherwise).

#### courses-max-scores

- **CSV Description**: Max score of each course the student is enrolled in.
- **Inputs**: `userId`.
- **Definition**: For each course, return the highest single best-attempt score observed among its learning elements for the student. If scores are scaled, use the maximum scaled value; otherwise derive from raw/min/max.
- **Output**: Array of `{ courseId, maxScore }`.
- **Notes**: If no scored attempts exist for a course, return `maxScore = 0`.

#### courses-time-spent

- **CSV Description**: Total time spent by a student in each course.
- **Inputs**: `userId`; optional `since`, `until`.
- **Definition**: Sum `result.duration` values for statements within each course for the student in the time window. Exclude malformed or negative durations.
- **Output**: Array of `{ courseId, timeSpent }` in seconds.

#### courses-last-elements

- **CSV Description**: Last three learning elements completed by a student.
- **Inputs**: `userId`; optional `since`, `until`.
- **Definition**: Per course, identify completions (`result.completion = true`) for the student within the time window. Deduplicate per element by most recent completion, sort by completion timestamp descending, and return the latest three.
- **Output**: Array of `{ elementId, completedAt }` per course context; if fewer than three exist, return available completions.

---

### Topic Metrics (v2)

#### topics-total-scores

- **CSV Description**: Total scores earned by a student in each topic.
- **Inputs**: `userId`, `courseId`; optional `since`, `until`.
- **Definition**: Within the selected course, sum the best-attempt scores of learning elements grouped by topic for the student and time window.
- **Output**: Array of `{ topicId, totalScore }`.

#### topics-max-scores

- **CSV Description**: Max score of each topic within the selected course.
- **Inputs**: `userId`, `courseId`.
- **Definition**: For each topic in the course, return the highest best-attempt score across its learning elements for the student.
- **Output**: Array of `{ topicId, maxScore }`; default 0 when no scores exist for a topic.

#### topics-time-spent

- **CSV Description**: Total time spent by a student in each topic.
- **Inputs**: `userId`, `courseId`; optional `since`, `until`.
- **Definition**: Sum `result.duration` per topic for the student in the time window. Use the same duration parsing and filtering rules as course time spent.
- **Output**: Array of `{ topicId, timeSpent }` in seconds.

#### topics-last-elements

- **CSV Description**: Last three learning elements completed by a student within the selected course.
- **Inputs**: `userId`, `courseId`; optional `since`, `until`.
- **Definition**: Within the course, find completions per topic, deduplicate per element by most recent completion, sort descending by timestamp, and return the latest three per topic.
- **Output**: Array of `{ elementId, completedAt }`; return available items when fewer than three exist.

---

### Learning Element Metrics (v2)

#### elements-completion-status

- **CSV Description**: Completion status of the best attempt by a student on each learning element in topic.
- **Inputs**: `userId`, `topicId`.
- **Definition**: For each element within the topic, select the best attempt for the student and report `completionStatus`, the best-attempt `score` (scaled where possible), and `completedAt` timestamp from the completion statement if present.
- **Output**: Array of `{ elementId, score, completionStatus, completedAt }`, where `completionStatus` is `true | false | null`.

#### elements-max-scores

- **CSV Description**: Max score of each learning element within the selected topic.
- **Inputs**: `userId`, `topicId`.
- **Definition**: For each element, return the highest score achieved by the student across all attempts within the topic context.
- **Output**: Array of `{ elementId, maxScore }`; default 0 when no scores exist.

#### elements-time-spent

- **CSV Description**: Total time spent by a student on each learning element.
- **Inputs**: `userId`, `topicId`; optional `since`, `until`.
- **Definition**: Sum `result.duration` for the student's statements per element in the time window, applying the same duration validation rules as above.
- **Output**: Array of `{ elementId, timeSpent }` in seconds.

#### elements-last-elements

- **CSV Description**: Last three learning elements completed by a student within the selected topic.
- **Inputs**: `userId`, `topicId`; optional `since`, `until`.
- **Definition**: Identify completions for the student per element, deduplicate by most recent completion, sort by completion timestamp descending, and return the latest three.
- **Output**: Array of `{ elementId, completedAt }`; return available items when fewer than three exist.

---

## Implementation Notes

### xAPI Statement Filtering

#### By Actor (Student)

```
actor.account.homePage = https://{instance}.moodle.haski.app
actor.account.name = {actorId}
OR actor.mbox_sha1sum = {actorId}
```

#### By Course

```
context.contextActivities.parent[] contains {id: courseId}
OR context.contextActivities.grouping[] contains {id: courseId}
```

#### By Topic

```
context.contextActivities.parent[] contains {id: topicId}
```

#### By Learning Element

```
object.id = {elementId}
```

#### By Time Period

```
timestamp >= {start} AND timestamp < {end}
```

### Attempt Grouping

- Group statements by `context.registration` (UUID)
- If `registration` is missing, fall back to grouping by `object.id` + `actor` + time window heuristic (e.g., statements within N hours)

### Best Attempt Selection Algorithm

```
1. Group statements by registration
2. For each attempt:
  a. Extract max score (latest statement with result.score)
  b. Extract latest timestamp
3. Sort attempts by:
  a. Score descending (highest first)
  b. Timestamp descending (most recent first) as tie-breaker
4. Select first attempt
```

### Duration Parsing

- Parse ISO 8601 duration strings: `PT1H30M45S` → 5445 seconds
- Reject invalid durations: negative, > 24 hours per statement, malformed strings
- Use standard library or xAPI-compliant parsers

### Missing Data Handling

- **No score**: Treat as 0 for aggregations, or exclude based on metric definition
- **No duration**: Exclude from time calculations
- **No completion**: Treat as incomplete
- **No registration**: Attempt to group by heuristics or treat each statement as separate attempt

### Edge Cases

- **Multiple completions**: Use latest completion statement per attempt
- **Negative scores**: Allowed if `scaled` is in [-1.0, 1.0]; validate against xAPI spec
- **Overlapping time periods**: Client responsibility to avoid; system processes as specified
- **Deleted elements**: If element referenced in statements but no longer exists in LRS metadata, still compute metrics from historical statements

---

## Versioning and Evolution

This specification is versioned alongside the API. Changes to metric definitions constitute breaking changes and require a new API version.

- **Version**: 2.0
- **Date**: January 28, 2026
- **Status**: Aligned to CSV v2 catalog

### Change Log

- v2.0 (2026-01-28): Adopted CSV v2 catalog; replaced CO/TO/EO metrics with courses/topics/elements slugs; retained general definitions; legacy v1 remains available for backward compatibility.
- v1.2 (2025-11-18): All 16 CSV v1 metrics implemented and verified.
- v1.1 (2025-11-18): Added formal specifications for topic-level CSV metrics (TO-001 through TO-005).
- v1.0 (2025-10-20): Initial formal specification covering all 16 CSV metrics.
