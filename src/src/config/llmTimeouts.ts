/**
 * LLM Loading Time Configuration
 * 
 * Handles timeout configurations for slow LLM systems where:
 * - Cold model load (disk → RAM/VRAM): up to ~10 minutes
 * - Model switch (unload A, then load B): up to ~15 minutes
 * - Request queuing with multiple agents using different LLMs
 * - Customizable timeout periods from seconds to days
 * 
 * Usage scenarios:
 * 1. Model switching during agent activation/deactivation
 * 2. Test connection when validating LLM configuration  
 * 3. Request queuing when multiple agents share LLM resources
 * 4. Long-running inference jobs with slow models
 */

import type * as vscodeType from 'vscode';

export interface LlmTimeoutConfig {
    /**
     * Cold model load timeout (disk → RAM/VRAM)
     * Default: 10 minutes (600000ms)
     * Range: 1 minute - 1 day
     */
    coldLoadMs: number;

    /**
     * Model switch timeout (unload A, load B)
     * Default: 15 minutes (900000ms)
     * Range: 1 minute - 1 day
     */
    modelSwitchMs: number;

    /**
     * Test connection timeout for validation
     * Default: 2 minutes (120000ms)
     * Range: 30 seconds - 10 minutes
     */
    testConnectionMs: number;

    /**
     * Standard request timeout
     * Default: 30 seconds (30000ms)
     * Range: 5 seconds - 5 minutes
     */
    requestMs: number;

    /**
     * Response wait time between queued requests
     * Used when multiple agents queue requests to same LLM
     * Default: 15 minutes (900000ms)
     * Range: 1 minute - 1 day
     */
    queuedResponseMs: number;

    /**
     * Agent activation timeout (includes model loading)
     * Default: 15 minutes (900000ms)
     * Range: 1 minute - 1 day
     */
    agentActivationMs: number;

    /**
     * Agent deactivation timeout (includes model unloading)
     * Default: 5 minutes (300000ms)
     * Range: 30 seconds - 15 minutes
     */
    agentDeactivationMs: number;

    /**
     * Maximum queue depth before rejecting requests
     * Default: 20
     * Range: 1 - 100
     */
    maxQueueDepth: number;
}

export interface LlmTimeoutState {
    config: LlmTimeoutConfig;
    issues: string[];
    isValid: boolean;
}

interface ConfigLike {
    get<T>(section: string, defaultValue?: T): T | undefined;
}

// Time constants for validation
const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;

// Default timeout configuration for slow LLM systems
const DEFAULTS: LlmTimeoutConfig = {
    coldLoadMs: 10 * ONE_MINUTE,           // 10 minutes for cold load
    modelSwitchMs: 15 * ONE_MINUTE,        // 15 minutes for model switch
    testConnectionMs: 2 * ONE_MINUTE,      // 2 minutes for test connection
    requestMs: 30 * ONE_SECOND,            // 30 seconds for standard request
    queuedResponseMs: 15 * ONE_MINUTE,     // 15 minutes between queued responses
    agentActivationMs: 15 * ONE_MINUTE,    // 15 minutes for agent activation
    agentDeactivationMs: 5 * ONE_MINUTE,   // 5 minutes for agent deactivation
    maxQueueDepth: 20,                     // Max 20 queued requests
};

// Validation ranges
const RANGES = {
    coldLoad: { min: ONE_MINUTE, max: ONE_DAY },
    modelSwitch: { min: ONE_MINUTE, max: ONE_DAY },
    testConnection: { min: 30 * ONE_SECOND, max: 10 * ONE_MINUTE },
    request: { min: 5 * ONE_SECOND, max: 5 * ONE_MINUTE },
    queuedResponse: { min: ONE_MINUTE, max: ONE_DAY },
    agentActivation: { min: ONE_MINUTE, max: ONE_DAY },
    agentDeactivation: { min: 30 * ONE_SECOND, max: 15 * ONE_MINUTE },
    maxQueueDepth: { min: 1, max: 100 },
} as const;

let vscode: typeof vscodeType | undefined;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    vscode = require('vscode');
} catch {
    vscode = undefined;
}

/**
 * Read LLM timeout configuration from VS Code settings
 */
