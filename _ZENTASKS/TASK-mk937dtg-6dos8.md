# TASK-007B: Metrics API endpoints

## Task Information

**ID:** TASK-mk937dtg-6dos8

**Status:** pending

**Priority:** medium

**Dependencies:** EPIC-007, TASK-007A

**Created:** 1/10/2026

**Updated:** 1/10/2026

## Description

Build REST API endpoints for metrics retrieval with time-range filtering and aggregation options.

## Implementation Details

Endpoints: GET /api/v1/metrics/tasks?range=7d (completion rate, avg time), GET /metrics/agents (utilization %), GET /metrics/errors?severity=high. Returns JSON with chart-ready data (labels, values arrays).

File: routes/api.php (extend), app/Http/Controllers/Api/MetricsController.php (new)

Estimate: 2 hours

## Test Strategy

Test each endpoint; verify JSON format; test time-range filters; validate aggregations; test empty data handling.
