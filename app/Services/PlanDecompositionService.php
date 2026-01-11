<?php

namespace App\Services;

use Illuminate\Support\Collection;
use InvalidArgumentException;

/**
 * Plan Decomposition Service
 * 
 * Analyzes wizard-generated plans and decomposes them into executable task trees
 * with proper dependencies, priorities, and effort estimates.
 */
class PlanDecompositionService
{
    public function __construct(
        private WizardPlanParserService $planParser,
        private DependencyGraphService $dependencyGraph
    ) {}

    /**
     * Decompose a plan into task tree with dependencies and priorities
     * 
     * @param array $normalizedPlan Normalized plan from WizardPlanParserService
     * @param array $options Decomposition options (microtask_size, etc.)
     * @return array Task tree with metadata
     */
    public function decomposePlan(array $normalizedPlan, array $options = []): array
    {
        $microtaskMinutes = $options['microtask_size'] ?? 45;
        
        $features = $normalizedPlan['features'];
        $timeline = $normalizedPlan['timeline'];
        $architecture = $normalizedPlan['architecture'];
        
        // Generate base tasks from features
        $tasks = $this->generateTasksFromFeatures($features, $microtaskMinutes);
        
        // Infer dependencies from feature relationships
        $tasks = $this->inferDependencies($tasks, $features);
        
        // Assign priorities based on critical path and timeline
        $tasks = $this->assignPriorities($tasks, $timeline);
        
        // Validate no circular dependencies
        if (!$this->validateNoCycles($tasks)) {
            throw new InvalidArgumentException('Generated task tree contains circular dependencies');
        }
        
        // Calculate critical path
        $criticalPath = $this->calculateCriticalPath($tasks);
        
        // Calculate metadata
        $metadata = [
            'total_tasks' => count($tasks),
            'estimated_hours' => array_sum(array_column($tasks, 'estimate_hours')),
            'critical_path' => $criticalPath,
            'architecture_pattern' => $architecture['pattern'],
            'priority_breakdown' => $this->getPriorityBreakdown($tasks),
        ];
        
        return [
            'tasks' => $tasks,
            'metadata' => $metadata,
        ];
    }

    /**
     * Generate tasks from feature list
     * 
     * @param Collection $features Feature collection from plan
     * @param int $microtaskMinutes Target minutes per subtask
     * @return array Array of task definitions
     */
    private function generateTasksFromFeatures(Collection $features, int $microtaskMinutes): array
    {
        $tasks = [];
        
        foreach ($features as $feature) {
            $featureTask = $this->createFeatureTask($feature);
            
            // Estimate effort for the feature
            $estimatedHours = $this->estimateEffort($feature);
            $featureTask['estimate_hours'] = $estimatedHours;
            
            // If feature is large, break into subtasks
            if ($estimatedHours * 60 > $microtaskMinutes) {
                $subtasks = $this->breakIntoSubtasks($feature, $microtaskMinutes);
                $featureTask['subtasks'] = $subtasks;
            }
            
            $tasks[] = $featureTask;
        }
        
        return $tasks;
    }

    /**
     * Create a task definition from a feature
     * 
     * @param array $feature Feature data
     * @return array Task definition
     */
    private function createFeatureTask(array $feature): array
    {
        return [
            'id' => $feature['id'],
            'title' => "Implement: {$feature['name']}",
            'description' => $feature['description'],
            'type' => 'feature',
            'priority' => $this->normalizeFeaturePriority($feature['priority']),
            'dependencies' => [], // Will be populated by inferDependencies
            'status' => 'pending',
            'feature_data' => $feature,
        ];
    }

    /**
     * Break large feature into subtasks
     * 
     * @param array $feature Feature data
     * @param int $microtaskMinutes Target minutes per subtask
     * @return array Array of subtask definitions
     */
    private function breakIntoSubtasks(array $feature, int $microtaskMinutes): array
    {
        $subtasks = [];
        
        // Standard subtask breakdown for features
        $subtaskTemplates = [
            [
                'suffix' => 'Setup & Planning',
                'description' => 'Define requirements, design approach, identify dependencies',
                'weight' => 0.15,
            ],
            [
                'suffix' => 'Core Implementation',
                'description' => 'Implement main feature logic and functionality',
                'weight' => 0.45,
            ],
            [
                'suffix' => 'Integration & Testing',
                'description' => 'Integrate with existing code, write tests, handle edge cases',
                'weight' => 0.25,
            ],
            [
                'suffix' => 'Documentation & Review',
                'description' => 'Add documentation, code review, finalize',
                'weight' => 0.15,
            ],
        ];
        
        $totalHours = $this->estimateEffort($feature);
        
        foreach ($subtaskTemplates as $index => $template) {
            $hours = $totalHours * $template['weight'];
            
            // Only create subtask if it's substantial enough
            if ($hours * 60 >= 15) { // Minimum 15 minutes
                $subtasks[] = [
                    'id' => $feature['id'] . '-sub-' . ($index + 1),
                    'title' => "{$feature['name']}: {$template['suffix']}",
                    'description' => $template['description'],
                    'type' => 'subtask',
                    'priority' => $this->normalizeFeaturePriority($feature['priority']),
                    'estimate_hours' => round($hours, 1),
                    'parent_id' => $feature['id'],
                ];
            }
        }
        
        return $subtasks;
    }

