<?php

namespace App\Services;

use Illuminate\Support\Str;

class DocumentParserService
{
    /**
     * Parse a document file and extract content with metadata
     */
    public function parse(string $filePath): array
    {
        if (!file_exists($filePath)) {
            throw new \InvalidArgumentException("File not found: {$filePath}");
        }

        $extension = pathinfo($filePath, PATHINFO_EXTENSION);

        return match ($extension) {
            'md' => $this->parseMarkdown($filePath),
            'txt' => $this->parseText($filePath),
            'json' => $this->parseJson($filePath),
            'yml', 'yaml' => $this->parseYaml($filePath),
            default => $this->parseGeneric($filePath),
        };
    }

    /**
     * Parse markdown file
     */
    private function parseMarkdown(string $filePath): array
    {
        $content = file_get_contents($filePath);
        $lines = file($filePath);

        $metadata = [
            'type' => 'markdown',
            'headings' => $this->extractMarkdownHeadings($content),
            'code_blocks' => $this->extractCodeBlocks($content),
            'links' => $this->extractLinks($content),
            'has_frontmatter' => $this->hasFrontmatter($content),
        ];

        // Extract frontmatter if present
        if ($metadata['has_frontmatter']) {
            $frontmatter = $this->extractFrontmatter($content);
            $metadata['frontmatter'] = $frontmatter;
            $content = $this->removeFrontmatter($content);
        }

        return [
            'content' => $content,
            'metadata' => $metadata,
            'line_count' => count($lines),
            'size' => filesize($filePath),
        ];
    }

    /**
     * Parse plain text file
     */
    private function parseText(string $filePath): array
    {
        $content = file_get_contents($filePath);
        $lines = file($filePath);

        return [
            'content' => $content,
            'metadata' => [
                'type' => 'text',
                'word_count' => str_word_count($content),
                'char_count' => strlen($content),
            ],
            'line_count' => count($lines),
            'size' => filesize($filePath),
        ];
    }

    /**
     * Parse JSON file
     */
    private function parseJson(string $filePath): array
    {
        $content = file_get_contents($filePath);
        $data = json_decode($content, true);

        return [
            'content' => $content,
            'metadata' => [
                'type' => 'json',
                'valid_json' => json_last_error() === JSON_ERROR_NONE,
                'structure' => $data ? array_keys($data) : [],
            ],
            'line_count' => count(file($filePath)),
            'size' => filesize($filePath),
        ];
    }

    /**
     * Parse YAML file
     */
    private function parseYaml(string $filePath): array
    {
        $content = file_get_contents($filePath);

        return [
            'content' => $content,
            'metadata' => [
                'type' => 'yaml',
            ],
            'line_count' => count(file($filePath)),
            'size' => filesize($filePath),
        ];
    }

    /**
     * Parse generic file
     */
    private function parseGeneric(string $filePath): array
    {
        $content = file_get_contents($filePath);

        return [
            'content' => $content,
            'metadata' => [
                'type' => 'generic',
            ],
            'line_count' => count(file($filePath)),
            'size' => filesize($filePath),
        ];
    }

    /**
     * Extract markdown headings
     */
    private function extractMarkdownHeadings(string $content): array
    {
        $headings = [];
        preg_match_all('/^(#{1,6})\s+(.+)$/m', $content, $matches, PREG_SET_ORDER);

        foreach ($matches as $match) {
            $headings[] = [
                'level' => strlen($match[1]),
                'text' => trim($match[2]),
            ];
        }

        return $headings;
    }

    /**
     * Extract code blocks from markdown
     */
    private function extractCodeBlocks(string $content): array
    {
        $blocks = [];
        preg_match_all('/```(\w+)?\n(.*?)```/s', $content, $matches, PREG_SET_ORDER);

        foreach ($matches as $match) {
            $blocks[] = [
                'language' => $match[1] ?? 'unknown',
                'code' => trim($match[2]),
                'line_count' => substr_count($match[2], "\n") + 1,
            ];
        }

        return $blocks;
    }

    /**
     * Extract links from markdown
     */
    private function extractLinks(string $content): array
    {
        $links = [];
        
        // Extract markdown links [text](url)
        preg_match_all('/\[([^\]]+)\]\(([^)]+)\)/', $content, $matches, PREG_SET_ORDER);
        foreach ($matches as $match) {
            $links[] = [
                'text' => $match[1],
                'url' => $match[2],
                'type' => 'markdown',
            ];
        }

        // Extract plain URLs
        preg_match_all('/https?:\/\/[^\s\)]+/', $content, $urlMatches);
        foreach ($urlMatches[0] as $url) {
            $links[] = [
                'text' => $url,
                'url' => $url,
                'type' => 'plain',
            ];
        }

        return array_unique($links, SORT_REGULAR);
    }

    /**
     * Check if content has frontmatter
     */
    private function hasFrontmatter(string $content): bool
    {
        return Str::startsWith(trim($content), '---');
    }

