## Moodle xAPI Plugin Statement Shape

Every emitted xAPI statement adheres to the standard 1.0.x structure:

```json
{
  "actor": { ... },
  "verb": { "id": "...", "display": { "en": "..." } },
  "object": {
    "id": "https://your-moodle.example/.../resource",
    "definition": {
      "name": { "en": "..." },
      "description": { "en": "..." },        // Present for some activities
      "type": "http://.../activitytype/...",
      "interactionType": "fill-in",          // Only when relevant (e.g. H5P, quiz interactions)
      "extensions": { ... }                  // Adds LMS- or event-specific metadata
    }
  },
  "result": {
    "score": { "raw": 7, "max": 10, "scaled": 0.7 },
    "duration": "PT35S",
    "completion": true,
    "success": true
  },
  "context": {
    "platform": "Moodle",
    "language": "en",
    "extensions": { ... },                  // Event / site / session details
    "contextActivities": {
      "parent":   [ courseObject, courseModuleObject, ... ],
      "grouping": [ siteObject, sometimes H5P local content id wrapper ]
    }
  },
  "timestamp": "2025-11-10T12:34:56Z"
}
```

Not all fields appear in every statement (e.g. `result` only for graded / interactive events).

---

## 2. Actor Construction

The actor is built by a utility (get_user). It conditionally includes different identifiers based on configuration flags:

- `send_mbox`: If true and the user’s email is valid, actor is `{ "name": "<Full Name>", "mbox": "mailto:user@example.com" }`.
- `send_username`: If true, actor uses an xAPI `account` object:  
  `{ "name": "<Full Name>", "account": { "homePage": "<app_url>", "username": "<moodle_username>" } }`.
- Pseudonymization (`send_pseudo` used elsewhere in activity builders): When active, user IDs and sometimes names are SHA‑1 hashed before inclusion.
- Default (when neither mbox nor username chosen): Fallback usually provides an `account` referencing the LMS with an internal identifier (often user ID). (The code path after the shown snippet handles this.)

Your retrieval logic must be prepared for different actor identifier schemes across deployments.

---

## 3. Verbs

Custom verbs are hosted under `https://wiki.haski.app/variables/xapi.*`. Examples extracted from the event transformers:

- `https://wiki.haski.app/variables/xapi.created` → “created”
- `https://wiki.haski.app/variables/xapi.updated` → “updated”
- `https://wiki.haski.app/variables/xapi.deleted` or analogous (deleted events)
- `https://wiki.haski.app/variables/xapi.clicked` → “clicked”
- `https://wiki.haski.app/variables/xapi.answered` → “answered”

Your app can filter by `verb` using these IDs.

---

## 4. Object (Activity) Construction

Utility functions under `src/transformer/utils/get_activity/*` build objects. Common patterns:

- `id`: A fully qualified Moodle URL (often including parameters like `?id=<cmid>&user=<userid>` for user-specific views).
- `definition.name`: A localized label (language comes from course or platform).
- `definition.type`: Uses vocabularies such as:
  - `http://activitystrea.ms/schema/1.0/page`
  - `http://id.tincanapi.com/activitytype/survey`
  - `http://www.tincanapi.co.uk/activitytypes/grade_classification`
  - `http://activitystrea.ms/schema/1.0/role`
  - Various module-specific types.
- `interactionType`: Included for interactive or question‑like resources (e.g. H5P: `fill-in`).
- `definition.extensions`: Adds LMS-specific metadata (IDs, short codes, user IDs, H5P local content IDs, etc.).

---

## 5. Result Section

Appears for graded / interactive events like H5P statements:

- `score.raw`, `score.max`, `score.scaled`
- `duration`: Constructed from measured seconds into ISO 8601 “PT#H#M#S”
- `completion`: Boolean
- `success`: Boolean

If an exception occurs (e.g. missing data), defaults like `duration = "PT0S"` and `success = false` can appear, with score fields set to null.

---

## 6. Context

Contains:

- `platform`: From `source_name` (e.g. “Moodle”)
- `language`: Course or site language
- `extensions`: A base extension pack (session ID, event metadata, etc.) via `extensions\base(...)`
- `contextActivities`:
  - `parent`: Typically includes the course object and sometimes the course module and specific sub‑activity.
  - `grouping`: Usually includes the site object; for H5P also an array with local H5P identifiers (e.g. `https://h5p.org/x-api/h5p-local-content-id` extension reference chain).

