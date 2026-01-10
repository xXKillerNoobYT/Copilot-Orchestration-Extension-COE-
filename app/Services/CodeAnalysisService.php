<?php

namespace App\Services;

class CodeAnalysisService
{
    /**
     * Analyze a code file and extract metadata
     */
    public function analyze(string $filePath): array
    {
        if (!file_exists($filePath)) {
            throw new \InvalidArgumentException("File not found: {$filePath}");
        }

        $extension = pathinfo($filePath, PATHINFO_EXTENSION);

        return match ($extension) {
            'php' => $this->analyzePhp($filePath),
            'ts' => $this->analyzeTypeScript($filePath),
            'js' => $this->analyzeJavaScript($filePath),
            'py' => $this->analyzePython($filePath),
            default => $this->analyzeGeneric($filePath),
        };
    }

    /**
     * Analyze PHP file
     */
    private function analyzePhp(string $filePath): array
    {
        $content = file_get_contents($filePath);
        $lines = file($filePath);

        return [
            'language' => 'php',
            'line_count' => count($lines),
            'size' => filesize($filePath),
            'namespace' => $this->extractPhpNamespace($content),
            'classes' => $this->extractPhpClasses($content),
            'functions' => $this->extractPhpFunctions($content),
            'interfaces' => $this->extractPhpInterfaces($content),
            'traits' => $this->extractPhpTraits($content),
            'use_statements' => $this->extractPhpUseStatements($content),
            'dependencies' => $this->extractPhpDependencies($content),
            'complexity' => $this->estimateComplexity($content),
        ];
    }

    /**
     * Analyze TypeScript file
     */
    private function analyzeTypeScript(string $filePath): array
    {
        $content = file_get_contents($filePath);
        $lines = file($filePath);

        return [
            'language' => 'typescript',
            'line_count' => count($lines),
            'size' => filesize($filePath),
            'imports' => $this->extractTypeScriptImports($content),
            'exports' => $this->extractTypeScriptExports($content),
            'classes' => $this->extractTypeScriptClasses($content),
            'interfaces' => $this->extractTypeScriptInterfaces($content),
            'functions' => $this->extractTypeScriptFunctions($content),
            'types' => $this->extractTypeScriptTypes($content),
            'complexity' => $this->estimateComplexity($content),
        ];
    }

    /**
     * Analyze JavaScript file
     */
    private function analyzeJavaScript(string $filePath): array
    {
        $content = file_get_contents($filePath);
        $lines = file($filePath);

        return [
            'language' => 'javascript',
            'line_count' => count($lines),
            'size' => filesize($filePath),
            'imports' => $this->extractJavaScriptImports($content),
            'exports' => $this->extractJavaScriptExports($content),
            'functions' => $this->extractJavaScriptFunctions($content),
            'classes' => $this->extractJavaScriptClasses($content),
            'complexity' => $this->estimateComplexity($content),
        ];
    }

    /**
     * Analyze Python file
     */
    private function analyzePython(string $filePath): array
    {
        $content = file_get_contents($filePath);
        $lines = file($filePath);

        return [
            'language' => 'python',
            'line_count' => count($lines),
            'size' => filesize($filePath),
            'imports' => $this->extractPythonImports($content),
            'classes' => $this->extractPythonClasses($content),
            'functions' => $this->extractPythonFunctions($content),
            'complexity' => $this->estimateComplexity($content),
        ];
    }

    /**
     * Analyze generic code file
     */
    private function analyzeGeneric(string $filePath): array
    {
        $content = file_get_contents($filePath);
        $lines = file($filePath);

        return [
            'language' => 'unknown',
            'line_count' => count($lines),
            'size' => filesize($filePath),
            'complexity' => $this->estimateComplexity($content),
        ];
    }

    /**
     * Extract PHP namespace
     */
    private function extractPhpNamespace(string $content): ?string
    {
        if (preg_match('/namespace\s+([^;]+);/', $content, $match)) {
            return trim($match[1]);
        }
        return null;
    }

    /**
     * Extract PHP classes
     */
    private function extractPhpClasses(string $content): array
    {
        $classes = [];
        preg_match_all('/class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/i', $content, $matches, PREG_SET_ORDER);

        foreach ($matches as $match) {
            $classes[] = [
                'name' => $match[1],
                'extends' => $match[2] ?? null,
                'implements' => isset($match[3]) ? array_map('trim', explode(',', $match[3])) : [],
            ];
        }

        return $classes;
    }

    /**
     * Extract PHP functions
     */
    private function extractPhpFunctions(string $content): array
    {
        $functions = [];
        preg_match_all('/(?:public|private|protected)?\s*function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\S+))?/i', $content, $matches, PREG_SET_ORDER);

        foreach ($matches as $match) {
            $functions[] = [
                'name' => $match[1],
                'parameters' => $this->parsePhpParameters($match[2] ?? ''),
                'return_type' => $match[3] ?? null,
            ];
        }

        return $functions;
    }

