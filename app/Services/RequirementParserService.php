<?php

namespace App\Services;

use App\Exceptions\RequirementParsingException;
use Illuminate\Support\Str;

class RequirementParserService
{
    // Common technical entities
    private const ENTITY_PATTERNS = [
        '/(?:create|build|add|implement)\s+(?:a\s+)?([A-Z][a-zA-Z]+)\s+(?:model|entity|table)/i',
        '/(?:user|customer|product|order|payment|invoice|project|task|comment)/i',
    ];

    // Intent patterns
    private const INTENT_PATTERNS = [
        'crud' => '/(?:create|read|update|delete|manage|crud)/i',
        'api' => '/(?:api|rest|restful|endpoint|route)/i',
        'authentication' => '/(?:auth|login|register|sign\s*up|password)/i',
        'authorization' => '/(?:permission|role|access\s*control|authorize)/i',
        'search' => '/(?:search|filter|query|find)/i',
        'reporting' => '/(?:report|analytics|dashboard|chart|graph)/i',
        'notification' => '/(?:notify|notification|email|alert)/i',
        'integration' => '/(?:integrate|sync|webhook|third[\s-]*party)/i',
    ];

    // Constraint patterns
    private const CONSTRAINT_PATTERNS = [
        'performance' => '/(?:fast|quick|performance|speed|latency|response\s*time)/i',
        'security' => '/(?:secure|security|encrypt|authentication|authorization)/i',
        'scalability' => '/(?:scale|scalable|load|concurrent|users)/i',
        'availability' => '/(?:24\/7|uptime|available|reliability)/i',
        'compliance' => '/(?:gdpr|hipaa|pci|compliant|regulation)/i',
    ];

    public function __construct(
        private LoggingService $logging
    ) {}

    /**
     * Parse user requirement into structured format
     */
    public function parseRequirement(string $requirement): object
    {
        try {
            $this->logging->logTaskEvent('requirement_parsing_started', [
                'length' => strlen($requirement),
            ]);

            // Extract entities
            $entities = $this->extractEntities($requirement);
            
            // Identify intents
            $intents = $this->identifyIntents($requirement);
            
            // Extract constraints
            $constraints = $this->extractConstraints($requirement);
            
            // Extract user stories if present
            $userStories = $this->extractUserStories($requirement);
            
            // Extract acceptance criteria
            $acceptanceCriteria = $this->extractAcceptanceCriteria($requirement);

            $parsed = (object) [
                'original' => $requirement,
                'entities' => $entities,
                'intents' => $intents,
                'constraints' => $constraints,
                'user_stories' => $userStories,
                'acceptance_criteria' => $acceptanceCriteria,
                'word_count' => str_word_count($requirement),
                'parsed_at' => now()->toIso8601String(),
            ];

            $this->logging->logTaskEvent('requirement_parsed', [
                'entities_count' => count($entities),
                'intents_count' => count($intents),
                'constraints_count' => count($constraints),
            ]);

            return $parsed;

        } catch (\Exception $e) {
            $this->logging->logError('requirement_parsing_failed', $e);
            
            throw new RequirementParsingException(
                "Failed to parse requirement: {$e->getMessage()}",
                previous: $e
            );
        }
    }

    /**
     * Extract entities (models, resources) from requirement
     */
    public function extractEntities(string $requirement): array
    {
        $entities = [];
        $words = explode(' ', $requirement);

        // Look for capitalized words (potential entities)
        foreach ($words as $word) {
            $cleaned = trim($word, '.,!?;:');
            if (ctype_upper($cleaned[0] ?? '') && strlen($cleaned) > 2) {
                $entities[] = (object) [
                    'name' => $cleaned,
                    'type' => $this->inferEntityType($cleaned),
                ];
            }
        }

        // Look for entity patterns
        foreach (self::ENTITY_PATTERNS as $pattern) {
            if (preg_match_all($pattern, $requirement, $matches)) {
                foreach ($matches[1] ?? [] as $match) {
                    $entities[] = (object) [
                        'name' => ucfirst($match),
                        'type' => 'model',
                    ];
                }
            }
        }

        // Remove duplicates
        $unique = [];
        $seen = [];
        foreach ($entities as $entity) {
            $key = strtolower($entity->name);
            if (!isset($seen[$key])) {
                $unique[] = $entity;
                $seen[$key] = true;
            }
        }

        return $unique;
    }

