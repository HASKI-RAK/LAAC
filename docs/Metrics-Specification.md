# Metrics Specification

## Purpose
This document provides formal definitions for all learning analytics metrics specified in `LAAC_Learning_Analytics_Requirements.csv`. It eliminates ambiguity by defining precise semantics, calculation methods, and data requirements for each metric.

## References
- [LAAC_Learning_Analytics_Requirements.csv](./resources/LAAC_Learning_Analytics_Requirements.csv)
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

## Metric Definitions

### Course Overview Metrics

#### CO-001: Total Score Earned by Student in Course
- **CSV Description**: "Total score earned by a student on learning elements in each course"
- **Definition**: Sum of scores from the best attempt of each learning element within the course for the given student.
- **Calculation**:
  1. Identify all learning elements in the course (from xAPI context hierarchy)
  2. For each element, select the best attempt by the student
  3. Extract `result.score.scaled` (or compute from raw/min/max)
  4. Sum scores across all elements
- **Units**: Normalized score (sum of scaled scores)
- **Filters**: `actorId`, `courseId`
- **Missing Data**: Learning elements without scores contribute 0
- **xAPI Query**: Filter by `actor`, `context.contextActivities.parent` or `grouping` matching course, aggregate by `object.id`

#### CO-002: Possible Total Score for Course
- **CSV Description**: "Possible total score for all learning elements in each course"
- **Definition**: Sum of maximum possible scores for all learning elements in the course.
- **Calculation**:
  1. Identify all unique learning elements in the course from historical statements
  2. For each element, determine max possible score:
     - If `result.score.scaled` is used: max = 1.0 per element
     - If `result.score.max` is present: use that value
  3. Sum maximum scores
- **Units**: Normalized score (sum of 1.0 per element if scaled) or sum of max raw scores
- **Filters**: `courseId`
- **Note**: This is course metadata; may be derived from activity definitions or configuration

#### CO-003: Total Time Spent by Student in Course
- **CSV Description**: "Total time spent by a student in each course in a given time period"
- **Definition**: Sum of all `result.duration` values from statements within the course, filtered by student and time period.
- **Calculation**:
  1. Filter statements: `actor = student`, `course context`, `start ≤ timestamp < end`
  2. Extract `result.duration` from each statement
  3. Parse ISO 8601 durations and convert to seconds
  4. Sum durations
- **Units**: Seconds (or format as HH:MM:SS)
- **Filters**: `actorId`, `courseId`, `start`, `end`
- **Missing Data**: Statements without duration are excluded

#### CO-004: Last Three Learning Elements Completed in Course
- **CSV Description**: "Last three learning elements of any course completed by a student"
- **Definition**: The three most recently completed learning elements within the course, ordered by completion timestamp descending.
- **Calculation**:
  1. Filter statements: `actor = student`, `course context`, `result.completion = true`
  2. For each unique learning element (`object.id`), find the latest completion timestamp
  3. Sort elements by timestamp descending
  4. Take top 3
- **Output**: Array of learning element identifiers (IRIs) or objects with `id`, `name`, `timestamp`
- **Filters**: `actorId`, `courseId`
- **Missing Data**: If fewer than 3 elements completed, return available elements

#### CO-005: Completion Dates of Last Three Elements in Course
- **CSV Description**: "Completion date of the last three learning elements of any course completed by a student"
- **Definition**: Timestamps corresponding to the three most recently completed elements (see CO-004).
- **Calculation**: Extract `timestamp` from the completion statements identified in CO-004
- **Output**: Array of ISO 8601 timestamps
- **Filters**: `actorId`, `courseId`

---

### Topic Overview Metrics

#### TO-001: Total Score Earned by Student in Topic
- **CSV Description**: "Total score earned by a student on learning elements in each topic"
- **Definition**: Sum of scores from the best attempt of each learning element within the topic for the given student.
- **Calculation**: Same as CO-001 but scoped to topic context instead of course
- **Units**: Normalized score
- **Filters**: `actorId`, `topicId`

