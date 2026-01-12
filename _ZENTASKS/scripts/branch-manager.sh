#!/bin/bash

# Branch Manager — Automated Feature Branch Management
# Version: 1.0.0
# Usage: ./branch-manager.sh [command] [options]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TASKS_FILE="../tasks.json"
MAIN_BRANCH="main"
BRANCH_PREFIX_MAP=(
  ["feature"]="feature"
  ["bugfix"]="bugfix"
  ["hotfix"]="hotfix"
  ["epic"]="epic"
  ["refactor"]="refactor"
  ["docs"]="docs"
  ["test"]="test"
  ["chore"]="chore"
)

# Helper functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Extract task info from tasks.json
get_task_title() {
  local task_id="$1"
  jq -r ".tasks[] | select(.id == \"$task_id\") | .title" "$TASKS_FILE"
}

get_task_dependencies() {
  local task_id="$1"
  jq -r ".tasks[] | select(.id == \"$task_id\") | .dependencies[]" "$TASKS_FILE" 2>/dev/null || echo ""
}

get_task_type() {
  local task_id="$1"
  jq -r ".tasks[] | select(.id == \"$task_id\") | .type // \"feature\"" "$TASKS_FILE"
}

# Generate branch name from task ID
generate_branch_name() {
  local task_id="$1"
  local task_title=$(get_task_title "$task_id")
  local task_type=$(get_task_type "$task_id")
  
  if [ -z "$task_title" ]; then
    log_error "Task $task_id not found in $TASKS_FILE"
    exit 1
  fi
  
  # Convert title to slug
  local slug=$(echo "$task_title" | \
    tr '[:upper:]' '[:lower:]' | \
    sed 's/[^a-z0-9]/-/g' | \
    sed 's/--*/-/g' | \
    sed 's/^-//' | \
    sed 's/-$//' | \
    cut -c 1-50)
  
  echo "${task_type}/${task_id}-${slug}"
}

# Update task with branch info
update_task_branch_info() {
  local task_id="$1"
  local branch_name="$2"
  local status="${3:-active}"
  local pr_url="${4:-}"
  
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
  
  # Create branch info JSON
  local branch_info=$(cat <<EOF
{
  "branchName": "$branch_name",
  "createdAt": "$timestamp",
  "baseBranch": "$MAIN_BRANCH",
  "status": "$status",
  "lastSyncedWithMain": "$timestamp",
  "prUrl": "$pr_url"
}
EOF
)
  
  # Update tasks.json with jq
  local temp_file=$(mktemp)
  jq --arg task_id "$task_id" \
     --argjson branch_info "$branch_info" \
     '(.tasks[] | select(.id == $task_id)) |= (. + {branchInfo: $branch_info} + {updatedAt: now|strftime("%Y-%m-%dT%H:%M:%S.000Z")})' \
     "$TASKS_FILE" > "$temp_file"
  
  mv "$temp_file" "$TASKS_FILE"
  log_success "Updated task $task_id with branch info"
}

# Command: create
cmd_create() {
  local task_id="$1"
  
  if [ -z "$task_id" ]; then
    log_error "Usage: branch-manager.sh create <TASK-ID>"
    exit 1
  fi
  
  # Generate branch name
  local branch_name=$(generate_branch_name "$task_id")
  
  log_info "Creating branch: $branch_name"
  
  # Check if branch already exists
  if git rev-parse --verify "$branch_name" >/dev/null 2>&1; then
    log_warning "Branch $branch_name already exists. Checking out..."
    git checkout "$branch_name"
  else
    # Ensure we're on main and up to date
    git checkout "$MAIN_BRANCH"
    git pull origin "$MAIN_BRANCH"
    
    # Create and checkout new branch
    git checkout -b "$branch_name"
    
    # Update task metadata
    update_task_branch_info "$task_id" "$branch_name" "active"
    
    log_success "Created and checked out branch: $branch_name"
  fi
  
  log_info "Branch ready for development!"
}

# Command: sync
cmd_sync() {
  local current_branch=$(git rev-parse --abbrev-ref HEAD)
  
  if [ "$current_branch" = "$MAIN_BRANCH" ]; then
    log_error "Cannot sync main branch. Switch to a feature branch first."
    exit 1
  fi
  
  log_info "Syncing $current_branch with $MAIN_BRANCH..."
  
  # Fetch latest main
  git fetch origin "$MAIN_BRANCH"
  
  # Attempt rebase
  if git rebase "origin/$MAIN_BRANCH"; then
    log_success "Successfully rebased on origin/$MAIN_BRANCH"
    
    # Update sync timestamp in task
    local task_id=$(echo "$current_branch" | grep -oP 'TASK-[a-z0-9-]+')
    if [ -n "$task_id" ]; then
      local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
      local temp_file=$(mktemp)
      jq --arg task_id "$task_id" \
         --arg timestamp "$timestamp" \
         '(.tasks[] | select(.id == $task_id) | .branchInfo.lastSyncedWithMain) = $timestamp' \
         "$TASKS_FILE" > "$temp_file"
      mv "$temp_file" "$TASKS_FILE"
    fi
  else
    log_error "Rebase conflicts detected. Resolve manually or run: git rebase --abort"
    exit 1
  fi
}

# Command: sync-all
cmd_sync_all() {
  local current_branch=$(git rev-parse --abbrev-ref HEAD)
  
  log_info "Syncing all feature branches with $MAIN_BRANCH..."
  
  # Get all feature branches
  local branches=$(git branch | grep -E 'feature/|bugfix/|epic/' | sed 's/^[ *]*//')
  
  for branch in $branches; do
    log_info "Syncing $branch..."
    git checkout "$branch"
    
    if git rebase "origin/$MAIN_BRANCH"; then
      log_success "✓ $branch synced"
    else
      log_warning "✗ $branch has conflicts (skipping)"
      git rebase --abort
    fi
  done
  
  # Return to original branch
  git checkout "$current_branch"
  log_success "All branches synced!"
}

