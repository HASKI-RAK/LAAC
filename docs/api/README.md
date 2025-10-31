# API Documentation

This directory contains comprehensive API documentation for the LAAC (Learning Analytics Analyzing Center) system.

## Contents

### [API Response Specifications](./API-Response-Specifications.md)

Complete specification of API response formats for all learning analytics metrics defined in the system. This document provides:

- **Generic response structures** for consistent API patterns
- **Concrete examples** for all 16 metrics from the CSV requirements
- **Error response formats** for all error scenarios
- **Pagination and filtering** guidelines
- **Extensibility guide** for adding new metrics

**Use this document when:**
- Integrating with the LAAC API as a client
- Adding new learning analytics metrics
- Understanding expected response formats
- Debugging API responses
- Designing metric computation logic

## Quick Reference

### Metric Categories

The API provides three levels of learning analytics:

1. **Course Overview (CO)**: Aggregated metrics at the course level
   - CO-001 to CO-005 (5 metrics)

2. **Topic Overview (TO)**: Aggregated metrics at the topic level
   - TO-001 to TO-005 (5 metrics)

3. **Learning Element (LE)**: Detailed metrics at the individual activity level
   - LE-001 to LE-006 (6 metrics)

### Key Endpoints

- `GET /api/v1/metrics` — List all available metrics (catalog)
- `GET /api/v1/metrics/{id}` — Get metric details
- `GET /api/v1/metrics/{id}/results` — Retrieve metric results
- `POST /api/v1/metrics/results` — Batch metric retrieval

### Related Documentation

- [LAAC_Learning_Analytics_Requirements.csv](../resources/LAAC_Learning_Analytics_Requirements.csv) — Authoritative metric requirements
- [Metrics Specification](../Metrics-Specification.md) — Formal metric definitions and calculations
- [SRS](../SRS.md) — Software Requirements Specification
- [Architecture](../architecture/ARCHITECTURE.md) — System architecture documentation

## Support

For questions or issues with the API:

1. Review the [API Response Specifications](./API-Response-Specifications.md)
2. Check the [Metrics Specification](../Metrics-Specification.md) for calculation details
3. Consult the relevant requirement documents in [docs/srs/](../srs/)
4. Open an issue in the project repository

## Versioning

API responses follow semantic versioning:

- **Major version** (v1, v2): Breaking changes to API structure
- **Metric version** (1.0.0, 1.1.0): Changes to metric calculation or output
- **Minor/Patch**: Non-breaking enhancements and fixes

Current API version: **v1**