    /**
     * Identify user intents from requirement
     */
    public function identifyIntents(string $requirement): array
    {
        $intents = [];

        foreach (self::INTENT_PATTERNS as $intent => $pattern) {
            if (preg_match($pattern, $requirement)) {
                $intents[] = $intent;
            }
        }

        // If no specific intents found, default to CRUD
        if (empty($intents)) {
            $intents[] = 'crud';
        }

        return array_unique($intents);
    }

    /**
     * Extract constraints (performance, security, etc.)
     */
    public function extractConstraints(string $requirement): array
    {
        $constraints = [];

        foreach (self::CONSTRAINT_PATTERNS as $type => $pattern) {
            if (preg_match($pattern, $requirement, $matches)) {
                $constraints[] = (object) [
                    'type' => $type,
                    'value' => $matches[0] ?? $type,
                    'priority' => $this->getConstraintPriority($type),
                ];
            }
        }

        return $constraints;
    }

    /**
     * Extract user stories (As a... I want... So that...)
     */
    public function extractUserStories(string $requirement): array
    {
        $stories = [];
        
        // Pattern: "As a [role], I want [feature], so that [benefit]"
        $pattern = '/as\s+a\s+([^,]+),\s*I\s+want\s+([^,]+)(?:,\s*so\s+that\s+(.+))?/i';
        
        if (preg_match_all($pattern, $requirement, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $stories[] = (object) [
                    'role' => trim($match[1]),
                    'feature' => trim($match[2]),
                    'benefit' => trim($match[3] ?? ''),
                ];
            }
        }

        return $stories;
    }

    /**
     * Extract acceptance criteria
     */
    public function extractAcceptanceCriteria(string $requirement): array
    {
        $criteria = [];
        
        // Look for "Given... When... Then..." patterns
        $pattern = '/given\s+([^,]+),\s*when\s+([^,]+),\s*then\s+(.+)/i';
        
        if (preg_match_all($pattern, $requirement, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $criteria[] = (object) [
                    'given' => trim($match[1]),
                    'when' => trim($match[2]),
                    'then' => trim($match[3]),
                ];
            }
        }

        // Look for bullet points or numbered lists
        if (preg_match_all('/^[\s]*[-*•]\s*(.+)$/m', $requirement, $matches)) {
            foreach ($matches[1] as $criterion) {
                $criteria[] = (object) [
                    'description' => trim($criterion),
                ];
            }
        }

        return $criteria;
    }

    /**
     * Analyze complexity of parsed requirement
     */
    public function analyzeComplexity(object $parsedRequirement): object
    {
        $entityCount = count($parsedRequirement->entities);
        $intentCount = count($parsedRequirement->intents);
        $constraintCount = count($parsedRequirement->constraints);
        $wordCount = $parsedRequirement->word_count;

        // Calculate complexity score
        $score = 0;
        $score += $entityCount * 10;      // Each entity adds complexity
        $score += $intentCount * 5;       // Each intent adds some complexity
        $score += $constraintCount * 15;  // Constraints significantly increase complexity
        $score += min($wordCount / 10, 50); // Word count adds up to 50 points

        // Determine complexity level
        $level = match(true) {
            $score < 30 => 'simple',
            $score < 60 => 'moderate',
            $score < 100 => 'complex',
            default => 'very_complex',
        };

        return (object) [
            'level' => $level,
            'score' => $score,
            'factors' => [
                'entities' => $entityCount,
                'intents' => $intentCount,
                'constraints' => $constraintCount,
                'word_count' => $wordCount,
            ],
            'explanation' => $this->getComplexityExplanation($level, $score),
        ];
    }

