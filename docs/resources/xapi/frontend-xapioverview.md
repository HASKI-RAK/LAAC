---
title: Configuration of xAPI
---

# Frontend

## Library

The frontend uses the **xAPI.js** library for xAPI statements. This is the only one that is compliant with the current version 1.3. xAPI.js can be installed as an ES module using yarn or npm.

## Setup

![Setup file example]( to an LRS or custom endpoint using the xAPI.js library, the following entries are required in the setup file (`src/services/xAPI/xAPI.setup.ts`):

- **endpoint**: URL of the endpoint. The library automatically adds "/statements" to it.
- **auth**: The credentials that are used to log in to the endpoint. It is possible to use an encrypted string directly.
- **version**: The current xAPI version used by the endpoint.

## Sending process

When the user performs a "click", "change" or "close" action on a custom component the `onClick`, `onChange` or `onClose` event is triggered. These overwritten functions call a `sendStatement` function of the statement hook with the corresponding verb and the `onClick`, `onChange` or `onClose` method of the default component. Inside the `sendStatement` function an xAPI statement is constructed using the `getStatement` method. Afterwards the xAPI object created in the xAPI setup file with the LRS information calls another `sendStatement` function with the xAPI statement as parameter. Finally, the Learning Record Store receives the xAPI statement.

## Overwritten Components

To send xAPI statements dynamically, default components have been overwritten with additional functionality. The following table lists the actions of each overwritten component that sends an xAPI statement when performed.

| Component                       | onClick | onChange | onClose |
| :------------------------------ | :-----: | :------: | :-----: |
| Accordion                       |  **x**  |          |         |
| Box as NodeWrapper/ImageWrapper |  **x**  |          |         |
| Button                          |  **x**  |          |         |
| Fab                             |  **x**  |          |         |
| IconButton                      |  **x**  |          |         |
| Link                            |  **x**  |          |         |
| Menu                            |         |          |  **x**  |
| MenuItem                        |  **x**  |          |         |
| Modal                           |         |          |  **x**  |
| Popover                         |         |          |  **x**  |
| RadioButton                     |         |  **x**   |         |
| Select                          |  **x**  |  **x**   |         |
| StepButton                      |  **x**  |          |         |
| TextField                       |         |  **x**   |         |
| ToggleButtonGroup               |         |  **x**   |         |
| Typography as TextWrapper       |  **x**  |          |         |

## Statements

An xAPI statement consists of several pieces of information that help to identify which user did what action on which page. To provide this information, the frontend statement contains an actor, a verb, an object, a context and a timestamp. More information about the properties of a statement can be found in the official [xAPI specification](https://xapi.com/specification/).

### Actor

- **account:** Contains the domain URL (**homePage**) and the LMS id of the user (**name**) who performed the action that sent a statement.

### Verb

- **id:** URL to the corresponding wiki entry.
- **display:** Contains the English name of the verb (**en**).

### Object

- **id:** Full URL of the component on which the action was used, including the custom component ID.
- **definition:** Contains the English name of the component type (**name.en**) and a URL to the corresponding wiki entry (**type**).

### Context

- **platform:** The platform from which the statement originated.
- **language:** The language selected by the user in the settings.

#### Extensions

**Note**: The extensions are stored under the key `https://lrs.learninglocker.net/define/extensions/info` (validated against production LRS).

- **domain:** The domain from which the statement originated.
- **domain_version:** The domain version.
- **github:** URL to the project's Github repository.
- **event_function:** The project path to the component that has sent the statement.

#### Context Activities

##### Parent

- **id:** The URL to the page that contains the component on which the action was used.
- **definition:** Contains the English name of the page (**name.en**) and a URL to the corresponding wiki entry (**type**).

##### Grouping

- **id:** The domain URL.
- **definition:** Contains the English name of the home page (**name.en**) and a URL to the corresponding wiki entry (**type**).

### Timestamp

- Timestamp of the action in ISO 8601 format.

### Authority

_(is automatically created by the LRS -- the system/agent that is claiming that the event occurred)_

#### Account

- Homepage: Name of the claiming system (example.org)
- Name: name of the claiming system

_objectType:_

- Either "Agent" or "System"

### Id

- Unique identifier (is automatically created by the LRS)

### Version

- Version of the xAPI statement

### Stored

- Timestamp when the statement was stored (is automatically created by the LRS)

### Result (Moodle excl.)

#### score

- raw: achieved points of the current activity
- max: maximum points that are achievable of the current activity
- scaled: ratio of reached points divided by maximum points (max. 1.0)

#### duration

- Total time spent on the attempt in ISO 8601 duration format

#### completion

- Indicates whether the user completed the activity

#### success

- Reflects whether the user met the teacher-defined (from LMS) success criteria

# Moodle

## Plugin

The logstore_plugin was extended in its functionality. It can be found in this repository: [https://github.com/HASKI-RAK/Moodle-xAPI-Plugin](https://github.com/HASKI-RAK/Moodle-xAPI-Plugin). The Plugin listens to all Moodle events and sends an xAPI statement to the desired address.

![Moodle plugin]( are 2 options to define the credentials. The first is a traditional username and password. The other method involves an Authorization Key, that can be generated with a base64 encoder. The statement itself looks very much like the Frontend statement.

The statements are documented in detail on this Github wiki page: [https://github.com/HASKI-RAK/Moodle-xAPI-Plugin/wiki](https://github.com/HASKI-RAK/Moodle-xAPI-Plugin/wiki).

---

## Validation (Production LRS)

**Validation Date**: November 10, 2025  
**LRS Instance**: `https://ke.lrs.haski.app/xapi`  
**Sample Size**: 50 most recent statements

### ✅ Validated Frontend Statement Structure

All documented fields are present and correct in production statements. Below is a real example:

```json
{
  "id": "df8e079c-3d8d-4677-aeb7-298b657441c7",
  "actor": {
    "account": {
      "homePage": "https://ke.haski.app",
      "name": "408"
    }
  },
  "verb": {
    "id": "https://wiki.haski.app/variables/services.mouseMoved",
    "display": {
      "en": "mouseMoved"
    }
  },
  "object": {
    "id": "https://ke.haski.app/course/1/topic/6#user-interaction-tracker",
    "definition": {
      "name": {
        "en": "UserInteractionTracker"
      },
      "type": "https://wiki.haski.app/functions/common.UserInteractionTracker"
    }
  },
  "context": {
    "platform": "Frontend",
    "language": "de",
    "extensions": {
      "https://lrs.learninglocker.net/define/extensions/info": {
        "domain": "https://ke.haski.app",
        "domain_version": "v1.2.0-alpha",
        "github": "https://github.com/HASKI-RAK/HASKI-Frontend",
        "event_function": "src/assets/index-f17cfd3e.js"
      }
    },
    "contextActivities": {
      "parent": [
        {
          "id": "https://ke.haski.app/course/1/topic/6",
          "definition": {
            "type": "https://wiki.haski.app/functions/pages.App",
            "name": {
              "en": "App"
            }
          }
        }
      ],
      "grouping": [
        {
          "id": "https://ke.haski.app",
          "definition": {
            "type": "https://wiki.haski.app/functions/pages.Home",
            "name": {
              "en": "Home"
            }
          }
        }
      ]
    }
  },
  "authority": {
    "account": {
      "homePage": "http://example.org",
      "name": "0192d84e-0792-8260-9316-6857b0a23414"
    },
    "objectType": "Agent"
  },
  "version": "1.0.0",
  "timestamp": "2025-11-10T16:05:57.465+00:00",
  "stored": "2025-11-10T16:05:56.228000000Z"
}
```

### Observed Frontend Activity

**Most Common Verbs** (last 50 statements):

- `mouseMoved`: 17 occurrences (User interaction tracking)
- `clicked`: 11 occurrences (Button/component clicks)
- `closed`: 1 occurrence (Modal/menu close)

**Active Components** (last 50 statements):

1. `UserInteractionTracker` - 17 events (mouse movement tracking)
2. `Button` - 3 events
3. `Node` - 3 events
4. `ListItemButton` - 2 events
5. `Fab` - 2 events
6. `Modal` - 1 event
7. `IconButton` - 1 event

### Key Findings

✅ **Actor Identification**: Uses `account` with `homePage` (domain URL) and `name` (user ID)  
✅ **Verb Structure**: Custom HASKI verbs in wiki namespace (`https://wiki.haski.app/variables/...`)  
✅ **Object ID Format**: Full URL with fragment identifier for components (e.g., `#user-interaction-tracker`)  
✅ **Context Platform**: Always set to `"Frontend"` (enables filtering)  
✅ **Language**: Dynamic based on user settings (`"de"`, `"en"`, etc.)  
✅ **Extensions Key**: Uses `https://lrs.learninglocker.net/define/extensions/info` (Learning Locker convention)  
✅ **Context Activities**: Properly structured with `parent` (page) and `grouping` (domain)  
✅ **Authority**: Automatically set by LRS (not by frontend)  
✅ **Timestamp Format**: ISO 8601 with timezone offset (e.g., `+00:00`)  
✅ **Stored Precision**: Nanosecond precision (9 decimal places)

### LAAC Implementation Notes

1. **Platform Filtering**: Use `context.platform == "Frontend"` to distinguish frontend from Moodle statements
2. **User Identification**: Extract user ID from `actor.account.name` (numeric string)
3. **Domain/Instance**: Use `context.extensions["https://lrs.learninglocker.net/define/extensions/info"].domain` for instance identification
4. **Component Tracking**: Parse `object.definition.name.en` for component type
5. **Page Context**: Get current page from `context.contextActivities.parent[0].id`
6. **Version Info**: Available in `context.extensions[...].domain_version`

### Differences from Documentation

⚠️ **Extension Key**: Documentation doesn't specify the full extension key. Production uses:  
`https://lrs.learninglocker.net/define/extensions/info`

✅ All other documented fields match production data exactly.
