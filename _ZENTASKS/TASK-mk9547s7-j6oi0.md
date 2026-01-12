# Establish Basic Observability and Metrics System

## Task Information

**ID:** TASK-mk9547s7-j6oi0

**Status:** done

**Priority:** high

**Dependencies:** None

**Created:** 1/10/2026

**Updated:** 1/10/2026

## Description

Implement telemetry collection for task completion, execution times, error rates, and user actions. Create metrics dashboard showing KPIs: task success rate, average task duration, error frequency, and project velocity. Enable data-driven decision making about performance and quality.

## Implementation Details

**Current Gap**: Section 6 (Success Metrics) defines 15 KPIs but zero are measured. Cannot verify project success or identify bottlenecks.

**Required Metrics** (Code Master Section 6):

Quality Metrics:
- Test coverage % (by component, by layer)
- Bug escape rate (bugs found in production vs QA)
- Code review completion rate

Adoption Metrics:
- Daily active users (DAU)
- Feature activation rate
- User retention rate
- Net Promoter Score (NPS)

Functionality Metrics:
- Features complete %
- System uptime %
- API response time (p50, p95, p99)

Satisfaction Metrics:
- NPS (Net Promoter Score)
- Customer satisfaction (CSAT)
- Support ticket volume

Business Metrics:
- Task execution velocity (tasks/day)
- Cost per task
- Time-to-completion

**Implementation Plan**:

1. **Create Metrics Service** (300-400 LOC)
   - `app/Services/MetricsService.php`
   - Methods: recordTaskCompletion, recordErrorEvent, recordExecutionTime
   - Persist to database (new metrics_events table)

2. **Create Database Schema** 
   - Table: `metrics_events` (id, event_type, value, timestamp)
   - Columns: event_type, metric_name, value, user_id, project_id, timestamp
   - Indexes on timestamp and event_type for queries

3. **Wire Event Recording**
   - Task completion: record in TaskCompletedEvent
   - Errors: record in error handlers
   - Execution time: measure in task executor
   - API calls: measure in middleware

4. **Create Aggregation Jobs** (200 LOC)
   - `app/Jobs/AggregateMetrics.php`
   - Daily aggregation: count events, calculate averages, derive KPIs
   - Store aggregations in `metrics_summary` table
   - Run via scheduler (daily at 1 AM UTC)

5. **Create Dashboard** (300 LOC)
   - API endpoint: GET /api/metrics/dashboard
   - Returns: KPI summary, trend data, anomalies
   - Vue component: MetricsDashboard.vue
   - Show: charts, KPI cards, trend indicators

6. **Integration Points**:
   - Task model: emit completion events
   - Error handlers: record errors
   - Task executor: measure execution time
   - API middleware: measure response times
   - Agent execution: track progress

**Success Criteria**:
- ✅ All 15 KPIs can be calculated from recorded data
- ✅ Dashboard shows real-time metrics
- ✅ Historical trending available (30+ days)
- ✅ Zero performance impact on main system
- ✅ Easy to add new metrics

**Baseline Metrics** (first month):
- Record: task completions, execution times, errors, user actions
- Publish: daily summary dashboard
- Track: velocity, quality, user engagement

**Timeline**: 8-12 hours (medium complexity)

**Related**: Section 6, Success Metrics tracking

## Test Strategy

Test MetricsService records events correctly. Test aggregation job calculates metrics accurately. Test dashboard API returns correct data. Manually verify dashboard shows expected KPI values. Load test to ensure zero performance impact.
