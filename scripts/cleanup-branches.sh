#!/bin/bash
#
# Branch Cleanup Script - Issue #177
# Deletes outdated remote branches that have been merged into main
#
# Usage: bash scripts/cleanup-branches.sh [--dry-run] [--all]
#
# Options:
#   --dry-run    Show what would be deleted without actually deleting
#   --all        Include additional branches (dead-letter-queue, replace-sample-data)
#
# Safety: This script requires confirmation before deleting branches

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
DRY_RUN=false
DELETE_ALL=false

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            ;;
        --all)
            DELETE_ALL=true
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Usage: $0 [--dry-run] [--all]"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}  Branch Cleanup Script - Issue #177${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

# Verify we're in the correct repository
if [ ! -d ".git" ]; then
    echo -e "${RED}Error: Must run from repository root${NC}"
    exit 1
fi

# Verify we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}Warning: Not on main branch (currently on: $CURRENT_BRANCH)${NC}"
    read -r -p "Switch to main? (y/n): " response
    if [ "$response" = "y" ]; then
        git checkout main
    else
        echo -e "${RED}Aborted.${NC}"
        exit 1
    fi
fi

# Fetch latest from origin
echo -e "${BLUE}Fetching latest from origin...${NC}"
git fetch origin

# Define branches to delete (confirmed outdated)
CONFIRMED_BRANCHES=(
    "copilot/add-metrics-service"
    "copilot/build-orchestrator-dashboard"
    "copilot/fix-race-condition-in-status-updates"
    "alert-fix-10"
)

# Additional branches (require --all flag)
ADDITIONAL_BRANCHES=(
    "copilot/implement-dead-letter-queue-sqlite"
    "copilot/replace-sample-data-integration"
)

# Determine which branches to delete
if [ "$DELETE_ALL" = true ]; then
    BRANCHES_TO_DELETE=("${CONFIRMED_BRANCHES[@]}" "${ADDITIONAL_BRANCHES[@]}")
    echo -e "${YELLOW}Mode: Delete ALL branches (confirmed + additional)${NC}"
else
    BRANCHES_TO_DELETE=("${CONFIRMED_BRANCHES[@]}")
    echo -e "${GREEN}Mode: Delete CONFIRMED branches only${NC}"
fi

echo ""
echo -e "${BLUE}Branches to delete:${NC}"
for branch in "${BRANCHES_TO_DELETE[@]}"; do
    # Check if branch exists on remote
    if git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
        echo -e "  ${RED}✗${NC} $branch ${GREEN}(exists)${NC}"
    else
        echo -e "  ${YELLOW}○${NC} $branch ${YELLOW}(not found)${NC}"
    fi
done

echo ""

# Dry run mode
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}=== DRY RUN MODE - No changes will be made ===${NC}"
    echo ""
    echo "Would execute:"
    for branch in "${BRANCHES_TO_DELETE[@]}"; do
        if git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
            echo "  git push origin --delete $branch"
        fi
    done
    echo "  git remote prune origin"
    echo ""
    echo -e "${YELLOW}Run without --dry-run to execute${NC}"
    exit 0
fi

# Confirmation prompt
# Count actual existing branches
EXISTING_COUNT=0
for branch in "${BRANCHES_TO_DELETE[@]}"; do
    if git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
        ((EXISTING_COUNT++))
    fi
done

echo -e "${YELLOW}⚠️  WARNING: This will permanently delete $EXISTING_COUNT remote branches${NC}"
read -r -p "Type 'DELETE' to confirm: " confirmation

if [ "$confirmation" != "DELETE" ]; then
    echo -e "${RED}Aborted - confirmation not provided${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Starting cleanup...${NC}"
echo ""

# Delete branches
DELETED_COUNT=0
FAILED_COUNT=0
SKIPPED_COUNT=0

for branch in "${BRANCHES_TO_DELETE[@]}"; do
    echo -e "${BLUE}Processing: $branch${NC}"
    
    # Check if branch exists on remote
    if ! git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
        echo -e "  ${YELLOW}⊘ Skipped (branch not found on remote)${NC}"
        ((SKIPPED_COUNT++))
        continue
    fi
    
    # Delete remote branch
    if git push origin --delete "$branch" 2>&1; then
        echo -e "  ${GREEN}✓ Deleted from origin${NC}"
        ((DELETED_COUNT++))
        
        # Delete local branch if it exists
        if git show-ref --verify --quiet "refs/heads/$branch"; then
            git branch -D "$branch" 2>/dev/null || true
            echo -e "  ${GREEN}✓ Deleted local branch${NC}"
        fi
    else
        echo -e "  ${RED}✗ Failed to delete${NC}"
        ((FAILED_COUNT++))
    fi
    
    echo ""
done

# Prune remote references
echo -e "${BLUE}Pruning remote references...${NC}"
git remote prune origin
echo -e "${GREEN}✓ Pruned${NC}"
echo ""

# Summary
echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}  Cleanup Summary${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "${GREEN}✓ Deleted:${NC} $DELETED_COUNT branches"
echo -e "${YELLOW}⊘ Skipped:${NC} $SKIPPED_COUNT branches (not found)"
echo -e "${RED}✗ Failed:${NC} $FAILED_COUNT branches"
echo ""

if [ $FAILED_COUNT -eq 0 ] && [ $DELETED_COUNT -gt 0 ]; then
    echo -e "${GREEN}🎉 Cleanup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Verify branches are deleted: git ls-remote --heads origin"
    echo "2. Check main branch CI is passing"
    echo "3. Close Issue #177"
    exit 0
elif [ $DELETED_COUNT -eq 0 ] && [ $SKIPPED_COUNT -eq ${#BRANCHES_TO_DELETE[@]} ]; then
    echo -e "${YELLOW}ℹ️  All branches already deleted${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Cleanup completed with errors${NC}"
    echo "Review the output above for details"
    exit 1
fi
