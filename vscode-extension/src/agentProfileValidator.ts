/**
 * Agent Profile Validator
 * 
 * Enhanced validation for agent profiles with detailed error reporting,
 * schema validation, and best-practice checks.
 * 
 * @author Auto Zen Agent
 * @date 2026-01-18
 */

import { AgentProfile } from './agentProfiles';

export interface ValidationError {
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    suggestion?: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
    info: ValidationError[];
    score: number; // 0-100, quality score
}

/**
 * AgentProfileValidator - Comprehensive profile validation
 * 
 * Features:
 * - Schema validation (required fields, types)
 * - Best-practice checks
 * - Security validation (permissions)
 * - Consistency checks (goals vs anti-goals)
 * - Template validation
 */
export class AgentProfileValidator {
    private static readonly REQUIRED_FIELDS = ['version', 'name', 'role'];
    private static readonly OPTIONAL_FIELDS = [
        'description',
        'instructions',
        'goals',
        'anti_goals',
        'tool_permissions',
        'execution_constraints',
        'prompt_templates',
        'defaults',
    ];

    /**
     * Validate agent profile comprehensively
     */
    public validate(profile: any): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationError[] = [];
        const info: ValidationError[] = [];

        // Basic structure validation
        if (!profile || typeof profile !== 'object') {
            errors.push({
                field: 'root',
                message: 'Profile must be a valid object',
                severity: 'error',
            });
            return { valid: false, errors, warnings, info, score: 0 };
        }

        // Required fields validation
        for (const field of AgentProfileValidator.REQUIRED_FIELDS) {
            if (!profile[field]) {
                errors.push({
                    field,
                    message: `Required field '${field}' is missing`,
                    severity: 'error',
                    suggestion: `Add ${field} to your profile YAML`,
                });
            }
        }

        // Type validation
        if (profile.version !== undefined && typeof profile.version !== 'number') {
            errors.push({
                field: 'version',
                message: 'Version must be a number',
                severity: 'error',
                suggestion: 'Use: version: 1',
            });
        }

        if (profile.name !== undefined && typeof profile.name !== 'string') {
            errors.push({
                field: 'name',
                message: 'Name must be a string',
                severity: 'error',
            });
        }

        if (profile.role !== undefined && typeof profile.role !== 'string') {
            errors.push({
                field: 'role',
                message: 'Role must be a string',
                severity: 'error',
            });
        }

        // Goals validation
        if (profile.goals !== undefined) {
            if (!Array.isArray(profile.goals)) {
                warnings.push({
                    field: 'goals',
                    message: 'Goals should be an array of strings',
                    severity: 'warning',
                });
            } else if (profile.goals.length === 0) {
                info.push({
                    field: 'goals',
                    message: 'No goals defined for this agent',
                    severity: 'info',
                    suggestion: 'Add goals to guide agent behavior',
                });
            }
        }

        // Anti-goals validation
        if (profile.anti_goals !== undefined && !Array.isArray(profile.anti_goals)) {
            warnings.push({
                field: 'anti_goals',
                message: 'Anti-goals should be an array of strings',
                severity: 'warning',
            });
        }

        // Tool permissions validation
        if (profile.tool_permissions) {
            this.validateToolPermissions(profile.tool_permissions, warnings, info);
        }

        // Execution constraints validation
        if (profile.execution_constraints) {
            this.validateExecutionConstraints(profile.execution_constraints, warnings, errors);
        }

        // Prompt templates validation
        if (profile.prompt_templates) {
            this.validatePromptTemplates(profile.prompt_templates, warnings, info);
        }

        // Best-practice checks
        this.checkBestPractices(profile, warnings, info);

