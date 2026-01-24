import { validateAgentProfile } from '../agentProfileValidator';

describe('Agent Profile Validator', () => {
	test('valid agent profile', () => {
		const profile = {
			version: 1,
			name: 'John Doe',
			email: 'john.doe@example.com',
			role: 'agent',
			description: 'Test agent',
			instructions: 'Follow the plan',
		};
		const result = validateAgentProfile(profile);
		expect(result.valid).toBe(true);
		expect(result.score).toBeGreaterThanOrEqual(70);
	});

	test('invalid agent profile - missing name', () => {
		const profile = {
			version: 1,
			email: 'john.doe@example.com',
			role: 'agent',
		};
		const result = validateAgentProfile(profile);
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.field === 'name')).toBe(true);
	});

	test('invalid agent profile - missing role', () => {
		const profile = {
			version: 1,
			name: 'John Doe',
			email: 'john.doe@example.com',
		};
		const result = validateAgentProfile(profile);
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.field === 'role')).toBe(true);
	});

	test('invalid agent profile - missing version', () => {
		const profile = {
			name: 'John Doe',
			email: 'john.doe@example.com',
			role: 'agent',
		};
		const result = validateAgentProfile(profile);
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.field === 'version')).toBe(true);
	});
});