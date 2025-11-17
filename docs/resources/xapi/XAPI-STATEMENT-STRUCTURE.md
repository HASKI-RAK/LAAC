# HASKI xAPI Statement Structure Reference

**Analysis Date**: 2025-11-10  
**LRS Endpoint**: https://ke.lrs.haski.app/xapi  
**Data Sources**:

- [HASKI Moodle-xAPI-Plugin](https://github.com/HASKI-RAK/Moodle-xAPI-Plugin)
- [HASKI Frontend](https://github.com/HASKI-RAK/HASKI-Frontend)  
  **xAPI Version**: 1.0.3 (statements use version 1.0.0)

## Overview

This document provides a comprehensive reference for xAPI statement structure in the HASKI ecosystem, based on actual LRS query results. It covers statements from both **Moodle** (learning events) and **Frontend** (UI tracking), with concrete examples and implementation guidance for LAAC.

**Sample Size**: 50 statements analyzed  
**Platforms**: Moodle (48%), Frontend (52%)

## Dual-Source Architecture

The HASKI LRS contains statements from **two sources**:

**Moodle (Learning Events)**:

- Platform: `"Moodle"`
- Domain: `https://ke.moodle.haski.app`
- Extension namespace: `https://wiki.haski.app/`
- Focus: Learning activities (completions, assessments, logins)

**HASKI Frontend (UI Tracking)**:

- Platform: `"Frontend"`
- Domain: `https://ke.haski.app`
- Extension namespace: `https://lrs.learninglocker.net/define/extensions/info`
- Focus: User interactions (clicks, navigation, mouse movements)

## Statement Structure Overview

All statements follow this consistent pattern:

```json
{
  "id": "uuid",
  "actor": {
    "account": {
      "homePage": "https://ke.moodle.haski.app",  // or ke.haski.app for Frontend
      "name": "463"  // User ID
    }
  },
  "verb": {
    "id": "https://wiki.haski.app/variables/xapi.clicked",
    "display": { "en": "clicked" }
  },
  "object": {
    "id": "activity-url",
    "definition": {
      "name": { "en": "Activity Name" },
      "type": "activity-type-iri"
    }
  },
  "context": {
    "platform": "Moodle" | "Frontend",
    "language": "en" | "de",
    "extensions": { /* metadata */ },
    "contextActivities": {
      "parent": [ /* course/page hierarchy */ ],
      "grouping": [ /* institution level */ ]
    }
  },
  "result": { /* optional, for assessments */ },
  "timestamp": "ISO-8601-with-offset",
  "stored": "ISO-8601-with-nanoseconds",
  "version": "1.0.0",
  "authority": { /* LRS credential */ }
}
```

## Key Findings

### 1. Actor Identification Pattern

**All actors use `account` identification** (not `mbox`):

```json
{
  "actor": {
    "account": {
      "homePage": "https://ke.moodle.haski.app",
      "name": "463" // User ID as string
    }
  }
}
```

**LAAC Implementation Strategy**:

- Filter statements using account-based agent queries (not mbox)
- Use `homePage` to identify LRS instance/source system (REQ-FN-017)
- Parse `name` field as user ID for metrics aggregation

**Query Example**:

```typescript
// Filter Moodle statements
const moodleAgent = {
  account: {
    homePage: 'https://ke.moodle.haski.app',
    name: userId,
  },
};

// Filter Frontend statements
const frontendAgent = {
  account: {
    homePage: 'https://ke.haski.app',
    name: userId,
  },
};
```

### 2. Custom HASKI Verb Namespace

Both systems use custom verbs under the HASKI wiki namespace:

**Moodle Verbs** (learning events):

- `https://wiki.haski.app/variables/xapi.clicked` - Content/resource access
- `https://wiki.haski.app/variables/xapi.completed` - Module/activity completion
- `https://wiki.haski.app/variables/xapi.answered` - Question/quiz responses
- `https://wiki.haski.app/variables/xapi.loggedin` - User login
- `https://wiki.haski.app/variables/xapi.loggedout` - User logout

**Frontend Verbs** (UI interactions):

- `https://wiki.haski.app/variables/services.clicked` - Button clicks
- `https://wiki.haski.app/variables/services.mouseMoved` - Mouse movements
- `https://wiki.haski.app/variables/services.closed` - Modal/dialog closes

**Verb Distribution** (from 50 statement sample):

1. `services.mouseMoved` - 32% (Frontend tracking - consider filtering for metrics)
2. `xapi.clicked` - 20% (Content access)
3. `services.clicked` - 18% (UI interactions)
4. `xapi.completed` - 10% (Completions - key for metrics)
5. `xapi.loggedin` - 8% (Session tracking)

### 3. Rich Context Structure

Every statement includes rich context metadata with platform-specific extensions:

```json
{
  "context": {
    "platform": "Moodle", // Or "Frontend"
    "language": "en",
    "extensions": {
      "https://wiki.haski.app/": {
        "domain": "https://ke.moodle.haski.app",
        "domain_version": "4.2 (Build: 20230424)",
        "github": "https://github.com/HASKI-RAK",
        "event_function": "\\src\\transformer\\events\\core\\course_module_completion_updated"
      }
    },
    "contextActivities": {
      "parent": [
        {
          "id": "https://ke.moodle.haski.app/course/view.php?id=10",
          "definition": {
            "name": { "en": "SE - EM2 - WiSe 24/25 & SoSe 25 & WiSe 25/26" },
            "type": "http://id.tincanapi.com/activitytype/lms/course"
          }
        }
      ],
      "grouping": [
        {
          "id": "https://ke.moodle.haski.app",
          "definition": {
            "name": { "en": "HS-KE" },
            "type": "http://id.tincanapi.com/activitytype/lms"
          }
        }
      ]
    }
  }
}
```

**Frontend Extensions** (different namespace):

```json
{
  "https://lrs.learninglocker.net/define/extensions/info": {
    "domain": "https://ke.haski.app",
    "domain_version": "v1.2.0-alpha",
    "github": "https://github.com/HASKI-RAK/HASKI-Frontend",
    "event_function": "src/assets/index-f17cfd3e.js"
  }
}
```

**LAAC Usage**:

- `platform` field distinguishes Moodle vs Frontend statements (REQ-FN-005)
- `extensions.domain` provides LRS instance identification (REQ-FN-017)
- `extensions.event_function` traces back to source code for debugging
- `contextActivities.parent` provides course hierarchy for metrics filtering
- `contextActivities.grouping` provides institution-level grouping

### 4. Object Types and Activity Hierarchy

**Moodle Activity Types**:

- `http://id.tincanapi.com/activitytype/lms` - LMS instance (top level)
- `http://id.tincanapi.com/activitytype/lms/course` - Course
- `http://id.tincanapi.com/activitytype/lms/module` - Module/activity within course
- `http://id.tincanapi.com/activitytype/resource` - Learning resource
- `http://www.tincanapi.co.uk/activitytypes/grade_classification` - Graded activity (H5P)
- `http://activitystrea.ms/schema/1.0/page` - Web page view

**Frontend Activity Types**:

- `https://wiki.haski.app/functions/common.UserInteractionTracker` - UI tracking
- `https://wiki.haski.app/functions/common.Button` - Button component
- `https://wiki.haski.app/functions/common.Modal` - Modal dialog
- etc.

### 5. Result Object (for assessments)

Statements with assessment results include detailed `result` objects:

```json
{
  "result": {
    "score": {
      "raw": 8,
      "max": 8,
      "scaled": 1 // Normalized 0-1
    },
    "duration": "PT4M17S", // ISO 8601 duration
    "completion": true,
    "success": true
  }
}
```

**Metrics Use Cases**:

- Course completion rates (filter by `verb=completed`)
- Assessment scores (extract `result.score.scaled`)
- Time-on-task analysis (parse `result.duration`)
- Success/failure rates (aggregate `result.success`)

### 6. Timestamp Precision

Statements use two timestamp fields with different precision:

```json
{
  "timestamp": "2025-11-10T12:02:09+00:00", // When event occurred (second precision)
  "stored": "2025-11-10T12:02:09.336000000Z" // When LRS stored it (nanosecond precision)
}
```

**LAAC Implication**:

- Use `stored` for watermark-based incremental polling (REQ-FN-002)
- Nanosecond precision requires careful parsing (9 decimal places)
- `timestamp` may include timezone offset (`+00:00`)

### 7. Statement Authority

All statements include an authority field set by the LRS:

```json
{
  "authority": {
    "account": {
      "homePage": "http://example.org",
      "name": "01928ae2-fcdd-8b3e-aa52-abd3fcf8e404" // LRS credential UUID
    },
    "objectType": "Agent"
  }
}
```

## Distribution Analysis (Sample of 50 statements)

### Platform Distribution

- Moodle: 48% (24 statements)
- Frontend: 52% (26 statements)

### Top 5 Verbs

1. `services.mouseMoved` - 32% (Frontend tracking)
2. `xapi.clicked` - 20% (Content access)
3. `services.clicked` - 18% (UI interactions)
4. `xapi.completed` - 10% (Completions)
5. `xapi.loggedin` - 8% (Logins)

### Top 5 Object Types

1. `common.UserInteractionTracker` - 32% (Frontend)
2. `lms` - 10% (LMS instance)
3. `lms/course` - 10% (Course views)
4. `lms/module` - 10% (Module completions)
5. `grade_classification` - 8% (H5P assessments)

## LAAC Implementation Guide

### 1. Multi-Instance Support (REQ-FN-017)

**Instance Identification Strategy**:

```typescript
function getInstanceId(statement: XAPIStatement): string {
  const homePage = statement.actor.account.homePage;

  if (homePage.includes('ke.moodle.haski.app')) {
    return 'moodle-hs-ke';
  } else if (homePage.includes('ke.haski.app')) {
    return 'frontend-hs-ke';
  }

  // Extract from domain extension as fallback
  return (
    statement.context?.extensions?.['https://wiki.haski.app/']?.domain ||
    'unknown'
  );
}
```

### 2. ILRSClient Query Patterns

```typescript
// Query by account (not mbox)
const agent = {
  account: {
    homePage: 'https://ke.moodle.haski.app',
    name: '463',
  },
};

const statements = await lrsClient.getStatements({
  agent: JSON.stringify(agent),
  since: lastWatermark,
  limit: 50,
});
```

### 3. Platform Filtering for Metrics

**Separate Moodle learning events from Frontend UI tracking**:

```typescript
// For learning analytics metrics, filter by platform
const learningStatements = statements.filter(
  (stmt) => stmt.context?.platform === 'Moodle',
);

// Exclude UI tracking noise
const cleanStatements = statements.filter(
  (stmt) => !stmt.verb.id.includes('services.mouseMoved'),
);
```

### 4. Parse Context Extensions

```typescript
// Extract domain metadata
const domain = stmt.context?.extensions?.['https://wiki.haski.app/']?.domain;
const domainVersion =
  stmt.context?.extensions?.['https://wiki.haski.app/']?.domain_version;
const eventFunction =
  stmt.context?.extensions?.['https://wiki.haski.app/']?.event_function;

// Use for traceability and debugging
logger.log('Statement from Moodle plugin', { domain, eventFunction });
```

### 5. Extract Course Hierarchy

```typescript
// Get course context from parent activities
const courseActivity = stmt.context?.contextActivities?.parent?.find(
  (p) =>
    p.definition?.type === 'http://id.tincanapi.com/activitytype/lms/course',
);

if (courseActivity) {
  const courseId = extractCourseIdFromUrl(courseActivity.id);
  const courseName = courseActivity.definition?.name?.en;
}
```

### 6. Cache Key Structure (REQ-NF-013)

```typescript
function buildCacheKey(params: MetricParams): string {
  const instanceId = getInstanceId(params.statements[0]);
  const platform = params.statements[0]?.context?.platform || 'unknown';

  return `cache:${params.metricId}:${instanceId}:${platform}:${params.scope}:${hashFilters(params.filters)}:v1`;
}

// Example: "cache:course-completion:moodle-hs-ke:Moodle:course:a1b2c3:v1"
```

### 7. Handle Timestamp Precision

```typescript
// Parse stored timestamp with nanosecond precision
const storedTimestamp = new Date(stmt.stored); // "2025-11-10T12:02:09.336000000Z"

// For watermark storage, keep full precision string
const watermark = stmt.stored;

// Advance watermark using X-Experience-API-Consistent-Through header
const consistentThrough =
  response.headers['x-experience-api-consistent-through'];
```

### 8. Verb-Based Metric Queries

```typescript
// Course completion rate
const completions = await lrsClient.getStatements({
  verb: 'https://wiki.haski.app/variables/xapi.completed',
  activity: courseId,
  since: watermark,
});

// Quiz performance
const answers = await lrsClient.getStatements({
  verb: 'https://wiki.haski.app/variables/xapi.answered',
  activity: quizId,
  since: watermark,
});

// Session analysis
const logins = await lrsClient.getStatements({
  verb: 'https://wiki.haski.app/variables/xapi.loggedin',
  since: watermark,
});
```

### 9. Metric Computation Examples

#### Course Completion Rate

```typescript
const completionStatements = await lrsClient.getStatements({
  verb: 'https://wiki.haski.app/variables/xapi.completed',
  activity: courseActivityId,
  since: startDate,
});

const uniqueUsers = new Set(
  completionStatements.map((s) => s.actor.account.name),
);

const completionRate = uniqueUsers.size / totalEnrolledUsers;
```

#### Average Quiz Score

```typescript
const quizStatements = await lrsClient.getStatements({
  verb: 'https://wiki.haski.app/variables/xapi.answered',
  activity: quizActivityId,
});

const scores = quizStatements
  .filter((s) => s.result?.score?.scaled !== undefined)
  .map((s) => s.result.score.scaled);

const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
```

## Example Statements

Full example statements are saved in `/docs/resources/xapi/examples/`:

**Use Case Examples**:

- `example-completed.json` - Module completion with course context
- `example-answered-question.json` - H5P quiz response with score/duration
- `example-login.json` - User authentication
- `example-course-viewed.json` - Course access
- `example-user-activity.json` - User activity timeline (10 statements)

**By Verb** (27 examples organized by action type):

- `verb-xapi.clicked.json`, `verb-xapi.completed.json`, `verb-xapi.answered.json`, etc.

**By Object Type** (13 examples organized by content type):

- `object-type-lms.json`, `object-type-course.json`, `object-type-module.json`, etc.

**Analysis Summary**:

- `summary-report.json` - Complete distribution analysis

## Traceability to Requirements

- **REQ-FN-002**: LRS Integration - Account-based queries, HTTP Basic Auth
- **REQ-FN-005**: Multi-instance filtering via `actor.account.homePage` and `context.extensions.domain`
- **REQ-FN-006**: Cacheable by `metricId:instanceId:scope:filters`
- **REQ-NF-004**: Deterministic metrics - same statements produce same results
- **REQ-NF-013**: Statement tagging with `_instanceId` derived from `actor.account.homePage`

## Query Scripts

Exploration scripts used to generate this documentation:

- `/scripts/query-lrs-moodle.ts` - Basic LRS query and analysis
- `/scripts/explore-moodle-statements.ts` - Comprehensive exploration with example generation

Run with: `npx ts-node scripts/explore-moodle-statements.ts`

## References

- [Moodle-xAPI-Plugin Repository](https://github.com/HASKI-RAK/Moodle-xAPI-Plugin)
- [HASKI Frontend Repository](https://github.com/HASKI-RAK/HASKI-Frontend)
- [xAPI LRS API Documentation](API-lrs-documentation.md)
- [LAAC Architecture](../../architecture/ARCHITECTURE.md)
- [Metrics Specification](../../Metrics-Specification.md)

---

**Maintainer**: LAAC Development Team  
**Last Updated**: 2025-11-10  
**Analysis Method**: Direct LRS queries (50 statement sample)
