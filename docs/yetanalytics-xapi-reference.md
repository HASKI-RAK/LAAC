# LAAC ⇄ Yet Analytics SQL LRS (lrsql) — xAPI Integration Guide

## 1) Base URL & Authentication

* **Base path**: all xAPI routes are under `/xapi`, e.g. `https://<lrs-host>/xapi`. The server can be configured to use a different path prefix internally, but `/xapi` is the default for the xAPI surface.
* **xAPI auth**: HTTP **Basic** with API key & secret (`apiKey:apiSecret`) base64‑encoded in the `Authorization` header:
  `Authorization: Basic <base64(apiKey:apiSecret)>`.
* **Admin auth** (for provisioning credentials only): obtain a JWT from `POST /admin/account/login`, then call `/admin/creds` endpoints with `Authorization: Bearer <jwt>`.

### Quick smoke test (store one statement)

```bash
curl -X POST https://<host>/xapi/statements \
  -u '<apiKey>:<apiSecret>' \
  -H 'X-Experience-API-Version: 1.0.3' \
  -H 'Content-Type: application/json' \
  -d '{
        "actor": {"mbox":"mailto:mike@example.org","name":"Mike"},
        "verb":  {"id":"http://example.org/verb/did","display":{"en-US":"Did"}},
        "object":{"id":"http://example.org/activity/activity-1",
                  "definition":{"name":{"en-US":"Activity 1"},
                                 "type":"http://example.org/activity-type/generic-activity"}} }'
# → ["550e8400-e29b-41d4-a716-446655440000"]
```

On success, **the response is a JSON array of UUID(s)** (the statement id(s) that were stored). It does **not** echo the full statement(s). ([yetanalytics.github.io][3])

---

## 2) Required headers & versions

* **`X-Experience-API-Version`**: lrsql supports **`1.0.3`** and **`2.0.0`**. Always send this header.

  * lrsql can enforce strict compatibility for 1.0.3 reads by normalizing away 2.0 fields when you **enable** `LRSQL_ENABLE_STRICT_VERSION`. See also `LRSQL_SUPPORTED_VERSIONS` and `LRSQL_REACTION_VERSION`. ([yetanalytics.github.io][2])
* **`Content-Type`**: typically `application/json`. Use `multipart/mixed` when **sending attachments**. ([xapi.ieee-saopen.org][1])
* **`Accept`**: use `application/json`. If you request statements with `attachments=true`, the LRS responds as **multipart/mixed** to include binaries. ([xapi.ieee-saopen.org][1])
* **Concurrency** (Documents APIs): for `PUT`/`POST`/`DELETE` on **state/profile** endpoints, include **`If-Match`** or **`If-None-Match`** (ETag‑based optimistic concurrency). ([xapi.ieee-saopen.org][1])

---

## 3) Statement API

### 3.1 Shapes