    /**
     * Normalize feature priority to task priority
     * 
     * @param string $featurePriority Priority from feature (high|medium|low|critical)
     * @return string Normalized priority
     */
    private function normalizeFeaturePriority(string $featurePriority): string
    {
        return match (strtolower($featurePriority)) {
            'critical' => 'critical',
            'high' => 'high',
            'medium', 'normal' => 'medium',
            'low' => 'low',
            default => 'medium',
        };
    }

    /**
     * Estimate effort for a feature in hours
     * 
     * @param array $feature Feature data
     * @return float Estimated hours
     */
    private function estimateEffort(array $feature): float
    {
        // Base complexity factors
        $baseHours = 4; // Default feature baseline
        
        $description = $feature['description'] ?? '';
        $complexity = 1.0;
        
        // Adjust based on keywords and description length
        if (str_contains(strtolower($description), 'authentication')) {
            $complexity *= 1.5;
        }
        if (str_contains(strtolower($description), 'database')) {
            $complexity *= 1.3;
        }
        if (str_contains(strtolower($description), 'api')) {
            $complexity *= 1.2;
        }
        if (str_contains(strtolower($description), 'integration')) {
            $complexity *= 1.4;
        }
        if (str_contains(strtolower($description), 'migration')) {
            $complexity *= 1.3;
        }
        
        // Description length indicates complexity
        $descriptionWords = str_word_count($description);
        if ($descriptionWords > 50) {
            $complexity *= 1.3;
        } elseif ($descriptionWords > 30) {
            $complexity *= 1.15;
        }
        
        // Number of dependencies increases complexity
        $dependencyCount = count($feature['dependencies'] ?? []);
        if ($dependencyCount > 2) {
            $complexity *= 1.2;
        }
        
        return round($baseHours * $complexity, 1);
    }

    /**
     * Infer task dependencies from feature dependencies
     * 
     * @param array $tasks Task array
     * @param Collection $features Original features with dependencies
     * @return array Updated task array with dependencies
     */
    private function inferDependencies(array $tasks, Collection $features): array
    {
        // Create feature ID to task mapping
        $featureMap = [];
        foreach ($tasks as $index => $task) {
            $featureMap[$task['id']] = $index;
        }
        
        // Map feature dependencies to task dependencies
        foreach ($features as $feature) {
            $featureId = $feature['id'];
            $featureDependencies = $feature['dependencies'] ?? [];
            
            if (isset($featureMap[$featureId])) {
                $taskIndex = $featureMap[$featureId];
                
                // Map each feature dependency to task dependency
                foreach ($featureDependencies as $depFeatureId) {
                    if (isset($featureMap[$depFeatureId])) {
                        $tasks[$taskIndex]['dependencies'][] = $depFeatureId;
                    }
                }
            }
        }
        
        return $tasks;
    }

    /**
     * Assign priorities based on critical path and timeline
     * 
     * @param array $tasks Task array
     * @param array $timeline Timeline from plan
     * @return array Updated task array
     */
    private function assignPriorities(array $tasks, array $timeline): array
    {
        // Calculate critical path
        $criticalPath = $this->calculateCriticalPath($tasks);
        
        // Boost priority for tasks on critical path
        foreach ($tasks as $index => $task) {
            if (in_array($task['id'], $criticalPath)) {
                // Promote priority if on critical path
                if ($task['priority'] === 'low') {
                    $tasks[$index]['priority'] = 'medium';
                } elseif ($task['priority'] === 'medium') {
                    $tasks[$index]['priority'] = 'high';
                }
                
                $tasks[$index]['on_critical_path'] = true;
            }
        }
        
        return $tasks;
    }