# Command: list
cmd_list() {
  log_info "Active feature branches:\n"
  
  # List branches with their task IDs and last commit
  git branch --format="%(refname:short)" | grep -E 'feature/|bugfix/|epic/' | while read branch; do
    local last_commit=$(git log -1 --format="%cr - %s" "$branch")
    echo -e "${GREEN}$branch${NC}"
    echo "  └─ $last_commit"
  done
}

# Command: cleanup
cmd_cleanup() {
  log_info "Cleaning up merged branches..."
  
  # Get merged branches
  local merged=$(git branch --merged "$MAIN_BRANCH" | grep -E 'feature/|bugfix/' | sed 's/^[ *]*//')
  
  if [ -z "$merged" ]; then
    log_info "No merged branches to clean up."
    return
  fi
  
  echo -e "\n${YELLOW}The following branches will be deleted:${NC}"
  echo "$merged"
  echo ""
  read -p "Continue? (y/N) " -n 1 -r
  echo
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    for branch in $merged; do
      # Extract task ID
      local task_id=$(echo "$branch" | grep -oP 'TASK-[a-z0-9-]+')
      
      # Update task metadata
      if [ -n "$task_id" ]; then
        local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
        local temp_file=$(mktemp)
        jq --arg task_id "$task_id" \
           --arg timestamp "$timestamp" \
           '(.tasks[] | select(.id == $task_id) | .branchInfo.status) = "merged" |
            (.tasks[] | select(.id == $task_id) | .branchInfo.mergedAt) = $timestamp' \
           "$TASKS_FILE" > "$temp_file"
        mv "$temp_file" "$TASKS_FILE"
      fi
      
      # Delete branch
      git branch -d "$branch"
      log_success "Deleted: $branch"
    done
  else
    log_info "Cleanup cancelled."
  fi
}

# Command: status
cmd_status() {
  local task_id="$1"
  
  if [ -z "$task_id" ]; then
    log_error "Usage: branch-manager.sh status <TASK-ID>"
    exit 1
  fi
  
  local branch_info=$(jq -r ".tasks[] | select(.id == \"$task_id\") | .branchInfo" "$TASKS_FILE")
  
  if [ "$branch_info" = "null" ] || [ -z "$branch_info" ]; then
    log_warning "No branch info found for task $task_id"
    exit 1
  fi
  
  echo -e "\n${BLUE}Branch Status for $task_id:${NC}"
  echo "$branch_info" | jq .
}

# Command: merge-order
cmd_merge_order() {
  log_info "Calculating dependency-aware merge order...\n"
  
  # Get all tasks with active branches
  local tasks=$(jq -r '.tasks[] | select(.branchInfo.status == "active") | .id' "$TASKS_FILE")
  
  # Simple topological sort (DFS)
  declare -A visited
  declare -a sorted
  
  visit() {
    local task_id="$1"
    
    if [ "${visited[$task_id]}" = "1" ]; then
      return
    fi
    
    visited[$task_id]=1
    
    # Visit dependencies first
    local deps=$(get_task_dependencies "$task_id")
    for dep in $deps; do
      visit "$dep"
    done
    
    sorted+=("$task_id")
  }
  
  for task in $tasks; do
    visit "$task"
  done
  
  echo -e "${GREEN}Recommended merge order:${NC}\n"
  for i in "${!sorted[@]}"; do
    local task_id="${sorted[$i]}"
    local branch_name=$(jq -r ".tasks[] | select(.id == \"$task_id\") | .branchInfo.branchName" "$TASKS_FILE")
    echo "$((i+1)). $branch_name"
  done
}

# Command: help
cmd_help() {
  cat <<EOF
${BLUE}Branch Manager — Feature Branch Management Tool${NC}

${GREEN}Usage:${NC}
  ./branch-manager.sh <command> [options]

${GREEN}Commands:${NC}
  create <TASK-ID>      Create new feature branch from task
  sync                  Sync current branch with main (rebase)
  sync-all              Sync all feature branches with main
  list                  List all active feature branches
  cleanup               Delete merged branches and update tasks
  status <TASK-ID>      Show branch status for task
  merge-order           Calculate dependency-aware merge order
  help                  Show this help message

${GREEN}Examples:${NC}
  ./branch-manager.sh create TASK-mk9c0007-template-tests
  ./branch-manager.sh sync
  ./branch-manager.sh list
  ./branch-manager.sh cleanup
  ./branch-manager.sh merge-order

${GREEN}Branch Naming Convention:${NC}
  {type}/{task-id}-{description-slug}
  
  Types: feature, bugfix, hotfix, epic, refactor, docs, test, chore

${GREEN}Documentation:${NC}
  See Docs/BranchingStrategy.md for complete branching guidelines

EOF
}

# Main command dispatcher
main() {
  local command="${1:-help}"
  shift || true
  
  case "$command" in
    create)
      cmd_create "$@"
      ;;
    sync)
      cmd_sync "$@"
      ;;
    sync-all)
      cmd_sync_all "$@"
      ;;
    list)
      cmd_list "$@"
      ;;
    cleanup)
      cmd_cleanup "$@"
      ;;
    status)
      cmd_status "$@"
      ;;
    merge-order)
      cmd_merge_order "$@"
      ;;
    help|--help|-h)
      cmd_help
      ;;
    *)
      log_error "Unknown command: $command"
      cmd_help
      exit 1
      ;;
  esac
}

# Run main
main "$@"