    /**
     * Extract YAML frontmatter from markdown
     */
    private function extractFrontmatter(string $content): array
    {
        if (!$this->hasFrontmatter($content)) {
            return [];
        }

        preg_match('/^---\n(.*?)\n---/s', $content, $matches);
        
        if (empty($matches[1])) {
            return [];
        }

        $frontmatter = [];
        $lines = explode("\n", $matches[1]);

        foreach ($lines as $line) {
            if (str_contains($line, ':')) {
                [$key, $value] = explode(':', $line, 2);
                $frontmatter[trim($key)] = trim($value);
            }
        }

        return $frontmatter;
    }

    /**
     * Remove frontmatter from content
     */
    private function removeFrontmatter(string $content): string
    {
        return preg_replace('/^---\n.*?\n---\n/s', '', $content);
    }

    /**
     * Extract task information from markdown
     */
    public function extractTaskInfo(string $content): array
    {
        $info = [
            'title' => null,
            'description' => null,
            'type' => null,
            'priority' => null,
            'status' => null,
            'assignees' => [],
            'labels' => [],
            'dependencies' => [],
            'estimate' => null,
        ];

        // Extract title (first h1)
        if (preg_match('/^#\s+(.+)$/m', $content, $match)) {
            $info['title'] = trim($match[1]);
        }

        // Extract metadata fields
        $patterns = [
            'type' => '/\*\*Type:\*\*\s*(.+)/i',
            'priority' => '/\*\*Priority:\*\*\s*(.+)/i',
            'status' => '/\*\*Status:\*\*\s*(.+)/i',
            'estimate' => '/\*\*Estimate:\*\*\s*(.+)/i',
        ];

        foreach ($patterns as $key => $pattern) {
            if (preg_match($pattern, $content, $match)) {
                $info[$key] = trim($match[1]);
            }
        }

        // Extract assignees
        if (preg_match('/\*\*Assignee(?:s)?:\*\*\s*(.+)/i', $content, $match)) {
            $info['assignees'] = array_map('trim', explode(',', $match[1]));
        }

        // Extract labels
        if (preg_match('/\*\*Labels:\*\*\s*(.+)/i', $content, $match)) {
            $info['labels'] = array_map('trim', explode(',', $match[1]));
        }

        // Extract dependencies
        if (preg_match('/\*\*Dependencies:\*\*\s*(.+)/i', $content, $match)) {
            $info['dependencies'] = array_map('trim', explode(',', $match[1]));
        }

        // Extract description (content between title and first section)
        if (preg_match('/^#\s+.+?\n\n(.*?)(?=\n##|\z)/s', $content, $match)) {
            $info['description'] = trim($match[1]);
        }

        return $info;
    }

    /**
     * Parse task file (enhanced version)
     */
    public function parseTaskFile(string $filePath): array
    {
        $parsed = $this->parseMarkdown($filePath);
        $taskInfo = $this->extractTaskInfo($parsed['content']);

        return [
            ...$parsed,
            'task_info' => $taskInfo,
        ];
    }

    /**
     * Extract code references from content
     */
    public function extractCodeReferences(string $content): array
    {
        $references = [];

        // Extract inline code `code`
        preg_match_all('/`([^`]+)`/', $content, $inlineMatches);
        foreach ($inlineMatches[1] as $code) {
            $references[] = [
                'type' => 'inline',
                'code' => $code,
            ];
        }

        // Extract code blocks
        $codeBlocks = $this->extractCodeBlocks($content);
        foreach ($codeBlocks as $block) {
            $references[] = [
                'type' => 'block',
                'language' => $block['language'],
                'code' => $block['code'],
            ];
        }

        return $references;
    }

    /**
     * Extract sections from document
     */
    public function extractSections(string $content): array
    {
        $sections = [];
        $currentSection = null;
        $lines = explode("\n", $content);

        foreach ($lines as $line) {
            if (preg_match('/^(#{1,6})\s+(.+)$/', $line, $match)) {
                // Save previous section
                if ($currentSection) {
                    $sections[] = $currentSection;
                }

                // Start new section
                $currentSection = [
                    'level' => strlen($match[1]),
                    'title' => trim($match[2]),
                    'content' => '',
                ];
            } elseif ($currentSection) {
                $currentSection['content'] .= $line . "\n";
            }
        }

        // Save last section
        if ($currentSection) {
            $sections[] = $currentSection;
        }

        return $sections;
    }

    /**
     * Calculate reading time estimate
     */
    public function estimateReadingTime(string $content): int
    {
        $wordCount = str_word_count(strip_tags($content));
        $wordsPerMinute = 200;
        
        return (int) ceil($wordCount / $wordsPerMinute);
    }

    /**
     * Extract table of contents
     */
    public function extractTableOfContents(string $content): array
    {
        $headings = $this->extractMarkdownHeadings($content);
        $toc = [];

        foreach ($headings as $heading) {
            $toc[] = [
                'level' => $heading['level'],
                'text' => $heading['text'],
                'slug' => Str::slug($heading['text']),
            ];
        }

        return $toc;
    }
}
