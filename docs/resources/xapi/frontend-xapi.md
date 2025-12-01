# Struktur der xAPI-Statements im Frontend

## Überblick

Das Frontend nutzt die Bibliothek `react-xapi-wrapper`, um Lernaktivitäten automatisch als xAPI-Statements an ein Learning Record Store (LRS) zu senden.
Die Initialisierung, Kontextweitergabe und Instrumentierung der UI-Komponenten sind durchgängig über zentrale Stellen gekapselt, sodass Komponenten ohne manuellen Netzwerkcode Messpunkte erzeugen können.【F:src/pages/App/App.tsx†L1-L71】

## Laufzeitkonfiguration

Beim Start der Anwendung lädt `src/index.tsx` eine laufzeitabhängige Konfigurationsdatei (`/config/env.<NODE_ENV>.json`) und legt ihren Inhalt über `setConfig` in einem globalen Speicher ab.【F:src/index.tsx†L11-L36】
Die Konfigurationsdatei enthält unter anderem den LRS-Endpunkt, optionale Basis-Authentifizierungsdaten sowie Metadaten-Links, die später in den Statements verwendet werden.【F:public/config/env.development.json†L2-L13】

## Initialisierung des xAPI-Clients

Der Hook `useApp` liest den aktuellen Benutzer aus dem Persistenz-Store, ermittelt die zuletzt verwendete Sprache aus dem Local Storage und ruft anschließend `setupXAPI` aus `react-xapi-wrapper` auf.【F:src/pages/App/App.hooks.tsx†L28-L47】
Dabei werden zahlreiche Metadaten konfiguriert, die in jedes Statement einfließen:

- `currentLanguage` zur Lokalisierung der Statement-Inhalte.【F:src/pages/App/App.hooks.tsx†L33-L56】
- `projectURL`, `projectVersion` und `repositories`, die auf weiterführende Dokumentation in der Projekt-Wiki verweisen.【F:src/pages/App/App.hooks.tsx†L57-L63】
- `userID`, das die LRS-Akte über den Moodle-Benutzer verknüpft.【F:src/pages/App/App.hooks.tsx†L42-L65】
- `xAPI.auth`, `xAPI.endpoint` und `xAPI.version` zur Authentifizierung sowie zum Transportziel.【F:src/pages/App/App.hooks.tsx†L65-L72】
  Fehler beim Laden von Benutzer oder LRS werden über `loglevel` geloggt, sodass Probleme mit fehlgeschlagenen Statements nachvollzogen werden können.【F:src/pages/App/App.hooks.tsx†L42-L57】
  Der Hook stellt das konfigurierte `xAPI`-Objekt als Kontextwert bereit, sobald `setupXAPI` erfolgreich abgeschlossen ist.【F:src/pages/App/App.hooks.tsx†L52-L78】

## Kontextbereitstellung und globale Ereignisse

Die Komponente `App` bezieht das `xAPI`-Objekt aus `useApp` und injiziert es über `XAPIProvider` in den React-Komponentenbaum.【F:src/pages/App/App.tsx†L35-L71】
Zusätzlich aktiviert `UserInteractionTracker` globale Listener (z. B. Scroll-, Fokus- oder Sichtbarkeitsereignisse) für die gesamte Anwendung. Er erhält dafür Metadaten wie `componentFilePath`, `componentType` und eine feste `pageName`-Kennung, die in die Statements übernommen werden.【F:src/pages/App/App.tsx†L45-L50】

## Instrumentierung wiederverwendbarer UI-Komponenten

Alle Standardkomponenten im Ordner `src/common/components` werden über den Higher-Order-Component `withXAPI` in xAPI-fähige Varianten verwandelt. Am Beispiel des `DefaultButton`:

- `withXAPI` ergänzt den Material-UI-Button um automatische Statement-Erzeugung und versieht ihn mit Metadaten (`componentFilePath`, `componentType`).【F:src/common/components/DefaultButton/DefaultButton.tsx†L24-L27】
- Der resultierende Wrapper akzeptiert neben den ursprünglichen MUI-Props auch die generischen `EventHandlers` des Wrappers. Dadurch können Interaktionen wie `onClick`, `onFocus` oder `onChange` Statements auslösen.【F:src/common/components/DefaultButton/DefaultButton.tsx†L1-L13】
- Vor dem Rendern ermittelt jede Wrapper-Komponente über `usePageName` den englischen Seitennamen und übergibt ihn an `withXAPI`. Der Seitenname dient später als Teil des Kontextes im Statement.【F:src/common/components/DefaultButton/DefaultButton.tsx†L41-L43】
  Dieses Muster wird für Checkboxen, Radio-Gruppen, Links, Modals und weitere Bausteine wiederverwendet, sodass sämtliche Standardinteraktionen zentral und konsistent erfasst werden.【F:src/common/components/DefaultCheckbox/DefaultCheckbox.tsx†L1-L44】

