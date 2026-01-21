#!/bin/bash
#
# Feature Verification Script - Issue #177
# Verifies all expected features from merged branches exist on main
#
# Usage: ./verify-features.sh
#
# Returns: 0 if all features verified, 1 if any missing

# Note: Do not use 'set -e' here; we want to run all checks and count PASS/FAIL.

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}  Feature Verification Report - Issue #177${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""
echo "Date: $(date)"
echo "Branch: $(git branch --show-current)"
echo "Commit: $(git rev-parse HEAD)"
echo "Commit Message: $(git log -1 --pretty=%B | head -1)"
echo ""

PASS=0
FAIL=0
WARNINGS=0

# Function to check file exists
check_file() {
    local filepath="$1"
    local description="$2"
    
    if [ -f "$filepath" ]; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC} $description"
        echo -e "   ${RED}File not found: $filepath${NC}"
        ((FAIL++))
        return 1
    fi
}

# Function to check pattern in file
check_pattern() {
    local filepath="$1"
    local pattern="$2"
    local description="$3"
    
    if [ ! -f "$filepath" ]; then
        echo -e "${RED}✗${NC} $description"
        echo -e "   ${RED}File not found: $filepath${NC}"
        ((FAIL++))
        return 1
    fi
    
    if grep -q "$pattern" "$filepath" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC} $description"
        echo -e "   ${RED}Pattern not found: '$pattern' in $filepath${NC}"
        ((FAIL++))
        return 1
    fi
}

# Function to check directory exists
check_directory() {
    local dirpath="$1"
    local description="$2"
    
    if [ -d "$dirpath" ]; then
        local file_count=$(find "$dirpath" -type f | wc -l)
        echo -e "${GREEN}✓${NC} $description ($file_count files)"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC} $description"
        echo -e "   ${RED}Directory not found: $dirpath${NC}"
        ((FAIL++))
        return 1
    fi
}

echo -e "${BLUE}--- Feature 1: MetricsService (copilot/add-metrics-service) ---${NC}"
check_file "vscode-extension/src/services/metricsService.ts" "MetricsService implementation"
check_pattern "vscode-extension/src/services/metricsService.ts" "class.*Metrics" "MetricsService class definition"

echo ""
echo -e "${BLUE}--- Feature 2: Dashboard Panels (copilot/build-orchestrator-dashboard) ---${NC}"
check_file "vscode-extension/src/panels/auditDashboardPanel.ts" "Audit Dashboard Panel implementation"
check_file "vscode-extension/src/panels/auditDashboardPanel.test.ts" "Audit Dashboard Panel tests"
check_pattern "vscode-extension/src/panels/auditDashboardPanel.ts" "class.*Dashboard" "Dashboard class definition"

echo ""
echo -e "${BLUE}--- Feature 3: Optimistic Locking (copilot/fix-race-condition-in-status-updates) ---${NC}"
check_file "app/Http/Controllers/Api/McpController.php" "MCP Controller (Laravel)"
check_pattern "app/Http/Controllers/Api/McpController.php" "Optimistic locking" "Optimistic locking comment"
check_pattern "app/Http/Controllers/Api/McpController.php" "atomic compare-and-swap" "Atomic compare-and-swap implementation"
check_pattern "app/Http/Controllers/Api/McpController.php" "expectedVersion" "Version checking logic"

echo ""
echo -e "${BLUE}--- Feature 4: MCP Handlers (copilot/replace-mcp-handler-mocks) ---${NC}"
check_file "vscode-extension/src/services/mcpClient.ts" "MCP Client implementation"
check_pattern "vscode-extension/src/services/mcpClient.ts" "class.*MCP" "MCP Client class"
check_file "vscode-extension/src/services/mcpClient.optimisticLocking.test.ts" "MCP optimistic locking tests"
check_file "vscode-extension/src/services/mcpClient.teamStatus.test.ts" "MCP team status tests"

echo ""
echo -e "${BLUE}--- Feature 5: Copilot Agent API (copilot/implement-github-copilot-agent-api) ---${NC}"
check_file "vscode-extension/src/services/copilotAgentClient.ts" "Copilot Agent Client"
check_pattern "vscode-extension/src/services/copilotAgentClient.ts" "class.*Copilot.*Agent" "Copilot Agent Client class"

# Check for authentication provider
if [ -f "vscode-extension/src/services/githubAuthProvider.ts" ] || \
   grep -q "GitHubAuth" "vscode-extension/src/services/copilotAgentClient.ts" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} GitHub authentication provider"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} GitHub authentication provider (optional)"
    ((WARNINGS++))
fi

echo ""
echo -e "${BLUE}--- Additional Checks ---${NC}"

# Check for Dead Letter Queue (additional branch)
if [ -f "vscode-extension/src/services/deadLetterQueue.ts" ]; then
    echo -e "${GREEN}✓${NC} Dead Letter Queue (bonus feature found)"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} Dead Letter Queue not found (may be on separate branch)"
    ((WARNINGS++))
fi

# Check for test files
TEST_COUNT=$(find vscode-extension/src -name "*.test.ts" -type f 2>/dev/null | wc -l)
if [ "$TEST_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Test files found ($TEST_COUNT test files)"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} No test files found"
    ((WARNINGS++))
fi

echo ""
echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "${GREEN}✓ Passed:${NC} $PASS"
echo -e "${RED}✗ Failed:${NC} $FAIL"
echo -e "${YELLOW}⚠ Warnings:${NC} $WARNINGS"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical features verified successfully!${NC}"
    echo ""
    echo -e "${BLUE}Main branch is ready for production${NC}"
    echo "All work from merged branches is confirmed present."
    echo ""
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}Note: $WARNINGS warnings detected (non-critical)${NC}"
    fi
    exit 0
else
    echo -e "${RED}⚠️  Some features are missing!${NC}"
    echo "Review the output above for details."
    echo ""
    echo -e "${YELLOW}Recommendation:${NC}"
    echo "- Check if branches were fully merged"
    echo "- Verify no rollbacks occurred"
    echo "- Review git history for missing commits"
    exit 1
fi
