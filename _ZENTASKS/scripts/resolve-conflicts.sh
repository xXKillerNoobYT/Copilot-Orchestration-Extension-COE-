#!/bin/bash

# Conflict Resolver — Automated Git Conflict Resolution
# Version: 1.0.0
# Usage: ./resolve-conflicts.sh [options]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if we're in a merge/rebase conflict state
check_conflict_state() {
  if ! git status | grep -q "Unmerged paths\|both modified"; then
    log_info "No conflicts detected. Repository is clean."
    exit 0
  fi
}

# Auto-resolve whitespace-only conflicts
resolve_whitespace_conflicts() {
  log_info "Attempting to resolve whitespace conflicts..."
  
  local conflicted=$(git diff --name-only --diff-filter=U)
  local resolved=0
  
  for file in $conflicted; do
    # Check if conflict is whitespace-only
    if git diff "$file" | grep -q "^<<<<<<<" && \
       git diff "$file" | grep -v "^[<=>|]" | tr -d '[:space:]' | wc -c | grep -q "^0$"; then
      
      log_info "Whitespace-only conflict in $file - using ours"
      git checkout --ours "$file"
      git add "$file"
      ((resolved++))
    fi
  done
  
  if [ $resolved -gt 0 ]; then
    log_success "Auto-resolved $resolved whitespace conflicts"
  fi
}

# Auto-resolve import order conflicts (JavaScript/TypeScript)
resolve_import_conflicts() {
  log_info "Attempting to resolve import order conflicts..."
  
  local conflicted=$(git diff --name-only --diff-filter=U | grep -E '\.(js|ts|jsx|tsx)$')
  local resolved=0
  
  for file in $conflicted; do
    # Check if conflict is in import section
    if git diff "$file" | grep -A5 -B5 "^<<<<<<<" | grep -q "^import"; then
      log_info "Import conflict detected in $file - merging and sorting"
      
      # Extract both versions of imports
      git show :2:"$file" > /tmp/ours.tmp 2>/dev/null || continue
      git show :3:"$file" > /tmp/theirs.tmp 2>/dev/null || continue
      
      # Merge imports (simple approach: combine and sort)
      cat /tmp/ours.tmp /tmp/theirs.tmp | \
        grep "^import" | \
        sort -u > /tmp/imports.tmp
      
      # Get non-import content from ours
      grep -v "^import" /tmp/ours.tmp > /tmp/rest.tmp || true
      
      # Combine
      cat /tmp/imports.tmp /tmp/rest.tmp > "$file"
      git add "$file"
      ((resolved++))
    fi
  done
  
  if [ $resolved -gt 0 ]; then
    log_success "Auto-resolved $resolved import conflicts"
  fi
  
  # Cleanup
  rm -f /tmp/{ours,theirs,imports,rest}.tmp
}

# Auto-resolve JSON formatting conflicts
resolve_json_conflicts() {
  log_info "Attempting to resolve JSON formatting conflicts..."
  
  local conflicted=$(git diff --name-only --diff-filter=U | grep '\.json$')
  local resolved=0
  
  for file in $conflicted; do
    log_info "JSON conflict in $file - attempting merge..."
    
    # Get both versions
    git show :2:"$file" > /tmp/ours.json 2>/dev/null || continue
    git show :3:"$file" > /tmp/theirs.json 2>/dev/null || continue
    
    # Try to parse both (if both valid, attempt merge)
    if jq . /tmp/ours.json >/dev/null 2>&1 && \
       jq . /tmp/theirs.json >/dev/null 2>&1; then
      
      # Use jq to merge (theirs overwrites ours for conflicts)
      jq -s '.[0] * .[1]' /tmp/ours.json /tmp/theirs.json > "$file"
      
      if jq . "$file" >/dev/null 2>&1; then
        git add "$file"
        ((resolved++))
        log_success "Merged $file successfully"
      else
        log_warning "Merge produced invalid JSON for $file - manual review required"
      fi
    else
      log_warning "One or both JSON versions invalid in $file - manual review required"
    fi
  done
  
  if [ $resolved -gt 0 ]; then
    log_success "Auto-resolved $resolved JSON conflicts"
  fi
  
  rm -f /tmp/{ours,theirs}.json
}

# Auto-resolve package.json/composer.json dependency conflicts
resolve_dependency_conflicts() {
  log_info "Attempting to resolve dependency file conflicts..."
  
  for file in package.json composer.json; do
    if git diff --name-only --diff-filter=U | grep -q "^$file$"; then
      log_info "Dependency conflict in $file - merging dependencies..."
      
      git show :2:"$file" > /tmp/ours.json 2>/dev/null || continue
      git show :3:"$file" > /tmp/theirs.json 2>/dev/null || continue
      
      # Merge dependencies (combine both, prefer newer versions)
      jq -s '
        .[0] * .[1] |
        if .dependencies then
          .dependencies = (.[0].dependencies * .[1].dependencies)
        else . end |
        if .devDependencies then
          .devDependencies = (.[0].devDependencies * .[1].devDependencies)
        else . end
      ' /tmp/ours.json /tmp/theirs.json > "$file"
      
      if jq . "$file" >/dev/null 2>&1; then
        git add "$file"
        log_success "Merged $file dependencies"
      else
        log_warning "Merge failed for $file - manual review required"
      fi
    fi
  done
  
  rm -f /tmp/{ours,theirs}.json
}