    /**
     * Validate that task tree has no circular dependencies
     * 
     * @param array $tasks Task array
     * @return bool True if no cycles detected
     */
    private function validateNoCycles(array $tasks): bool
    {
        $graph = $this->buildDependencyGraph($tasks);
        
        foreach (array_keys($graph) as $taskId) {
            if ($this->hasCycleFrom($taskId, $graph)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Build adjacency list representation of task dependencies
     * 
     * @param array $tasks Task array
     * @return array Adjacency list
     */
    private function buildDependencyGraph(array $tasks): array
    {
        $graph = [];
        
        foreach ($tasks as $task) {
            $graph[$task['id']] = $task['dependencies'] ?? [];
        }
        
        return $graph;
    }

    /**
     * Check for cycles starting from a given task using DFS
     * 
     * @param string $taskId Starting task ID
     * @param array $graph Dependency graph
     * @param array $visited Visited nodes
     * @param array $recursionStack Current path
     * @return bool True if cycle detected
     */
    private function hasCycleFrom(
        string $taskId,
        array $graph,
        array &$visited = [],
        array &$recursionStack = []
    ): bool {
        if (!isset($visited[$taskId])) {
            $visited[$taskId] = false;
        }
        
        if (!isset($recursionStack[$taskId])) {
            $recursionStack[$taskId] = false;
        }
        
        if ($recursionStack[$taskId]) {
            return true; // Cycle detected
        }
        
        if ($visited[$taskId]) {
            return false; // Already processed this node
        }
        
        $visited[$taskId] = true;
        $recursionStack[$taskId] = true;
        
        $dependencies = $graph[$taskId] ?? [];
        foreach ($dependencies as $depId) {
            if ($this->hasCycleFrom($depId, $graph, $visited, $recursionStack)) {
                return true;
            }
        }
        
        $recursionStack[$taskId] = false;
        
        return false;
    }

    /**
     * Calculate critical path through task tree
     * 
     * @param array $tasks Task array
     * @return array Task IDs on critical path
     */
    private function calculateCriticalPath(array $tasks): array
    {
        // Build task lookup and calculate longest path
        $taskMap = [];
        foreach ($tasks as $task) {
            $taskMap[$task['id']] = $task;
        }
        
        $longestPaths = [];
        
        // Calculate longest path to each task
        foreach ($tasks as $task) {
            $longestPaths[$task['id']] = $this->calculateLongestPath(
                $task['id'],
                $taskMap,
                $longestPaths
            );
        }
        
        // Find the path with maximum total effort
        $maxPath = [];
        $maxEffort = 0;
        
        foreach ($longestPaths as $taskId => $pathData) {
            if ($pathData['effort'] > $maxEffort) {
                $maxEffort = $pathData['effort'];
                $maxPath = $pathData['path'];
            }
        }
        
        return $maxPath;
    }

    /**
     * Calculate longest path to a task (recursive with memoization)
     * 
     * @param string $taskId Task ID
     * @param array $taskMap Task lookup map
     * @param array $memo Memoization cache
     * @return array Path data (effort, path)
     */
    private function calculateLongestPath(
        string $taskId,
        array $taskMap,
        array &$memo = []
    ): array {
        // Prevent infinite recursion on cycles
        static $processing = [];
        
        if (isset($processing[$taskId])) {
            // Cycle detected, return empty path
            return ['effort' => 0, 'path' => []];
        }
        
        if (isset($memo[$taskId])) {
            return $memo[$taskId];
        }
        
        $processing[$taskId] = true;
        
        $task = $taskMap[$taskId] ?? null;
        if (!$task) {
            unset($processing[$taskId]);
            return ['effort' => 0, 'path' => []];
        }
        
        $taskEffort = $task['estimate_hours'] ?? 0;
        $dependencies = $task['dependencies'] ?? [];
        
        if (empty($dependencies)) {
            // Base case: no dependencies
            $result = [
                'effort' => $taskEffort,
                'path' => [$taskId],
            ];
        } else {
            // Find longest path through dependencies
            $maxDependencyPath = ['effort' => 0, 'path' => []];
            
            foreach ($dependencies as $depId) {
                $depPath = $this->calculateLongestPath($depId, $taskMap, $memo);
                if ($depPath['effort'] > $maxDependencyPath['effort']) {
                    $maxDependencyPath = $depPath;
                }
            }
            
            $result = [
                'effort' => $taskEffort + $maxDependencyPath['effort'],
                'path' => array_merge($maxDependencyPath['path'], [$taskId]),
            ];
        }
        
        $memo[$taskId] = $result;
        unset($processing[$taskId]);
        return $result;
    }

    /**
     * Get priority breakdown statistics
     * 
     * @param array $tasks Task array
     * @return array Priority counts
     */
    private function getPriorityBreakdown(array $tasks): array
    {
        $breakdown = [
            'critical' => 0,
            'high' => 0,
            'medium' => 0,
            'low' => 0,
        ];
        
        foreach ($tasks as $task) {
            $priority = $task['priority'] ?? 'medium';
            if (isset($breakdown[$priority])) {
                $breakdown[$priority]++;
            }
        }
        
        return $breakdown;
    }
}