## Seitenerkennung

Der Hook `usePageName` analysiert die aktuelle URL, entfernt numerische IDs und übersetzt den letzten Pfadbestandteil mit der englischen Sprachresource (`pages.<slug>`). Leerzeichen werden entfernt, um einen stabilen Identifier zu erhalten.【F:src/services/PageName/PageName.hooks.tsx†L27-L45】
Auf diese Weise besitzen alle Statements einen sprachunabhängigen, maschinenlesbaren `pageName`, auch wenn der Benutzer die Oberfläche in einer anderen Sprache nutzt.

## Struktur der erzeugten Statements

Durch die oben beschriebenen Bausteine enthalten alle gesendeten Statements folgende strukturierte Informationen:

- **Aktor**: aus `userID`, das auf dem im Store hinterlegten Moodle-Benutzer basiert.【F:src/pages/App/App.hooks.tsx†L42-L65】【F:node_modules/react-xapi-wrapper/dist/index.esm.js†L1-L1】
- **Verb** und **Objekt**: werden vom `react-xapi-wrapper` gemäß ausgelöstem Ereignis bestimmt; die Komponenten liefern dafür `componentType` und `pageName` als Kontext.【F:src/common/components/DefaultButton/DefaultButton.tsx†L24-L43】【F:src/services/PageName/PageName.hooks.tsx†L27-L45】【F:node_modules/react-xapi-wrapper/dist/index.esm.js†L1-L1】
- **Kontext**: umfasst `componentFilePath`, Projekt- und Repositoriums-URLs sowie die vom Tracker gesetzten Metadaten.【F:src/common/components/DefaultButton/DefaultButton.tsx†L24-L43】【F:src/pages/App/App.hooks.tsx†L57-L63】【F:src/pages/App/App.tsx†L45-L50】【F:node_modules/react-xapi-wrapper/dist/index.esm.js†L1-L1】
- **Authority & Transport**: stammen aus den Konfigurationswerten `LRS`, `LRS_AUTH_USERNAME`, `LRS_AUTH_PASSWORD` und der Protokollversion 1.0.3.【F:public/config/env.development.json†L6-L13】【F:src/pages/App/App.hooks.tsx†L65-L72】

### Verben des Frontends

Alle im Frontend eingesetzten Verben folgen dem Schema `https://wiki.haski.app/variables/services.<verb>`. Die Anzeige im Statement (`display.en`) entspricht stets dem Verb-Schlüssel.

| Verb-Key | IRI (Suffix) | Zweck |
| :------- | :----------- | :---- |
| `clicked` | services.clicked | Klick auf UI-Elemente (Button, Link, IconButton usw.) |
| `changed` | services.changed | Wertänderung in Formular-/Auswahl-Elementen |
| `closed` | services.closed | Schließen eines Dialogs/Overlays |
| `answered` | services.answered | Beantworten einer Frage (z. B. H5P, Quiz) |
| `started` | services.started | Start eines Vorgangs oder einer Aktivität |
| `completed` | services.completed | Abschluss eines Vorgangs oder einer Aktivität |
| `created` | services.created | Anlegen eines Objekts (z. B. Kommentar) |
| `deleted` | services.deleted | Löschen eines Objekts |
| `uploaded` | services.uploaded | Hochladen einer Datei |
| `updated` | services.updated | Aktualisieren eines Objekts oder Uploads |
| `selected` | services.selected | Auswahl eines Elements (Radio/Checkbox/ListItem) |
| `pressed` | services.pressed | Tastatur-/Maus-/Gamepad-Eingabe |
| `loggedin` | services.loggedin | Nutzer hat sich eingeloggt |
| `loggedout` | services.loggedout | Nutzer hat sich ausgeloggt |

## Beispiel-Statements

Die folgenden Beispiele zeigen reale JSON-Strukturen, wie sie der Wrapper im Browser erzeugt. Sie nutzen die Standard-Konfiguration aus `public/config/env.development.json` und demonstrieren die automatisch gesetzten Felder für unterschiedliche Ereignistypen.【F:public/config/env.development.json†L2-L13】【F:node_modules/react-xapi-wrapper/dist/index.esm.js†L1-L1】

### Button-Klick auf der Startseite

