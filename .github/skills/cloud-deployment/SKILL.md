---
name: cloud-deployment
description: Deploy applications to cloud environments (Azure, AWS, GCP), manage infrastructure, monitor health, and coordinate the full deployment lifecycle from staging to production
---

# Cloud Deployment Skill

Manage complete cloud deployment lifecycle from local validation to production release, including infrastructure provisioning, health monitoring, and rollback procedures.

## When to Use This Skill

- Deploy application to staging or production
- Provision cloud infrastructure
- Update deployed application
- Monitor application health
- Troubleshoot deployment issues
- Rollback problematic deployments

## What This Skill Does

1. **Local Validation**: Verify tests, linting, builds pass locally
2. **Infrastructure Check**: Ensure cloud resources provisioned correctly
3. **Staging Deployment**: Deploy to staging environment
4. **Smoke Testing**: Run critical path tests on staging
5. **Production Deployment**: Deploy to production with approval
6. **Health Monitoring**: Track metrics, errors, performance
7. **Rollback**: Revert to previous version if issues detected

## Step-by-Step Procedure

### Phase 1: Pre-Deployment Validation (Local)
```
1. Run full test suite
   npm test || php artisan test || pytest

2. Run linting
   npm run lint || phpstan analyze

3. Run type checking
   tsc --noEmit || phpstan --level=8

4. Build production assets
   npm run build || php artisan build

5. Verify build artifacts created

SUCCESS CRITERIA:
- [ ] All tests pass
- [ ] No lint errors
- [ ] No type errors
- [ ] Build completes
- [ ] Artifacts valid
```

### Phase 2: Infrastructure Verification
```
1. Check cloud configuration files exist:
   - .env.production
   - docker-compose.yml (or equivalent)
   - Infrastructure as Code (Terraform/ARM)

2. Verify required services:
   - Database accessible
   - Cache server running
   - Queue workers ready
   - Storage buckets exist

3. Check security:
   - Secrets in vault (not code)
   - API keys rotated
   - SSL certificates valid
   - Firewall rules correct

4. Verify backup procedures:
   - Database backup recent
   - Rollback plan documented
   - Backup restoration tested
```

### Phase 3: Staging Deployment
```
1. Create deployment branch:
   git checkout -b deploy/staging-$(date +%Y%m%d%H%M%S)

2. Trigger staging deployment:
   - Via GitHub Actions workflow
   - Via cloud provider CLI
   - Via infrastructure tool

3. Wait for deployment completion (max 5 min)

4. Verify deployment status:
   - Pods/containers running
   - Health endpoints responding
   - Database migrations applied
   - Static assets uploaded
```

### Phase 4: Staging Validation
```
SMOKE TESTS (critical paths only):
1. Health check: GET /health → 200 OK
2. Auth flow: Login → Success
3. Core API: GET /api/resource → 200 OK
4. Database: Read/write test → Success

MONITORING:
1. Check error rates (should be 0)
2. Check response times (<500ms)
3. Review application logs
4. Verify no crash loops

WAIT TIME: 3-5 minutes for system stabilization
```

### Phase 5: Production Readiness
```
1. Compare staging vs production configs
   - Environment variables
   - Resource limits
   - Scaling settings
   - Feature flags

2. Review deployment logs for warnings

3. Verify rollback ready:
   - Previous version tagged
   - Rollback procedure documented
   - Backup confirmed recent

4. Get approval (if required):
   - Manual approval gate
   - Stakeholder sign-off
   - Change request ticket
```

### Phase 6: Production Deployment
```
1. Create deployment PR (if required)
   - Title: "Deploy v1.2.3 to production"
   - Description: Changes since last deploy
   - Link to staging validation results

2. Trigger production deployment:
   - Via GitHub Actions
   - Via cloud provider
   - Via infrastructure tool

3. Wait for deployment (max 10 min)

4. Monitor deployment progress:
   - Rolling update status
   - Pod/container replacements
   - Zero-downtime verification
```