    /**
     * Extract PHP interfaces
     */
    private function extractPhpInterfaces(string $content): array
    {
        $interfaces = [];
        preg_match_all('/interface\s+(\w+)(?:\s+extends\s+([^{]+))?/i', $content, $matches, PREG_SET_ORDER);

        foreach ($matches as $match) {
            $interfaces[] = [
                'name' => $match[1],
                'extends' => isset($match[2]) ? array_map('trim', explode(',', $match[2])) : [],
            ];
        }

        return $interfaces;
    }

    /**
     * Extract PHP traits
     */
    private function extractPhpTraits(string $content): array
    {
        $traits = [];
        preg_match_all('/trait\s+(\w+)/i', $content, $matches);

        foreach ($matches[1] as $trait) {
            $traits[] = ['name' => $trait];
        }

        return $traits;
    }

    /**
     * Extract PHP use statements
     */
    private function extractPhpUseStatements(string $content): array
    {
        $uses = [];
        preg_match_all('/use\s+([^;]+);/', $content, $matches);

        foreach ($matches[1] as $use) {
            $uses[] = trim($use);
        }

        return $uses;
    }

    /**
     * Extract PHP dependencies (constructor injection)
     */
    private function extractPhpDependencies(string $content): array
    {
        $dependencies = [];
        
        // Extract constructor promoted properties (PHP 8+)
        if (preg_match('/__construct\s*\((.*?)\)/s', $content, $match)) {
            preg_match_all('/(?:public|private|protected)\s+(?:\w+\s+)?\$(\w+)/', $match[1], $propMatches);
            foreach ($propMatches[1] as $prop) {
                $dependencies[] = $prop;
            }
        }

        return $dependencies;
    }

    /**
     * Parse PHP function parameters
     */
    private function parsePhpParameters(string $params): array
    {
        if (empty(trim($params))) {
            return [];
        }

        $parameters = [];
        $parts = explode(',', $params);

        foreach ($parts as $part) {
            $part = trim($part);
            if (preg_match('/(?:(\S+)\s+)?\$(\w+)(?:\s*=\s*(.+))?/', $part, $match)) {
                $parameters[] = [
                    'name' => $match[2],
                    'type' => $match[1] ?? null,
                    'default' => $match[3] ?? null,
                ];
            }
        }

        return $parameters;
    }

    /**
     * Extract TypeScript imports
     */
    private function extractTypeScriptImports(string $content): array
    {
        $imports = [];
        preg_match_all('/import\s+(?:{([^}]+)}|(\w+))\s+from\s+[\'"]([^\'"]+)[\'"]/', $content, $matches, PREG_SET_ORDER);

        foreach ($matches as $match) {
            $imports[] = [
                'named' => isset($match[1]) ? array_map('trim', explode(',', $match[1])) : [],
                'default' => $match[2] ?? null,
                'from' => $match[3],
            ];
        }

        return $imports;
    }

    /**
     * Extract TypeScript exports
     */
    private function extractTypeScriptExports(string $content): array
    {
        $exports = [];
        preg_match_all('/export\s+(?:class|interface|function|const|type)\s+(\w+)/', $content, $matches);

        foreach ($matches[1] as $export) {
            $exports[] = $export;
        }

        return $exports;
    }

    /**
     * Extract TypeScript classes
     */
    private function extractTypeScriptClasses(string $content): array
    {
        $classes = [];
        preg_match_all('/class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/i', $content, $matches, PREG_SET_ORDER);

        foreach ($matches as $match) {
            $classes[] = [
                'name' => $match[1],
                'extends' => $match[2] ?? null,
                'implements' => isset($match[3]) ? array_map('trim', explode(',', $match[3])) : [],
            ];
        }

        return $classes;
    }

    /**
     * Extract TypeScript interfaces
     */
    private function extractTypeScriptInterfaces(string $content): array
    {
        $interfaces = [];
        preg_match_all('/interface\s+(\w+)(?:\s+extends\s+([^{]+))?/i', $content, $matches, PREG_SET_ORDER);

        foreach ($matches as $match) {
            $interfaces[] = [
                'name' => $match[1],
                'extends' => isset($match[2]) ? array_map('trim', explode(',', $match[2])) : [],
            ];
        }

        return $interfaces;
    }

    /**
     * Extract TypeScript functions
     */
    private function extractTypeScriptFunctions(string $content): array
    {
        $functions = [];
        preg_match_all('/(?:export\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\S+))?/i', $content, $matches, PREG_SET_ORDER);

        foreach ($matches as $match) {
            $functions[] = [
                'name' => $match[1],
                'parameters' => $match[2] ?? '',
                'return_type' => $match[3] ?? null,
            ];
        }

        return $functions;
    }

