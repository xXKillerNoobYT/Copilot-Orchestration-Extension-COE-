---
id: MAINT-XXX
title: [Maintenance objective]
type: maintenance
priority: medium
status: pending
dependencies: []
assignees: [maintenance]
labels: [maintenance]
estimate: "2h"
format_version: "1.0"
---

## Maintenance Type

[Select one or more: Dependency Update | Health Check | Performance Optimization | Security Patch | Cleanup]

## Current State

[Description of what needs maintenance, current versions, known issues]

## Actions Required

- [ ] [Action item 1]
- [ ] [Action item 2]
- [ ] [Action item 3]
- [ ] [Verify changes in test environment]
- [ ] [Update documentation if needed]

## Dependency Updates (if applicable)

| Package | Current Version | Target Version | Breaking Changes |
|---------|----------------|----------------|------------------|
| [package-name] | [1.0.0] | [2.0.0] | [Yes/No - description] |

## Testing & Validation

[How to verify maintenance was successful]

- [ ] [Validation step 1 - e.g., run test suite]
- [ ] [Validation step 2 - e.g., verify build succeeds]
- [ ] [Validation step 3 - e.g., manual smoke test]
- [ ] [Check for deprecation warnings]
- [ ] [Review security audit results]

## Rollback Plan

[Recovery strategy if issues arise]

1. [Rollback step 1]
2. [Rollback step 2]
3. [Verification after rollback]

## Impact Assessment

**Risk Level:** [Low | Medium | High]

**Affected Areas:**

- [Component 1]
- [Component 2]

**Downtime Required:** [Yes/No - duration if applicable]

**User Impact:** [None | Minimal | Moderate | Significant]

## Security Considerations (if applicable)

[CVE numbers, vulnerability descriptions, security implications]

- **CVE:** [CVE-2024-XXXXX]
- **Severity:** [Critical | High | Medium | Low]
- **Description:** [Brief vulnerability description]

---

**Template Notes:**

- Use `MAINT-` prefix for maintenance task IDs
- Assign to `maintenance` agent
- Set `priority` based on urgency:
  - `critical`: Security patches, production issues, system down
  - `high`: Important dependency updates, performance degradation
  - `medium`: Routine updates, health checks, optimizations
  - `low`: Cleanup tasks, deprecated package migrations (no deadline)
- Add specific maintenance labels:
  - `dependency-update`: Package/library updates
  - `security-patch`: CVE fixes, vulnerability remediation
  - `performance`: Optimization, resource usage improvements
  - `cleanup`: Code cleanup, unused dependency removal
  - `health-check`: System monitoring, drift detection
- **Critical:** Always test in non-production environment first
- Document breaking changes and migration steps
- Run full test suite after dependency updates
- Review changelogs for updated packages
- Check for deprecated APIs or features
- Monitor application after deployment
- Keep rollback plan ready for rapid recovery