export function readLlmTimeoutConfig(options?: { configuration?: ConfigLike }): LlmTimeoutState {
    const configuration = options?.configuration ?? vscode?.workspace.getConfiguration();
    const issues: string[] = [];

    const coldLoadMs = normalizeTimeout(
        configuration?.get<number>('copilot-orchestrator.llm.timeouts.coldLoadMs', DEFAULTS.coldLoadMs),
        'coldLoad',
        issues
    );

    const modelSwitchMs = normalizeTimeout(
        configuration?.get<number>('copilot-orchestrator.llm.timeouts.modelSwitchMs', DEFAULTS.modelSwitchMs),
        'modelSwitch',
        issues
    );

    const testConnectionMs = normalizeTimeout(
        configuration?.get<number>('copilot-orchestrator.llm.timeouts.testConnectionMs', DEFAULTS.testConnectionMs),
        'testConnection',
        issues
    );

    const requestMs = normalizeTimeout(
        configuration?.get<number>('copilot-orchestrator.llm.timeouts.requestMs', DEFAULTS.requestMs),
        'request',
        issues
    );

    const queuedResponseMs = normalizeTimeout(
        configuration?.get<number>('copilot-orchestrator.llm.timeouts.queuedResponseMs', DEFAULTS.queuedResponseMs),
        'queuedResponse',
        issues
    );

    const agentActivationMs = normalizeTimeout(
        configuration?.get<number>('copilot-orchestrator.llm.timeouts.agentActivationMs', DEFAULTS.agentActivationMs),
        'agentActivation',
        issues
    );

    const agentDeactivationMs = normalizeTimeout(
        configuration?.get<number>('copilot-orchestrator.llm.timeouts.agentDeactivationMs', DEFAULTS.agentDeactivationMs),
        'agentDeactivation',
        issues
    );

    const maxQueueDepth = normalizeQueueDepth(
        configuration?.get<number>('copilot-orchestrator.llm.timeouts.maxQueueDepth', DEFAULTS.maxQueueDepth),
        issues
    );

    const config: LlmTimeoutConfig = {
        coldLoadMs,
        modelSwitchMs,
        testConnectionMs,
        requestMs,
        queuedResponseMs,
        agentActivationMs,
        agentDeactivationMs,
        maxQueueDepth,
    };

    const isValid = issues.length === 0;

    return { config, issues, isValid };
}

/**
 * Normalize timeout value with validation
 */
function normalizeTimeout(
    value: number | undefined,
    type: keyof Omit<typeof RANGES, 'maxQueueDepth'>,
    issues: string[]
): number {
    const range = RANGES[type];
    const defaultValue = DEFAULTS[`${type}Ms` as keyof LlmTimeoutConfig] as number;

    if (value === undefined || value === null) {
        return defaultValue;
    }

    if (typeof value !== 'number' || isNaN(value)) {
        issues.push(`Invalid ${type} timeout: must be a number`);
        return defaultValue;
    }

    if (value < range.min) {
        issues.push(
            `${type} timeout too low: ${value}ms (minimum: ${range.min}ms = ${formatDuration(range.min)})`
        );
        return range.min;
    }

    if (value > range.max) {
        issues.push(
            `${type} timeout too high: ${value}ms (maximum: ${range.max}ms = ${formatDuration(range.max)})`
        );
        return range.max;
    }

    return value;
}

/**
 * Normalize queue depth with validation
 */
function normalizeQueueDepth(value: number | undefined, issues: string[]): number {
    const range = RANGES.maxQueueDepth;
    const defaultValue = DEFAULTS.maxQueueDepth;

    if (value === undefined || value === null) {
        return defaultValue;
    }

    if (typeof value !== 'number' || isNaN(value)) {
        issues.push('Invalid maxQueueDepth: must be a number');
        return defaultValue;
    }

    if (value < range.min) {
        issues.push(`maxQueueDepth too low: ${value} (minimum: ${range.min})`);
        return range.min;
    }

    if (value > range.max) {
        issues.push(`maxQueueDepth too high: ${value} (maximum: ${range.max})`);
        return range.max;
    }

    return Math.floor(value);
}

/**
 * Format duration in human-readable form
 */
function formatDuration(ms: number): string {
    if (ms >= ONE_DAY) {
        return `${ms / ONE_DAY} day(s)`;
    }
    if (ms >= ONE_HOUR) {
        return `${ms / ONE_HOUR} hour(s)`;
    }
    if (ms >= ONE_MINUTE) {
        return `${ms / ONE_MINUTE} minute(s)`;
    }
    return `${ms / ONE_SECOND} second(s)`;
}

/**
 * Calculate total potential wait time for queued requests
 */
export function calculateQueueWaitTime(queueDepth: number, responseTimeMs: number): number {
    return queueDepth * responseTimeMs;
}

/**
 * Get human-readable queue wait estimate
 */
export function getQueueWaitEstimate(queueDepth: number, config: LlmTimeoutConfig): string {
    if (queueDepth === 0) {
        return 'No queue';
    }

    const totalMs = calculateQueueWaitTime(queueDepth, config.queuedResponseMs);

    if (totalMs >= ONE_HOUR) {
        const hours = Math.floor(totalMs / ONE_HOUR);
        const minutes = Math.floor((totalMs % ONE_HOUR) / ONE_MINUTE);
        return `~${hours}h ${minutes}m (${queueDepth} requests @ ${formatDuration(config.queuedResponseMs)} each)`;
    }

    if (totalMs >= ONE_MINUTE) {
        const minutes = Math.floor(totalMs / ONE_MINUTE);
        return `~${minutes} minutes (${queueDepth} requests @ ${formatDuration(config.queuedResponseMs)} each)`;
    }

    return `~${Math.floor(totalMs / ONE_SECOND)} seconds`;
}

/**
 * Export defaults for external use
 */
export const LLM_TIMEOUT_DEFAULTS = DEFAULTS;
export const LLM_TIMEOUT_RANGES = RANGES;