Ein `DefaultButton` mit der DOM-ID `start-course` löst beim Klick das Verb `clicked` aus. Die Komponente steht auf der Startseite (`/`), daher enthält `contextActivities.parent` nur die Portalseite, während der `grouping`-Eintrag entfällt.【F:src/common/components/DefaultButton/DefaultButton.tsx†L24-L43】【F:src/services/PageName/PageName.hooks.tsx†L27-L45】【F:src/shared/translation/translationEnglish.json†L1828-L1828】【F:node_modules/react-xapi-wrapper/dist/index.esm.js†L1-L1】

```json
{
  "actor": {
    "account": {
      "homePage": "https://frontend.haski.app",
      "name": "4711"
    }
  },
  "verb": {
    "id": "https://wiki.haski.app/variables/services.clicked",
    "display": { "en": "clicked" }
  },
  "object": {
    "id": "https://frontend.haski.app/#start-course",
    "definition": {
      "name": { "en": "Button" },
      "type": "https://wiki.haski.app/functions/common.Button"
    }
  },
  "context": {
    "platform": "Frontend",
    "language": "de-DE",
    "extensions": {
      "https://lrs.learninglocker.net/define/extensions/info": {
        "domain": "https://frontend.haski.app",
        "domain_version": "v1.2.0-alpha",
        "github": "https://github.com/HASKI-RAK/HASKI-Frontend",
        "event_function": "src/src/common/components/DefaultButton/DefaultButton.tsx"
      }
    },
    "contextActivities": {
      "parent": [
        {
          "id": "https://frontend.haski.app",
          "definition": {
            "type": "https://wiki.haski.app/functions/pages.Home",
            "name": { "en": "Home" }
          }
        }
      ]
    }
  },
  "timestamp": "2024-05-06T12:34:56.789+00:00"
}
```

### Auswahländerung auf einer Kursseite

Interagiert ein `DefaultSelect` mit dem ID-Attribut `language-select` auf einer Kursdetailseite (`/course/42`), wird das Verb `changed` verwendet. Da die Seite nicht die Startseite ist, enthält `contextActivities` zusätzlich einen `grouping`-Eintrag für die Portal-Startseite.【F:src/common/components/DefaultSelect/DefaultSelect.tsx†L24-L43】【F:src/services/PageName/PageName.hooks.tsx†L27-L45】【F:src/shared/translation/translationEnglish.json†L1828-L1828】【F:node_modules/react-xapi-wrapper/dist/index.esm.js†L1-L1】

```json
{
  "actor": {
    "account": {
      "homePage": "https://frontend.haski.app",
      "name": "4711"
    }
  },
  "verb": {
    "id": "https://wiki.haski.app/variables/services.changed",
    "display": { "en": "changed" }
  },
  "object": {
    "id": "https://frontend.haski.app/course/42#language-select",
    "definition": {
      "name": { "en": "Select" },
      "type": "https://wiki.haski.app/functions/common.Select"
    }
  },
  "context": {
    "platform": "Frontend",
    "language": "de-DE",
    "extensions": {
      "https://lrs.learninglocker.net/define/extensions/info": {
        "domain": "https://frontend.haski.app",
        "domain_version": "v1.2.0-alpha",
        "github": "https://github.com/HASKI-RAK/HASKI-Frontend",
        "event_function": "src/src/common/components/DefaultSelect/DefaultSelect.tsx"
      }
    },
    "contextActivities": {
      "parent": [
        {
          "id": "https://frontend.haski.app/course/42",
          "definition": {
            "type": "https://wiki.haski.app/functions/pages.Course",
            "name": { "en": "Course" }
          }
        }
      ],
      "grouping": [
        {
          "id": "https://frontend.haski.app",
          "definition": {
            "type": "https://wiki.haski.app/functions/pages.Home",
            "name": { "en": "Home" }
          }
        }
      ]
    }
  },
  "timestamp": "2024-05-06T12:35:12.123+00:00"
}
```

## Erweiterung und Pflege

Um eine neue UI-Komponente xAPI-fähig zu machen, wird sie wie folgt angebunden:

1. Standardkomponente (z. B. aus MUI) importieren.
2. Mit `withXAPI(Component, { componentFilePath, componentType })` wrappen und den Hook `usePageName` einbinden.【F:src/common/components/DefaultButton/DefaultButton.tsx†L24-L43】
3. Die neue Komponente innerhalb des `XAPIProvider` einsetzen (in der Regel bereits gegeben).【F:src/pages/App/App.tsx†L45-L71】
4. Optional zusätzliche Event-Handler (`EventHandlers`) anreichen, um weitere Interaktionen aufzuzeichnen.【F:src/common/components/DefaultButton/DefaultButton.tsx†L1-L13】

Diese Struktur stellt sicher, dass alle Benutzeraktionen konsistent, mit vollständigen Metadaten und in Einklang mit der Projektkonfiguration an das LRS übermittelt werden.
