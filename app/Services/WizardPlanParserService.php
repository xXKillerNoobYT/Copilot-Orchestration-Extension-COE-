<?php

namespace App\Services;

use Illuminate\Support\Collection;
use InvalidArgumentException;

/**
 * Parser for wizard-generated plan.json files
 * 
 * Extracts features, timeline, team structure, and architecture decisions
 * from the Plan Builder wizard output for task decomposition.
 */
class WizardPlanParserService
{
    /**
     * Parse plan.json file and return structured data
     * 
     * @param string $planPath Path to plan.json file
     * @return array Parsed plan data
     * @throws InvalidArgumentException If file not found or invalid JSON
     */
    public function parsePlanFile(string $planPath): array
    {
        if (!file_exists($planPath)) {
            throw new InvalidArgumentException("Plan file not found: {$planPath}");
        }

        $content = file_get_contents($planPath);
        $plan = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new InvalidArgumentException("Invalid JSON in plan file: " . json_last_error_msg());
        }

        if (!is_array($plan) || array_keys($plan) === range(0, count($plan) - 1)) {
            throw new InvalidArgumentException("Plan file must contain a JSON object");
        }

        return $plan;
    }

    /**
     * Extract features list with descriptions and priorities
     * 
     * @param array $plan Parsed plan data
     * @return Collection Collection of feature objects
     */
    public function extractFeatures(array $plan): Collection
    {
        $features = $plan['features'] ?? [];
        
        if (!is_array($features)) {
            return collect([]);
        }

        return collect($features)->map(function ($feature) {
            return [
                'id' => $feature['id'] ?? null,
                'name' => $feature['name'] ?? 'Unnamed Feature',
                'description' => $feature['description'] ?? '',
                'priority' => $feature['priority'] ?? 'medium',
                'dependencies' => $feature['dependencies'] ?? [],
                'status' => $feature['status'] ?? 'pending',
            ];
        });
    }

    /**
     * Extract timeline milestones and deadlines
     * 
     * @param array $plan Parsed plan data
     * @return array Array of timeline entries
     */
    public function extractTimeline(array $plan): array
    {
        $timeline = $plan['timeline'] ?? [];
        
        if (!is_array($timeline)) {
            return [];
        }

        return array_map(function ($entry) {
            return [
                'milestone' => $entry['milestone'] ?? 'Unnamed Milestone',
                'date' => $entry['date'] ?? null,
                'phase' => $entry['phase'] ?? null,
                'description' => $entry['description'] ?? '',
            ];
        }, $timeline);
    }

    /**
     * Extract architecture pattern and constraints
     * 
     * @param array $plan Parsed plan data
     * @return array Architecture details
     */
    public function extractArchitecture(array $plan): array
    {
        $architecture = $plan['architecture'] ?? 'mvc';
        
        return [
            'pattern' => is_string($architecture) ? $architecture : ($architecture['pattern'] ?? 'mvc'),
            'constraints' => $plan['constraints'] ?? [],
            'tech_stack' => $plan['techStack'] ?? [],
            'integrations' => $plan['integrations'] ?? [],
        ];
    }

    /**
     * Extract team roles and skill requirements
     * 
     * @param array $plan Parsed plan data
     * @return array Team structure
     */
    public function extractTeam(array $plan): array
    {
        $team = $plan['team'] ?? [];
        
        if (!is_array($team)) {
            return [];
        }

        return array_map(function ($member) {
            return [
                'role' => $member['role'] ?? 'Developer',
                'skills' => $member['skills'] ?? [],
                'agent' => $member['agent'] ?? null,
                'responsibilities' => $member['responsibilities'] ?? [],
            ];
        }, $team);
    }

    /**
     * Extract all plan metadata
     * 
     * @param array $plan Parsed plan data
     * @return array Metadata including project name, description, etc.
     */
    public function extractMetadata(array $plan): array
    {
        return [
            'project_name' => $plan['projectName'] ?? 'Unnamed Project',
            'description' => $plan['description'] ?? '',
            'created_at' => $plan['createdAt'] ?? null,
            'version' => $plan['version'] ?? '1.0',
            'wizard_version' => $plan['wizardVersion'] ?? null,
        ];
    }

    /**
     * Get normalized plan structure ready for task generation
     * 
     * @param string $planPath Path to plan.json file
     * @return array Complete normalized plan data
     */
    public function getNormalizedPlan(string $planPath): array
    {
        $plan = $this->parsePlanFile($planPath);
        
        return [
            'metadata' => $this->extractMetadata($plan),
            'features' => $this->extractFeatures($plan),
            'timeline' => $this->extractTimeline($plan),
            'architecture' => $this->extractArchitecture($plan),
            'team' => $this->extractTeam($plan),
            'raw' => $plan,
        ];
    }
}
