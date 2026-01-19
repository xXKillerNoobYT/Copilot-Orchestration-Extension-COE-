# Dead Letter Queue (DLQ) Operational Runbook

**Version:** 1.0.1  
**Last Updated:** January 19, 2026  
**Owner:** Platform Team  
**On-Call:** @platform-oncall

---

## Quick Reference

| Task | Command | Frequency |
|------|---------|-----------|
| View DLQ | `Cmd+Shift+P` → "Show Dead Letter Queue" | As needed |
| Archive Old | Panel → "Archive Old (7d)" button | Weekly |
| Delete Archived | Panel → "Delete Archived (30d)" button | Monthly |
| Export for Analysis | Panel → "Export JSON" button | Quarterly |
| Check DLQ Size | `dlqService.getCountByStatus()` | Daily |

---

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Weekly Maintenance](#weekly-maintenance)
3. [Monthly Cleanup](#monthly-cleanup)
4. [Incident Response](#incident-response)
5. [Debugging Procedures](#debugging-procedures)
6. [Performance Tuning](#performance-tuning)
7. [Disaster Recovery](#disaster-recovery)

---

## Daily Operations

### 1. Morning Health Check (5 minutes)

**Goal:** Ensure DLQ is healthy and no critical failures accumulated overnight

**Steps:**

1. **Open DLQ Panel**
   ```
   VS Code Command Palette → "Copilot Orchestrator: Show Dead Letter Queue"
   ```

2. **Check Stats Card**
   - Total Entries: Should be <100
   - Failed: Should be <50
   - Archived: Growth expected
   - Replayed: Track resolution rate

3. **Review Recent Failures**
   - Filter: Status = "Failed", since = "Last 24 hours"
   - Look for patterns (same handler, same error)
   - Escalate if >10 failures for single handler

4. **Alert Thresholds**
   - 🟢 GREEN: <10 failed entries
   - 🟡 YELLOW: 10-50 failed entries
   - 🔴 RED: >50 failed entries → Escalate

**Expected Outcome:** DLQ size stable or decreasing

**If Failing:** Proceed to [Incident Response](#incident-response)

### 2. Monitor Growth Rate (Automated)

**Setup:** Add daily cron job or GitHub Action

```typescript
// check-dlq-health.ts
import { DeadLetterQueueService } from './services/deadLetterQueue';

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

const recentEntries = await dlqService.getEntries({ since: yesterday });
const hourlyRate = recentEntries.length / 24;

if (hourlyRate > 5) {
  console.error(`⚠️ DLQ growing at ${hourlyRate.toFixed(1)} entries/hour`);
  // Send alert to Slack/PagerDuty
}
```

**Alert on:** >5 entries per hour sustained

---

## Weekly Maintenance

### 1. Archive Old Entries (10 minutes)

**Goal:** Move failed entries >7 days old to archived status

**Steps:**

1. **Open DLQ Panel**
2. **Click "Archive Old (7d)" Button**
3. **Review Confirmation Dialog**
   - Shows count to be archived
   - Confirm action
4. **Verify Results**
   - Check "Archived" stat increased
   - Filter by Status="Archived" to review

**Automated Alternative:**

```typescript
// weekly-archive.ts
const archived = await dlqService.archiveOldEntries(7);
console.log(`Archived ${archived} entries older than 7 days`);
```

**Expected:** 0-50 entries archived per week

**If >100 Archived:** Investigation needed - recurring failures

### 2. Review Top Failure Handlers (15 minutes)

**Goal:** Identify handlers that fail most frequently

**Steps:**

1. **Export Last 7 Days to CSV**
   ```
   DLQ Panel → Filter: Last 7 days → Export CSV
   ```

2. **Analyze in Spreadsheet**
   - Group by `handler_name`
   - Count failures per handler
   - Identify top 3

3. **Create Tracking Issue**
   ```markdown
   ## High DLQ Failure Rate: {handler_name}
   
   - **Handler:** {handler_name}
   - **Failure Count:** {count}
   - **Time Period:** Last 7 days
   - **Sample Errors:** {top 3 error messages}
   
   **Action Items:**
   - [ ] Review handler implementation
   - [ ] Check MCP server logs
   - [ ] Add defensive error handling
   - [ ] Deploy fix
   - [ ] Replay failed messages
   ```

---

## Monthly Cleanup

### 1. Delete Archived Entries (5 minutes)

**Goal:** Permanently remove archived entries >30 days old

**Steps:**

1. **Open DLQ Panel**
2. **Click "Delete Archived (30d)" Button**
3. **Confirm Deletion** (Warning dialog)
4. **Verify Results**
   - "Archived" stat decreased
   - Database size reduced

**Automated:**

```typescript
// monthly-cleanup.ts
const deleted = await dlqService.deleteArchivedEntries(30);
console.log(`Deleted ${deleted} archived entries older than 30 days`);
```

**Expected:** 50-200 deletions per month

### 2. Export Quarterly Report (30 minutes)

**Goal:** Generate executive summary of DLQ trends

**Steps:**

1. **Export Last 90 Days**
   ```
   DLQ Panel → Filter: Since 90 days ago → Export JSON
   ```

2. **Analyze Trends**
   - Total failures by month
   - Top 5 failing handlers
   - Most common error types
   - Average time to resolution

3. **Create Report**
   ```markdown
   # Q1 2026 DLQ Report
   
   ## Summary
   - Total Failures: {count}
   - Resolved: {replayed_count}
   - Unresolved: {failed_count}
   - Resolution Rate: {percentage}%
   
   ## Top Handlers
   1. {handler1}: {count1} failures
   2. {handler2}: {count2} failures
   3. {handler3}: {count3} failures
   
   ## Recommendations
   - ...
   ```

---

## Incident Response

### Incident: DLQ Growing Rapidly (>50 entries/hour)

**Severity:** 🔴 HIGH

**Response Time:** <15 minutes

**Steps:**

1. **Assess Scope**
   ```
   DLQ Panel → Filter: Last 1 hour
   Count failures by handler and error message
   ```

2. **Check MCP Server Status**
   ```bash
   # Verify server is running
   curl http://localhost:8000/health
   
   # Check response time
   time curl http://localhost:8000/api/v1/mcp/nextTask
   ```

3. **Review Server Logs**
   ```bash
   # Check for errors in last hour
   tail -n 1000 /var/log/mcp-server.log | grep ERROR
   ```

4. **Determine Root Cause**
   - **Network Issue:** Check connectivity, restart network
   - **Server Crash:** Restart MCP server
   - **Database Lock:** Check database connections
   - **Code Bug:** Rollback recent deploy

5. **Immediate Mitigation**
   - Restart affected services
   - Scale out if overload
   - Disable failing feature if critical

6. **Post-Incident**
   - Replay failed messages after fix
   - Document root cause
   - Create preventive measure ticket

### Incident: Single Handler Failing Consistently

**Severity:** 🟡 MEDIUM

**Response Time:** <1 hour

**Steps:**

1. **Identify Pattern**
   ```
   DLQ Panel → Filter: Handler = {failing_handler}
   Export to JSON for analysis
   ```

2. **Sample Failed Messages**
   ```json
   // Look for commonalities in:
   - Request payload structure
   - Error message text
   - Timestamp pattern (time of day?)
   ```

3. **Test Handler in Isolation**
   ```typescript
   // Test with sample payload from DLQ
   const result = await mcpClient.executeHandler(
     handlerName,
     samplePayload
   );
   ```

4. **Fix and Deploy**
   - Implement fix
   - Add unit test for failure case
   - Deploy to production
   - Monitor for recurrence

5. **Replay Failed Messages**
   ```typescript
   const entries = await dlqService.getEntries({
     handlerName: 'problematic_handler',
     status: 'failed'
   });
   
   for (const entry of entries) {
     await dlqService.replayMessage(entry.id);
     // Reprocess...
   }
   ```

---

## Debugging Procedures

### Debug: High Retry Count for Message

**Symptom:** Single message has `retry_count > 3`

**Investigation:**

1. **Get Message Details**
   ```typescript
   const entry = await dlqService.getEntry(messageId);
   console.log('Retries:', entry.retryCount);
   console.log('First Failed:', entry.firstFailedAt);
   console.log('Last Retry:', entry.lastRetryAt);
   ```

2. **Check Error Evolution**
   - Same error each time? → Permanent failure
   - Different errors? → Intermittent failure
   - Timeout → Server overload

3. **Manual Replay Test**
   ```typescript
   try {
     const result = await mcpClient.executeHandler(
       entry.handlerName,
       entry.originalPayload
     );
     console.log('✅ Manual replay succeeded:', result);
   } catch (error) {
     console.error('❌ Manual replay failed:', error);
   }
   ```

### Debug: Timeout Errors Only

**Symptom:** All DLQ entries are timeout errors

**Root Causes:**
- MCP server overloaded
- Network latency increased
- Database query slow

**Debugging:**

1. **Measure Server Response Time**
   ```bash
   # Benchmark typical request
   time curl -X POST http://localhost:8000/api/v1/mcp/nextTask \
     -H "Content-Type: application/json" \
     -d '{"agentId": "test"}'
   
   # Expected: <1 second
   # Problem: >10 seconds
   ```

2. **Check Server Load**
   ```bash
   # CPU usage
   top -p $(pgrep -f mcp-server)
   
   # Memory usage
   ps aux | grep mcp-server
   ```

3. **Review Slow Queries**
   ```sql
   -- If using Laravel/Eloquent
   SELECT * FROM tasks WHERE execution_time > 1000;
   ```

4. **Mitigation**
   - Increase timeout from 30s to 60s (temporary)
   - Scale server resources
   - Add database indexes
   - Cache frequently accessed data

---

## Performance Tuning

### Optimize Query Performance

**Before:**
- Query time: 500ms for 100 entries
- Full table scan

**After:**
- Query time: <50ms for 100 entries
- Index-optimized

**Steps:**

1. **Verify Indexes Exist**
   ```sql
   -- Check indexes
   .schema dead_letter_queue
   
   -- Should see:
   -- idx_dlq_status
   -- idx_dlq_message_type
   -- idx_dlq_handler_name
   -- idx_dlq_created_at
   -- idx_dlq_task_id
   ```

2. **Analyze Query Plans**
   ```sql
   EXPLAIN QUERY PLAN
   SELECT * FROM dead_letter_queue
   WHERE status = 'failed'
   ORDER BY created_at DESC
   LIMIT 100;
   
   -- Should use idx_dlq_status or idx_dlq_created_at
   ```

3. **Add Missing Indexes**
   ```sql
   -- If missing, add:
   CREATE INDEX idx_dlq_composite 
   ON dead_letter_queue(status, created_at DESC);
   ```

### Reduce Database Size

**Target:** Keep DLQ database <100MB

**Current Size Check:**
```bash
ls -lh copilot-orchestrator.db
# Example: 45M copilot-orchestrator.db
```

**If >100MB:**

1. **Archive Aggressively**
   ```typescript
   // Archive after 3 days instead of 7
   await dlqService.archiveOldEntries(3);
   ```

2. **Delete Sooner**
   ```typescript
   // Delete after 14 days instead of 30
   await dlqService.deleteArchivedEntries(14);
   ```

3. **Vacuum Database**
   ```sql
   VACUUM;
   -- Reclaims space from deleted rows
   ```

---

## Disaster Recovery

### Scenario: DLQ Database Corrupted

**Symptoms:**
- SQLite errors on query
- Database file size is 0 bytes
- "database disk image is malformed"

**Recovery:**

1. **Stop Extension**
   ```
   VS Code → Reload Window
   ```

2. **Backup Current DB**
   ```bash
   cp copilot-orchestrator.db copilot-orchestrator.db.backup
   ```

3. **Attempt Repair**
   ```bash
   sqlite3 copilot-orchestrator.db ".recover" | sqlite3 recovered.db
   mv recovered.db copilot-orchestrator.db
   ```

4. **If Repair Fails**
   ```bash
   # Delete corrupted database
   rm copilot-orchestrator.db
   
   # Extension will recreate on next use
   # (All DLQ history lost - document in incident report)
   ```

5. **Restart Extension**
   ```
   VS Code → Reload Window
   ```

### Scenario: Accidental Mass Delete

**Symptoms:**
- All DLQ entries gone
- User clicked "Delete" instead of "Archive"

**Recovery:**

1. **Check for Backup**
   ```bash
   ls -l ~/.vscode/globalStorage/**/copilot-orchestrator.db*
   ```

2. **Restore from Backup**
   ```bash
   # If backup exists
   cp copilot-orchestrator.db.backup copilot-orchestrator.db
   ```

3. **If No Backup**
   - Loss is permanent
   - Enable automated backups going forward
   - Document incident

4. **Preventive Measure**
   ```bash
   # Add daily backup cron
   0 0 * * * cp ~/.vscode/globalStorage/*/copilot-orchestrator.db \
     ~/dlq-backups/dlq-$(date +\%Y\%m\%d).db
   ```

---

## Appendix

### A. Useful SQL Queries

```sql
-- Count by handler
SELECT handler_name, COUNT(*) as failures
FROM dead_letter_queue
WHERE status = 'failed'
GROUP BY handler_name
ORDER BY failures DESC;

-- Failures by hour
SELECT strftime('%Y-%m-%d %H:00', created_at) as hour, COUNT(*)
FROM dead_letter_queue
WHERE status = 'failed'
GROUP BY hour
ORDER BY hour DESC
LIMIT 24;

-- Average time to resolution
SELECT AVG(julianday(last_retry_at) - julianday(first_failed_at)) * 24 as avg_hours
FROM dead_letter_queue
WHERE status = 'replayed';
```

### B. Monitoring Checklist

- [ ] DLQ size trending downward or stable
- [ ] No single handler >20% of failures
- [ ] Replay rate >80% for valid failures
- [ ] Average resolution time <24 hours
- [ ] Database size <100MB
- [ ] Query performance <100ms
- [ ] Automated archival working

### C. Contact List

| Role | Contact | Responsibility |
|------|---------|---------------|
| Platform Lead | @platform-lead | Escalation, architecture decisions |
| On-Call Engineer | @platform-oncall | Incident response 24/7 |
| Backend Team | @backend-team | MCP server issues |
| Database Admin | @dba | SQLite performance tuning |

---

**End of DLQ Operational Runbook**
