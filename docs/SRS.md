# Software Requirements Specification (SRS)
for the project according to ISO/IEC/IEEE 29148:2018.

## Introduction
### Purpose
The purpose of this document is to define the functional and non-functional requirements for the system. They are derived and linked to the informal stakeholder needs in `docs/StRS.md`.

## Project Overview
### Product Perspective
The project is located in between a Learning Record Store (LRS) and an Adaptive Learning System (ALS). It acts as an intermediary system that consolidates and processes learning data from the LRS and generates data for frequently accessed learning analytics in the ALS.
### Product Functions
- Data Integration: Pulls data from Yetanalytics LRS.
- Data Processing: Aggregates and processes pulled data to generate derived analytics.
- Data Provision: Supplies processed data to clients via an API.
### User Characteristics
The primary users of the system are developers who will integrate the system with the ALS. They should have a good understanding of APIs and data processing.
### Constraints
- A bachelor thesis will integrate in the system. Therefore the architecture needs to support both the `quick implementation` and the `bachelor thesis` as inplace exchangable components.
- The LRS is Yetanalytics, which is based on the xAPI standard. The API of Yetanalytics is documented [here](https://github.com/yetanalytics/lrsql/blob/main/doc/endpoints.md).

## Functional Requirements
> Located in `docs/srs/REQ-FN-<ID>.md`.

## Non-Functional Requirements
> Located in `docs/srs/REQ-NF-<ID>.md`.