**Minimal Statement**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",     // optional on POST; LRS will set if absent
  "actor": { "mbox": "mailto:alice@example.org", "name": "Alice" },
  "verb":  { "id": "http://adlnet.gov/expapi/verbs/experienced",
             "display": {"en-US": "experienced"} },
  "object": { "id": "https://example.org/activities/solo-hang-gliding" },
  "timestamp": "2025-10-15T12:34:56Z"               // optional; if omitted LRS sets based on 'stored'
}
```

This format, including the roles of **actor/verb/object**, is defined by the xAPI spec (see the Statement, Actor, Verb, Object, Result, Context tables). ([xapi.ieee-saopen.org][1])

**POST /xapi/statements**

* **Body**: a single Statement or an array of Statements.
* **Returns**: `200 OK` with a JSON **array of statement id(s)** in the same order as the submitted statements. Example:

```json
["550e8400-e29b-41d4-a716-446655440000", "2c4bb3e2-4a8a-4cd0-8d5b-54d56d8a6cde"]
```

Spec detail: When `POST`ing a batch that includes duplicate ids, LRS must reject the batch with `400`. ([xapi.ieee-saopen.org][1])

**PUT /xapi/statements?statementId=<uuid>**

* **Body**: a single Statement (its `id`, if present, must match `statementId`).
* **Returns**: `204 No Content` (idempotent). ([xapi.ieee-saopen.org][1])

**GET /xapi/statements**

* **Single fetch**: `?statementId=<uuid>` or `?voidedStatementId=<uuid>` → the exact Statement.
* **Query** (collection): supports `agent` (JSON), `verb` (IRI), `activity` (IRI), `registration` (UUID), `related_agents`, `related_activities`, `since`, `until`, `limit`, `attachments`, `ascending`, `format=ids|exact|canonical`.
* **Returns**: a **StatementResult** object:

```json
{
  "statements": [ /* array of Statement objects */ ],
  "more": "/xapi/statements?session=abc&more=xyz"
}
```

Notes:

* The **`more`** value is a **relative path** you call (with the same auth/headers) to continue paging; empty string means no more. ([xapi.readthedocs.io][4])
* The server includes **`X-Experience-API-Consistent-Through`** on responses to indicate the time through which results are complete; use this for safe, incremental pulls. ([xapi.ieee-saopen.org][1])
* With `attachments=true`, the response is **multipart/mixed** and includes the JSON part first followed by one part per attachment. ([xapi.ieee-saopen.org][1])
* `format=canonical` applies **language filtering** and canonicalizes Activity/Verb display; `Accept-Language` influences which language is selected. ([xapi.ieee-saopen.org][1])

**lrsql paging limits**

* lrsql’s default `limit` if omitted is controlled by environment variable **`LRSQL_STMT_GET_DEFAULT`** (default **50**); the maximum allowed per request is **`LRSQL_STMT_GET_MAX`** (default **50**). If you send `limit=0` the spec allows “use server maximum.” ([yetanalytics.github.io][2])

### 3.2 Attachments (send)

When you **send attachments**, you must use **`multipart/mixed`** with:

* Part 1 = the Statement(s) JSON (`Content-Type: application/json`).
* Each attachment as a subsequent part with:

  * `Content-Type: <binary media type>`
  * `Content-Transfer-Encoding: binary`
  * `X-Experience-API-Hash: <sha2-of-bytes>` (must match the statement’s `attachments[].sha2`). ([xapi.ieee-saopen.org][1])

**Skeleton**

```
POST /xapi/statements
Content-Type: multipart/mixed; boundary=ABC
X-Experience-API-Version: 2.0.0
Authorization: Basic <...>

--ABC
Content-Type: application/json

{ "actor": {...}, "verb": {...}, "object": {...},
  "attachments": [ { "usageType": "https://w3id.org/xapi/video/attachments/thumbnail",
                     "display": {"en-US":"Thumbnail"},
                     "contentType":"image/png",
                     "length": 12345,
                     "sha2":"<SHA256 hex>" } ] }
--ABC
Content-Type: image/png
Content-Transfer-Encoding: binary
X-Experience-API-Hash: <SHA256 hex>

<binary bytes...>
--ABC--
```

Reference: xAPI multipart rules (what each part must contain) and LRS acceptance requirements. ([xapi.ieee-saopen.org][1])

### 3.3 Query examples

* **By activity (canonical format, oldest first, page 200)**

```bash
curl -G https://<host>/xapi/statements \
  -u '<apiKey>:<apiSecret>' \
  -H 'X-Experience-API-Version: 2.0.0' \
  --data-urlencode 'activity=https://example.org/activities/solo-hang-gliding' \
  --data-urlencode 'ascending=true' \
  --data-urlencode 'format=canonical' \
  --data-urlencode 'limit=200'
```

* **By agent** (note the **JSON‑encode then URL‑encode** for the `agent` parameter):

```bash
curl -G https://<host>/xapi/statements \
  -u '<apiKey>:<apiSecret>' \
  -H 'X-Experience-API-Version: 1.0.3' \
  --data-urlencode 'agent={"mbox":"mailto:alice@example.org"}'