#### TO-002: Possible Total Score for Topic
- **CSV Description**: "Possible total score for all learning elements in each topic"
- **Definition**: Sum of maximum possible scores for all learning elements in the topic.
- **Calculation**: Same as CO-002 but scoped to topic
- **Units**: Normalized score
- **Filters**: `topicId`

#### TO-003: Total Time Spent by Student in Topic
- **CSV Description**: "Total time spent by a student in each topic in a given time period"
- **Definition**: Sum of durations from statements within the topic, filtered by student and time period.
- **Calculation**: Same as CO-003 but scoped to topic context
- **Units**: Seconds
- **Filters**: `actorId`, `topicId`, `start`, `end`

#### TO-004: Last Three Learning Elements Completed in Topic
- **CSV Description**: "Last three learning elements of any topic in a course completed by a student"
- **Definition**: The three most recently completed elements within the topic.
- **Calculation**: Same as CO-004 but scoped to topic context
- **Output**: Array of learning element identifiers
- **Filters**: `actorId`, `topicId`

#### TO-005: Completion Dates of Last Three Elements in Topic
- **CSV Description**: "Completion date of the last three learning elements of any course completed by a student"
- **Note**: CSV description references "course" but context indicates this is for topics
- **Definition**: Timestamps of the three most recently completed elements in the topic.
- **Calculation**: Same as CO-005 but scoped to topic
- **Output**: Array of timestamps
- **Filters**: `actorId`, `topicId`

---

### Learning Element Overview Metrics

#### LE-001: Current Completion Status of Best Attempt
- **CSV Description**: "Current completion status of the best attempt by a student for each learning element"
- **Definition**: The completion status (`result.completion`) from the best attempt at the learning element.
- **Calculation**:
  1. Identify best attempt (see Best Attempt definition)
  2. Find the latest statement in that attempt with `result.completion` present
  3. Return the boolean value
- **Output**: `true`, `false`, or `null` (if no completion data)
- **Filters**: `actorId`, `elementId`

#### LE-002: Date of Best Attempt for Learning Element
- **CSV Description**: "Date of the best attempt of a student for each learning element"
- **Definition**: The timestamp of the first statement in the best attempt registration.
- **Calculation**:
  1. Identify best attempt
  2. Return the earliest `timestamp` from statements in that registration
- **Output**: ISO 8601 timestamp
- **Filters**: `actorId`, `elementId`

#### LE-003: Score for Best Attempt at Learning Element
- **CSV Description**: "Score for the best attempt of a student at each learning element"
- **Definition**: The score from the best attempt.
- **Calculation**:
  1. Identify best attempt
  2. Extract `result.score.scaled` (or compute from raw/min/max)
- **Output**: Numeric score (scaled between -1.0 and 1.0, typically 0.0 to 1.0)
- **Filters**: `actorId`, `elementId`
- **Missing Data**: Return `null` or 0 if no score present

#### LE-004: Total Time Spent on Learning Element
- **CSV Description**: "Total time spent by a student on each learning element in a given time period"
- **Definition**: Sum of all durations from statements related to the element, filtered by time period.
- **Calculation**:
  1. Filter statements: `actor = student`, `object.id = element`, `start ≤ timestamp < end`
  2. Sum `result.duration` values
- **Units**: Seconds
- **Filters**: `actorId`, `elementId`, `start`, `end`

#### LE-005: Last Three Learning Elements Completed in Topic
- **CSV Description**: "Last three learning elements of a topic completed by a student"
- **Note**: Duplicate of TO-004; included for consistency
- **Definition**: Same as TO-004
- **Filters**: `actorId`, `topicId`

#### LE-006: Completion Dates of Last Three Elements in Topic
- **CSV Description**: "Completion date of the last three learning elements of a topic completed by a student"
- **Note**: Duplicate of TO-005; included for consistency
- **Definition**: Same as TO-005
- **Filters**: `actorId`, `topicId`

---

## Implementation Notes

### xAPI Statement Filtering

#### By Actor (Student)
```
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

- **Version**: 1.0
- **Date**: October 20, 2025
- **Status**: Initial Release

### Change Log
- v1.0 (2025-10-20): Initial formal specification covering all 16 CSV metrics