    /**
     * Suggest clarifying questions for ambiguous requirements
     */
    public function suggestClarifications(object $parsedRequirement): array
    {
        $clarifications = [];

        // If no entities found
        if (empty($parsedRequirement->entities)) {
            $clarifications[] = (object) [
                'question' => 'What are the main data entities or resources in this system?',
                'reason' => 'No entities detected',
                'priority' => 'high',
            ];
        }

        // If security mentioned but no auth intent
        $hasSecurityConstraint = !empty(array_filter(
            $parsedRequirement->constraints,
            fn($c) => $c->type === 'security'
        ));
        
        if ($hasSecurityConstraint && !in_array('authentication', $parsedRequirement->intents)) {
            $clarifications[] = (object) [
                'question' => 'What authentication method should be used?',
                'reason' => 'Security mentioned but no authentication details',
                'priority' => 'high',
            ];
        }

        // If API intent but no integration details
        if (in_array('api', $parsedRequirement->intents) && !in_array('integration', $parsedRequirement->intents)) {
            $clarifications[] = (object) [
                'question' => 'Will this API integrate with any external services?',
                'reason' => 'API mentioned but no integration details',
                'priority' => 'medium',
            ];
        }

        // If many entities but no relationships mentioned
        if (count($parsedRequirement->entities) > 3 && strpos($parsedRequirement->original, 'relationship') === false) {
            $clarifications[] = (object) [
                'question' => 'How do these entities relate to each other?',
                'reason' => 'Multiple entities without clear relationships',
                'priority' => 'medium',
            ];
        }

        // If no acceptance criteria
        if (empty($parsedRequirement->acceptance_criteria)) {
            $clarifications[] = (object) [
                'question' => 'What are the acceptance criteria for completion?',
                'reason' => 'No acceptance criteria provided',
                'priority' => 'medium',
            ];
        }

        return $clarifications;
    }

    /**
     * Estimate scope based on parsed requirement
     */
    public function estimateScope(object $parsedRequirement): object
    {
        $entityCount = count($parsedRequirement->entities);
        $intentCount = count($parsedRequirement->intents);

        // Estimate features
        $features = [];
        foreach ($parsedRequirement->entities as $entity) {
            $features[] = "CRUD operations for {$entity->name}";
        }

        foreach ($parsedRequirement->intents as $intent) {
            if ($intent !== 'crud') {
                $features[] = ucfirst($intent) . ' functionality';
            }
        }

        // Estimate effort (person-days)
        $baseDays = $entityCount * 3; // 3 days per entity (model, repo, service, controller, tests)
        $intentDays = $intentCount * 2; // 2 days per intent
        $constraintDays = count($parsedRequirement->constraints) * 1; // 1 day per constraint

        $totalDays = $baseDays + $intentDays + $constraintDays;

        // Estimate team size
        $recommendedTeam = match(true) {
            $totalDays < 10 => 1,
            $totalDays < 30 => 2,
            $totalDays < 60 => 3,
            default => 4,
        };

        return (object) [
            'estimated_days' => $totalDays,
            'estimated_weeks' => ceil($totalDays / 5),
            'recommended_team_size' => $recommendedTeam,
            'features' => $features,
            'entities_to_build' => $entityCount,
            'integrations' => in_array('integration', $parsedRequirement->intents) ? 'yes' : 'no',
        ];
    }

    /**
     * Infer entity type from name
     */
    private function inferEntityType(string $name): string
    {
        $lowerName = strtolower($name);

        if (in_array($lowerName, ['user', 'customer', 'admin', 'employee'])) {
            return 'user_entity';
        }

        if (in_array($lowerName, ['product', 'item', 'service'])) {
            return 'product_entity';
        }

        if (in_array($lowerName, ['order', 'transaction', 'purchase'])) {
            return 'transaction_entity';
        }

        return 'model';
    }

    /**
     * Get constraint priority
     */
    private function getConstraintPriority(string $type): string
    {
        return match($type) {
            'security' => 'critical',
            'compliance' => 'critical',
            'performance' => 'high',
            'scalability' => 'high',
            'availability' => 'medium',
            default => 'medium',
        };
    }

    /**
     * Get complexity explanation
     */
    private function getComplexityExplanation(string $level, float $score): string
    {
        return match($level) {
            'simple' => "This is a straightforward project with minimal complexity (score: {$score}). Should be quick to implement.",
            'moderate' => "This project has moderate complexity (score: {$score}). Requires careful planning but is manageable.",
            'complex' => "This is a complex project (score: {$score}). Needs thorough architecture and experienced developers.",
            'very_complex' => "This is a very complex project (score: {$score}). Requires significant planning, architecture, and resources.",
            default => "Complexity analysis unavailable",
        };
    }
}