```

Encoding the Agent JSON into the query string is the spec’s intended approach. ([xapi.ieee-saopen.org][1])

---

## 4) Activities & Agents lookup

### 4.1 **GET /xapi/activities?activityId=<iri>**

* Returns the **canonical Activity Object** (same shape as appears inside Statements), even if the LRS only has minimal information. Example:

```json
{
  "objectType": "Activity",
  "id": "https://example.org/activities/solo-hang-gliding",
  "definition": {
    "name": { "en-US": "Solo Hang Gliding" },
    "description": { "en-US": "Intro experience" },
    "type": "http://adlnet.gov/expapi/activities/lesson",
    "moreInfo": "https://example.org/activities/solo-hang-gliding/about"
  }
}
```

Behavior per spec; LRS must still return an Activity object even if it has no canonical definition stored. ([xapi.ieee-saopen.org][1])

### 4.2 **GET /xapi/agents?agent=<json>**

* Returns a **Person Object** (an Agent‑like view with **arrays** for each identifier). Example:

```json
{
  "objectType":"Person",
  "name":["Alice"],
  "mbox":["mailto:alice@example.org"],
  "mbox_sha1sum":[],
  "openid":[],
  "account":[{"homePage":"https://id.example.org","name":"alice-id"}]
}
```

See the Person Object table (arrays for properties like `name`, `mbox`, etc.). ([xapi.ieee-saopen.org][1])

---

## 5) Documents & Metadata APIs

These endpoints persist **documents** (arbitrary JSON or binary) keyed by activity/agent/registration. Remember **ETags** with `If-Match`/`If-None-Match` on writes/deletes.

| Endpoint                                       | What it does                                                                      | Notes                                                                                                                                                                              |
| ---------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET/PUT/POST/DELETE /xapi/activities/state`   | Per‑learner **state** docs (scratch space to persist progress, savepoints, etc.). | `activityId` (IRI), `agent` (JSON), `stateId` (string), optional `registration` (UUID). `GET`/`DELETE` with **no `stateId`** operate on the *collection* (ids list or delete all). |
| `GET/PUT/POST/DELETE /xapi/activities/profile` | Activity‑level docs.                                                              | `activityId`, `profileId`.                                                                                                                                                         |
| `GET/PUT/POST/DELETE /xapi/agents/profile`     | Agent‑level docs.                                                                 | `agent` (JSON), `profileId`.                                                                                                                                                       |

Spec requirements: which methods are allowed and when you must include **If‑Match / If‑None‑Match**. ([xapi.ieee-saopen.org][1])

**Examples**

* **PUT a single state doc**

```bash
curl -X PUT 'https://<host>/xapi/activities/state?activityId=https%3A%2F%2Fexample.org%2Fcourse%2F1&stateId=progress&agent=%7B%22mbox%22%3A%22mailto%3Aalice%40example.org%22%7D' \
  -u '<apiKey>:<apiSecret>' \
  -H 'X-Experience-API-Version: 2.0.0' \
  -H 'If-None-Match: *' \
  -H 'Content-Type: application/json' \
  --data '{"lesson":5,"score":0.82}'
# → 204 No Content
```

* **GET all state ids for an (activity,agent[,registration])**

```bash
curl -G 'https://<host>/xapi/activities/state' \
  -u '<apiKey>:<apiSecret>' \
  -H 'X-Experience-API-Version: 2.0.0' \
  --data-urlencode 'activityId=https://example.org/course/1' \
  --data-urlencode 'agent={"mbox":"mailto:alice@example.org"}'
# → ["progress","notes","bookmark"]
```

Shapes/semantics: state is keyed by `(activityId, agent, [registration], stateId)`; listing returns **array of ids**; single GET returns the **document body** with its content type; deletes return `204`. ([xapi.ieee-saopen.org][1])

---

## 6) About endpoint

**GET /xapi/about** → returns basic LRS metadata:

```json
{
  "version": ["1.0.3","2.0.0"],   // xAPI versions supported
  "extensions": {
    "https://example.org/ext/some-feature": { "value": true }
  }
}
```