        // Calculate quality score
        const score = this.calculateQualityScore(profile, errors, warnings);

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            info,
            score,
        };
    }

    /**
     * Validate tool permissions
     */
    private validateToolPermissions(
        permissions: any,
        warnings: ValidationError[],
        info: ValidationError[]
    ): void {
        const knownPermissions = [
            'read_files',
            'write_files',
            'run_commands',
            'access_network',
            'modify_tasks',
        ];

        for (const key of Object.keys(permissions)) {
            if (!knownPermissions.includes(key)) {
                warnings.push({
                    field: `tool_permissions.${key}`,
                    message: `Unknown permission '${key}'`,
                    severity: 'warning',
                    suggestion: `Valid permissions: ${knownPermissions.join(', ')}`,
                });
            }

            if (typeof permissions[key] !== 'boolean') {
                warnings.push({
                    field: `tool_permissions.${key}`,
                    message: `Permission '${key}' should be boolean`,
                    severity: 'warning',
                });
            }
        }

        // Security warnings
        if (permissions.run_commands === true && permissions.write_files === true) {
            warnings.push({
                field: 'tool_permissions',
                message: 'Agent has both run_commands and write_files enabled',
                severity: 'warning',
                suggestion: 'Consider limiting permissions for security',
            });
        }

        if (permissions.access_network === true) {
            info.push({
                field: 'tool_permissions.access_network',
                message: 'Agent can access network - ensure proper security',
                severity: 'info',
            });
        }
    }

    /**
     * Validate execution constraints
     */
    private validateExecutionConstraints(
        constraints: any,
        warnings: ValidationError[],
        errors: ValidationError[]
    ): void {
        if (constraints.max_depth !== undefined) {
            if (typeof constraints.max_depth !== 'number') {
                errors.push({
                    field: 'execution_constraints.max_depth',
                    message: 'max_depth must be a number',
                    severity: 'error',
                });
            } else if (constraints.max_depth < 1 || constraints.max_depth > 10) {
                warnings.push({
                    field: 'execution_constraints.max_depth',
                    message: 'max_depth should be between 1 and 10',
                    severity: 'warning',
                    suggestion: 'Recommended: 3-5 for most agents',
                });
            }
        }

        if (constraints.max_parallel_actions !== undefined) {
            if (typeof constraints.max_parallel_actions !== 'number') {
                errors.push({
                    field: 'execution_constraints.max_parallel_actions',
                    message: 'max_parallel_actions must be a number',
                    severity: 'error',
                });
            } else if (constraints.max_parallel_actions > 10) {
                warnings.push({
                    field: 'execution_constraints.max_parallel_actions',
                    message: 'High parallelism may cause performance issues',
                    severity: 'warning',
                    suggestion: 'Recommended: 1-5 parallel actions',
                });
            }
        }

        // Check boolean constraints
        const booleanConstraints = [
            'require_plan_before_action',
            'require_context_review',
            'require_tests_for_changes',
            'require_explicit_confirmation_for_commands',
            'approval_required_for_changes',
            'approval_required_for_schema_changes',
        ];

        for (const key of booleanConstraints) {
            if (constraints[key] !== undefined && typeof constraints[key] !== 'boolean') {
                warnings.push({
                    field: `execution_constraints.${key}`,
                    message: `${key} should be boolean`,
                    severity: 'warning',
                });
            }
        }
    }

    /**
     * Validate prompt templates
     */
    private validatePromptTemplates(
        templates: any,
        warnings: ValidationError[],
        info: ValidationError[]
    ): void {
        const knownTemplates = [
            'system',
            'planning',
            'recap',
            'adr',
            'review',
            'plan',
            'summary',
            'report',
            'checklist',
            'announce',
        ];

        for (const key of Object.keys(templates)) {
            if (!knownTemplates.includes(key)) {
                info.push({
                    field: `prompt_templates.${key}`,
                    message: `Custom template '${key}' detected`,
                    severity: 'info',
                });
            }

            if (typeof templates[key] !== 'string') {
                warnings.push({
                    field: `prompt_templates.${key}`,
                    message: `Template '${key}' should be a string`,
                    severity: 'warning',
                });
            } else if (templates[key].length === 0) {
                warnings.push({
                    field: `prompt_templates.${key}`,
                    message: `Template '${key}' is empty`,
                    severity: 'warning',
                });
            }
        }
    }

    /**
     * Check best practices
     */
    private checkBestPractices(
        profile: any,
        warnings: ValidationError[],
        info: ValidationError[]
    ): void {
        // Check for description
        if (!profile.description || profile.description.trim().length === 0) {
            info.push({
                field: 'description',
                message: 'Consider adding a description for better documentation',
                severity: 'info',
            });
        }

        // Check for instructions
        if (!profile.instructions || profile.instructions.trim().length === 0) {
            info.push({
                field: 'instructions',
                message: 'Consider adding instructions to guide agent behavior',
                severity: 'info',
            });
        }

        // Check goals/anti-goals balance
        const hasGoals = profile.goals && Array.isArray(profile.goals) && profile.goals.length > 0;
        const hasAntiGoals =
            profile.anti_goals && Array.isArray(profile.anti_goals) && profile.anti_goals.length > 0;

        if (hasGoals && !hasAntiGoals) {
            info.push({
                field: 'anti_goals',
                message: 'Consider adding anti-goals to clarify boundaries',
                severity: 'info',
            });
        }

        // Check for overly permissive settings
        if (
            profile.tool_permissions &&
            Object.values(profile.tool_permissions).every((v) => v === true)
        ) {
            warnings.push({
                field: 'tool_permissions',
                message: 'All permissions enabled - consider principle of least privilege',
                severity: 'warning',
                suggestion: 'Enable only required permissions',
            });
        }

        // Check version
        if (profile.version && profile.version < 1) {
            warnings.push({
                field: 'version',
                message: 'Version should be >= 1',
                severity: 'warning',
            });
        }
    }

    /**
     * Calculate quality score (0-100)
     */
    private calculateQualityScore(
        profile: any,
        errors: ValidationError[],
        warnings: ValidationError[]
    ): number {
        let score = 100;

        // Deduct for errors
        score -= errors.length * 20;

        // Deduct for warnings
        score -= warnings.length * 5;

        // Bonus for optional fields
        const hasDescription = profile.description && profile.description.trim().length > 0;
        const hasInstructions = profile.instructions && profile.instructions.trim().length > 0;
        const hasGoals = profile.goals && Array.isArray(profile.goals) && profile.goals.length > 0;
        const hasAntiGoals =
            profile.anti_goals && Array.isArray(profile.anti_goals) && profile.anti_goals.length > 0;
        const hasPermissions = profile.tool_permissions && Object.keys(profile.tool_permissions).length > 0;
        const hasConstraints =
            profile.execution_constraints && Object.keys(profile.execution_constraints).length > 0;

        if (!hasDescription) score -= 5;
        if (!hasInstructions) score -= 5;
        if (!hasGoals) score -= 5;
        if (!hasAntiGoals) score -= 3;
        if (!hasPermissions) score -= 5;
        if (!hasConstraints) score -= 5;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Handle profile file change (create or modify)
     */
    private async handleProfileChange(
        uri: vscode.Uri,
        changeType: 'created' | 'modified'
    ): Promise<void> {
        try {
            // Extract profile name from filename
            const fileName = path.basename(uri.fsPath, path.extname(uri.fsPath));

            // Reload the specific profile
            const profile = await defaultAgentProfileLoader.loadProfile(fileName);

            if (!profile) {
                throw new Error(`Failed to load profile from ${uri.fsPath}`);
            }

            // Update cache
            this.profiles.set(profile.name.toLowerCase(), profile);

            // Notify callbacks
            const event: ProfileChangeEvent = {
                profileName: profile.name,
                profile,
                changeType,
                timestamp: new Date(),
            };

            this.notifyCallbacks(event);

            // Show notification
            vscode.window.showInformationMessage(
                `✓ Agent profile '${profile.name}' ${changeType === 'created' ? 'created' : 'reloaded'}`
            );
        } catch (error) {
            console.error(`[AgentProfileWatcher] Failed to handle ${changeType}:`, error);
            vscode.window.showErrorMessage(
                `Failed to ${changeType === 'created' ? 'create' : 'reload'} agent profile: ${error}`
            );
        }
    }
}