These nested activity references let you aggregate by course, module, or site.

---

## 7. Extensions (Selected Examples)

Definition or context extensions may use URIs like:

- `https://moodle.org/xapi/extensions/user_id`
- `https://w3id.org/learning-analytics/learning-management-system/short-id` (course shortname)
- `https://h5p.org/x-api/h5p-local-content-id`
- Additional site / session identifiers from `extensions\base`.

Your app should treat unknown extension keys generically (store raw key/value).

---

## 8. Timestamp

Set via a utility (`get_event_timestamp`). Standard RFC 3339 string. Use it for time‑range queries (`since`, `until` in the LRS API).

---

## 9. Example: H5P “Answered” Statement

```json
{
  "actor": {
    "name": "Jane Student",
    "account": { "homePage": "https://lms.example", "username": "jstudent" }
  },
  "verb": {
    "id": "https://wiki.haski.app/variables/xapi.answered",
    "display": { "en": "answered" }
  },
  "object": {
    "id": "https://lms.example/mod/h5pactivity/grade.php?id=57&user=42",
    "definition": {
      "name": { "en": "statement for H5P Interactive Video" },
      "description": { "en": "the statement of the h5p activity" },
      "type": "http://www.tincanapi.co.uk/activitytypes/grade_classification",
      "interactionType": "fill-in"
    }
  },
  "result": {
    "score": { "raw": 8, "max": 10, "scaled": 0.8 },
    "duration": "PT35S",
    "completion": true,
    "success": true
  },
  "context": {
    "platform": "Moodle",
    "language": "en",
    "extensions": { "session_id": "test_session_id", "...": "..." },
    "contextActivities": {
      "parent": [
        {
          "id": "https://lms.example/course/view.php?id=23",
          "definition": {
            "type": "http://id.tincanapi.com/activitytype/course"
          }
        },
        {
          "id": "https://lms.example/mod/h5pactivity/view.php?id=57",
          "definition": {
            "type": "http://id.tincanapi.com/activitytype/lms/module"
          }
        }
      ],
      "grouping": [
        {
          "id": "https://lms.example",
          "definition": { "type": "http://id.tincanapi.com/activitytype/site" }
        }
      ]
    }
  },
  "timestamp": "2025-11-10T17:26:20Z"
}
```

(Names/IDs illustrative.)

---

## 10. Example: User Created

```json
{
  "actor": {
    "name": "System Admin",
    "account": { "homePage": "https://lms.example", "username": "admin" }
  },
  "verb": {
    "id": "https://wiki.haski.app/variables/xapi.created",
    "display": { "en": "created" }
  },
  "object": {
    "id": "https://lms.example/user/profile.php?id=512",
    "definition": {
      "name": { "en": "profile of Jane Student" },
      "type": "http://id.tincanapi.com/activitytype/user-profile",
      "extensions": { "https://moodle.org/xapi/extensions/user_id": 512 }
    }
  },
  "context": {
    "platform": "Moodle",
    "language": "en",
    "extensions": { "session_id": "..." },
    "contextActivities": { "grouping": [{ "id": "https://lms.example" }] }
  },
  "timestamp": "2025-11-10T17:26:20Z"
}
```

---

## 11. Example: Course Module “Clicked” (Generic View)

```json
{
  "actor": {
    "name": "Jane Student",
    "account": { "homePage": "https://lms.example", "username": "jstudent" }
  },
  "verb": {
    "id": "https://wiki.haski.app/variables/xapi.clicked",
    "display": { "en": "clicked" }
  },
  "object": {
    "id": "https://lms.example/mod/url/view.php?id=145",
    "definition": {
      "name": { "en": "External Link Resource" },
      "type": "http://adlnet.gov/expapi/activities/link"
    }
  },
  "context": {
    "platform": "Moodle",
    "language": "en",
    "extensions": { "...": "..." },
    "contextActivities": {
      "parent": [
        { "id": "https://lms.example/course/view.php?id=23" },
        { "id": "https://lms.example/mod/url/view.php?id=145" }
      ],
      "grouping": [{ "id": "https://lms.example" }]
    }
  },
  "timestamp": "2025-11-10T17:26:20Z"
}
```

---

## 12. Retrieving Statements from the LRS

