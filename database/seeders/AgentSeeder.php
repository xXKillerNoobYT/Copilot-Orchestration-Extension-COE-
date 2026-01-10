<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Agent;

class AgentSeeder extends Seeder
{
    public function run(): void
    {
        $agents = [
            [
                'name' => 'Planner',
                'type' => 'planner',
                'description' => 'Plans and breaks down user requirements into actionable tasks with dependencies',
                'capabilities' => ['requirement_analysis', 'task_decomposition', 'dependency_mapping', 'user_interaction'],
                'configuration' => ['detail_level' => 'adaptive', 'interactive' => true],
                'llm_provider' => 'copilot',
                'is_active' => true,
            ],
            [
                'name' => 'Architect',
                'type' => 'architect',
                'description' => 'Designs system architecture, enforces architectural patterns, and maintains architecture documentation',
                'capabilities' => ['architecture_design', 'pattern_enforcement', 'documentation', 'decision_tracking'],
                'configuration' => ['enforce_boundaries' => true, 'track_decisions' => true],
                'llm_provider' => 'copilot',
                'is_active' => true,
            ],
            [
                'name' => 'Coder',
                'type' => 'coder',
                'description' => 'Handles all code implementation, file editing, and repository operations via GitHub Copilot',
                'capabilities' => ['code_generation', 'file_editing', 'refactoring', 'repository_operations'],
                'configuration' => ['use_copilot' => true, 'context_scoped' => true],
                'llm_provider' => 'copilot',
                'is_active' => true,
            ],
            [
                'name' => 'Tester',
                'type' => 'tester',
                'description' => 'Generates and runs tests, validates functionality, and ensures quality gates',
                'capabilities' => ['test_generation', 'test_execution', 'coverage_analysis', 'quality_validation'],
                'configuration' => ['auto_run' => true, 'coverage_threshold' => 80],
                'llm_provider' => 'copilot',
                'is_active' => true,
            ],
            [
                'name' => 'Reviewer',
                'type' => 'reviewer',
                'description' => 'Reviews code, validates task completion, and enforces code quality standards',
                'capabilities' => ['code_review', 'completion_verification', 'quality_checks', 'github_integration'],
                'configuration' => ['auto_approve' => false, 'strict_mode' => true],
                'llm_provider' => 'copilot',
                'is_active' => true,
            ],
            [
                'name' => 'Documentation',
                'type' => 'documentation',
                'description' => 'Maintains documentation, generates API docs, and keeps architecture documents up to date',
                'capabilities' => ['doc_generation', 'api_documentation', 'architecture_docs', 'changelog_management'],
                'configuration' => ['auto_update' => true, 'format' => 'markdown'],
                'llm_provider' => 'copilot',
                'is_active' => true,
            ],
            [
                'name' => 'Deployment',
                'type' => 'deployment',
                'description' => 'Manages CI/CD pipelines, deployment processes, and release coordination',
                'capabilities' => ['ci_cd_management', 'deployment_orchestration', 'release_management', 'rollback_handling'],
                'configuration' => ['auto_deploy' => false, 'environments' => ['dev', 'staging', 'production']],
                'llm_provider' => 'copilot',
                'is_active' => true,
            ],
            [
                'name' => 'Maintenance',
                'type' => 'maintenance',
                'description' => 'Monitors health, detects drift, updates dependencies, and handles technical debt',
                'capabilities' => ['health_monitoring', 'dependency_updates', 'drift_detection', 'debt_tracking'],
                'configuration' => ['auto_update_deps' => false, 'alert_threshold' => 'medium'],
                'llm_provider' => 'copilot',
                'is_active' => true,
            ],
        ];

        foreach ($agents as $agentData) {
            Agent::create($agentData);
        }
    }
}
