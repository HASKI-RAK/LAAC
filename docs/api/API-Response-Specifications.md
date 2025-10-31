# API Response Specifications

## Purpose

This document specifies the structure and format of API responses for all learning analytics metrics defined in the LAAC system. It provides concrete examples for each metric type and establishes patterns for future metric additions.

## References

- [LAAC_Learning_Analytics_Requirements.csv](../resources/LAAC_Learning_Analytics_Requirements.csv) — Authoritative metric requirements
- [Metrics-Specification.md](../Metrics-Specification.md) — Formal metric definitions and calculations
- [REQ-FN-001](../srs/REQ-FN-001.md) — Client-Facing Intermediary API
- [REQ-FN-003](../srs/REQ-FN-003.md) — Analytics Metrics Catalog and Discovery
- [REQ-FN-005](../srs/REQ-FN-005.md) — Results Retrieval, Aggregation, and Export

## Table of Contents

1. [Generic Response Structure](#generic-response-structure)
2. [Common Patterns](#common-patterns)
3. [Metrics Catalog API](#metrics-catalog-api)
4. [Course Overview Metrics](#course-overview-metrics)
5. [Topic Overview Metrics](#topic-overview-metrics)
6. [Learning Element Metrics](#learning-element-metrics)
7. [Error Responses](#error-responses)
8. [Pagination and Filtering](#pagination-and-filtering)
9. [Extensibility Guide](#extensibility-guide)

---

## Generic Response Structure

All metric responses follow a consistent envelope structure to ensure predictability and ease of integration.

### Understanding Dashboard Level vs Perspective

The API response structure distinguishes between two orthogonal dimensions:

- **`dashboardLevel`**: The **aggregation scope** of the metric (course/topic/element)
  - Defines at what granularity the data is aggregated
  - Examples: course-level totals, topic-level summaries, element-specific details

- **`perspective`**: The **viewpoint** from which the metric is calculated (student/instructor/course/system)
  - Defines whose data or what context the metric represents
  - Examples: student's individual progress, instructor's class overview, course metadata

**Key insight:** Most current metrics use `perspective: "student"` because they track individual student analytics, but are aggregated at different levels (course/topic/element). This design allows for future expansion to instructor dashboards, cohort analytics, or system-wide metrics without changing the response structure.

**Examples:**
- `dashboardLevel: "course"` + `perspective: "student"` → Student's total score in a course (CO-001)
- `dashboardLevel: "course"` + `perspective: "course"` → Maximum possible score for a course (CO-002, not student-specific)
- `dashboardLevel: "topic"` + `perspective: "student"` → Student's progress in a topic (TO-001)
- `dashboardLevel: "element"` + `perspective: "student"` → Student's best attempt on an element (LE-003)

### Single Metric Response

```json
{
  "metricId": "string",
  "dashboardLevel": "course" | "topic" | "element",
  "perspective": "student" | "instructor" | "course" | "system",
  "description": "string",
  "filters": {
    "actorId": "string (optional)",
    "courseId": "string (optional)",
    "topicId": "string (optional)",
    "elementId": "string (optional)",
    "start": "ISO 8601 timestamp (optional)",
    "end": "ISO 8601 timestamp (optional)"
  },
  "result": {
    "value": "any (number, string, boolean, array, object)",
    "unit": "string (optional)",
    "metadata": {
      "computedAt": "ISO 8601 timestamp",
      "cached": "boolean",
      "cacheAge": "number (seconds, optional)",
      "dataPoints": "number (optional)",
      "version": "string (optional)"
    }
  },
  "links": {
    "self": "string (URL)",
    "metric": "string (URL to metric definition)"
  }
}
```

**Field Descriptions:**
- `metricId`: Unique identifier for the metric (e.g., "co-001", "to-001")
- `dashboardLevel`: The aggregation/scope level of the metric ("course", "topic", or "element")
- `perspective`: The viewpoint from which the metric is calculated:
  - `student`: Metrics calculated from an individual student's perspective (requires actorId filter)
  - `instructor`: Metrics from an instructor's perspective (aggregated across students)
  - `course`: Course-level metrics independent of individual actors
  - `system`: System-wide analytics or metadata
- `description`: Human-readable description of what the metric measures
- `filters`: Parameters used to scope the metric calculation
- `result`: The computed metric value with metadata
- `links`: HATEOAS navigation links

### Batch Metrics Response

```json
{
  "metrics": [
    {
      "metricId": "string",
      "dashboardLevel": "string",
      "perspective": "string",
      "result": { /* same as single metric */ },
      "error": { /* present only if this metric failed */ }
    }
  ],
  "summary": {
    "totalRequested": "number",
    "successful": "number",
    "failed": "number",
    "computedAt": "ISO 8601 timestamp"
  },
  "links": {
    "self": "string (URL)"
  }
}
```

---

## Common Patterns

### Numeric Metrics

Metrics that return a single numeric value (scores, durations, counts).

**Pattern:**
```json
{
  "result": {
    "value": 42.5,
    "unit": "points" | "seconds" | "count",
    "metadata": {
      "computedAt": "2025-10-31T08:51:33.171Z",
      "cached": true
    }
  }
}
```

### Array Metrics

Metrics that return lists of items (recent completions, activity history).

**Pattern:**
```json
{
  "result": {
    "value": [
      {
        "id": "string",
        "name": "string (optional)",
        "timestamp": "ISO 8601 timestamp (optional)",
        "score": "number (optional)"
      }
    ],
    "unit": "items",
    "metadata": {
      "computedAt": "2025-10-31T08:51:33.171Z",
      "dataPoints": 3
    }
  }
}
```

### Boolean Metrics

Metrics that return true/false or completion status.

**Pattern:**
```json
{
  "result": {
    "value": true,
    "metadata": {
      "computedAt": "2025-10-31T08:51:33.171Z"
    }
  }
}
```

### Null/Missing Data

When data is unavailable or not applicable.

**Pattern:**
```json
{
  "result": {
    "value": null,
    "metadata": {
      "computedAt": "2025-10-31T08:51:33.171Z",
      "reason": "No data available for the specified filters"
    }
  }
}
```

---

## Metrics Catalog API

### GET /api/v1/metrics

Returns the complete catalog of available metrics.

**Response:**
```json
{
  "metrics": [
    {
      "id": "co-001",
      "title": "Total Score Earned by Student in Course",
      "dashboardLevel": "course",
      "perspective": "student",
      "description": "Total score earned by a student on learning elements in each course",
      "version": "1.0.0",
      "parameters": {
        "required": ["actorId", "courseId"],
        "optional": []
      },
      "outputType": "numeric",
      "unit": "points"
    },
    {
      "id": "co-002",
      "title": "Possible Total Score for Course",
      "dashboardLevel": "course",
      "perspective": "course",
      "description": "Possible total score for all learning elements in each course",
      "version": "1.0.0",
      "parameters": {
        "required": ["courseId"],
        "optional": []
      },
      "outputType": "numeric",
      "unit": "points"
    }
    // ... additional metrics
  ],
  "total": 16,
  "version": "1.0.0",
  "links": {
    "self": "/api/v1/metrics"
  }
}
```

### GET /api/v1/metrics/{id}

Returns details for a specific metric.

**Response:**
```json
{
  "id": "co-001",
  "title": "Total Score Earned by Student in Course",
  "dashboardLevel": "course",
  "perspective": "student",
  "description": "Total score earned by a student on learning elements in each course",
  "version": "1.0.0",
  "parameters": {
    "required": ["actorId", "courseId"],
    "optional": []
  },
  "outputType": "numeric",
  "unit": "points",
  "calculation": "Sum of scores from the best attempt of each learning element within the course",
  "dataSource": "xAPI statements from LRS",
  "links": {
    "self": "/api/v1/metrics/co-001",
    "results": "/api/v1/metrics/co-001/results",
    "specification": "/docs/Metrics-Specification.md#co-001"
  }
}
```

---

## Course Overview Metrics

### CO-001: Total Score Earned by Student in Course

**Endpoint:** `GET /api/v1/metrics/co-001/results?actorId={actorId}&courseId={courseId}`

**Response:**
```json
{
  "metricId": "co-001",
  "dashboardLevel": "course",
  "perspective": "student",
  "description": "Total score earned by a student on learning elements in each course",
  "filters": {
    "actorId": "student-12345",
    "courseId": "course-cs101"
  },
  "result": {
    "value": 87.5,
    "unit": "points",
    "metadata": {
      "computedAt": "2025-10-31T08:51:33.171Z",
      "cached": true,
      "cacheAge": 120,
      "dataPoints": 15,
      "version": "1.0.0"
    }
  },
  "links": {
    "self": "/api/v1/metrics/co-001/results?actorId=student-12345&courseId=course-cs101",
    "metric": "/api/v1/metrics/co-001"
  }
}
```

### CO-002: Possible Total Score for Course

**Endpoint:** `GET /api/v1/metrics/co-002/results?courseId={courseId}`

**Response:**
```json
{
  "metricId": "co-002",
  "dashboardLevel": "course",
  "perspective": "course",
  "description": "Possible total score for all learning elements in each course",
  "filters": {
    "courseId": "course-cs101"
  },
  "result": {
    "value": 100.0,
    "unit": "points",
    "metadata": {
      "computedAt": "2025-10-31T08:51:33.171Z",
      "cached": true,
      "dataPoints": 15,
      "version": "1.0.0"
    }
  },
  "links": {
    "self": "/api/v1/metrics/co-002/results?courseId=course-cs101",
    "metric": "/api/v1/metrics/co-002"
  }
}
```

### CO-003: Total Time Spent by Student in Course

**Endpoint:** `GET /api/v1/metrics/co-003/results?actorId={actorId}&courseId={courseId}&start={start}&end={end}`

**Response:**
```json
{
  "metricId": "co-003",
  "dashboardLevel": "course",
  "perspective": "student",
  "description": "Total time spent by a student in each course in a given time period",
  "filters": {
    "actorId": "student-12345",
    "courseId": "course-cs101",
    "start": "2025-10-01T00:00:00.000Z",
    "end": "2025-10-31T23:59:59.999Z"
  },
  "result": {
    "value": 18720,
    "unit": "seconds",
    "formatted": "5h 12m",
    "metadata": {
      "computedAt": "2025-10-31T08:51:33.171Z",
      "cached": false,
      "dataPoints": 47,
      "version": "1.0.0"
    }
  },
  "links": {
    "self": "/api/v1/metrics/co-003/results?actorId=student-12345&courseId=course-cs101&start=2025-10-01T00:00:00.000Z&end=2025-10-31T23:59:59.999Z",
    "metric": "/api/v1/metrics/co-003"
  }
}
```

### CO-004: Last Three Learning Elements Completed in Course

**Endpoint:** `GET /api/v1/metrics/co-004/results?actorId={actorId}&courseId={courseId}`

**Response:**
```json
{
  "metricId": "co-004",
  "dashboardLevel": "course",
  "perspective": "student",
  "description": "Last three learning elements of any course completed by a student",
  "filters": {
    "actorId": "student-12345",
    "courseId": "course-cs101"
  },
  "result": {
    "value": [
      {
        "id": "https://example.com/activities/cs101/quiz-5",
        "name": "Module 5 Quiz",
        "type": "http://adlnet.gov/expapi/activities/assessment",
        "completedAt": "2025-10-30T14:23:15.000Z"
      },
      {
        "id": "https://example.com/activities/cs101/assignment-4",
        "name": "Assignment 4: Data Structures",
        "type": "http://adlnet.gov/expapi/activities/assessment",
        "completedAt": "2025-10-28T09:45:30.000Z"
      },
      {
        "id": "https://example.com/activities/cs101/video-lecture-12",
        "name": "Lecture 12: Algorithms",
        "type": "http://adlnet.gov/expapi/activities/media",
        "completedAt": "2025-10-27T16:10:00.000Z"
      }
    ],
    "unit": "items",
    "metadata": {
      "computedAt": "2025-10-31T08:51:33.171Z",
      "cached": true,
      "dataPoints": 3,
      "version": "1.0.0"
    }
  },
  "links": {
    "self": "/api/v1/metrics/co-004/results?actorId=student-12345&courseId=course-cs101",
    "metric": "/api/v1/metrics/co-004"
  }
}
```

### CO-005: Completion Dates of Last Three Elements in Course

**Endpoint:** `GET /api/v1/metrics/co-005/results?actorId={actorId}&courseId={courseId}`

**Response:**
```json
{
  "metricId": "co-005",
  "dashboardLevel": "course",
  "perspective": "student",
  "description": "Completion date of the last three learning elements of any course completed by a student",
  "filters": {
    "actorId": "student-12345",
    "courseId": "course-cs101"
  },
  "result": {
    "value": [
      "2025-10-30T14:23:15.000Z",
      "2025-10-28T09:45:30.000Z",
      "2025-10-27T16:10:00.000Z"
    ],
    "unit": "timestamps",
    "metadata": {
      "computedAt": "2025-10-31T08:51:33.171Z",
      "cached": true,
      "dataPoints": 3,
      "version": "1.0.0"
    }
  },
  "links": {
    "self": "/api/v1/metrics/co-005/results?actorId=student-12345&courseId=course-cs101",
    "metric": "/api/v1/metrics/co-005"
  }
}
```

---

## Topic Overview Metrics

### TO-001: Total Score Earned by Student in Topic

**Endpoint:** `GET /api/v1/metrics/to-001/results?actorId={actorId}&topicId={topicId}`

**Response:**
```json
{
  "metricId": "to-001",
  "dashboardLevel": "topic",
  "perspective": "student",
  "description": "Total score earned by a student on learning elements in each topic",
  "filters": {
    "actorId": "student-12345",
    "topicId": "topic-data-structures"
  },
  "result": {
    "value": 28.5,
    "unit": "points",
    "metadata": {
      "computedAt": "2025-10-31T08:51:33.171Z",
      "cached": true,
      "cacheAge": 60,
      "dataPoints": 5,
      "version": "1.0.0"
    }
  },
  "links": {
    "self": "/api/v1/metrics/to-001/results?actorId=student-12345&topicId=topic-data-structures",
    "metric": "/api/v1/metrics/to-001"
  }
}
```

### TO-002: Possible Total Score for Topic

**Endpoint:** `GET /api/v1/metrics/to-002/results?topicId={topicId}`

**Response:**
```json
{
  "metricId": "to-002",
  "dashboardLevel": "topic",
  "perspective": "course",
  "description": "Possible total score for all learning elements in each topic",
  "filters": {
    "topicId": "topic-data-structures"
  },
  "result": {
    "value": 30.0,
    "unit": "points",
    "metadata": {
      "computedAt": "2025-10-31T08:51:33.171Z",
      "cached": true,
      "dataPoints": 5,
      "version": "1.0.0"
    }
  },
  "links": {
    "self": "/api/v1/metrics/to-002/results?topicId=topic-data-structures",
    "metric": "/api/v1/metrics/to-002"
  }
}
```

### TO-003: Total Time Spent by Student in Topic

**Endpoint:** `GET /api/v1/metrics/to-003/results?actorId={actorId}&topicId={topicId}&start={start}&end={end}`

**Response:**
```json
{
  "metricId": "to-003",
  "dashboardLevel": "topic",
  "perspective": "student",
  "description": "Total time spent by a student in each topic in a given time period",
  "filters": {
    "actorId": "student-12345",
    "topicId": "topic-data-structures",
    "start": "2025-10-01T00:00:00.000Z",
    "end": "2025-10-31T23:59:59.999Z"
  },
  "result": {
    "value": 5400,
    "unit": "seconds",
    "formatted": "1h 30m",
    "metadata": {
      "computedAt": "2025-10-31T08:51:33.171Z",
      "cached": false,
      "dataPoints": 12,
      "version": "1.0.0"
    }
  },
  "links": {
    "self": "/api/v1/metrics/to-003/results?actorId=student-12345&topicId=topic-data-structures&start=2025-10-01T00:00:00.000Z&end=2025-10-31T23:59:59.999Z",
    "metric": "/api/v1/metrics/to-003"
  }
}
```

### TO-004: Last Three Learning Elements Completed in Topic

**Endpoint:** `GET /api/v1/metrics/to-004/results?actorId={actorId}&topicId={topicId}`

**Response:**
```json
{
  "metricId": "to-004",
  "dashboardLevel": "topic",
  "perspective": "student",
  "description": "Last three learning elements of any topic in a course completed by a student",
  "filters": {
    "actorId": "student-12345",
    "topicId": "topic-data-structures"
  },
  "result": {
    "value": [
      {
        "id": "https://example.com/activities/cs101/ds-quiz-3",
        "name": "Trees and Graphs Quiz",
        "type": "http://adlnet.gov/expapi/activities/assessment",
        "completedAt": "2025-10-29T11:30:00.000Z"
      },
      {
        "id": "https://example.com/activities/cs101/ds-exercise-2",
        "name": "Binary Search Tree Exercise",
        "type": "http://adlnet.gov/expapi/activities/assessment",
        "completedAt": "2025-10-27T15:20:00.000Z"
      },
      {
        "id": "https://example.com/activities/cs101/ds-lecture-5",
        "name": "Introduction to Graphs",
        "type": "http://adlnet.gov/expapi/activities/media",
        "completedAt": "2025-10-26T10:00:00.000Z"
      }
    ],
    "unit": "items",
    "metadata": {
      "computedAt": "2025-10-31T08:51:33.171Z",
      "cached": true,
      "dataPoints": 3,
      "version": "1.0.0"
    }
  },
  "links": {
    "self": "/api/v1/metrics/to-004/results?actorId=student-12345&topicId=topic-data-structures",
    "metric": "/api/v1/metrics/to-004"
  }
}
```

### TO-005: Completion Dates of Last Three Elements in Topic

**Endpoint:** `GET /api/v1/metrics/to-005/results?actorId={actorId}&topicId={topicId}`

**Response:**
```json
{
  "metricId": "to-005",
  "dashboardLevel": "topic",
  "perspective": "student",
  "description": "Completion date of the last three learning elements of any topic completed by a student",
  "filters": {
    "actorId": "student-12345",
    "topicId": "topic-data-structures"
  },
  "result": {
    "value": [
      "2025-10-29T11:30:00.000Z",
      "2025-10-27T15:20:00.000Z",
      "2025-10-26T10:00:00.000Z"
    ],
    "unit": "timestamps",
    "metadata": {
      "computedAt": "2025-10-31T08:51:33.171Z",
      "cached": true,
      "dataPoints": 3,
      "version": "1.0.0"
    }
  },
  "links": {
    "self": "/api/v1/metrics/to-005/results?actorId=student-12345&topicId=topic-data-structures",
    "metric": "/api/v1/metrics/to-005"
  }
}
```

---

## Learning Element Metrics

### LE-001: Current Completion Status of Best Attempt

**Endpoint:** `GET /api/v1/metrics/le-001/results?actorId={actorId}&elementId={elementId}`

**Response:**
```json
{
  "metricId": "le-001",
  "dashboardLevel": "element",
  "perspective": "student",
  "description": "Current completion status of the best attempt by a student for each learning element",
  "filters": {
    "actorId": "student-12345",
    "elementId": "https://example.com/activities/cs101/quiz-5"
  },
  "result": {
    "value": true,
    "metadata": {
      "computedAt": "2025-10-31T08:51:33.171Z",
      "cached": true,
      "attemptId": "registration-uuid-12345",
      "version": "1.0.0"
    }
  },
  "links": {
    "self": "/api/v1/metrics/le-001/results?actorId=student-12345&elementId=https://example.com/activities/cs101/quiz-5",
    "metric": "/api/v1/metrics/le-001"
  }
}
```

**Example with null value (no data):**
```json
{
  "metricId": "le-001",
  "dashboardLevel": "element",
  "perspective": "student",
  "description": "Current completion status of the best attempt by a student for each learning element",
  "filters": {
    "actorId": "student-12345",
    "elementId": "https://example.com/activities/cs101/quiz-99"
  },
  "result": {
    "value": null,
    "metadata": {
      "computedAt": "2025-10-31T08:51:33.171Z",
      "cached": false,
      "reason": "No completion data available for this element",
      "version": "1.0.0"
    }
  },
  "links": {
    "self": "/api/v1/metrics/le-001/results?actorId=student-12345&elementId=https://example.com/activities/cs101/quiz-99",
    "metric": "/api/v1/metrics/le-001"
  }
}
```

### LE-002: Date of Best Attempt for Learning Element

**Endpoint:** `GET /api/v1/metrics/le-002/results?actorId={actorId}&elementId={elementId}`

**Response:**
```json
{
  "metricId": "le-002",
  "dashboardLevel": "element",
  "perspective": "student",
  "description": "Date of the best attempt of a student for each learning element",
  "filters": {
    "actorId": "student-12345",
    "elementId": "https://example.com/activities/cs101/quiz-5"
  },
  "result": {
    "value": "2025-10-30T14:23:15.000Z",
    "unit": "timestamp",
    "metadata": {
      "computedAt": "2025-10-31T08:51:33.171Z",
      "cached": true,
      "attemptId": "registration-uuid-12345",
      "version": "1.0.0"
    }
  },
  "links": {
    "self": "/api/v1/metrics/le-002/results?actorId=student-12345&elementId=https://example.com/activities/cs101/quiz-5",
    "metric": "/api/v1/metrics/le-002"
  }
}
```

### LE-003: Score for Best Attempt at Learning Element

**Endpoint:** `GET /api/v1/metrics/le-003/results?actorId={actorId}&elementId={elementId}`

**Response:**
```json
{
  "metricId": "le-003",
  "dashboardLevel": "element",
  "perspective": "student",
  "description": "Score for the best attempt of a student at each learning element",
  "filters": {
    "actorId": "student-12345",
    "elementId": "https://example.com/activities/cs101/quiz-5"
  },
  "result": {
    "value": 0.95,
    "unit": "scaled",
    "rawScore": 19,
    "maxScore": 20,
    "metadata": {
      "computedAt": "2025-10-31T08:51:33.171Z",
      "cached": true,
      "attemptId": "registration-uuid-12345",
      "version": "1.0.0"
    }
  },
  "links": {
    "self": "/api/v1/metrics/le-003/results?actorId=student-12345&elementId=https://example.com/activities/cs101/quiz-5",
    "metric": "/api/v1/metrics/le-003"
  }
}
```

### LE-004: Total Time Spent on Learning Element

**Endpoint:** `GET /api/v1/metrics/le-004/results?actorId={actorId}&elementId={elementId}&start={start}&end={end}`

**Response:**
```json
{
  "metricId": "le-004",
  "dashboardLevel": "element",
  "perspective": "student",
  "description": "Total time spent by a student on each learning element in a given time period",
  "filters": {
    "actorId": "student-12345",
    "elementId": "https://example.com/activities/cs101/quiz-5",
    "start": "2025-10-01T00:00:00.000Z",
    "end": "2025-10-31T23:59:59.999Z"
  },
  "result": {
    "value": 1800,
    "unit": "seconds",
    "formatted": "30m",
    "metadata": {
      "computedAt": "2025-10-31T08:51:33.171Z",
      "cached": false,
      "dataPoints": 3,
      "attempts": 2,
      "version": "1.0.0"
    }
  },
  "links": {
    "self": "/api/v1/metrics/le-004/results?actorId=student-12345&elementId=https://example.com/activities/cs101/quiz-5&start=2025-10-01T00:00:00.000Z&end=2025-10-31T23:59:59.999Z",
    "metric": "/api/v1/metrics/le-004"
  }
}
```

### LE-005: Last Three Learning Elements Completed in Topic

**Note:** This is identical to TO-004. See [TO-004](#to-004-last-three-learning-elements-completed-in-topic) for response format.

### LE-006: Completion Dates of Last Three Elements in Topic

**Note:** This is identical to TO-005. See [TO-005](#to-005-completion-dates-of-last-three-elements-in-topic) for response format.

---

## Error Responses

All error responses follow a consistent structure with appropriate HTTP status codes.

### Generic Error Structure

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": "string (optional)",
    "timestamp": "ISO 8601 timestamp",
    "path": "string (request path)",
    "correlationId": "string (for tracing)"
  }
}
```

### 400 Bad Request

Missing or invalid required parameters.

```json
{
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Required parameter 'actorId' is missing",
    "details": "The metric 'co-001' requires actorId and courseId parameters",
    "timestamp": "2025-10-31T08:51:33.171Z",
    "path": "/api/v1/metrics/co-001/results",
    "correlationId": "req-uuid-67890"
  }
}
```

### 404 Not Found

Metric not found.

```json
{
  "error": {
    "code": "METRIC_NOT_FOUND",
    "message": "Metric 'invalid-metric' does not exist",
    "details": "See /api/v1/metrics for available metrics",
    "timestamp": "2025-10-31T08:51:33.171Z",
    "path": "/api/v1/metrics/invalid-metric/results",
    "correlationId": "req-uuid-67890"
  }
}
```

### 500 Internal Server Error

Computation or system error.

```json
{
  "error": {
    "code": "COMPUTATION_FAILED",
    "message": "Failed to compute metric",
    "details": "Unable to retrieve data from LRS: connection timeout",
    "timestamp": "2025-10-31T08:51:33.171Z",
    "path": "/api/v1/metrics/co-001/results",
    "correlationId": "req-uuid-67890"
  }
}
```

### 503 Service Unavailable

Upstream dependency unavailable.

```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "LRS service is currently unavailable",
    "details": "Retry after: 30 seconds",
    "timestamp": "2025-10-31T08:51:33.171Z",
    "path": "/api/v1/metrics/co-001/results",
    "correlationId": "req-uuid-67890",
    "retryAfter": 30
  }
}
```

### 429 Too Many Requests

Rate limit exceeded.

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": "Rate limit: 100 requests per minute",
    "timestamp": "2025-10-31T08:51:33.171Z",
    "path": "/api/v1/metrics/co-001/results",
    "correlationId": "req-uuid-67890",
    "retryAfter": 15,
    "rateLimit": {
      "limit": 100,
      "remaining": 0,
      "reset": "2025-10-31T08:52:33.171Z"
    }
  }
}
```

---

## Pagination and Filtering

### Pagination

For endpoints that return lists or large datasets, pagination is supported.

**Query Parameters:**
- `page` (optional): Page number (1-indexed). Default: 1
- `perPage` (optional): Items per page (1-100). Default: 20
- `sort` (optional): Sort field and direction (e.g., `timestamp:desc`)

**Example Request:**
```
GET /api/v1/metrics/co-004/results?actorId=student-12345&courseId=course-cs101&page=1&perPage=10
```

**Paginated Response Structure:**
```json
{
  "metricId": "co-004",
  "dashboardLevel": "course",
  "perspective": "student",
  "filters": {
    "actorId": "student-12345",
    "courseId": "course-cs101"
  },
  "result": {
    "value": [ /* items */ ],
    "metadata": {
      "computedAt": "2025-10-31T08:51:33.171Z"
    }
  },
  "pagination": {
    "page": 1,
    "perPage": 10,
    "total": 3,
    "totalPages": 1
  },
  "links": {
    "self": "/api/v1/metrics/co-004/results?actorId=student-12345&courseId=course-cs101&page=1&perPage=10",
    "first": "/api/v1/metrics/co-004/results?actorId=student-12345&courseId=course-cs101&page=1&perPage=10",
    "last": "/api/v1/metrics/co-004/results?actorId=student-12345&courseId=course-cs101&page=1&perPage=10",
    "next": null,
    "prev": null
  }
}
```

### Filtering

All metrics support filtering through query parameters based on their required and optional parameters.

**Common Filters:**
- `actorId`: Student identifier (pseudonymous)
- `courseId`: Course identifier (IRI)
- `topicId`: Topic identifier (IRI)
- `elementId`: Learning element identifier (IRI)
- `start`: Start of time period (ISO 8601 timestamp)
- `end`: End of time period (ISO 8601 timestamp)

**Advanced Filters (where applicable):**
- `includeIncomplete`: Include incomplete attempts (boolean, default: false)
- `minScore`: Minimum score threshold (number, 0.0-1.0)
- `maxScore`: Maximum score threshold (number, 0.0-1.0)

### Batch Retrieval

**Endpoint:** `POST /api/v1/metrics/results`

Request multiple metrics in a single call.

**Request Body:**
```json
{
  "metrics": [
    {
      "id": "co-001",
      "filters": {
        "actorId": "student-12345",
        "courseId": "course-cs101"
      }
    },
    {
      "id": "co-002",
      "filters": {
        "courseId": "course-cs101"
      }
    },
    {
      "id": "co-003",
      "filters": {
        "actorId": "student-12345",
        "courseId": "course-cs101",
        "start": "2025-10-01T00:00:00.000Z",
        "end": "2025-10-31T23:59:59.999Z"
      }
    }
  ]
}
```

**Response:**
```json
{
  "metrics": [
    {
      "metricId": "co-001",
      "dashboardLevel": "course",
      "perspective": "student",
      "result": {
        "value": 87.5,
        "unit": "points",
        "metadata": { /* ... */ }
      }
    },
    {
      "metricId": "co-002",
      "dashboardLevel": "course",
      "perspective": "course",
      "result": {
        "value": 100.0,
        "unit": "points",
        "metadata": { /* ... */ }
      }
    },
    {
      "metricId": "co-003",
      "dashboardLevel": "course",
      "perspective": "student",
      "result": {
        "value": 18720,
        "unit": "seconds",
        "metadata": { /* ... */ }
      }
    }
  ],
  "summary": {
    "totalRequested": 3,
    "successful": 3,
    "failed": 0,
    "computedAt": "2025-10-31T08:51:33.171Z",
    "totalDuration": 245
  },
  "links": {
    "self": "/api/v1/metrics/results"
  }
}
```

---

## Extensibility Guide

### Adding New Metrics

When adding new learning analytics metrics from the CSV file or custom requirements, follow these patterns:

#### 1. Define Metric Metadata

```typescript
{
  id: "co-001",  // Dashboard level prefix (co/to/le/cx) + sequential number
  title: "Human-readable metric name",
  dashboardLevel: "course" | "topic" | "element",
  perspective: "student" | "instructor" | "course" | "system",
  description: "Brief description from CSV",
  version: "1.0.0",
  parameters: {
    required: ["param1", "param2"],
    optional: ["param3"]
  },
  outputType: "numeric" | "array" | "boolean" | "object",
  unit: "points" | "seconds" | "count" | "items" | "timestamp" | null
}
```

**Perspective Values:**
- `student`: Metric calculated from individual student's perspective (requires actorId)
- `instructor`: Metric from instructor's perspective (aggregated across students)
- `course`: Course-level metric independent of individual actors
- `system`: System-wide analytics or metadata

#### 2. Determine Response Pattern

Based on `outputType`, use the appropriate pattern:

- **Numeric**: Single value with unit (scores, durations, counts)
- **Array**: List of items (recent activities, completions)
- **Boolean**: True/false/null (completion status, eligibility)
- **Object**: Complex nested structure (detailed analytics)

#### 3. Define Required Filters

Document which filters are required vs. optional:

```typescript
{
  required: ["actorId", "courseId"],  // Must be provided
  optional: ["start", "end"]          // May be provided
}
```

#### 4. Document Data Source and Calculation

Reference the xAPI statements and aggregation logic:

```markdown
**Data Source**: xAPI statements filtered by actor and course context
**Calculation**: Sum of result.score.scaled from best attempts
**xAPI Filter**: actor.account.name = {actorId} AND context.contextActivities.parent[].id = {courseId}
```

#### 5. Provide Example Responses

Include at least two examples:
1. **Success case** with representative data
2. **Edge case** (null/missing data, empty array, etc.)

#### 6. Update Catalog

Add the metric to the catalog endpoint response and ensure proper versioning.

### Versioning Strategy

- **Metric Version**: Track metric definition evolution (e.g., "1.0.0" → "1.1.0" for calculation change)
- **API Version**: Use URL versioning (`/api/v1/`, `/api/v2/`) for breaking changes
- **Backward Compatibility**: Support multiple metric versions simultaneously when feasible

### Validation Checklist

Before deploying a new metric:

- [ ] Metric ID is unique and follows naming convention (xx-NNN)
- [ ] Metric appears in catalog endpoint (`GET /api/v1/metrics`)
- [ ] Metric detail endpoint returns complete metadata (`GET /api/v1/metrics/{id}`)
- [ ] Results endpoint returns correct structure (`GET /api/v1/metrics/{id}/results`)
- [ ] Required parameters are validated (400 error if missing)
- [ ] Response includes all required metadata fields
- [ ] Error cases are handled (404, 500, 503)
- [ ] Response is cacheable (includes cache metadata)
- [ ] Unit tests cover calculation logic
- [ ] E2E tests verify API contract
- [ ] Documentation is updated (this file + Metrics-Specification.md)
- [ ] CSV requirement is traced to implementation (traceability.md)

### CSV to Metric Mapping

When adding a new row to `LAAC_Learning_Analytics_Requirements.csv`:

1. **Parse CSV Row:**
   - Dashboard Level → `dashboardLevel`
   - Metric Description → `description` and `title`
   - Source → informational (usually "LAAC")

2. **Generate Metric ID:**
   - Course overview → `co-NNN`
   - Topic overview → `to-NNN`
   - Learning element overview → `le-NNN`
   - Custom/Other → `cx-NNN`

3. **Define in Metrics-Specification.md:**
   - Add formal definition under appropriate section
   - Specify calculation method
   - Define xAPI query pattern
   - Document filters and units

4. **Create API Response Example:**
   - Add to this document under appropriate section
   - Follow established patterns for `outputType`
   - Include success and edge cases

5. **Implement in Code:**
   - Create metric computation class implementing `IMetricComputation`
   - Register in metric provider (Quick or Thesis)
   - Add unit tests and E2E tests
   - Update catalog service

6. **Update Traceability:**
   - Map CSV row → Metric ID → Code module in `traceability.md`

---

## Compliance with Requirements

This API response specification implements the following requirements:

- **REQ-FN-001**: Client-Facing Intermediary API
  - Provides clear, consistent API surface for all metrics
  - Abstracts LRS implementation details
  - Returns well-structured responses

- **REQ-FN-003**: Analytics Metrics Catalog and Discovery
  - Documents catalog endpoint structure
  - Ensures all CSV metrics are discoverable
  - Provides stable metric identifiers

- **REQ-FN-005**: Results Retrieval, Aggregation, and Export
  - Defines single and batch retrieval patterns
  - Supports JSON format (CSV format documented separately)
  - Includes pagination for large result sets

- **REQ-FN-008**: OpenAPI Specification Generation and Exposure
  - Response schemas can be codified in OpenAPI/Swagger
  - All endpoints documented with examples

- **REQ-NF-008**: API Documentation Completeness and Accuracy
  - Comprehensive examples for all metric types
  - Clear extensibility guidelines
  - Traceable to CSV requirements

---

## Change History

- **v1.0.0** (2025-10-31): Initial specification
  - Defined generic response structure
  - Documented all 16 metrics from CSV
  - Added error response patterns
  - Created extensibility guide