/**
 * Quick validation function for use in code
 */
export function validateAgentProfile(profile: AgentProfile): ValidationResult {
    const validator = new AgentProfileValidator();
    return validator.validate(profile);
}

/**
 * Format validation result as human-readable string
 */
export function formatValidationResult(result: ValidationResult): string {
    const lines: string[] = [];

    lines.push(`Validation Score: ${result.score}/100`);
    lines.push(`Status: ${result.valid ? '✓ Valid' : '✗ Invalid'}`);
    lines.push('');

    if (result.errors.length > 0) {
        lines.push('❌ Errors:');
        for (const error of result.errors) {
            lines.push(`  - ${error.field}: ${error.message}`);
            if (error.suggestion) {
                lines.push(`    💡 ${error.suggestion}`);
            }
        }
        lines.push('');
    }

    if (result.warnings.length > 0) {
        lines.push('⚠️ Warnings:');
        for (const warning of result.warnings) {
            lines.push(`  - ${warning.field}: ${warning.message}`);
            if (warning.suggestion) {
                lines.push(`    💡 ${warning.suggestion}`);
            }
        }
        lines.push('');
    }

    if (result.info.length > 0) {
        lines.push('ℹ️ Info:');
        for (const infoItem of result.info) {
            lines.push(`  - ${infoItem.field}: ${infoItem.message}`);
            if (infoItem.suggestion) {
                lines.push(`    💡 ${infoItem.suggestion}`);
            }
        }
    }

    return lines.join('\n');
}
