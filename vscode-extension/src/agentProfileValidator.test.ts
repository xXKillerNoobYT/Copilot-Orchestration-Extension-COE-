/**
 * Agent Profile Validator Tests
 * 
 * Tests for profile validation logic and error reporting
 * 
 * @author Auto Zen Agent
 * @date 2026-01-18
 */

import { AgentProfileValidator, validateAgentProfile, formatValidationResult } from '../agentProfileValidator';
import { AgentProfile } from '../agentProfiles';

describe('AgentProfileValidator', () => {
    let validator: AgentProfileValidator;

    beforeEach(() => {
        validator = new AgentProfileValidator();
    });

    describe('Required Fields Validation', () => {
        it('should pass validation for valid minimal profile', () => {
            const profile: AgentProfile = {
                version: 1,
                name: 'TestAgent',
                role: 'tester',
            };

            const result = validator.validate(profile);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should fail when version is missing', () => {
            const profile: any = {
                name: 'TestAgent',
                role: 'tester',
            };

            const result = validator.validate(profile);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.some((e) => e.field === 'version')).toBe(true);
        });

        it('should fail when name is missing', () => {
            const profile: any = {
                version: 1,
                role: 'tester',
            };

            const result = validator.validate(profile);

            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.field === 'name')).toBe(true);
        });

        it('should fail when role is missing', () => {
            const profile: any = {
                version: 1,
                name: 'TestAgent',
            };

            const result = validator.validate(profile);

            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.field === 'role')).toBe(true);
        });
    });

    describe('Type Validation', () => {
        it('should fail when version is not a number', () => {
            const profile: any = {
                version: '1',
                name: 'TestAgent',
                role: 'tester',
            };

            const result = validator.validate(profile);

            expect(result.errors.some((e) => e.field === 'version')).toBe(true);
        });

        it('should fail when name is not a string', () => {
            const profile: any = {
                version: 1,
                name: 123,
                role: 'tester',
            };

            const result = validator.validate(profile);

            expect(result.errors.some((e) => e.field === 'name')).toBe(true);
        });

        it('should warn when goals is not an array', () => {
            const profile: any = {
                version: 1,
                name: 'TestAgent',
                role: 'tester',
                goals: 'not an array',
            };

            const result = validator.validate(profile);

            expect(result.warnings.some((w) => w.field === 'goals')).toBe(true);
        });
    });

    describe('Tool Permissions Validation', () => {
        it('should validate known permissions', () => {
            const profile: AgentProfile = {
                version: 1,
                name: 'TestAgent',
                role: 'tester',
                tool_permissions: {
                    read_files: true,
                    write_files: false,
                    run_commands: false,
                    access_network: true,
                    modify_tasks: true,
                },
            };

            const result = validator.validate(profile);

            expect(result.valid).toBe(true);
        });

        it('should warn on unknown permissions', () => {
            const profile: any = {
                version: 1,
                name: 'TestAgent',
                role: 'tester',
                tool_permissions: {
                    unknown_permission: true,
                },
            };

            const result = validator.validate(profile);

            expect(result.warnings.some((w) => w.field.includes('unknown_permission'))).toBe(true);
        });

        it('should warn on overly permissive settings', () => {
            const profile: AgentProfile = {
                version: 1,
                name: 'TestAgent',
                role: 'tester',
                tool_permissions: {
                    read_files: true,
                    write_files: true,
                    run_commands: true,
                    access_network: true,
                    modify_tasks: true,
                },
            };

            const result = validator.validate(profile);

            expect(result.warnings.some((w) => w.field === 'tool_permissions')).toBe(true);
        });

        it('should warn when both run_commands and write_files enabled', () => {
            const profile: AgentProfile = {
                version: 1,
                name: 'TestAgent',
                role: 'tester',
                tool_permissions: {
                    run_commands: true,
                    write_files: true,
                },
            };

            const result = validator.validate(profile);

            expect(result.warnings.length).toBeGreaterThan(0);
        });
    });

    describe('Execution Constraints Validation', () => {
        it('should validate max_depth range', () => {
            const profile: AgentProfile = {
                version: 1,
                name: 'TestAgent',
                role: 'tester',
                execution_constraints: {
                    max_depth: 15, // Too high
                },
            };

            const result = validator.validate(profile);

            expect(result.warnings.some((w) => w.field.includes('max_depth'))).toBe(true);
        });

        it('should fail when max_depth is not a number', () => {
            const profile: any = {
                version: 1,
                name: 'TestAgent',
                role: 'tester',
                execution_constraints: {
                    max_depth: '5',
                },
            };

            const result = validator.validate(profile);

            expect(result.errors.some((e) => e.field.includes('max_depth'))).toBe(true);
        });

        it('should warn on high parallelism', () => {
            const profile: AgentProfile = {
                version: 1,
                name: 'TestAgent',
                role: 'tester',
                execution_constraints: {
                    max_parallel_actions: 20, // Too high
                },
            };

            const result = validator.validate(profile);

            expect(result.warnings.some((w) => w.field.includes('max_parallel_actions'))).toBe(true);
        });
    });

    describe('Quality Score', () => {
        it('should score 100 for complete profile', () => {
            const profile: AgentProfile = {
                version: 1,
                name: 'TestAgent',
                role: 'tester',
                description: 'A test agent for validation',
                instructions: 'Follow test-driven development',
                goals: ['Write comprehensive tests', 'Ensure code quality'],
                anti_goals: ['Skip testing', 'Ignore errors'],
                tool_permissions: {
                    read_files: true,
                    write_files: true,
                },
                execution_constraints: {
                    max_depth: 5,
                    require_tests_for_changes: true,
                },
                prompt_templates: {
                    system: 'You are a testing agent',
                },
            };

            const result = validator.validate(profile);

            expect(result.score).toBeGreaterThan(90);
        });

        it('should score lower for minimal profile', () => {
            const profile: AgentProfile = {
                version: 1,
                name: 'TestAgent',
                role: 'tester',
            };

            const result = validator.validate(profile);

            expect(result.score).toBeLessThan(80);
        });

        it('should penalize errors heavily', () => {
            const profile: any = {
                version: '1', // Wrong type
                name: 'TestAgent',
                role: 'tester',
            };

            const result = validator.validate(profile);

            expect(result.score).toBeLessThan(80);
        });
    });

    describe('Best Practices', () => {
        it('should suggest adding description', () => {
            const profile: AgentProfile = {
                version: 1,
                name: 'TestAgent',
                role: 'tester',
            };

            const result = validator.validate(profile);

            expect(result.info.some((i) => i.field === 'description')).toBe(true);
        });

        it('should suggest adding anti-goals when goals exist', () => {
            const profile: AgentProfile = {
                version: 1,
                name: 'TestAgent',
                role: 'tester',
                goals: ['Test everything'],
            };

            const result = validator.validate(profile);

            expect(result.info.some((i) => i.field === 'anti_goals')).toBe(true);
        });
    });

    describe('Helper Functions', () => {
        it('should format validation result as string', () => {
            const profile: AgentProfile = {
                version: 1,
                name: 'TestAgent',
                role: 'tester',
            };

            const result = validateAgentProfile(profile);
            const formatted = formatValidationResult(result);

            expect(formatted).toContain('Validation Score');
            expect(formatted).toContain('Status');
        });

        it('should include suggestions in formatted output', () => {
            const profile: any = {
                version: '1', // Error
                name: 'TestAgent',
                role: 'tester',
            };

            const result = validateAgentProfile(profile);
            const formatted = formatValidationResult(result);

            expect(formatted).toContain('💡');
        });
    });

    describe('Edge Cases', () => {
        it('should handle null profile', () => {
            const result = validator.validate(null);

            expect(result.valid).toBe(false);
            expect(result.score).toBe(0);
        });

        it('should handle undefined profile', () => {
            const result = validator.validate(undefined);

            expect(result.valid).toBe(false);
        });

        it('should handle empty object', () => {
            const result = validator.validate({});

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should handle profile with extra fields', () => {
            const profile: any = {
                version: 1,
                name: 'TestAgent',
                role: 'tester',
                extraField: 'extra value',
                anotherExtra: 123,
            };

            const result = validator.validate(profile);

            // Extra fields should be allowed (for extensibility)
            expect(result.valid).toBe(true);
        });
    });
});
