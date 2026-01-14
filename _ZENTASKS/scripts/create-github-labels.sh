#!/bin/bash

################################################################################
# GitHub Labels Creation Script
# 
# Purpose: Create standardized labels for GitHub Issues migration
# Version: 1.0
# Created: 2026-01-13
# 
# Usage:
#   ./create-github-labels.sh OWNER REPO [GITHUB_TOKEN]
#
# Arguments:
#   OWNER        - GitHub repository owner (e.g., xXKillerNoobYT)
#   REPO         - GitHub repository name (e.g., Copilot-Orchestration-Extension-COE-)
#   GITHUB_TOKEN - GitHub personal access token (optional, uses $GITHUB_TOKEN env var if not provided)
#
# Example:
#   export GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
#   ./create-github-labels.sh xXKillerNoobYT Copilot-Orchestration-Extension-COE-
#
# Requirements:
#   - curl
#   - jq (for JSON parsing, optional)
#   - GitHub token with 'repo' scope
#
################################################################################

set -e  # Exit on error

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
OWNER="${1}"
REPO="${2}"
TOKEN="${3:-${GITHUB_TOKEN}}"

# Validate arguments
if [ -z "$OWNER" ] || [ -z "$REPO" ]; then
    echo -e "${RED}Error: Missing required arguments${NC}"
    echo "Usage: $0 OWNER REPO [GITHUB_TOKEN]"
    echo ""
    echo "Example:"
    echo "  export GITHUB_TOKEN=\"ghp_xxxxxxxxxxxx\""
    echo "  $0 xXKillerNoobYT Copilot-Orchestration-Extension-COE-"
    exit 1
fi

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Error: GITHUB_TOKEN not set${NC}"
    echo "Please set GITHUB_TOKEN environment variable or pass as third argument"
    exit 1
fi

# GitHub API base URL
API_URL="https://api.github.com/repos/${OWNER}/${REPO}/labels"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}GitHub Labels Creation Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Repository: ${OWNER}/${REPO}"
echo "API URL: ${API_URL}"
echo ""

# Function to create a label
create_label() {
    local name="$1"
    local color="$2"
    local description="$3"
    
    # Remove # from color if present
    color="${color#\#}"
    
    echo -e "${YELLOW}Creating label:${NC} ${name}"
    
    response=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}" \
        -H "Authorization: token ${TOKEN}" \
        -H "Accept: application/vnd.github.v3+json" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"${name}\",
            \"color\": \"${color}\",
            \"description\": \"${description}\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 201 ]; then
        echo -e "${GREEN}✓ Created successfully${NC}"
        return 0
    elif [ "$http_code" -eq 422 ]; then
        # Label already exists, try to update it
        echo -e "${YELLOW}  Label already exists, updating...${NC}"
        
        update_response=$(curl -s -w "\n%{http_code}" -X PATCH "${API_URL}/${name}" \
            -H "Authorization: token ${TOKEN}" \
            -H "Accept: application/vnd.github.v3+json" \
            -H "Content-Type: application/json" \
            -d "{
                \"color\": \"${color}\",
                \"description\": \"${description}\"
            }")
        
        update_http_code=$(echo "$update_response" | tail -n1)
        
        if [ "$update_http_code" -eq 200 ]; then
            echo -e "${GREEN}✓ Updated successfully${NC}"
            return 0
        else
            echo -e "${RED}✗ Failed to update (HTTP ${update_http_code})${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗ Failed to create (HTTP ${http_code})${NC}"
        echo "$body"
        return 1
    fi
}

################################################################################
# TYPE LABELS
################################################################################

echo -e "\n${BLUE}Creating TYPE labels...${NC}\n"

create_label "type: feature" "0E8A16" "Feature implementation - new functionality and enhancements"
create_label "type: bug" "D73A4A" "Bug fix - defect fixes and error corrections"
create_label "type: refactor" "FBCA04" "Code refactoring - improvements without changing behavior"
create_label "type: maintenance" "7057FF" "Maintenance tasks - dependency updates, cleanup, housekeeping"
create_label "type: architecture" "0052CC" "Architecture decisions - design decisions and system architecture"
create_label "type: testing" "1D76DB" "Test creation/improvement - test suite additions and coverage improvements"
create_label "type: documentation" "006B75" "Documentation updates - docs, guides, README updates"

################################################################################
# PRIORITY LABELS
################################################################################

echo -e "\n${BLUE}Creating PRIORITY labels...${NC}\n"

create_label "priority: critical" "B60205" "Blocking all work - production down, security vulnerability"
create_label "priority: high" "D93F0B" "Critical path - time-sensitive, unblocks multiple tasks"
create_label "priority: medium" "FBCA04" "Standard work - normal feature work and improvements"
create_label "priority: low" "0E8A16" "Nice-to-have - tech debt, future enhancements"

################################################################################
# STATUS LABELS
################################################################################

echo -e "\n${BLUE}Creating STATUS labels...${NC}\n"

create_label "status: pending" "EDEDED" "Not started - needs triage and planning"
create_label "status: approved" "BFD4F2" "Ready for work - triaged and approved for implementation"
create_label "status: in-progress" "FEF2C0" "Active work - currently being worked on"
create_label "status: blocked" "E99695" "Blocked - waiting on dependency or external factor"
create_label "status: review" "C5DEF5" "In review - awaiting code review"
create_label "status: testing" "D4C5F9" "In testing - being tested for quality assurance"
create_label "status: failed" "D73A4A" "Failed - work attempted but did not succeed"
create_label "status: cancelled" "6A737D" "Cancelled - work intentionally stopped or no longer needed"

################################################################################
# AGENT LABELS
################################################################################

echo -e "\n${BLUE}Creating AGENT labels...${NC}\n"

create_label "agent: auto-zen" "C2E0C6" "Auto Zen - autonomous code executor"
create_label "agent: zen-planner" "BFD4F2" "Zen Planner - strategic task architect"
create_label "agent: testing-agent" "D4C5F9" "Testing Agent - quality assurance specialist"
create_label "agent: plan-agent" "FFD1DC" "Plan Agent - system architecture and constraints"
create_label "agent: dependency-agent" "FFE4B5" "Dependency Agent - relationship and workflow manager"
create_label "agent: issue-handler" "E1D5E7" "Issue Handler - bug triage and resolution"

################################################################################
# SUMMARY
################################################################################

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}Label creation complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Summary:"
echo "  - Type labels: 7"
echo "  - Priority labels: 4"
echo "  - Status labels: 8"
echo "  - Agent labels: 6"
echo "  - Total: 25 labels"
echo ""
echo "Next steps:"
echo "  1. Verify labels at: https://github.com/${OWNER}/${REPO}/labels"
echo "  2. Create issue templates in .github/ISSUE_TEMPLATE/"
echo "  3. Begin migration from _ZENTASKS to GitHub Issues"
echo ""
echo -e "${GREEN}Done!${NC}"
