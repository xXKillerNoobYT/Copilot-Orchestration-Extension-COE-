# TASK-007A: Metrics collection service

## Task Information

**ID:** TASK-mk937dlg-xwt43

**Status:** pending

**Priority:** medium

**Dependencies:** EPIC-007

**Created:** 1/10/2026

**Updated:** 1/10/2026

## Description

Create MetricsService.php for collecting and aggregating metrics: task completion counts, average execution time, error counts, agent utilization percentages.

## Implementation Details

Methods: recordTaskCompletion(taskId, duration), recordError(taskId, error), getTaskMetrics(timeRange), getAgentMetrics(), getErrorMetrics(). Stores in metrics table with timestamps for time-series queries.

File: app/Services/MetricsService.php

Estimate: 3 hours

## Test Strategy

Record sample metrics; verify storage; test aggregation queries; verify time-range filters work; test agent utilization calculations.
