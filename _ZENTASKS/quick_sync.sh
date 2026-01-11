#!/bin/bash
# Quick sync script - automatically syncs Zen tasks with GitHub issues
# Usage: ./quick_sync.sh

# Load environment variables from .env if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if GitHub token is set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "ERROR: GITHUB_TOKEN not set. Please set it in .env or export it."
    exit 1
fi

echo "Starting two-way sync..."
python3 sync_github.py --sync-both

if [ $? -eq 0 ]; then
    echo "✓ Sync completed successfully!"
else
    echo "✗ Sync failed. Check error messages above."
    exit 1
fi