The `version` array is **required**; `extensions` is optional and LRS‑defined. ([xapi.ieee-saopen.org][1])

---

## 7) Admin endpoints (for setup only)

While LAAC at runtime should call only `/xapi/*`, you’ll often need to **provision** or **rotate** credentials:

* `POST /admin/account/login` → `{"jwt":"<token>"}`
* `POST /admin/creds` → create new API key/secret with scopes
* `GET /admin/creds` → list
* `PUT /admin/creds` → update scopes
* `DELETE /admin/creds` → revoke
* `GET /admin/openapi` → OpenAPI JSON for the whole surface

All `/admin/*` require `Authorization: Bearer <jwt>` **except** login.

---

## 8) Error codes (what you should expect)

Common statuses the spec calls out across resources:

* `400` malformed JSON / invalid object structure
* `401` auth missing/invalid
* `403` credentials valid but not permitted
* `404` not found (e.g., single Statement or a specific document id)
* `409` conflict (e.g., duplicate id on store)
* `412` precondition failed (ETag mismatch)
* `413` entity too large (statement or attachment)
* `429` rate limited
* `500` server error ([xapi.ieee-saopen.org][1])

---

## 9) Practical polling strategy for LAAC

* Always send `X-Experience-API-Version`. For new builds, prefer **2.0.0**, but coordinate with upstream senders/consumers.
* Use **`since`** and **`ascending=true`** to read forward in time and keep a durable **watermark** (the last processed statement’s `stored` value). ([xapi.ieee-saopen.org][1])
* On each page, record the response header **`X‑Experience‑API‑Consistent‑Through`**; don’t advance your watermark past that value. This avoids missing late‑arriving statements. ([xapi.ieee-saopen.org][1])
* Follow `more` **immediately** until it’s empty. (The spec permits either cached or live `more` behavior; implementations may change or expire these IRLs.) ([xapi.ieee-saopen.org][1])
* If you need binaries (e.g., certificates), request the same query with `attachments=true` and handle **multipart/mixed**. Otherwise, leave `attachments=false` to keep responses JSON‑only. ([xapi.ieee-saopen.org][1])

---

## 10) Versioning notes (1.0.3 vs 2.0.0)

* lrsql supports both **1.0.3** and **2.0.0**. You can enable **strict 1.0.3** downgrading for GETs to strip/normalize fields not allowed in 1.0.3 (`LRSQL_ENABLE_STRICT_VERSION=true`). ([yetanalytics.github.io][2])
* Statements **retain** the version they were accepted with; if no `version` is present, LRS sets it to 2.0.0. ([xapi.ieee-saopen.org][1])

---

## 11) Handy cURL cookbook

* **Get latest 500 statements for an activity, with attachments embedded**

```bash
curl -G https://<host>/xapi/statements \
  -u '<apiKey>:<apiSecret>' \
  -H 'X-Experience-API-Version: 2.0.0' \
  --data-urlencode 'activity=https://example.org/activities/solo-hang-gliding' \
  --data-urlencode 'since=2025-10-01T00:00:00Z' \
  --data-urlencode 'limit=500' \
  --data-urlencode 'attachments=true'
# → multipart/mixed; first part is JSON {statements, more}, then binary parts
```

* **Retrieve a canonical Activity definition**

```bash
curl -G 'https://<host>/xapi/activities' \
  -u '<apiKey>:<apiSecret>' \
  -H 'X-Experience-API-Version: 2.0.0' \
  --data-urlencode 'activityId=https://example.org/activities/solo-hang-gliding'
```

* **Fetch Person (Agent resolution)**

```bash
curl -G 'https://<host>/xapi/agents' \
  -u '<apiKey>:<apiSecret>' \
  -H 'X-Experience-API-Version: 2.0.0' \
  --data-urlencode 'agent={"mbox":"mailto:alice@example.org"}'
```

* **Check what the LRS supports**