    /**
     * Extract TypeScript type definitions
     */
    private function extractTypeScriptTypes(string $content): array
    {
        $types = [];
        preg_match_all('/type\s+(\w+)\s*=/', $content, $matches);

        foreach ($matches[1] as $type) {
            $types[] = ['name' => $type];
        }

        return $types;
    }

    /**
     * Extract JavaScript imports (ES6)
     */
    private function extractJavaScriptImports(string $content): array
    {
        return $this->extractTypeScriptImports($content); // Same syntax
    }

    /**
     * Extract JavaScript exports
     */
    private function extractJavaScriptExports(string $content): array
    {
        return $this->extractTypeScriptExports($content); // Same syntax
    }

    /**
     * Extract JavaScript functions
     */
    private function extractJavaScriptFunctions(string $content): array
    {
        $functions = [];
        
        // Regular functions
        preg_match_all('/function\s+(\w+)\s*\(([^)]*)\)/', $content, $regularMatches, PREG_SET_ORDER);
        foreach ($regularMatches as $match) {
            $functions[] = ['name' => $match[1], 'type' => 'function'];
        }

        // Arrow functions assigned to const/let/var
        preg_match_all('/(?:const|let|var)\s+(\w+)\s*=\s*\([^)]*\)\s*=>/', $content, $arrowMatches, PREG_SET_ORDER);
        foreach ($arrowMatches as $match) {
            $functions[] = ['name' => $match[1], 'type' => 'arrow'];
        }

        return $functions;
    }

    /**
     * Extract JavaScript classes
     */
    private function extractJavaScriptClasses(string $content): array
    {
        return $this->extractTypeScriptClasses($content); // Same syntax
    }

    /**
     * Extract Python imports
     */
    private function extractPythonImports(string $content): array
    {
        $imports = [];
        
        // import module
        preg_match_all('/^import\s+(.+)$/m', $content, $matches);
        foreach ($matches[1] as $import) {
            $imports[] = ['type' => 'import', 'module' => trim($import)];
        }

        // from module import ...
        preg_match_all('/^from\s+(\S+)\s+import\s+(.+)$/m', $content, $fromMatches, PREG_SET_ORDER);
        foreach ($fromMatches as $match) {
            $imports[] = [
                'type' => 'from_import',
                'module' => $match[1],
                'items' => array_map('trim', explode(',', $match[2])),
            ];
        }

        return $imports;
    }

    /**
     * Extract Python classes
     */
    private function extractPythonClasses(string $content): array
    {
        $classes = [];
        preg_match_all('/^class\s+(\w+)(?:\(([^)]+)\))?:/m', $content, $matches, PREG_SET_ORDER);

        foreach ($matches as $match) {
            $classes[] = [
                'name' => $match[1],
                'bases' => isset($match[2]) ? array_map('trim', explode(',', $match[2])) : [],
            ];
        }

        return $classes;
    }

    /**
     * Extract Python functions
     */
    private function extractPythonFunctions(string $content): array
    {
        $functions = [];
        preg_match_all('/^def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*(\S+))?:/m', $content, $matches, PREG_SET_ORDER);

        foreach ($matches as $match) {
            $functions[] = [
                'name' => $match[1],
                'parameters' => $match[2] ?? '',
                'return_type' => $match[3] ?? null,
            ];
        }

        return $functions;
    }

    /**
     * Estimate code complexity (simplified cyclomatic complexity)
     */
    private function estimateComplexity(string $content): array
    {
        $conditionals = preg_match_all('/\b(if|else|elseif|switch|case|for|foreach|while|do|catch)\b/', $content);
        $functions = preg_match_all('/\bfunction\b/', $content);
        $classes = preg_match_all('/\bclass\b/', $content);

        $score = $conditionals + ($functions * 2) + ($classes * 3);

        return [
            'score' => $score,
            'level' => match (true) {
                $score > 100 => 'very_high',
                $score > 50 => 'high',
                $score > 20 => 'medium',
                $score > 5 => 'low',
                default => 'very_low',
            },
            'conditionals' => $conditionals,
            'functions' => $functions,
            'classes' => $classes,
        ];
    }

    /**
     * Extract code metrics
     */
    public function getMetrics(string $filePath): array
    {
        $content = file_get_contents($filePath);
        $lines = file($filePath);

        $codeLines = 0;
        $commentLines = 0;
        $blankLines = 0;

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if (empty($trimmed)) {
                $blankLines++;
            } elseif (str_starts_with($trimmed, '//') || str_starts_with($trimmed, '#') || str_starts_with($trimmed, '*')) {
                $commentLines++;
            } else {
                $codeLines++;
            }
        }

        return [
            'total_lines' => count($lines),
            'code_lines' => $codeLines,
            'comment_lines' => $commentLines,
            'blank_lines' => $blankLines,
            'code_ratio' => count($lines) > 0 ? round(($codeLines / count($lines)) * 100, 2) : 0,
        ];
    }
}
