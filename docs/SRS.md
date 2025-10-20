# Software Requirements Specification (SRS)

for the project according to ISO/IEC/IEEE 29148:2018.

## Introduction

### Purpose

The purpose of this document is to define the functional and non-functional requirements for the system. They are derived and linked to the informal stakeholder needs in `docs/StRS.md`.

### References

- [Stakeholder Requirements (StRS)](./StRS.md)
- [Metrics Specification](./Metrics-Specification.md) — Formal definitions for all analytics metrics

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

> Located in `docs/srs/REQ-FN-<ID>.md`. Authoring template: `docs/srs/REQ-TEMPLATE.md`.

- REQ-FN-001 — Client-Facing Intermediary API → `docs/srs/REQ-FN-001.md`
- REQ-FN-002 — xAPI LRS Integration → `docs/srs/REQ-FN-002.md`
- REQ-FN-003 — Analytics Metrics Catalog and Discovery → `docs/srs/REQ-FN-003.md`
- REQ-FN-004 — Compute Analytics from xAPI LRS per CSV Metric → `docs/srs/REQ-FN-004.md`
- REQ-FN-005 — Results Retrieval, Aggregation, and Export → `docs/srs/REQ-FN-005.md`
- REQ-FN-006 — Analytics Results Caching → `docs/srs/REQ-FN-006.md`
- REQ-FN-007 — Cache Invalidation and Refresh → `docs/srs/REQ-FN-007.md`
- REQ-FN-008 — OpenAPI Specification Generation and Exposure → `docs/srs/REQ-FN-008.md`
- REQ-FN-009 — Interactive API Documentation UI → `docs/srs/REQ-FN-009.md`
- REQ-FN-010 — Metric Extension Architecture and Interfaces → `docs/srs/REQ-FN-010.md`
- REQ-FN-011 — Metric Contribution Guide and Templates → `docs/srs/REQ-FN-011.md`
- REQ-FN-012 — Container Image Build and Registry → `docs/srs/REQ-FN-012.md`
- REQ-FN-013 — Docker Compose Configurations (Dev and Prod) → `docs/srs/REQ-FN-013.md`
- REQ-FN-014 — Secrets and Configuration Management → `docs/srs/REQ-FN-014.md`
- REQ-FN-015 — CI/CD Pipeline with GitHub Actions → `docs/srs/REQ-FN-015.md`
- REQ-FN-016 — API Versioning and Deprecation Policy → `docs/srs/REQ-FN-016.md`
- REQ-FN-017 — Multi-Instance Support and Cross-Instance Analytics → `docs/srs/REQ-FN-017.md`
- REQ-FN-018 — Architecture Documentation with PlantUML Diagrams → `docs/srs/REQ-FN-018.md`
- REQ-FN-019 — SOLID and CUPID Principles Guidance → `docs/srs/REQ-FN-019.md`
- REQ-FN-020 — Structured Logging with Correlation IDs → `docs/srs/REQ-FN-020.md`
- REQ-FN-021 — Metrics Export and Monitoring Endpoints → `docs/srs/REQ-FN-021.md`
- REQ-FN-022 — Performance Testing and SLO Validation → `docs/srs/REQ-FN-022.md`
- REQ-FN-023 — Authentication and Authorization Framework → `docs/srs/REQ-FN-023.md`
- REQ-FN-024 — Input Validation and Rate Limiting → `docs/srs/REQ-FN-024.md`

## Non-Functional Requirements

> Located in `docs/srs/REQ-NF-<ID>.md`. Authoring template: `docs/srs/REQ-TEMPLATE.md`.

- REQ-NF-001 — Core Data Source Scope (xAPI LRS) → `docs/srs/REQ-NF-001.md`
- REQ-NF-002 — Standalone Deployability → `docs/srs/REQ-NF-002.md`
- REQ-NF-003 — Metrics Traceability and Coverage Verification → `docs/srs/REQ-NF-003.md`
- REQ-NF-004 — Determinism, Idempotency, and Result Consistency → `docs/srs/REQ-NF-004.md`
- REQ-NF-005 — Analytics Endpoint Performance (CSV Metrics) → `docs/srs/REQ-NF-005.md`
- REQ-NF-006 — Cache Performance and Hit Ratio Targets → `docs/srs/REQ-NF-006.md`
- REQ-NF-007 — Cache Consistency and Correctness → `docs/srs/REQ-NF-007.md`
- REQ-NF-008 — API Documentation Completeness and Accuracy → `docs/srs/REQ-NF-008.md`
- REQ-NF-009 — Metric Development Velocity and Lead Time → `docs/srs/REQ-NF-009.md`
- REQ-NF-010 — Metric Isolation and Testability → `docs/srs/REQ-NF-010.md`
- REQ-NF-011 — Deployment Automation and Reliability → `docs/srs/REQ-NF-011.md`
- REQ-NF-012 — Deployment Rollback and Recovery → `docs/srs/REQ-NF-012.md`
- REQ-NF-013 — Multi-Instance Data Isolation and Consistency → `docs/srs/REQ-NF-013.md`
- REQ-NF-014 — Architecture Documentation Currency and Maintenance → `docs/srs/REQ-NF-014.md`
- REQ-NF-015 — Developer Onboarding and Architecture Comprehension → `docs/srs/REQ-NF-015.md`
- REQ-NF-016 — Observability Baseline and Alert Guidance → `docs/srs/REQ-NF-016.md`
- REQ-NF-017 — Analytics Endpoint Latency SLO (Detailed) → `docs/srs/REQ-NF-017.md`
- REQ-NF-018 — Graceful Degradation and Timeout Handling → `docs/srs/REQ-NF-018.md`
- REQ-NF-019 — Security Baseline and Secure Defaults → `docs/srs/REQ-NF-019.md`
- REQ-NF-020 — Security Testing and Compliance Validation → `docs/srs/REQ-NF-020.md`