# Analyze remaining conflicts
analyze_conflicts() {
  local conflicted=$(git diff --name-only --diff-filter=U)
  
  if [ -z "$conflicted" ]; then
    log_success "All conflicts resolved automatically!"
    return 0
  fi
  
  log_warning "\nRemaining conflicts require manual resolution:\n"
  
  for file in $conflicted; do
    local conflict_count=$(grep -c "^<<<<<<<" "$file" 2>/dev/null || echo 0)
    echo -e "${YELLOW}$file${NC} - $conflict_count conflict(s)"
    
    # Show conflict context
    if [ $conflict_count -gt 0 ]; then
      echo "  Conflict types:"
      grep -A1 "^<<<<<<<" "$file" | grep -v "^--$" | head -5 | sed 's/^/    /'
      echo ""
    fi
  done
  
  echo ""
  log_info "To resolve manually:"
  echo "  1. Edit conflicted files"
  echo "  2. Remove conflict markers (<<<<<<<, =======, >>>>>>>)"
  echo "  3. Test changes"
  echo "  4. Run: git add <files>"
  echo "  5. Continue: git rebase --continue  OR  git merge --continue"
  echo ""
  
  return 1
}

# Generate conflict report
generate_report() {
  local report_file="conflict-report.md"
  
  log_info "Generating conflict report: $report_file"
  
  cat > "$report_file" <<EOF
# Conflict Resolution Report

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Branch:** $(git rev-parse --abbrev-ref HEAD)
**Status:** $(git status --short | head -1)

## Auto-Resolved Conflicts

EOF
  
  # List resolved files (staged but originally conflicted)
  local resolved=$(git diff --cached --name-only --diff-filter=M)
  if [ -n "$resolved" ]; then
    echo "✅ **Automatically resolved:**" >> "$report_file"
    echo "$resolved" | sed 's/^/- /' >> "$report_file"
  else
    echo "*None*" >> "$report_file"
  fi
  
  cat >> "$report_file" <<EOF

## Manual Resolution Required

EOF
  
  # List remaining conflicts
  local conflicted=$(git diff --name-only --diff-filter=U)
  if [ -n "$conflicted" ]; then
    echo "⚠️ **Requires manual review:**" >> "$report_file"
    for file in $conflicted; do
      local count=$(grep -c "^<<<<<<<" "$file" 2>/dev/null || echo 0)
      echo "- \`$file\` ($count conflict(s))" >> "$report_file"
    done
  else
    echo "*None - All conflicts resolved!* ✅" >> "$report_file"
  fi
  
  cat >> "$report_file" <<EOF

## Resolution Guidelines

### Safe Auto-Resolution Patterns
- Whitespace-only differences → Keep ours
- Import order differences → Merge and sort
- JSON formatting differences → Pretty-print merge
- Dependency version conflicts → Keep newer version

### Escalate to Manual Review
- Logic conflicts (same function modified differently)
- Schema changes (migrations, API contracts)
- Test failures after auto-merge
- Build errors after auto-merge

## Next Steps

1. Review remaining conflicts manually
2. Edit conflicted files
3. Remove conflict markers
4. Test thoroughly
5. Stage resolved files: \`git add <file>\`
6. Continue: \`git rebase --continue\` or \`git merge --continue\`

EOF
  
  log_success "Report saved to $report_file"
}

# Main resolution workflow
main() {
  log_info "Git Conflict Resolver v1.0.0"
  echo ""
  
  # Check if we're in conflict state
  check_conflict_state
  
  log_info "Conflicts detected. Starting auto-resolution..."
  echo ""
  
  # Run auto-resolution strategies
  resolve_whitespace_conflicts
  resolve_import_conflicts
  resolve_json_conflicts
  resolve_dependency_conflicts
  
  echo ""
  
  # Analyze what's left
  if analyze_conflicts; then
    log_success "\n✅ All conflicts auto-resolved!"
    log_info "You can now continue with: git rebase --continue  OR  git merge --continue"
  else
    log_warning "\n⚠️ Manual resolution required for remaining conflicts"
  fi
  
  # Generate report
  echo ""
  generate_report
  
  echo ""
  log_info "Resolution complete. Review conflict-report.md for details."
}

# Run main
main "$@"
