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

![Statement example 1]((>
<img src="./media/image5.emf" />

  <figcaption>
    Figure 3: A complete frontend xAPI statement
  </figcaption>
</figure>

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

- **domain:** The domain from which the statement originated.
- **domain_version:** The domain version.
- **github:** URL to the project’s Github repository.
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

[1](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/45392277/5174615e-9879-4fe1-bae7-c10671a970d2/Configuration_of_xAPI_2025-09-02.docx)