### Phase 7: Post-Deployment Monitoring
```
IMMEDIATE CHECKS (first 5 minutes):
1. Health endpoints → 200 OK
2. Error rate → <0.1%
3. Response time → baseline ±10%
4. No crash loops
5. Database connections stable

EXTENDED MONITORING (next 30 minutes):
1. User-facing features working
2. Background jobs processing
3. No unusual traffic patterns
4. No security alerts
5. Performance within SLOs

ALERT THRESHOLDS:
- Error rate >1% → Investigate
- Response time >2x baseline → Investigate
- Health check fails → Rollback
- Critical feature broken → Rollback
```

### Phase 8: Rollback (If Needed)
```
TRIGGERS:
- Health checks failing
- Error rate >5%
- Critical feature broken
- Data corruption detected
- Security vulnerability

PROCEDURE:
1. Alert team via Slack/Discord
2. Revert to previous deployment:
   - Tag previous version
   - Trigger rollback workflow
   - Or manually: kubectl rollout undo

3. Verify rollback success:
   - Health checks pass
   - Error rate normal
   - Services stable

4. Create incident issue:
   - What failed
   - When detected
   - Rollback actions taken
   - Root cause analysis needed
```

## Expected Input

**User Request Examples**:
- "Deploy to staging"
- "Release v1.2.3 to production"
- "Check production health"
- "Rollback last deployment"

**Deployment Configuration**:
```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to deploy'
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Cloud
        run: |
          # Cloud provider specific deployment
```

## Expected Output

**Deployment Report**:
```markdown
## Production Deployment Complete ✅

**Version**: v1.2.3
**Environment**: Production
**Deploy Time**: 2026-01-12 14:30 UTC
**Duration**: 8 minutes

### Pre-Deployment
- [x] Tests passed (120/120)
- [x] Linting passed
- [x] Build completed
- [x] Infrastructure verified

### Staging
- [x] Deployed successfully
- [x] Smoke tests passed (5/5)
- [x] Performance baseline met
- [x] No errors in logs

### Production
- [x] Deployed successfully
- [x] Zero downtime achieved
- [x] Health checks passing
- [x] Error rate: 0.02% (normal)
- [x] Response time: 245ms avg (baseline: 250ms)

### Monitoring
- Error rate: 0.02%
- Response time: 245ms (p50), 480ms (p95)
- Uptime: 100%
- Traffic: 1,200 req/min (normal)

### Changes Deployed
- Feature: User authentication (#42)
- Fix: Password reset email (#43)
- Refactor: Optimize database queries (#44)

**Next deployment window**: 2026-01-15 14:00 UTC
```

## Cloud Provider Commands

### Azure
```bash
# Deploy to App Service
az webapp deployment source config-zip \
  --resource-group myResourceGroup \
  --name myApp \
  --src ./build.zip

# Check health
az webapp show --name myApp --resource-group myResourceGroup
```

### AWS
```bash
# Deploy to Elastic Beanstalk
eb deploy production

# Check health
eb health production
```

### GCP
```bash
# Deploy to Cloud Run
gcloud run deploy myapp \
  --image gcr.io/project/myapp:v1.2.3 \
  --region us-central1

# Check health
gcloud run services describe myapp --region us-central1
```

### Kubernetes
```bash
# Deploy
kubectl apply -f k8s/production/

# Check rollout
kubectl rollout status deployment/myapp

# Rollback
kubectl rollout undo deployment/myapp
```

## Integration with Other Skills

- **Execution**: Called by [task-execution](./task-execution/SKILL.md)
- **Testing**: Requires [test-generation](./test-generation/SKILL.md) to pass
- **Monitoring**: Uses [health-monitoring](./health-monitoring/SKILL.md)

## Configuration

**Deployment Environments**:
```
Development: Auto-deploy on main branch push
Staging: Manual trigger or scheduled
Production: Manual approval required
```

**Health Check Endpoints**:
```
GET /health → 200 OK
GET /health/database → 200 OK
GET /health/cache → 200 OK
GET /health/queue → 200 OK
```

**Rollback Criteria**:
```
Auto-rollback if:
- Health check fails for >2 minutes
- Error rate >10%
- Critical endpoint returns 5xx

Manual rollback if:
- Data corruption detected
- Security issue found
- Business-critical feature broken
```

## References

- Cloud provider documentation
- `.github/workflows/deploy-*.yml` - Deployment workflows
- `docs/DEPLOYMENT.md` - Deployment procedures
- Infrastructure as Code files (Terraform, ARM, CloudFormation)