```bash
curl https://<host>/xapi/about \
  -u '<apiKey>:<apiSecret>' \
  -H 'X-Experience-API-Version: 2.0.0'
# → { "version": ["1.0.3","2.0.0"], "extensions": {...} }
```

---

## 12) Reference shapes (for quick copy)

**StatementResult**

```json
{
  "statements": [ /* Statement, Statement, ... */ ],
  "more": "/xapi/statements?session=abcd&page=2"  // relative; empty string if none
}
```

* `more` is a **relative IRL** (relative URL); call it with the same headers/auth. ([xapi.readthedocs.io][4])

**Person (from /agents)**

```json
{
  "objectType":"Person",
  "name":["..."],
  "mbox":["mailto:..."],
  "mbox_sha1sum":[],
  "openid":[],
  "account":[{"homePage":"https://...","name":"..."}]
}
```

See Agents Resource → Person Object table. ([xapi.ieee-saopen.org][1])

**Activity (from /activities)**

```json
{
  "objectType": "Activity",
  "id": "https://example.org/activities/...",
  "definition": {
    "name": {"en-US": "..."}, "description": {"en-US": "..."},
    "type": "http://adlnet.gov/expapi/activities/...", "moreInfo": "https://..."
  }
}
```

Spec behavior for Activities Resource. ([xapi.ieee-saopen.org][1])

**About**

```json
{ "version": ["1.0.3","2.0.0"], "extensions": {} }
```

Required `version` array per spec. ([xapi.ieee-saopen.org][1])

---

## 13) lrsql‑specific knobs you may care about

* **Statement paging**: `LRSQL_STMT_GET_DEFAULT`, `LRSQL_STMT_GET_MAX`, `LRSQL_STMT_GET_MAX_CSV`. Defaults: 50, 50, -1 (no cap for CSV). ([yetanalytics.github.io][2])
* **URL prefix** used in constructing `more`: `LRSQL_URL_PREFIX` (defaults to `/xapi`). Handy if you reverse‑proxy under a sub‑path. ([yetanalytics.github.io][2])
* **Strict versioning**: `LRSQL_ENABLE_STRICT_VERSION` and `LRSQL_SUPPORTED_VERSIONS`. ([yetanalytics.github.io][2])

---

## Sources (primary)

* **lrsql docs (official)** — HTTP endpoints, versioning, env vars, startup examples. ([yetanalytics.github.io][5])
* **xAPI 2.0 Base Standard (IEEE/ADL)** — Statements, query params, error codes, multipart attachments, resources (statements, activities, agents, profiles, state), about, language filtering, consistency header. ([xapi.ieee-saopen.org][1])
* **`more` semantics (relative IRL)** — client‑library docs summarizing the spec’s expected behavior. ([xapi.readthedocs.io][4])

---

### Final checks for your existing doc

* **Change** “`POST /xapi/statements` … *Returns stored statements with server‑generated IDs*” → **Returns an array of stored statement IDs**. ([xapi.ieee-saopen.org][1])
* **Change** “default `limit` 100” → **lrsql default is 50 unless you configure `LRSQL_STMT_GET_DEFAULT`**. ([yetanalytics.github.io][2])
* Keep the note that `agent` and other complex params must be JSON‑encoded and URL‑escaped; that’s how the spec expects you to pass them. ([xapi.ieee-saopen.org][1])

If you want, I can turn this into a one‑page Markdown you can drop straight into your repo, or a Postman collection mirroring the examples above.

[1]: https://xapi.ieee-saopen.org/standard/ "Draft xAPI Base Standard - IEEE SA OPEN"
[2]: https://yetanalytics.github.io/lrsql/env_vars.html "Yet SQL LRS Documentation"
[3]: https://yetanalytics.github.io/lrsql/startup.html "Yet SQL LRS Documentation"
[4]: https://xapi.readthedocs.io/en/latest/?utm_source=chatgpt.com "xapi"
[5]: https://yetanalytics.github.io/lrsql/ "Yet SQL LRS Documentation"
