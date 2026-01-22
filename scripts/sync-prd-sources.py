#!/usr/bin/env python3
"""
PRD Sync Automation Script
Validates and updates PRD source files before generation

Usage:
    python scripts/sync-prd-sources.py           # Validate only
    python scripts/sync-prd-sources.py --update  # Update files
"""

import sys
from pathlib import Path
from datetime import datetime
import re
import argparse

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent
AUDIT_FILE = PROJECT_ROOT / "COMPREHENSIVE-AUDIT-UNDONE-TASKS.md"
INCOMPLETE_WORK_FILE = PROJECT_ROOT / "Docs" / "Current-Status" / "INCOMPLETE-WORK.md"
PRD_MD = PROJECT_ROOT / "PRD.md"
PRD_JSON = PROJECT_ROOT / "PRD.json"

def check_file_age(filepath: Path, max_days: int = 7) -> tuple[bool, str]:
    """Check if file has been updated within max_days"""
    if not filepath.exists():
        return False, f"❌ {filepath.name} not found"
    
    modified_time = datetime.fromtimestamp(filepath.stat().st_mtime)
    age_days = (datetime.now() - modified_time).days
    
    if age_days > max_days:
        return False, f"⚠️  {filepath.name} is {age_days} days old (last updated: {modified_time.strftime('%Y-%m-%d')})"
    
    return True, f"✅ {filepath.name} is up to date ({age_days} days old)"

def extract_audit_counts(content: str) -> dict:
    """Extract completion counts from audit file"""
    completed_count = content.count('✅ Done') + content.count('✅ COMPLETE')
    remaining_todos = content.count('TODO') + content.count('FIXME')
    remaining_mocks = content.count('❌ Mock')
    
    # Extract date
    date_match = re.search(r'\*\*Date\*\*:\s*(.+?)(?:\s*\(Updated\))?\s*$', content, re.MULTILINE)
    audit_date = date_match.group(1).strip() if date_match else "Unknown"
    
    return {
        'completed': completed_count,
        'remaining_todos': remaining_todos,
        'remaining_mocks': remaining_mocks,
        'last_updated': audit_date
    }

def sync_incomplete_work_from_audit(audit_content: str, update: bool = False) -> bool:
    """Sync INCOMPLETE-WORK.md from audit file"""
    if not INCOMPLETE_WORK_FILE.exists():
        print(f"❌ {INCOMPLETE_WORK_FILE} not found")
        return False
    
    incomplete_content = INCOMPLETE_WORK_FILE.read_text(encoding='utf-8')
    audit_counts = extract_audit_counts(audit_content)
    incomplete_counts = extract_audit_counts(incomplete_content)
    
    # Check if counts match
    if audit_counts['completed'] != incomplete_counts['completed']:
        print(f"⚠️  INCOMPLETE-WORK.md out of sync:")
        print(f"   - Audit shows {audit_counts['completed']} completed")
        print(f"   - INCOMPLETE-WORK shows {incomplete_counts['completed']} completed")
        
        if update:
            print("   → Would update INCOMPLETE-WORK.md (manual edit required)")
            print(f"   → See COMPREHENSIVE-AUDIT-UNDONE-TASKS.md Section 11 for update procedure")
        return False
    
    return True

def validate_prd_alignment(prd_content: str, audit_content: str) -> bool:
    """Validate PRD plan_alignment_audit matches current audit state"""
    if 'plan_alignment_audit' not in prd_content:
        print("⚠️  PRD.md missing plan_alignment_audit section")
        print("   → Re-run PRD.ipynb to regenerate")
        return False
    
    audit_counts = extract_audit_counts(audit_content)
    
    # Check if PRD mentions completed items
    completed_in_prd = prd_content.count('✅') if '## Plan Alignment Audit' in prd_content else 0
    
    if audit_counts['completed'] > 0 and completed_in_prd == 0:
        print("⚠️  PRD plan_alignment_audit may be out of date")
        print(f"   - Audit shows {audit_counts['completed']} completed items")
        print("   → Re-run PRD.ipynb to regenerate PRD.md and PRD.json")
        return False
    
    return True

def main():
    parser = argparse.ArgumentParser(description='Validate PRD source files')
    parser.add_argument('--update', action='store_true', help='Update files (not just validate)')
    args = parser.parse_args()
    
    print("🔍 PRD Source File Validation\n")
    
    all_valid = True
    
    # Check audit file age
    valid, msg = check_file_age(AUDIT_FILE, max_days=7)
    print(msg)
    if not valid:
        print("   → Update COMPREHENSIVE-AUDIT-UNDONE-TASKS.md (see Section 11)")
        all_valid = False
    
    # Check INCOMPLETE-WORK file age
    valid, msg = check_file_age(INCOMPLETE_WORK_FILE, max_days=3)
    print(msg)
    if not valid:
        all_valid = False
    
    # Load audit content
    if AUDIT_FILE.exists():
        audit_content = AUDIT_FILE.read_text(encoding='utf-8')
        audit_counts = extract_audit_counts(audit_content)
        
        print(f"\n📊 Audit Statistics:")
        print(f"   - Completed items: {audit_counts['completed']}")
        print(f"   - Remaining TODOs: {audit_counts['remaining_todos']}")
        print(f"   - Remaining mocks: {audit_counts['remaining_mocks']}")
        print(f"   - Last updated: {audit_counts['last_updated']}")
        
        # Check sync between audit and INCOMPLETE-WORK
        if not sync_incomplete_work_from_audit(audit_content, args.update):
            all_valid = False
        
        # Validate PRD alignment
        if PRD_MD.exists():
            prd_content = PRD_MD.read_text(encoding='utf-8')
            if not validate_prd_alignment(prd_content, audit_content):
                all_valid = False
        else:
            print(f"⚠️  PRD.md not found - run PRD.ipynb to generate")
            all_valid = False
    else:
        print(f"❌ {AUDIT_FILE} not found")
        all_valid = False
    
    print("\n" + "="*60)
    if all_valid:
        print("✅ All PRD source files are in sync and up to date!")
        print("\n💡 Safe to run PRD.ipynb to generate PRD.md and PRD.json")
        return 0
    else:
        print("❌ PRD source files need updates before generating PRD")
        print("\n📋 Update procedure:")
        print("   1. Update COMPREHENSIVE-AUDIT-UNDONE-TASKS.md (Section 11)")
        print("   2. Verify Docs/Current-Status/INCOMPLETE-WORK.md is in sync")
        print("   3. Run PRD.ipynb to regenerate PRD.md and PRD.json")
        print("   4. Commit all changes")
        return 1

if __name__ == "__main__":
    sys.exit(main())