The plugin normalizes the configured endpoint (stripping a trailing `/statements` if provided). Your app should query:

```
GET {baseEndpoint}/statements
```

Common query parameters (standard xAPI):

- `verb=...` (filter by verb ID)
- `activity=...` (match `object.id` or sometimes a parent/course ID)
- `agent={JSON}` (filter by actor; JSON must be URL-encoded)
- `since=2025-11-01T00:00:00Z`
- `until=2025-11-10T23:59:59Z`
- `limit=100`
- `ascending=true`
- `registration=...` (if registration UUIDs are used—depends on implementation; not shown in snippets)

Example:

```
GET https://lrs.example/xapi/statements?verb=https://wiki.haski.app/variables/xapi.answered&since=2025-11-10T00:00:00Z
```

Filtering by actor (username case):

```
GET https://lrs.example/xapi/statements?agent=%7B%22account%22%3A%7B%22homePage%22%3A%22https%3A%2F%2Flms.example%22,%22username%22%3A%22jstudent%22%7D%7D
```

---

## 13. Filtering Strategies

- By Course: Use `activity=<course_url>` that appears in `context.contextActivities.parent[0].id`.
- By Module Type: Filter by `activity=<module_view_url>` or post-process by inspecting `object.definition.type`.
- By User: Filter via `agent` matching mbox or account.
- By Performance: For scored events, post-process `result.score` locally (the LRS does not natively aggregate).
- By Duration: Query time range + client-side filter on `result.duration`.

---

## 14. Privacy / Pseudonymization

If `send_pseudo` is enabled, user IDs/names may be SHA‑1 hashed in object IDs or extensions; do not assume numeric user IDs. Treat hashes as opaque identifiers.

If `send_mbox` disabled, you won't get `mbox`—fall back to `account.username` or hashed variant.

Your app should gracefully handle missing score fields (null) or absent extensions.

---

## 15. Batching and Timing

The plugin can send statements:

- Immediately (foreground)
- Via scheduled tasks (background mode) and in batches (controlled by `maxbatchsize`)

Implication: Near‑real‑time dashboards must tolerate slight delays. For historical backfill, large burst arrivals may occur.

Use incremental retrieval with `since` and store the `more` URL (per xAPI spec) to paginate.

---

## 16. Building Your Third‑Party App

Recommended workflow:

1. Configuration: Obtain LRS endpoint, auth username/password (basic auth), and note which actor options are enabled in the Moodle plugin.
2. Initial Harvest: Pull recent statements with a broad `since` window; store their `timestamp` and statement `id`.
3. Normalization Layer:
   - Map custom verbs to internal enums (`clicked`, `answered`, etc.).
   - Extract course/module from `context.contextActivities.parent`.
   - Extract user identifier (choose priority: mbox > account.username > account.userId/hash).
4. Storage: Use a schema that preserves raw `statement` JSON plus parsed facets (`verb_id`, `activity_type`, `course_id`, `user_key`, `timestamp`, `score_scaled`, `duration_seconds`).
5. Incremental Sync: Repeat queries every N minutes using `since=<lastTimestamp>` (plus a small overlap window) to account for clock skew.
6. Error Handling: On HTTP 429/5xx, backoff and resume from last successful page.
7. Extensions: Keep a flexible key-value store; new extension URIs may appear as plugin evolves.
8. Aggregation: Compute analytics (e.g. average scaled score per module) client-side.

---

## 17. Quick Reference of Key URIs Observed

- Verbs: `https://wiki.haski.app/variables/xapi.(created|updated|deleted|clicked|answered)`
- Activity Types (examples):
  - `http://activitystrea.ms/schema/1.0/page`
  - `http://id.tincanapi.com/activitytype/user-profile`
  - `http://www.tincanapi.co.uk/activitytypes/grade_classification`
  - `http://id.tincanapi.com/activitytype/survey`
  - `http://id.tincanapi.com/activitytype/lms/module`
- Extensions:
  - `https://moodle.org/xapi/extensions/user_id`
  - `https://w3id.org/learning-analytics/learning-management-system/short-id`
  - `https://h5p.org/x-api/h5p-local-content-id`

---

## 18. Validation

The repository’s tests validate each generated statement against an xAPI statement validator (LockerStatement) to ensure compliance. Leverage similar validation if you transform or enrich statements before re-exporting.
