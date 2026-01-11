<?php

namespace App\Services;

use App\Models\Task;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class ZenTasksFileService
{
    private string $tasksDir;
    private string $tasksFile;
    private string $syncMetadataFile;

    public function __construct()
    {
        $this->tasksDir = base_path('_ZENTASKS');
        $this->tasksFile = $this->tasksDir . '/tasks.json';
        $this->syncMetadataFile = $this->tasksDir . '/sync_metadata.json';
    }

    /**
     * Read all tasks from tasks.json
     */
    public function loadTasksFromFile(): array
    {
        if (!File::exists($this->tasksFile)) {
            return [];
        }

        $content = File::get($this->tasksFile);
        $data = json_decode($content, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException(
                'Failed to decode tasks.json: ' . json_last_error_msg()
            );
        }

        return $data['tasks'] ?? [];
    }

    /**
     * Save tasks to tasks.json
     */
    public function saveTasksToFile(array $tasks): void
    {
        $data = ['tasks' => $tasks];
        File::put($this->tasksFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    /**
     * Load task markdown file
     */
    public function loadTaskMarkdown(string $taskId): ?string
    {
        $mdFile = $this->tasksDir . "/{$taskId}.md";
        
        if (!File::exists($mdFile)) {
            return null;
        }

        return File::get($mdFile);
    }

    /**
     * Save task markdown file
     */
    public function saveTaskMarkdown(string $taskId, string $content): void
    {
        $mdFile = $this->tasksDir . "/{$taskId}.md";
        File::put($mdFile, $content);
    }

    /**
     * Parse YAML frontmatter from task markdown
     */
    public function parseTaskMarkdown(string $content): array
    {
        // Extract YAML frontmatter
        if (!preg_match('/^---\s*\n(.*?)\n---\s*\n(.*)$/s', $content, $matches)) {
            return ['body' => $content];
        }

        $yamlContent = $matches[1];
        $bodyContent = $matches[2];

        // Simple YAML parsing
        $parsed = ['body' => $bodyContent];
        foreach (explode("\n", $yamlContent) as $line) {
            if (strpos($line, ':') !== false && !str_starts_with(trim($line), '-')) {
                [$key, $value] = explode(':', $line, 2);
                $key = trim($key);
                $value = trim($value, " \t\n\r\0\x0B\"'");
                if ($value !== '') {
                    $parsed[$key] = $value;
                }
            }
        }

        return $parsed;
    }

    /**
     * Create task markdown from GitHub issue
     */
    public function createTaskMarkdownFromIssue(string $taskId, array $issueData, array $taskData): string
    {
        $taskType = $taskData['type'] ?? 'feature';
        $priority = $taskData['priority'] ?? 'medium';
        $status = $taskData['status'] ?? 'pending';
        
        // Extract labels
        $labels = array_map(
            fn($label) => is_array($label) ? ($label['name'] ?? '') : $label,
            $issueData['labels'] ?? []
        );
        $labels = array_filter($labels, fn($l) => !str_starts_with($l, 'priority:'));
        $labelsStr = implode(', ', $labels);

        // Escape YAML values to prevent injection
        $escapeYaml = function($value) {
            if (is_null($value)) {
                return '""';
            }
            $value = (string)$value;
            // If value contains special YAML characters, quote it
            if (preg_match('/[:\'"\\\\#\[\]{}&*!|>@`]/', $value) || 
                preg_match('/^\s|\s$/', $value) ||
                in_array(strtolower($value), ['true', 'false', 'null', 'yes', 'no', 'on', 'off'])) {
                // Escape double quotes and wrap in double quotes
                return '"' . str_replace(['"', '\\'], ['\"', '\\\\'], $value) . '"';
            }
            return $value;
        };

        // Build frontmatter with escaped values
        $frontmatter = <<<YAML
---
id: {$taskId}
title: {$escapeYaml($issueData['title'])}
type: {$taskType}
priority: {$priority}
status: {$status}
dependencies: []
assignees: []
labels: [{$labelsStr}]
estimate: ""
due: ""
format_version: "1.0"
github_issue: {$issueData['number']}
github_url: {$escapeYaml($issueData['html_url'])}
---

YAML;

        $body = $issueData['body'] ?? '';
        
        // Check if this was previously synced (has metadata)
        if (str_contains($body, '### Task Metadata')) {
            $bodyParts = explode('---', $body);
            if (count($bodyParts) > 1) {
                $body = trim($bodyParts[0]);
            }
        }

        // Build markdown content
        $content = $frontmatter;
        
        // Add goal section
        $content .= "## Goal\n\n";
        $paragraphs = array_filter(explode("\n\n", $body));
        if (!empty($paragraphs)) {
            $content .= $paragraphs[0] . "\n\n";
        }

        // Add full description
        if (count($paragraphs) > 1) {
            $content .= "## Description\n\n";
            $content .= implode("\n\n", array_slice($paragraphs, 1)) . "\n\n";
        } elseif ($body) {
            $content .= "## Description\n\n";
            $content .= $body . "\n\n";
        }

        // Add sections
        $content .= <<<SECTIONS
## Acceptance Criteria

- [ ] Synced from GitHub issue - update as needed

## Technical Approach

[To be defined based on implementation approach]

## Dependencies & Risks

- Synced from GitHub issue #{$issueData['number']}

## AI Prompt (for agents)

- **Goal:** {$issueData['title']}
- **Context:** Synced from GitHub issue #{$issueData['number']}
- **Acceptance Criteria:**
  - Review and implement based on issue description
- **Expected Outputs:** Code changes, tests, documentation
- **Constraints/Guardrails:** Follow project coding standards
SECTIONS;

        return $content;
    }

    /**
     * Format task as GitHub issue body
     */
    public function formatTaskAsIssueBody(array $task): string
    {
        $taskId = $task['id'];
        
        // Try to load detailed markdown file
        $mdContent = $this->loadTaskMarkdown($taskId);
        
        if ($mdContent) {
            // Parse markdown to extract body (without frontmatter)
            $parsed = $this->parseTaskMarkdown($mdContent);
            $body = trim($parsed['body'] ?? '');
            
            // Add metadata footer
            $lines = [$body, '', '---', '### Task Metadata'];
            $lines[] = "- **Task ID**: `{$taskId}`";
            $lines[] = "- **Priority**: " . ($task['priority'] ?? 'medium');
            $lines[] = "- **Status**: " . ($task['status'] ?? 'pending');
            
            if (!empty($task['dependencies'])) {
                $deps = array_map(fn($d) => "`{$d}`", $task['dependencies']);
                $lines[] = "- **Dependencies**: " . implode(', ', $deps);
            }
            
            $lines[] = '';
            $lines[] = '*Synced from Zen Tasks - See task file for full details*';
            
            return implode("\n", $lines);
        }

        // Fallback to basic formatting
        $lines = [];
        
        if (!empty($task['description'])) {
            $lines[] = $task['description'];
            $lines[] = '';
        }
        
        if (!empty($task['details'])) {
            $lines[] = '## Details';
            $lines[] = $task['details'];
            $lines[] = '';
        }
        
        $lines[] = '---';
        $lines[] = '### Task Metadata';
        $lines[] = "- **Task ID**: `{$taskId}`";
        $lines[] = "- **Priority**: " . ($task['priority'] ?? 'medium');
        $lines[] = "- **Status**: " . ($task['status'] ?? 'pending');
        
        if (!empty($task['dependencies'])) {
            $deps = array_map(fn($d) => "`{$d}`", $task['dependencies']);
            $lines[] = "- **Dependencies**: " . implode(', ', $deps);
        }
        
        if (!empty($task['testStrategy'])) {
            $lines[] = '';
            $lines[] = '### Test Strategy';
            $lines[] = $task['testStrategy'];
        }
        
        $lines[] = '';
        $lines[] = '*Synced from Zen Tasks*';
        
        return implode("\n", $lines);
    }

    /**
     * Load sync metadata
     */
    public function loadSyncMetadata(): array
    {
        if (!File::exists($this->syncMetadataFile)) {
            return [
                'task_to_issue' => [],
                'issue_to_task' => [],
            ];
        }

        $content = File::get($this->syncMetadataFile);
        return json_decode($content, true) ?? [
            'task_to_issue' => [],
            'issue_to_task' => [],
        ];
    }

    /**
     * Save sync metadata
     */
    public function saveSyncMetadata(array $metadata): void
    {
        File::put($this->syncMetadataFile, json_encode($metadata, JSON_PRETTY_PRINT));
    }

    /**
     * Generate a new task ID
     */
    public function generateTaskId(): string
    {
        // Generate ID in format: TASK-xxxxxxxx-xxxxx
        $part1 = Str::random(8);
        $part2 = Str::random(5);
        
        return "TASK-{$part1}-{$part2}";
    }
}
