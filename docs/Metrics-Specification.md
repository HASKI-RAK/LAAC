# Metrics Specification

## Purpose

This document provides formal definitions for all learning analytics metrics specified in the v3 catalog [docs/resources/LAAC_Learning_Analytics_Requirements.v3.csv](docs/resources/LAAC_Learning_Analytics_Requirements.v3.csv). It eliminates ambiguity by defining precise semantics, calculation methods, and data requirements for each metric. Legacy v1 and v2 definitions have been removed; v3 is the sole authoritative catalog.

## References

- [LAAC_Learning_Analytics_Requirements.v3.csv](./resources/LAAC_Learning_Analytics_Requirements.v3.csv)
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

## Global Aggregation Rules (CSV v3)

Per the CSV v3 specification, all metric implementations MUST follow these rules:

- **Score aggregation** MUST consider only the highest-scoring attempt per learning element.
- **Time aggregation** MUST sum the durations of all attempts.
- **All time values** MUST be returned in seconds.
- **All calculations** MUST consider only entities the user is authorized to access.

---

## Metric Definitions (CSV v3)

### Course Metrics (v3)

#### courses-scores

- **CSV Description**: Calculates, per course, the sum of the highest score achieved by the user for each learning element in that course, optionally limited to a specified time range.
- **Inputs**: `userId`; optional `since`, `until`.
- **Definition**: For each course the student appears in, sum the best-attempt scores of all learning elements within that course during the time window (if provided). Best attempt selection follows the global definition.
- **Output**: Array of `{ courseId, score }` sorted by `courseId`.
- **Units**: Normalized score (scaled where available; derive from raw/min/max otherwise).

#### courses-max-scores

- **CSV Description**: Calculates, per course, the maximum possible score, defined as the sum of the defined maximum scores configured for all learning elements belonging to that course.
- **Inputs**: `userId`.
- **Definition**: For each course, sum the configured maximum scores (`result.score.max`) for all learning elements within that course. This represents the theoretical maximum achievable score.
- **Output**: Array of `{ courseId, maxScore }`.
- **Notes**: If no max scores are defined for elements in a course, return `maxScore = 0`.

#### courses-time-spent

- **CSV Description**: Calculates, per course, the total time spent by the user across all attempts of all learning elements in that course, optionally limited to a specified time range.
- **Inputs**: `userId`; optional `since`, `until`.
- **Definition**: Sum `result.duration` values for all statements within each course for the student in the time window. Exclude malformed or negative durations.
- **Output**: Array of `{ courseId, timeSpent }` in seconds.

#### user-last-elements

- **CSV Description**: Returns the three most recently completed learning elements by the user across all courses, ordered by completion time descending and optionally filtered by a specified time range.
- **Inputs**: `userId`; optional `since`, `until`.
- **Definition**: Identify completions (`result.completion = true`) for the student across all courses within the time window. Deduplicate per element by most recent completion, sort by completion timestamp descending, and return the latest three.
- **Output**: Array of `{ elementId, completedAt }`; if fewer than three exist, return available completions.

---

### Course-Topic Metrics (v3)

#### course-topics-scores

- **CSV Description**: Calculates, per topic within a given course, the sum of the highest score achieved by the user for each learning element in that topic, optionally limited to a specified time range.
- **Inputs**: `userId`, `courseId`; optional `since`, `until`.
- **Definition**: Within the selected course, sum the best-attempt scores of learning elements grouped by topic for the student and time window.
- **Output**: Array of `{ topicId, score }`.

#### course-topics-max-scores

- **CSV Description**: Calculates, per topic within a given course, the maximum possible score, defined as the sum of the defined maximum scores configured for all learning elements in that topic.
- **Inputs**: `userId`, `courseId`.
- **Definition**: For each topic in the course, sum the configured maximum scores for all learning elements within that topic.
- **Output**: Array of `{ topicId, maxScore }`; default 0 when no max scores are defined for a topic.

#### course-topics-time-spent

- **CSV Description**: Calculates, per topic within a given course, the total time spent by the user across all attempts of all learning elements in that topic, optionally limited to a specified time range.
- **Inputs**: `userId`, `courseId`; optional `since`, `until`.
- **Definition**: Sum `result.duration` per topic for the student in the time window. Use the same duration parsing and filtering rules as course time spent.
- **Output**: Array of `{ topicId, timeSpent }` in seconds.

#### course-last-elements

- **CSV Description**: Returns the three most recently completed learning elements by the user within a specific course, ordered by completion time descending and optionally filtered by a specified time range.
- **Inputs**: `userId`, `courseId`; optional `since`, `until`.
- **Definition**: Within the course, find completions, deduplicate per element by most recent completion, sort descending by timestamp, and return the latest three.
- **Output**: Array of `{ elementId, completedAt }`; return available items when fewer than three exist.

---

### Topic-Element Metrics (v3)

#### topic-elements-best-attempts

- **CSV Description**: For each learning element within a specified topic, selects the user's highest-scoring attempt and returns its score, completion status, and completion timestamp.
- **Inputs**: `userId`, `topicId`.
- **Definition**: For each element within the topic, select the best attempt for the student and report `score` (scaled where possible), `completionStatus`, and `completedAt` timestamp from the completion statement if present.
- **Output**: Array of `{ elementId, score, completionStatus, completedAt }`, where `completionStatus` is `true | false | null`.

#### topic-elements-max-scores

- **CSV Description**: Returns for each learning element within a specified topic its defined maximum achievable score.
- **Inputs**: `userId`, `topicId`.
- **Definition**: For each element in the topic, return the configured maximum score (`result.score.max`) from available statements.
- **Output**: Array of `{ elementId, score }`; default 0 when no max score is defined.

#### topic-elements-time-spent

- **CSV Description**: Calculates, for each learning element within a specified topic, the total time spent by the user across all attempts, optionally limited to a specified time range.
- **Inputs**: `userId`, `topicId`; optional `since`, `until`.
- **Definition**: Sum `result.duration` for the student's statements per element in the time window, applying the same duration validation rules as above.
- **Output**: Array of `{ elementId, timeSpent }` in seconds.

#### topic-last-elements

- **CSV Description**: Returns the three most recently completed learning elements by the user within a specified topic, ordered by completion time descending and optionally filtered by a specified time range.
- **Inputs**: `userId`, `topicId`; optional `since`, `until`.
- **Definition**: Identify completions for the student per learning element, deduplicate by most recent completion, sort by completion timestamp descending, and return the latest three.
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

- **Version**: 3.1
- **Date**: February 4, 2026
- **Status**: v3 is sole catalog; v1/v2 definitions removed

### Change Log

- v3.1 (2026-02-04): Removed legacy v1/v2 metric definitions; v3 is now the sole authoritative catalog. All 12 v3 providers implemented.
- v3.0 (2026-02-04): Adopted CSV v3 catalog; restructured naming (courses-_, course-topics-_, topic-elements-_, user-_); added global aggregation rules; standardized output fields.
- v2.0 (2026-01-28): Adopted CSV v2 catalog; replaced CO/TO/EO metrics with courses/topics/elements slugs; retained general definitions; legacy v1 remains available for backward compatibility.
- v1.2 (2025-11-18): All 16 CSV v1 metrics implemented and verified.
- v1.1 (2025-11-18): Added formal specifications for topic-level CSV metrics (TO-001 through TO-005).
- v1.0 (2025-10-20): Initial formal specification covering all 16 CSV metrics.
