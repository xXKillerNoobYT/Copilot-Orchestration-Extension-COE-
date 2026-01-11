#!/usr/bin/env python3
"""
Zen Tasks ↔ GitHub Issues Sync Trigger
========================================

Simple trigger script that runs the Laravel Artisan command for syncing.
All sync logic is in the Laravel application (app/Services/).

Usage:
    python sync_trigger.py              # Two-way sync (default)
    python sync_trigger.py --to-github  # Sync tasks TO GitHub only
    python sync_trigger.py --from-github # Sync issues FROM GitHub only
"""

import sys
import subprocess
import argparse
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description='Trigger Zen tasks and GitHub issues sync',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument('--to-github', action='store_true',
                       help='Sync tasks TO GitHub issues only')
    parser.add_argument('--from-github', action='store_true',
                       help='Sync issues FROM GitHub to tasks only')
    parser.add_argument('--owner', help='GitHub repository owner')
    parser.add_argument('--repo', help='GitHub repository name')
    
    args = parser.parse_args()
    
    # Determine sync direction
    if args.to_github:
        direction = 'to-github'
    elif args.from_github:
        direction = 'from-github'
    else:
        direction = 'both'
    
    # Find the Laravel root directory
    script_dir = Path(__file__).parent
    laravel_root = script_dir.parent
    
    # Build artisan command
    cmd = ['php', str(laravel_root / 'artisan'), 'zentasks:sync-github']
    cmd.extend(['--direction', direction])
    
    if args.owner:
        cmd.extend(['--owner', args.owner])
    if args.repo:
        cmd.extend(['--repo', args.repo])
    
    # Run the command
    print(f"Running: {' '.join(cmd)}\n")
    
    try:
        result = subprocess.run(cmd, cwd=str(laravel_root), check=True)
        sys.exit(result.returncode)
    except subprocess.CalledProcessError as e:
        print(f"\nError: Command failed with exit code {e.returncode}", file=sys.stderr)
        sys.exit(e.returncode)
    except FileNotFoundError:
        print("\nError: PHP not found. Make sure PHP is installed and in your PATH.", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\nUnexpected error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
