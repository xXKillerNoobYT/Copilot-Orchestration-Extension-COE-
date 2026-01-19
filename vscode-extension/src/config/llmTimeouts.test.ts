/**
 * Tests for LLM Timeout Configuration
 */

import { readLlmTimeoutConfig, calculateQueueWaitTime, getQueueWaitEstimate, LLM_TIMEOUT_DEFAULTS, LLM_TIMEOUT_RANGES } from '../config/llmTimeouts';

describe('LLM Timeout Configuration', () => {
    describe('readLlmTimeoutConfig', () => {
        it('should return default configuration when no settings provided', () => {
            const result = readLlmTimeoutConfig();

            expect(result.isValid).toBe(true);
            expect(result.issues).toHaveLength(0);
            expect(result.config.coldLoadMs).toBe(LLM_TIMEOUT_DEFAULTS.coldLoadMs);
            expect(result.config.modelSwitchMs).toBe(LLM_TIMEOUT_DEFAULTS.modelSwitchMs);
            expect(result.config.testConnectionMs).toBe(LLM_TIMEOUT_DEFAULTS.testConnectionMs);
            expect(result.config.requestMs).toBe(LLM_TIMEOUT_DEFAULTS.requestMs);
            expect(result.config.queuedResponseMs).toBe(LLM_TIMEOUT_DEFAULTS.queuedResponseMs);
            expect(result.config.agentActivationMs).toBe(LLM_TIMEOUT_DEFAULTS.agentActivationMs);
            expect(result.config.agentDeactivationMs).toBe(LLM_TIMEOUT_DEFAULTS.agentDeactivationMs);
            expect(result.config.maxQueueDepth).toBe(LLM_TIMEOUT_DEFAULTS.maxQueueDepth);
        });

        it('should accept valid custom timeouts', () => {
            const config = {
                get: (key: string) => {
                    switch (key) {
                        case 'copilot-orchestrator.llm.timeouts.coldLoadMs': return 1200000; // 20 minutes
                        case 'copilot-orchestrator.llm.timeouts.modelSwitchMs': return 1800000; // 30 minutes
                        case 'copilot-orchestrator.llm.timeouts.testConnectionMs': return 300000; // 5 minutes
                        case 'copilot-orchestrator.llm.timeouts.requestMs': return 60000; // 1 minute
                        case 'copilot-orchestrator.llm.timeouts.queuedResponseMs': return 1200000; // 20 minutes
                        case 'copilot-orchestrator.llm.timeouts.agentActivationMs': return 1800000; // 30 minutes
                        case 'copilot-orchestrator.llm.timeouts.agentDeactivationMs': return 600000; // 10 minutes
                        case 'copilot-orchestrator.llm.timeouts.maxQueueDepth': return 50;
                        default: return undefined;
                    }
                }
            };

            const result = readLlmTimeoutConfig({ configuration: config });

            expect(result.isValid).toBe(true);
            expect(result.config.coldLoadMs).toBe(1200000);
            expect(result.config.modelSwitchMs).toBe(1800000);
            expect(result.config.testConnectionMs).toBe(300000);
            expect(result.config.requestMs).toBe(60000);
            expect(result.config.queuedResponseMs).toBe(1200000);
            expect(result.config.agentActivationMs).toBe(1800000);
            expect(result.config.agentDeactivationMs).toBe(600000);
            expect(result.config.maxQueueDepth).toBe(50);
        });

        it('should clamp values below minimum', () => {
            const config = {
                get: (key: string) => {
                    switch (key) {
                        case 'copilot-orchestrator.llm.timeouts.coldLoadMs': return 1000; // Too low (min: 60000)
                        case 'copilot-orchestrator.llm.timeouts.testConnectionMs': return 5000; // Too low (min: 30000)
                        default: return undefined;
                    }
                }
            };

            const result = readLlmTimeoutConfig({ configuration: config });

            expect(result.isValid).toBe(false);
            expect(result.issues.length).toBeGreaterThan(0);
            expect(result.config.coldLoadMs).toBe(LLM_TIMEOUT_RANGES.coldLoad.min);
            expect(result.config.testConnectionMs).toBe(LLM_TIMEOUT_RANGES.testConnection.min);
        });

        it('should clamp values above maximum', () => {
            const config = {
                get: (key: string) => {
                    switch (key) {
                        case 'copilot-orchestrator.llm.timeouts.coldLoadMs': return 90000000; // Too high (max: 86400000 = 1 day)
                        case 'copilot-orchestrator.llm.timeouts.requestMs': return 400000; // Too high (max: 300000 = 5 minutes)
                        default: return undefined;
                    }
                }
            };

            const result = readLlmTimeoutConfig({ configuration: config });

            expect(result.isValid).toBe(false);
            expect(result.issues.length).toBeGreaterThan(0);
            expect(result.config.coldLoadMs).toBe(LLM_TIMEOUT_RANGES.coldLoad.max);
            expect(result.config.requestMs).toBe(LLM_TIMEOUT_RANGES.request.max);
        });

        it('should handle invalid number values', () => {
            const config = {
                get: (key: string) => {
                    switch (key) {
                        case 'copilot-orchestrator.llm.timeouts.coldLoadMs': return 'not a number' as any;
                        case 'copilot-orchestrator.llm.timeouts.maxQueueDepth': return NaN;
                        default: return undefined;
                    }
                }
            };

            const result = readLlmTimeoutConfig({ configuration: config });

            expect(result.isValid).toBe(false);
            expect(result.issues.some(i => i.includes('Invalid'))).toBe(true);
            expect(result.config.coldLoadMs).toBe(LLM_TIMEOUT_DEFAULTS.coldLoadMs);
            expect(result.config.maxQueueDepth).toBe(LLM_TIMEOUT_DEFAULTS.maxQueueDepth);
        });

        it('should validate queue depth range', () => {
            const config = {
                get: (key: string) => {
                    switch (key) {
                        case 'copilot-orchestrator.llm.timeouts.maxQueueDepth': return 150; // Too high (max: 100)
                        default: return undefined;
                    }
                }
            };

            const result = readLlmTimeoutConfig({ configuration: config });

            expect(result.isValid).toBe(false);
            expect(result.config.maxQueueDepth).toBe(LLM_TIMEOUT_RANGES.maxQueueDepth.max);
        });

        it('should floor queue depth to integer', () => {
            const config = {
                get: (key: string) => {
                    switch (key) {
                        case 'copilot-orchestrator.llm.timeouts.maxQueueDepth': return 25.7;
                        default: return undefined;
                    }
                }
            };

            const result = readLlmTimeoutConfig({ configuration: config });

            expect(result.isValid).toBe(true);
            expect(result.config.maxQueueDepth).toBe(25);
        });
    });

    describe('calculateQueueWaitTime', () => {
        it('should calculate total wait time for queued requests', () => {
            const queueDepth = 10;
            const responseTimeMs = 60000; // 1 minute

            const totalWait = calculateQueueWaitTime(queueDepth, responseTimeMs);

            expect(totalWait).toBe(600000); // 10 minutes
        });

        it('should return 0 for empty queue', () => {
            const totalWait = calculateQueueWaitTime(0, 60000);
            expect(totalWait).toBe(0);
        });

        it('should handle large queue depths', () => {
            const queueDepth = 100;
            const responseTimeMs = 900000; // 15 minutes

            const totalWait = calculateQueueWaitTime(queueDepth, responseTimeMs);

            expect(totalWait).toBe(90000000); // 25 hours
        });
    });

    describe('getQueueWaitEstimate', () => {
        it('should return "No queue" for empty queue', () => {
            const config = LLM_TIMEOUT_DEFAULTS;
            const estimate = getQueueWaitEstimate(0, config);

            expect(estimate).toBe('No queue');
        });

        it('should format hours and minutes for long waits', () => {
            const config = LLM_TIMEOUT_DEFAULTS;
            const queueDepth = 20;

            const estimate = getQueueWaitEstimate(queueDepth, config);

            expect(estimate).toContain('h');
            expect(estimate).toContain('m');
            expect(estimate).toContain('20 requests');
        });

        it('should format minutes for medium waits', () => {
            const config = { ...LLM_TIMEOUT_DEFAULTS, queuedResponseMs: 120000 }; // 2 minutes
            const queueDepth = 10;

            const estimate = getQueueWaitEstimate(queueDepth, config);

            expect(estimate).toContain('minutes');
            expect(estimate).toContain('10 requests');
        });

        it('should format seconds for short waits', () => {
            const config = { ...LLM_TIMEOUT_DEFAULTS, queuedResponseMs: 5000 }; // 5 seconds
            const queueDepth = 3;

            const estimate = getQueueWaitEstimate(queueDepth, config);

            expect(estimate).toContain('seconds');
        });
    });

    describe('Timeout Ranges', () => {
        it('should have valid range definitions', () => {
            expect(LLM_TIMEOUT_RANGES.coldLoad.min).toBeGreaterThan(0);
            expect(LLM_TIMEOUT_RANGES.coldLoad.max).toBeGreaterThan(LLM_TIMEOUT_RANGES.coldLoad.min);

            expect(LLM_TIMEOUT_RANGES.modelSwitch.min).toBeGreaterThan(0);
            expect(LLM_TIMEOUT_RANGES.modelSwitch.max).toBeGreaterThan(LLM_TIMEOUT_RANGES.modelSwitch.min);

            expect(LLM_TIMEOUT_RANGES.testConnection.min).toBeGreaterThan(0);
            expect(LLM_TIMEOUT_RANGES.testConnection.max).toBeGreaterThan(LLM_TIMEOUT_RANGES.testConnection.min);

            expect(LLM_TIMEOUT_RANGES.request.min).toBeGreaterThan(0);
            expect(LLM_TIMEOUT_RANGES.request.max).toBeGreaterThan(LLM_TIMEOUT_RANGES.request.min);

            expect(LLM_TIMEOUT_RANGES.queuedResponse.min).toBeGreaterThan(0);
            expect(LLM_TIMEOUT_RANGES.queuedResponse.max).toBeGreaterThan(LLM_TIMEOUT_RANGES.queuedResponse.min);

            expect(LLM_TIMEOUT_RANGES.agentActivation.min).toBeGreaterThan(0);
            expect(LLM_TIMEOUT_RANGES.agentActivation.max).toBeGreaterThan(LLM_TIMEOUT_RANGES.agentActivation.min);

            expect(LLM_TIMEOUT_RANGES.agentDeactivation.min).toBeGreaterThan(0);
            expect(LLM_TIMEOUT_RANGES.agentDeactivation.max).toBeGreaterThan(LLM_TIMEOUT_RANGES.agentDeactivation.min);

            expect(LLM_TIMEOUT_RANGES.maxQueueDepth.min).toBe(1);
            expect(LLM_TIMEOUT_RANGES.maxQueueDepth.max).toBeGreaterThan(LLM_TIMEOUT_RANGES.maxQueueDepth.min);
        });

        it('should have defaults within ranges', () => {
            expect(LLM_TIMEOUT_DEFAULTS.coldLoadMs).toBeGreaterThanOrEqual(LLM_TIMEOUT_RANGES.coldLoad.min);
            expect(LLM_TIMEOUT_DEFAULTS.coldLoadMs).toBeLessThanOrEqual(LLM_TIMEOUT_RANGES.coldLoad.max);

            expect(LLM_TIMEOUT_DEFAULTS.modelSwitchMs).toBeGreaterThanOrEqual(LLM_TIMEOUT_RANGES.modelSwitch.min);
            expect(LLM_TIMEOUT_DEFAULTS.modelSwitchMs).toBeLessThanOrEqual(LLM_TIMEOUT_RANGES.modelSwitch.max);

            expect(LLM_TIMEOUT_DEFAULTS.testConnectionMs).toBeGreaterThanOrEqual(LLM_TIMEOUT_RANGES.testConnection.min);
            expect(LLM_TIMEOUT_DEFAULTS.testConnectionMs).toBeLessThanOrEqual(LLM_TIMEOUT_RANGES.testConnection.max);

            expect(LLM_TIMEOUT_DEFAULTS.requestMs).toBeGreaterThanOrEqual(LLM_TIMEOUT_RANGES.request.min);
            expect(LLM_TIMEOUT_DEFAULTS.requestMs).toBeLessThanOrEqual(LLM_TIMEOUT_RANGES.request.max);

            expect(LLM_TIMEOUT_DEFAULTS.queuedResponseMs).toBeGreaterThanOrEqual(LLM_TIMEOUT_RANGES.queuedResponse.min);
            expect(LLM_TIMEOUT_DEFAULTS.queuedResponseMs).toBeLessThanOrEqual(LLM_TIMEOUT_RANGES.queuedResponse.max);

            expect(LLM_TIMEOUT_DEFAULTS.agentActivationMs).toBeGreaterThanOrEqual(LLM_TIMEOUT_RANGES.agentActivation.min);
            expect(LLM_TIMEOUT_DEFAULTS.agentActivationMs).toBeLessThanOrEqual(LLM_TIMEOUT_RANGES.agentActivation.max);

            expect(LLM_TIMEOUT_DEFAULTS.agentDeactivationMs).toBeGreaterThanOrEqual(LLM_TIMEOUT_RANGES.agentDeactivation.min);
            expect(LLM_TIMEOUT_DEFAULTS.agentDeactivationMs).toBeLessThanOrEqual(LLM_TIMEOUT_RANGES.agentDeactivation.max);

            expect(LLM_TIMEOUT_DEFAULTS.maxQueueDepth).toBeGreaterThanOrEqual(LLM_TIMEOUT_RANGES.maxQueueDepth.min);
            expect(LLM_TIMEOUT_DEFAULTS.maxQueueDepth).toBeLessThanOrEqual(LLM_TIMEOUT_RANGES.maxQueueDepth.max);
        });
    });

    describe('Default Values', () => {
        it('should have sensible default values for slow systems', () => {
            // Cold load: 10 minutes
            expect(LLM_TIMEOUT_DEFAULTS.coldLoadMs).toBe(600000);

            // Model switch: 15 minutes
            expect(LLM_TIMEOUT_DEFAULTS.modelSwitchMs).toBe(900000);

            // Test connection: 2 minutes
            expect(LLM_TIMEOUT_DEFAULTS.testConnectionMs).toBe(120000);

            // Standard request: 30 seconds
            expect(LLM_TIMEOUT_DEFAULTS.requestMs).toBe(30000);

            // Queued response: 15 minutes
            expect(LLM_TIMEOUT_DEFAULTS.queuedResponseMs).toBe(900000);

            // Agent activation: 15 minutes
            expect(LLM_TIMEOUT_DEFAULTS.agentActivationMs).toBe(900000);

            // Agent deactivation: 5 minutes
            expect(LLM_TIMEOUT_DEFAULTS.agentDeactivationMs).toBe(300000);

            // Max queue depth: 20
            expect(LLM_TIMEOUT_DEFAULTS.maxQueueDepth).toBe(20);
        });
    });
});
