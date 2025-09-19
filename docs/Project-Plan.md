# Project Plan – LAAC

## Purpose and Scope
This project plan describes the approach, timeline, and resources for developing the LAAC system. The plan outlines project goals and tailored conformance matrix.

## Project Goals
- Develop an intermediary system that consolidates and processes learning data from a Learning Record Store (LRS).
- Make frequently accessed learning analytics available to clients.
- Provide a well-documented and maintainable system.

## Project Description (informal)
The HASKI team decided on the development of the Learning Analytics Analyzing Center (LAAC) to support the integration of adaptive learning path algorithms, as well as dashboards for students and teachers that are rich in learning analytics. background of this decition was the circumstance that currenly all systems in HASKI send data to a learning record store (LRS), which acts as a central data storage using xAPI. However, the LRS is not designed to provide learning analytics in a performant way. It just tracks individual statements. Derived information, such as an aggregation of all statements in a defined timespan for a specific user or learning element is not  available. The LAAC is intended to close this gap by offring developers to write tailored aggregation and processing logic to generate derived learning analytics. These analytics can then be provided to clients, such as a backend for an adaptive learning system or other unkown clients in the future.