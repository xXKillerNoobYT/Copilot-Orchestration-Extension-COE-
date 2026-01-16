# GitHub API Rate Limit - Quick Reference

## 🚨 Check Current Rate Limit Status

### Method 1: Via GitHub CLI
```bash
gh api rate_limit
```

### Method 2: Via curl
```bash
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/rate_limit
```

### Method 3: Via Laravel (in project)
```bash
cd /path/to/project
php artisan tinker
>>> $client = app(App\Services\GitHubApiClient::class);
>>> $status = $client->getRateLimitStatus();
>>> print_r($status);
```

---

## 📊 Expected Response

```json
{
  "resources": {
    "core": {
      "limit": 5000,
      "remaining": 4500,
      "reset": 1705363200,
      "used": 500
    },
    "search": {
      "limit": 30,
      "remaining": 30,
      "reset": 1705363200,
      "used": 0
    },
    "graphql": {
      "limit": 5000,
      "remaining": 5000,
      "reset": 1705363200,
      "used": 0
    }
  },
  "rate": {
    "limit": 5000,
    "remaining": 4500,
    "reset": 1705363200,
    "used": 500
  }
}
```

**Key Fields:**
- `limit`: Total requests allowed per hour (5000 for authenticated)
- `remaining`: Requests remaining in current window
- `reset`: Unix timestamp when limit resets
- `used`: Requests consumed in current window

---

## ⚠️ Thresholds

| Remaining | Status | Action |
|-----------|--------|--------|
| 1000+ | ✅ Healthy | Normal operation |
| 500-999 | ⚠️ Warning | Log warning, monitor closely |
| 100-499 | 🚨 Critical | Reduce API calls, cache aggressively |
| <100 | ❌ Blocked | API calls rejected, wait for reset |

---

## 🔧 Configuration Reference

### Current Settings (After Optimization)

| Component | Frequency | API Calls/Run | Daily Total |
|-----------|-----------|---------------|-------------|
| Dependabot (Composer) | Weekly | ~50 | ~7 |
| Dependabot (NPM Root) | Weekly | ~50 | ~7 |
| Dependabot (NPM Extension) | Weekly | ~50 | ~7 |
| Zen Tasks Sync | Every 12h | ~150 | ~300 |
| Feature Branch Sync | Daily | ~50 | ~50 |
| CodeQL | Weekly | ~20 | ~3 |
| Tests | Daily | ~10 | ~10 |
| **Total Automated** | - | - | **~384/day** |

**Safety Margin:** 4,616 requests/day for manual/development use

---

## 🛠️ Troubleshooting

### If Rate Limit Still Exhausting

1. **Check recent workflow runs:**
   ```bash
   gh run list --limit 50
   ```

2. **Review API usage by hour:**
   ```bash
   # Look for patterns in GitHub API responses
   # Check Laravel logs for API calls
   tail -f storage/logs/laravel.log | grep -i "github"
   ```

3. **Further reduce frequency:**
   - Dependabot: Weekly → Monthly
   - Zen Sync: 12h → 24h

4. **Enable conditional sync:**
   ```php
   // Only sync if changes detected
   if ($hasChanges) {
       $syncService->sync();
   }
   ```

---

## 📈 Monitoring Commands

### Laravel Cache Check
```bash
php artisan tinker
>>> Cache::get('github:rate_limit');
```

### View Recent Logs
```bash
tail -100 storage/logs/laravel.log | grep -i "rate limit"
```

### Check Workflow History
```bash
# Last 20 workflow runs
gh run list --limit 20

# Specific workflow
gh run list --workflow=sync-zen-tasks.yml
```

---

## 🔄 Rate Limit Reset

Rate limit resets occur **every hour** at the top of the hour.

**Calculate time until reset:**
```bash
# Get reset timestamp
RESET=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/rate_limit | jq -r '.rate.reset')

# Calculate minutes remaining
echo "Minutes until reset: $(( ($RESET - $(date +%s)) / 60 ))"
```

---

## 📚 Quick Links

- [Full Documentation](./GITHUB-API-RATE-LIMIT-OPTIMIZATION.md)
- [GitHub Rate Limit Docs](https://docs.github.com/en/rest/overview/rate-limits-for-the-rest-api)
- [Dependabot Config](../.github/dependabot.yml)
- [Sync Workflow](../.github/workflows/sync-zen-tasks.yml)

---

## 🎯 Emergency Actions

### If Completely Exhausted (0 remaining)

1. **Stop all workflows:**
   ```bash
   # Disable sync workflow temporarily
   gh workflow disable sync-zen-tasks.yml
   ```

2. **Wait for reset:**
   - Check reset time: `gh api rate_limit | jq -r '.rate.reset'`
   - Convert to local time: `date -d @RESET_TIMESTAMP`

3. **Re-enable workflows:**
   ```bash
   gh workflow enable sync-zen-tasks.yml
   ```

4. **Review and adjust:**
   - Check what caused exhaustion
   - Further reduce frequencies if needed
   - Consider webhook-based alternatives

---

**Last Updated:** 2026-01-16  
**Status:** Active Monitoring
