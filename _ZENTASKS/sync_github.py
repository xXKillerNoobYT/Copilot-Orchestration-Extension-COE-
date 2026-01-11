#!/usr/bin/env python3
"""
Zen Tasks <-> GitHub Issues Two-Way Sync
==========================================

This script synchronizes tasks from _ZENTASKS/tasks.json with GitHub issues
and vice versa. It creates/updates issues from tasks and creates/updates
tasks from issues, maintaining bidirectional consistency.

Usage:
    python sync_github.py --sync-to-github    # Sync tasks TO GitHub
    python sync_github.py --sync-from-github  # Sync issues FROM GitHub
    python sync_github.py --sync-both         # Two-way sync (default)

Configuration:
    Set environment variables:
    - GITHUB_TOKEN: Your GitHub personal access token
    - GITHUB_OWNER: Repository owner (default: xXKillerNoobYT)
    - GITHUB_REPO: Repository name (default: Copilot-Orchestration-Extension-COE-)
"""

import os
import json
import sys
import argparse
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: requests library not found. Install with: pip install requests")
    sys.exit(1)


class GitHubSyncError(Exception):
    """Custom exception for GitHub sync errors"""
    pass


class ZenTasksGitHubSync:
    """Handles bidirectional sync between Zen tasks and GitHub issues"""
    
    # Status mapping: Zen Task -> GitHub Issue State
    STATUS_TO_GITHUB = {
        'pending': 'open',
        'approved': 'open',
        'in-progress': 'open',
        'in_progress': 'open',
        'testing': 'open',
        'review': 'open',
        'completed': 'closed',
        'done': 'closed',
        'failed': 'open',
        'blocked': 'open',
        'cancelled': 'closed',
    }
    
    # Status mapping: GitHub Issue State -> Zen Task Status
    GITHUB_TO_STATUS = {
        'open': 'pending',
        'closed': 'completed',
    }
    
    # Task type to GitHub label mapping
    TYPE_TO_LABEL = {
        'feature': 'enhancement',
        'bug': 'bug',
        'refactor': 'refactor',
        'maintenance': 'maintenance',
        'architecture': 'architecture',
        'testing': 'testing',
        'documentation': 'documentation',
    }
    
    def __init__(self, token: str, owner: str, repo: str, tasks_file: str):
        """
        Initialize the sync manager
        
        Args:
            token: GitHub personal access token
            owner: Repository owner
            repo: Repository name
            tasks_file: Path to tasks.json file
        """
        self.token = token
        self.owner = owner
        self.repo = repo
        self.tasks_file = Path(tasks_file)
        self.api_base = "https://api.github.com"
        self.headers = {
            'Authorization': f'token {token}',
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        }
        
        # Track sync metadata
        self.sync_metadata_file = self.tasks_file.parent / 'sync_metadata.json'
        self.sync_metadata = self._load_sync_metadata()
    
    def _load_sync_metadata(self) -> Dict:
        """Load sync metadata from file"""
        if self.sync_metadata_file.exists():
            try:
                with open(self.sync_metadata_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Warning: Could not load sync metadata: {e}")
        return {'task_to_issue': {}, 'issue_to_task': {}}
    
    def _save_sync_metadata(self):
        """Save sync metadata to file"""
        try:
            with open(self.sync_metadata_file, 'w') as f:
                json.dump(self.sync_metadata, f, indent=2)
        except Exception as e:
            print(f"Warning: Could not save sync metadata: {e}")
    
    def _load_tasks(self) -> Dict:
        """Load tasks from tasks.json"""
        if not self.tasks_file.exists():
            raise GitHubSyncError(f"Tasks file not found: {self.tasks_file}")
        
        with open(self.tasks_file, 'r') as f:
            return json.load(f)
    
    def _save_tasks(self, data: Dict):
        """Save tasks to tasks.json"""
        with open(self.tasks_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def _api_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Any:
        """Make an API request to GitHub"""
        url = f"{self.api_base}{endpoint}"
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=self.headers, params=data)
            elif method == 'POST':
                response = requests.post(url, headers=self.headers, json=data)
            elif method == 'PATCH':
                response = requests.patch(url, headers=self.headers, json=data)
            else:
                raise GitHubSyncError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json() if response.text else {}
        
        except requests.exceptions.HTTPError as e:
            error_msg = f"GitHub API error: {e}"
            if hasattr(e.response, 'text'):
                error_msg += f"\nResponse: {e.response.text}"
            raise GitHubSyncError(error_msg)
        except requests.exceptions.RequestException as e:
            raise GitHubSyncError(f"Request error: {e}")
    
    def _get_issue(self, issue_number: int) -> Dict:
        """Get a GitHub issue by number"""
        return self._api_request('GET', f"/repos/{self.owner}/{self.repo}/issues/{issue_number}")
    
    def _list_issues(self, state: str = 'all') -> List[Dict]:
        """List all GitHub issues"""
        issues = []
        page = 1
        per_page = 100
        
        while True:
            params = {'state': state, 'per_page': per_page, 'page': page}
            page_issues = self._api_request('GET', f"/repos/{self.owner}/{self.repo}/issues", params)
            
            if not page_issues:
                break
            
            # Filter out pull requests
            page_issues = [issue for issue in page_issues if 'pull_request' not in issue]
            issues.extend(page_issues)
            
            if len(page_issues) < per_page:
                break
            
            page += 1
        
        return issues
    
    def _create_issue(self, title: str, body: str, labels: List[str]) -> Dict:
        """Create a new GitHub issue"""
        data = {
            'title': title,
            'body': body,
            'labels': labels,
        }
        return self._api_request('POST', f"/repos/{self.owner}/{self.repo}/issues", data)
    
    def _update_issue(self, issue_number: int, title: Optional[str] = None, 
                     body: Optional[str] = None, state: Optional[str] = None,
                     labels: Optional[List[str]] = None) -> Dict:
        """Update an existing GitHub issue"""
        data = {}
        if title is not None:
            data['title'] = title
        if body is not None:
            data['body'] = body
        if state is not None:
            data['state'] = state
        if labels is not None:
            data['labels'] = labels
        
        return self._api_request('PATCH', f"/repos/{self.owner}/{self.repo}/issues/{issue_number}", data)
    
    def _load_task_markdown(self, task_id: str) -> Optional[str]:
        """Load the detailed task markdown file if it exists"""
        md_file = self.tasks_file.parent / f"{task_id}.md"
        if md_file.exists():
            try:
                with open(md_file, 'r') as f:
                    return f.read()
            except Exception as e:
                print(f"  Warning: Could not read {md_file}: {e}")
        return None
    
    def _save_task_markdown(self, task_id: str, content: str):
        """Save task markdown file"""
        md_file = self.tasks_file.parent / f"{task_id}.md"
        try:
            with open(md_file, 'w') as f:
                f.write(content)
        except Exception as e:
            print(f"  Warning: Could not write {md_file}: {e}")
    
    def _parse_task_markdown(self, content: str) -> Dict[str, Any]:
        """Parse YAML frontmatter from task markdown"""
        import re
        
        # Extract YAML frontmatter
        match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)$', content, re.DOTALL)
        if not match:
            return {'body': content}
        
        yaml_content = match.group(1)
        body_content = match.group(2)
        
        # Parse YAML manually (simple parsing)
        parsed = {'body': body_content}
        for line in yaml_content.split('\n'):
            if ':' in line and not line.strip().startswith('-'):
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if value:
                    parsed[key] = value
        
        return parsed
    
    def _format_task_as_issue_body(self, task: Dict) -> str:
        """Format a task as GitHub issue body"""
        task_id = task['id']
        
        # Try to load detailed markdown file
        md_content = self._load_task_markdown(task_id)
        
        if md_content:
            # Parse markdown to extract body (without frontmatter)
            parsed = self._parse_task_markdown(md_content)
            body = parsed.get('body', '').strip()
            
            # Add metadata footer
            lines = [body, '', '---', '### Task Metadata']
            lines.append(f"- **Task ID**: `{task_id}`")
            lines.append(f"- **Priority**: {task.get('priority', 'medium')}")
            lines.append(f"- **Status**: {task.get('status', 'pending')}")
            
            if task.get('dependencies'):
                lines.append(f"- **Dependencies**: {', '.join([f'`{d}`' for d in task['dependencies']])}")
            
            lines.append('')
            lines.append('*Synced from Zen Tasks - See task file for full details*')
            
            return '\n'.join(lines)
        else:
            # Fallback to basic formatting from tasks.json
            lines = []
            
            # Description
            if task.get('description'):
                lines.append(task['description'])
                lines.append('')
            
            # Details
            if task.get('details'):
                lines.append('## Details')
                lines.append(task['details'])
                lines.append('')
            
            # Metadata
            lines.append('---')
            lines.append('### Task Metadata')
            lines.append(f"- **Task ID**: `{task['id']}`")
            lines.append(f"- **Priority**: {task.get('priority', 'medium')}")
            lines.append(f"- **Status**: {task.get('status', 'pending')}")
            
            if task.get('dependencies'):
                lines.append(f"- **Dependencies**: {', '.join([f'`{d}`' for d in task['dependencies']])}")
            
            if task.get('testStrategy'):
                lines.append('')
                lines.append('### Test Strategy')
                lines.append(task['testStrategy'])
            
            lines.append('')
            lines.append('*Synced from Zen Tasks*')
            
            return '\n'.join(lines)
    
    def _parse_task_id_from_issue(self, issue: Dict) -> Optional[str]:
        """Extract task ID from issue body if present"""
        body = issue.get('body', '')
        if not body:
            return None
        
        # Look for task ID in metadata section
        for line in body.split('\n'):
            if 'Task ID' in line and '`TASK-' in line:
                # Extract TASK-xxx from the line
                import re
                match = re.search(r'`(TASK-[^`]+)`', line)
                if match:
                    return match.group(1)
        
        return None
    
    def _get_task_labels(self, task: Dict) -> List[str]:
        """Generate GitHub labels for a task"""
        labels = []
        
        # Add type label
        task_type = task.get('type', 'feature')
        if task_type in self.TYPE_TO_LABEL:
            labels.append(self.TYPE_TO_LABEL[task_type])
        
        # Add priority label
        priority = task.get('priority', 'medium')
        labels.append(f'priority:{priority}')
        
        # Add status label if blocked
        if task.get('status') == 'blocked':
            labels.append('blocked')
        
        return labels
    
    def sync_task_to_github(self, task: Dict) -> Dict:
        """
        Sync a single task to GitHub
        
        Returns the created/updated issue data
        """
        task_id = task['id']
        title = task['title']
        body = self._format_task_as_issue_body(task)
        labels = self._get_task_labels(task)
        state = self.STATUS_TO_GITHUB.get(task.get('status', 'pending'), 'open')
        
        # Check if we already have an issue for this task
        issue_number = self.sync_metadata['task_to_issue'].get(task_id)
        
        if issue_number:
            # Update existing issue
            print(f"  Updating issue #{issue_number} for task {task_id}")
            issue = self._update_issue(issue_number, title=title, body=body, 
                                      state=state, labels=labels)
        else:
            # Create new issue
            print(f"  Creating new issue for task {task_id}")
            issue = self._create_issue(title, body, labels)
            issue_number = issue['number']
            
            # Store mapping
            self.sync_metadata['task_to_issue'][task_id] = issue_number
            self.sync_metadata['issue_to_task'][str(issue_number)] = task_id
        
        return issue
    
    def _create_task_markdown_from_issue(self, task_id: str, issue: Dict, task_data: Dict):
        """Create a task markdown file from a GitHub issue"""
        task_type = task_data.get('type', 'feature')
        priority = task_data.get('priority', 'medium')
        status = task_data.get('status', 'pending')
        
        # Extract labels
        labels = [label.get('name', label) if isinstance(label, dict) else label 
                 for label in issue.get('labels', [])]
        labels = [l for l in labels if not l.startswith('priority:')]
        
        # Build frontmatter
        frontmatter = f"""---
id: {task_id}
title: {issue['title']}
type: {task_type}
priority: {priority}
status: {status}
dependencies: []
assignees: []
labels: [{', '.join(labels)}]
estimate: ""
due: ""
format_version: "1.0"
github_issue: {issue['number']}
github_url: {issue['html_url']}
---

"""
        
        # Parse issue body to extract sections
        body = issue.get('body', '')
        
        # Check if this is a task that was previously synced (has metadata)
        if '### Task Metadata' in body:
            # Extract the body before metadata
            body_parts = body.split('---')
            if len(body_parts) > 1:
                body = body_parts[0].strip()
        
        # Build markdown content
        content = frontmatter
        
        # Add goal section
        content += "## Goal\n\n"
        # Use first paragraph as goal if available
        paragraphs = body.split('\n\n')
        if paragraphs:
            content += paragraphs[0] + "\n\n"
        
        # Add full description
        if len(paragraphs) > 1:
            content += "## Description\n\n"
            content += '\n\n'.join(paragraphs[1:]) + "\n\n"
        elif body:
            content += "## Description\n\n"
            content += body + "\n\n"
        
        # Add acceptance criteria section
        content += "## Acceptance Criteria\n\n"
        content += "- [ ] Synced from GitHub issue - update as needed\n\n"
        
        # Add technical approach section
        content += "## Technical Approach\n\n"
        content += "[To be defined based on implementation approach]\n\n"
        
        # Add dependencies section
        content += "## Dependencies & Risks\n\n"
        content += f"- Synced from GitHub issue #{issue['number']}\n"
        if issue.get('milestone'):
            content += f"- Milestone: {issue['milestone']['title']}\n"
        content += "\n"
        
        # Add AI prompt section
        content += "## AI Prompt (for agents)\n\n"
        content += f"- **Goal:** {issue['title']}\n"
        content += f"- **Context:** Synced from GitHub issue #{issue['number']}\n"
        content += "- **Acceptance Criteria:**\n"
        content += "  - Review and implement based on issue description\n"
        content += "- **Expected Outputs:** Code changes, tests, documentation\n"
        content += "- **Constraints/Guardrails:** Follow project coding standards\n"
        
        self._save_task_markdown(task_id, content)
    
    def sync_issue_to_task(self, issue: Dict) -> Optional[Dict]:
        """
        Sync a single GitHub issue to a task
        
        Returns the created/updated task data
        """
        issue_number = issue['number']
        
        # Check if this issue already has a corresponding task
        task_id = self._parse_task_id_from_issue(issue)
        
        if not task_id:
            # Check metadata mapping
            task_id = self.sync_metadata['issue_to_task'].get(str(issue_number))
        
        # Load current tasks
        tasks_data = self._load_tasks()
        tasks = tasks_data.get('tasks', [])
        
        # Find existing task or create new one
        existing_task = None
        if task_id:
            for task in tasks:
                if task['id'] == task_id:
                    existing_task = task
                    break
        
        # Prepare task data from issue
        task_data = {
            'title': issue['title'],
            'description': issue['body'] or '',
            'status': self._map_github_state_to_status(issue['state'], issue),
            'priority': self._extract_priority_from_labels(issue.get('labels', [])),
            'type': self._extract_type_from_labels(issue.get('labels', [])),
        }
        
        if existing_task:
            # Update existing task
            print(f"  Updating task {task_id} from issue #{issue_number}")
            existing_task.update(task_data)
            existing_task['updatedAt'] = datetime.utcnow().isoformat() + 'Z'
            
            # Update markdown file if it exists
            md_file = self.tasks_file.parent / f"{task_id}.md"
            if md_file.exists():
                # TODO: Smart merge of markdown content
                # For now, we preserve existing markdown and just update tasks.json
                pass
        else:
            # Create new task
            print(f"  Creating new task from issue #{issue_number}")
            task_id = self._generate_task_id()
            task_data['id'] = task_id
            task_data['createdAt'] = datetime.utcnow().isoformat() + 'Z'
            task_data['updatedAt'] = task_data['createdAt']
            task_data['dependencies'] = []
            tasks.append(task_data)
            
            # Store mapping
            self.sync_metadata['issue_to_task'][str(issue_number)] = task_id
            self.sync_metadata['task_to_issue'][task_id] = issue_number
            
            # Create markdown file for the new task
            self._create_task_markdown_from_issue(task_id, issue, task_data)
        
        # Save tasks
        tasks_data['tasks'] = tasks
        self._save_tasks(tasks_data)
        
        return task_data if not existing_task else existing_task
    
    def _map_github_state_to_status(self, state: str, issue: Dict) -> str:
        """Map GitHub issue state to task status"""
        if state == 'closed':
            return 'completed'
        
        # Check if assigned (indicates in progress)
        if issue.get('assignee') or issue.get('assignees'):
            return 'in_progress'
        
        return 'pending'
    
    def _extract_priority_from_labels(self, labels: List[Dict]) -> str:
        """Extract priority from GitHub labels"""
        for label in labels:
            name = label.get('name', '') if isinstance(label, dict) else label
            if name.startswith('priority:'):
                priority = name.split(':', 1)[1]
                if priority in ['critical', 'high', 'medium', 'low']:
                    return priority
        return 'medium'
    
    def _extract_type_from_labels(self, labels: List[Dict]) -> str:
        """Extract type from GitHub labels"""
        label_to_type = {v: k for k, v in self.TYPE_TO_LABEL.items()}
        
        for label in labels:
            name = label.get('name', '') if isinstance(label, dict) else label
            if name in label_to_type:
                return label_to_type[name]
        
        return 'feature'
    
    def _generate_task_id(self) -> str:
        """Generate a new task ID"""
        import random
        import string
        
        # Generate ID in format: TASK-xxxxxxxx-xxxxx
        part1 = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        part2 = ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
        
        return f"TASK-{part1}-{part2}"
    
    def sync_all_tasks_to_github(self):
        """Sync all tasks to GitHub issues"""
        print("\n=== Syncing Tasks to GitHub ===\n")
        
        tasks_data = self._load_tasks()
        tasks = tasks_data.get('tasks', [])
        
        synced_count = 0
        error_count = 0
        
        for task in tasks:
            try:
                self.sync_task_to_github(task)
                synced_count += 1
            except Exception as e:
                print(f"  ERROR syncing task {task['id']}: {e}")
                error_count += 1
        
        self._save_sync_metadata()
        
        print(f"\nSynced {synced_count} tasks to GitHub")
        if error_count > 0:
            print(f"Failed to sync {error_count} tasks")
    
    def sync_all_issues_to_tasks(self):
        """Sync all GitHub issues to tasks"""
        print("\n=== Syncing GitHub Issues to Tasks ===\n")
        
        issues = self._list_issues()
        
        synced_count = 0
        error_count = 0
        
        for issue in issues:
            try:
                self.sync_issue_to_task(issue)
                synced_count += 1
            except Exception as e:
                print(f"  ERROR syncing issue #{issue['number']}: {e}")
                error_count += 1
        
        self._save_sync_metadata()
        
        print(f"\nSynced {synced_count} issues to tasks")
        if error_count > 0:
            print(f"Failed to sync {error_count} issues")
    
    def sync_both_ways(self):
        """Perform bidirectional sync"""
        print("\n=== Two-Way Sync: Zen Tasks <-> GitHub Issues ===\n")
        
        # First sync issues to tasks (to get any new issues)
        self.sync_all_issues_to_tasks()
        
        # Then sync tasks to GitHub (to update with any task changes)
        self.sync_all_tasks_to_github()
        
        print("\n=== Sync Complete ===\n")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Sync Zen tasks with GitHub issues',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument('--sync-to-github', action='store_true',
                       help='Sync tasks TO GitHub issues only')
    parser.add_argument('--sync-from-github', action='store_true',
                       help='Sync issues FROM GitHub to tasks only')
    parser.add_argument('--sync-both', action='store_true',
                       help='Perform two-way sync (default)')
    
    parser.add_argument('--token', help='GitHub personal access token (or set GITHUB_TOKEN env var)')
    parser.add_argument('--owner', help='Repository owner (or set GITHUB_OWNER env var)')
    parser.add_argument('--repo', help='Repository name (or set GITHUB_REPO env var)')
    parser.add_argument('--tasks-file', help='Path to tasks.json file')
    
    args = parser.parse_args()
    
    # Get configuration
    token = args.token or os.getenv('GITHUB_TOKEN')
    owner = args.owner or os.getenv('GITHUB_OWNER', 'xXKillerNoobYT')
    repo = args.repo or os.getenv('GITHUB_REPO', 'Copilot-Orchestration-Extension-COE-')
    
    # Determine tasks file path
    if args.tasks_file:
        tasks_file = args.tasks_file
    else:
        # Default to _ZENTASKS/tasks.json relative to script location
        script_dir = Path(__file__).parent
        tasks_file = script_dir / 'tasks.json'
    
    # Validate configuration
    if not token:
        print("ERROR: GitHub token not provided. Set GITHUB_TOKEN environment variable or use --token")
        sys.exit(1)
    
    if not Path(tasks_file).exists():
        print(f"ERROR: Tasks file not found: {tasks_file}")
        sys.exit(1)
    
    # Create sync manager
    try:
        sync = ZenTasksGitHubSync(token, owner, repo, str(tasks_file))
        
        # Determine sync direction
        if args.sync_to_github:
            sync.sync_all_tasks_to_github()
        elif args.sync_from_github:
            sync.sync_all_issues_to_tasks()
        else:
            # Default: sync both ways
            sync.sync_both_ways()
        
        print("\nSync completed successfully!")
        
    except GitHubSyncError as e:
        print(f"\nERROR: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
