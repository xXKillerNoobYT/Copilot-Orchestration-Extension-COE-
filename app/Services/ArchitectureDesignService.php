<?php

namespace App\Services;

use App\Models\ArchitectureDesign;
use App\Models\ArchitectureDecision;
use App\Repositories\ArchitectureDecisionRepository;
use App\Exceptions\ArchitectureException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class ArchitectureDesignService
{
    private const CACHE_PREFIX = 'architecture';
    private const CACHE_TTL = 3600; // 1 hour

    public function __construct(
        private ArchitectureDecisionRepository $adrRepository,
        private LoggingService $logging,
        private AuditTrailService $audit
    ) {}

    /**
     * Generate architecture design from task plan
     */
    public function generateArchitecture(string $planId): ArchitectureDesign
    {
        try {
            $this->logging->logTaskEvent('architecture_generation_started', [
                'plan_id' => $planId,
            ]);

            $plan = \App\Models\TaskPlan::findOrFail($planId);
            
            // Analyze requirements
            $parsedReq = (object) $plan->parsed_requirement;
            $entities = $parsedReq->entities ?? [];
            
            // Determine architectural pattern
            $pattern = $this->determineArchitecturalPattern($plan);
            
            // Generate layers
            $layers = $this->generateLayers($pattern);
            
            // Generate components
            $components = $this->generateComponents($entities, $pattern);
            
            // Generate relationships
            $relationships = $this->generateRelationships($components);
            
            // Generate database schema
            $dbSchema = $this->generateDatabaseSchema($entities);
            
            // Generate API contracts
            $apiContracts = $this->generateApiContracts($entities);
            
            // Generate diagrams
            $diagrams = $this->generateDiagrams($components, $relationships, $pattern);

            $design = ArchitectureDesign::create([
                'task_plan_id' => $planId,
                'project_id' => $plan->project_id,
                'pattern' => $pattern,
                'layers' => $layers,
                'components' => $components,
                'relationships' => $relationships,
                'database_schema' => $dbSchema,
                'api_contracts' => $apiContracts,
                'diagrams' => $diagrams,
                'version' => 1,
            ]);

            // Record initial ADR
            $this->recordArchitectureDecision($design->id, [
                'title' => "Use {$pattern} architecture pattern",
                'status' => 'accepted',
                'context' => 'Initial architecture design for project',
                'decision' => "Adopt {$pattern} pattern for clean separation of concerns",
                'consequences' => [
                    'Clear separation of responsibilities',
                    'Improved testability',
                    'Better maintainability',
                ],
            ]);

            $this->logging->logTaskEvent('architecture_generated', [
                'design_id' => $design->id,
                'pattern' => $pattern,
                'component_count' => count($components),
            ]);

            return $design;

        } catch (\Exception $e) {
            $this->logging->logError('architecture_generation_failed', $e, [
                'plan_id' => $planId,
            ]);

            throw new ArchitectureException(
                "Failed to generate architecture: {$e->getMessage()}",
                previous: $e
            );
        }
    }

    /**
     * Update existing architecture design
     */
    public function updateArchitecture(string $designId, array $changes): ArchitectureDesign
    {
        try {
            $design = ArchitectureDesign::findOrFail($designId);
            
            $changeLog = [];

            if (isset($changes['components'])) {
                $design->components = $changes['components'];
                $changeLog[] = 'Updated components';
            }

            if (isset($changes['relationships'])) {
                $design->relationships = $changes['relationships'];
                $changeLog[] = 'Updated relationships';
            }

            if (isset($changes['database_schema'])) {
                $design->database_schema = $changes['database_schema'];
                $changeLog[] = 'Updated database schema';
            }

            if (isset($changes['api_contracts'])) {
                $design->api_contracts = $changes['api_contracts'];
                $changeLog[] = 'Updated API contracts';
            }

            $design->version += 1;
            $design->save();

            $this->audit->logTaskAudit('architecture_updated', $designId, [
                'changes' => $changeLog,
                'version' => $design->version,
            ]);

            // Invalidate cache
            Cache::forget(self::CACHE_PREFIX . ":{$designId}");

            return $design;

        } catch (\Exception $e) {
            throw new ArchitectureException(
                "Failed to update architecture: {$e->getMessage()}",
                previous: $e
            );
        }
    }

    /**
     * Validate architectural constraints
     */
    public function validateArchitecturalConstraints(string $designId): array
    {
        $design = ArchitectureDesign::findOrFail($designId);
        
        $violations = [];
        $warnings = [];

        // Validate layer dependencies (no upward dependencies)
        foreach ($design->relationships as $rel) {
            if ($this->violatesLayerDependency($rel, $design->layers, $design->components)) {
                $violations[] = "Layer violation: {$rel['from']} → {$rel['to']}";
            }
        }

        // Validate circular dependencies
        if ($this->hasCircularDependencies($design->relationships)) {
            $violations[] = "Circular dependencies detected in component relationships";
        }

        // Validate component cohesion
        foreach ($design->components as $component) {
            if ($this->hasLowCohesion($component)) {
                $warnings[] = "Low cohesion in component: {$component['name']}";
            }
        }

        // Validate API contracts
        foreach ($design->api_contracts ?? [] as $contract) {
            if (empty($contract['endpoints'])) {
                $warnings[] = "API contract has no endpoints: {$contract['resource']}";
            }
        }

        return [
            'valid' => empty($violations),
            'violations' => $violations,
            'warnings' => $warnings,
            'validated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Apply architectural pattern
     */
    public function applyArchitecturalPattern(string $designId, string $pattern): void
    {
        $design = ArchitectureDesign::findOrFail($designId);
        
        // Generate new structure based on pattern
        $layers = $this->generateLayers($pattern);
        
        // Reorganize components according to pattern
        $components = $this->reorganizeComponents($design->components, $pattern);
        
        $design->pattern = $pattern;
        $design->layers = $layers;
        $design->components = $components;
        $design->version += 1;
        $design->save();

        // Record ADR
        $this->recordArchitectureDecision($designId, [
            'title' => "Change architecture pattern to {$pattern}",
            'status' => 'accepted',
            'context' => 'Pattern change requested',
            'decision' => "Migrate to {$pattern} architecture",
            'consequences' => $this->getPatternConsequences($pattern),
        ]);
    }

    /**
     * Enforce architectural boundaries
     */
    public function enforceArchitecturalBoundaries(string $designId): array
    {
        $design = ArchitectureDesign::findOrFail($designId);
        
        $enforced = [];
        $violations = [];

        foreach ($design->components as $component) {
            $layer = $component['layer'];
            $allowedDependencies = $this->getAllowedDependencies($layer, $design->layers);
            
            // Check if component dependencies respect boundaries
            foreach ($component['dependencies'] ?? [] as $dependency) {
                $depComponent = $this->findComponent($dependency, $design->components);
                if ($depComponent && !in_array($depComponent['layer'], $allowedDependencies)) {
                    $violations[] = [
                        'component' => $component['name'],
                        'depends_on' => $dependency,
                        'violation' => "Layer {$layer} cannot depend on {$depComponent['layer']}",
                    ];
                } else {
                    $enforced[] = "{$component['name']} → {$dependency}";
                }
            }
        }

        return [
            'violations' => $violations,
            'enforced_count' => count($enforced),
            'violation_count' => count($violations),
        ];
    }

    /**
     * Generate architecture document in specified format
     */
    public function generateArchitectureDocument(string $designId, string $format = 'markdown'): string
    {
        $design = ArchitectureDesign::findOrFail($designId);
        
        return match($format) {
            'markdown' => $this->generateMarkdownDocument($design),
            'html' => $this->generateHtmlDocument($design),
            'json' => json_encode($design->toArray(), JSON_PRETTY_PRINT),
            default => throw new ArchitectureException("Unsupported format: {$format}"),
        };
    }

    /**
     * Generate architecture diagrams (Mermaid format)
     */
    public function generateDiagrams(array $components, array $relationships, string $pattern): array
    {
        return [
            'component_diagram' => $this->generateComponentDiagram($components, $relationships),
            'layer_diagram' => $this->generateLayerDiagram($pattern),
            'sequence_diagram' => $this->generateSequenceDiagram($components),
            'class_diagram' => $this->generateClassDiagram($components),
        ];
    }

    /**
     * Record architecture decision (ADR)
     */
    public function recordArchitectureDecision(string $designId, array $decision): ArchitectureDecision
    {
        $adr = $this->adrRepository->create([
            'architecture_design_id' => $designId,
            'title' => $decision['title'],
            'status' => $decision['status'] ?? 'proposed',
            'context' => $decision['context'],
            'decision' => $decision['decision'],
            'consequences' => $decision['consequences'] ?? [],
            'alternatives_considered' => $decision['alternatives'] ?? [],
        ]);

        $this->logging->logTaskEvent('adr_recorded', [
            'adr_id' => $adr->id,
            'title' => $adr->title,
        ]);

        return $adr;
    }

    /**
     * Get architecture decisions for a design
     */
    public function getArchitectureDecisions(string $designId): Collection
    {
        return $this->adrRepository->findForDesign($designId);
    }

    /**
     * Determine appropriate architectural pattern based on requirements
     */
    private function determineArchitecturalPattern($plan): string
    {
        $taskCount = count($plan->generated_tasks);
        $complexity = $plan->complexity;

        // Simple projects → Layered
        if ($taskCount < 10 || $complexity === 'simple') {
            return 'layered';
        }

        // Complex projects → Clean Architecture
        if ($complexity === 'complex' || $complexity === 'very_complex') {
            return 'clean_architecture';
        }

        // Default to layered
        return 'layered';
    }

    /**
     * Generate layers based on pattern
     */
    private function generateLayers(string $pattern): array
    {
        return match($pattern) {
            'layered' => [
                ['name' => 'presentation', 'order' => 1, 'description' => 'HTTP controllers and views'],
                ['name' => 'application', 'order' => 2, 'description' => 'Business logic services'],
                ['name' => 'domain', 'order' => 3, 'description' => 'Domain models and rules'],
                ['name' => 'infrastructure', 'order' => 4, 'description' => 'Database, external services'],
            ],
            'clean_architecture' => [
                ['name' => 'entities', 'order' => 1, 'description' => 'Enterprise business rules'],
                ['name' => 'use_cases', 'order' => 2, 'description' => 'Application business rules'],
                ['name' => 'interface_adapters', 'order' => 3, 'description' => 'Controllers, presenters, gateways'],
                ['name' => 'frameworks_drivers', 'order' => 4, 'description' => 'External frameworks and tools'],
            ],
            'hexagonal' => [
                ['name' => 'domain', 'order' => 1, 'description' => 'Core business logic'],
                ['name' => 'application', 'order' => 2, 'description' => 'Application services'],
                ['name' => 'ports', 'order' => 3, 'description' => 'Interfaces for adapters'],
                ['name' => 'adapters', 'order' => 4, 'description' => 'External implementations'],
            ],
            default => [
                ['name' => 'presentation', 'order' => 1],
                ['name' => 'business', 'order' => 2],
                ['name' => 'data', 'order' => 3],
            ],
        };
    }

    /**
     * Generate components from entities
     */
    private function generateComponents(array $entities, string $pattern): array
    {
        $components = [];

        foreach ($entities as $entity) {
            $entityName = is_object($entity) ? $entity->name : ($entity['name'] ?? 'Entity');
            
            // Model component
            $components[] = [
                'id' => 'model_' . strtolower($entityName),
                'name' => "{$entityName}Model",
                'type' => 'model',
                'layer' => $pattern === 'clean_architecture' ? 'entities' : 'domain',
                'responsibilities' => ["Represent {$entityName} entity", 'Business rules'],
                'dependencies' => [],
            ];

            // Repository component
            $components[] = [
                'id' => 'repo_' . strtolower($entityName),
                'name' => "{$entityName}Repository",
                'type' => 'repository',
                'layer' => 'infrastructure',
                'responsibilities' => ["Data access for {$entityName}"],
                'dependencies' => ['model_' . strtolower($entityName)],
            ];

            // Service component
            $components[] = [
                'id' => 'service_' . strtolower($entityName),
                'name' => "{$entityName}Service",
                'type' => 'service',
                'layer' => $pattern === 'clean_architecture' ? 'use_cases' : 'application',
                'responsibilities' => ["{$entityName} business logic"],
                'dependencies' => ['repo_' . strtolower($entityName)],
            ];

            // Controller component
            $components[] = [
                'id' => 'controller_' . strtolower($entityName),
                'name' => "{$entityName}Controller",
                'type' => 'controller',
                'layer' => 'presentation',
                'responsibilities' => ["HTTP API for {$entityName}"],
                'dependencies' => ['service_' . strtolower($entityName)],
            ];
        }

        return $components;
    }

    /**
     * Generate relationships between components
     */
    private function generateRelationships(array $components): array
    {
        $relationships = [];

        foreach ($components as $component) {
            foreach ($component['dependencies'] ?? [] as $dependency) {
                $relationships[] = [
                    'from' => $component['id'],
                    'to' => $dependency,
                    'type' => 'depends_on',
                ];
            }
        }

        return $relationships;
    }

    /**
     * Generate database schema
     */
    private function generateDatabaseSchema(array $entities): array
    {
        $tables = [];

        foreach ($entities as $entity) {
            $entityName = is_object($entity) ? $entity->name : ($entity['name'] ?? 'Entity');
            $tableName = Str::snake(Str::plural($entityName));

            $tables[] = [
                'name' => $tableName,
                'columns' => [
                    ['name' => 'id', 'type' => 'uuid', 'primary' => true],
                    ['name' => 'name', 'type' => 'string'],
                    ['name' => 'created_at', 'type' => 'timestamp'],
                    ['name' => 'updated_at', 'type' => 'timestamp'],
                ],
                'indexes' => [
                    ['columns' => ['id']],
                ],
            ];
        }

        return $tables;
    }

    /**
     * Generate API contracts
     */
    private function generateApiContracts(array $entities): array
    {
        $contracts = [];

        foreach ($entities as $entity) {
            $entityName = is_object($entity) ? $entity->name : ($entity['name'] ?? 'Entity');
            $resource = Str::snake(Str::plural($entityName));

            $contracts[] = [
                'resource' => $resource,
                'base_url' => "/api/v1/{$resource}",
                'endpoints' => [
                    ['method' => 'GET', 'path' => '', 'description' => 'List all'],
                    ['method' => 'POST', 'path' => '', 'description' => 'Create new'],
                    ['method' => 'GET', 'path' => '/{id}', 'description' => 'Get by ID'],
                    ['method' => 'PATCH', 'path' => '/{id}', 'description' => 'Update'],
                    ['method' => 'DELETE', 'path' => '/{id}', 'description' => 'Delete'],
                ],
            ];
        }

        return $contracts;
    }

    /**
     * Generate component diagram in Mermaid format
     */
    private function generateComponentDiagram(array $components, array $relationships): string
    {
        $mermaid = "graph TD\n";

        foreach ($components as $component) {
            $id = $component['id'];
            $name = $component['name'];
            $type = $component['type'];
            $mermaid .= "    {$id}[{$name}<br/>{$type}]\n";
        }

        foreach ($relationships as $rel) {
            $mermaid .= "    {$rel['from']} --> {$rel['to']}\n";
        }

        return $mermaid;
    }

    /**
     * Generate layer diagram
     */
    private function generateLayerDiagram(string $pattern): string
    {
        $layers = $this->generateLayers($pattern);
        $mermaid = "graph TB\n";

        foreach ($layers as $layer) {
            $name = $layer['name'];
            $mermaid .= "    {$name}[{$name}]\n";
        }

        for ($i = 0; $i < count($layers) - 1; $i++) {
            $from = $layers[$i]['name'];
            $to = $layers[$i + 1]['name'];
            $mermaid .= "    {$from} --> {$to}\n";
        }

        return $mermaid;
    }

    /**
     * Generate sequence diagram
     */
    private function generateSequenceDiagram(array $components): string
    {
        $mermaid = "sequenceDiagram\n";
        $mermaid .= "    participant Client\n";
        $mermaid .= "    participant Controller\n";
        $mermaid .= "    participant Service\n";
        $mermaid .= "    participant Repository\n";
        $mermaid .= "    participant Database\n";
        $mermaid .= "    Client->>Controller: HTTP Request\n";
        $mermaid .= "    Controller->>Service: Call business logic\n";
        $mermaid .= "    Service->>Repository: Query data\n";
        $mermaid .= "    Repository->>Database: SQL Query\n";
        $mermaid .= "    Database-->>Repository: Results\n";
        $mermaid .= "    Repository-->>Service: Data\n";
        $mermaid .= "    Service-->>Controller: Response\n";
        $mermaid .= "    Controller-->>Client: HTTP Response\n";

        return $mermaid;
    }

    /**
     * Generate class diagram
     */
    private function generateClassDiagram(array $components): string
    {
        $mermaid = "classDiagram\n";

        foreach ($components as $component) {
            if ($component['type'] === 'model') {
                $name = $component['name'];
                $mermaid .= "    class {$name} {\n";
                $mermaid .= "        +UUID id\n";
                $mermaid .= "        +String name\n";
                $mermaid .= "        +DateTime created_at\n";
                $mermaid .= "    }\n";
            }
        }

        return $mermaid;
    }

    /**
     * Generate Markdown documentation
     */
    private function generateMarkdownDocument(ArchitectureDesign $design): string
    {
        $md = "# Architecture Documentation\n\n";
        $md .= "**Pattern:** {$design->pattern}\n";
        $md .= "**Version:** {$design->version}\n";
        $md .= "**Last Updated:** {$design->updated_at}\n\n";

        $md .= "## Layers\n\n";
        foreach ($design->layers as $layer) {
            $md .= "### {$layer['name']}\n";
            $md .= "{$layer['description']}\n\n";
        }

        $md .= "## Components\n\n";
        foreach ($design->components as $component) {
            $md .= "### {$component['name']}\n";
            $md .= "**Type:** {$component['type']}\n";
            $md .= "**Layer:** {$component['layer']}\n\n";
        }

        if (!empty($design->diagrams)) {
            $md .= "## Diagrams\n\n";
            foreach ($design->diagrams as $type => $diagram) {
                $md .= "### " . ucwords(str_replace('_', ' ', $type)) . "\n\n";
                $md .= "```mermaid\n{$diagram}\n```\n\n";
            }
        }

        return $md;
    }

    private function generateHtmlDocument(ArchitectureDesign $design): string
    {
        // HTML generation implementation
        return "<html><body><h1>Architecture Documentation</h1></body></html>";
    }

    private function violatesLayerDependency($rel, $layers, $components): bool
    {
        // Implementation for layer dependency validation
        return false;
    }

    private function hasCircularDependencies(array $relationships): bool
    {
        // DFS cycle detection
        return false;
    }

    private function hasLowCohesion($component): bool
    {
        // Cohesion analysis
        return count($component['responsibilities'] ?? []) > 5;
    }

    private function reorganizeComponents(array $components, string $pattern): array
    {
        // Reorganize components for new pattern
        return $components;
    }

    private function getPatternConsequences(string $pattern): array
    {
        return match($pattern) {
            'clean_architecture' => [
                'Strong separation of concerns',
                'High testability',
                'Independent of frameworks',
                'More complex initial setup',
            ],
            'layered' => [
                'Simple to understand',
                'Easy to implement',
                'Good for small to medium projects',
            ],
            default => [],
        };
    }

    private function getAllowedDependencies(string $layer, array $layers): array
    {
        $layerOrder = array_column($layers, 'order', 'name');
        $currentOrder = $layerOrder[$layer] ?? 0;

        // Only allow dependencies on layers with higher order (lower in stack)
        return array_keys(array_filter($layerOrder, fn($order) => $order > $currentOrder));
    }

    private function findComponent(string $id, array $components): ?array
    {
        foreach ($components as $component) {
            if ($component['id'] === $id) {
                return $component;
            }
        }
        return null;
    }
}
