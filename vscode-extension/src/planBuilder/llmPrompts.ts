/**
 * LLM Prompts for Plan Builder
 */

export const PROMPTS = {
  // Architecture suggestion prompt
  ARCHITECTURE: {
    SYSTEM: `You are an expert software architect with deep knowledge of system design patterns, frameworks, and best practices. 
Your goal is to provide tailored architecture recommendations based on project requirements.
Always provide practical, actionable suggestions that balance simplicity with scalability.`,

    USER_TEMPLATE: (context: Record<string, string>): string => `
Based on the following project requirements, provide architecture recommendations:

PROJECT DETAILS:
- Name: ${context.projectName}
- Type: ${context.projectType}
- Technologies: ${context.techStack}
- Team Size: ${context.teamSize} people
- Scale: ${context.scale}
- Required Integrations: ${context.integrations}
- Timeline: ${context.timeline}

Provide recommendations in JSON format with architecture patterns, frameworks, folder structure, and best practices.`
  },

  // Task decomposition prompt
  TASK_DECOMPOSITION: {
    SYSTEM: `You are an expert project manager and software engineer. Your goal is to decompose high-level project plans into granular, manageable tasks with clear dependencies, estimates, and priorities.
Each task should be specific, measurable, and achievable within a defined timeframe.`,

    USER_TEMPLATE: (context: Record<string, string>): string => `
Decompose the following project plan into granular tasks:

PROJECT PLAN:
${context.plan}

Generate a list of tasks with:
1. Task title and description
2. Effort estimate (hours/days)
3. Priority (critical/high/medium/low)
4. Dependencies on other tasks
5. Resource requirements
6. Success criteria

Format as JSON with a "tasks" array.`
  },

  // Feature decomposition prompt
  FEATURE: {
    SYSTEM: `You are a product manager and software architect. Your goal is to break down features into implementable components and modules.`,

    USER_TEMPLATE: (context: Record<string, string>): string => `
Break down the following feature into components and modules:

FEATURE: ${context.feature}

PROJECT CONTEXT:
- Tech Stack: ${context.techStack}
- Architecture Pattern: ${context.pattern}
- Team Size: ${context.teamSize}

Provide:
1. High-level architecture diagram (text-based)
2. Component breakdown
3. Module dependencies
4. Implementation phases
5. Testing strategy

Format as JSON.`
  },

  // API design prompt
  API: {
    SYSTEM: `You are an API design expert. Your goal is to design RESTful APIs that are intuitive, scalable, and follow best practices.`,

    USER_TEMPLATE: (context: Record<string, string>): string => `
Design a RESTful API for: ${context.feature}

Provide:
1. Endpoints (GET, POST, PUT, DELETE)
2. Request/response schemas
3. Authentication & authorization
4. Error handling
5. Rate limiting strategy

Format as JSON with OpenAPI/Swagger compatible schema.`
  },

  // Testing strategy prompt
  TESTING: {
    SYSTEM: `You are a QA engineer and testing expert. Your goal is to create comprehensive testing strategies that maximize coverage and catch bugs early.`,

    USER_TEMPLATE: (context: Record<string, string>): string => `
Create a testing strategy for: ${context.feature}

PROJECT CONTEXT:
- Tech Stack: ${context.techStack}
- Priority: ${context.priority}

Provide:
1. Unit test coverage targets
2. Integration tests
3. E2E test scenarios
4. Performance benchmarks
5. Security testing requirements

Format as JSON.`
  }
};

/**
 * Get prompt by key
 */
export function getPrompt(
  key: keyof typeof PROMPTS
): { SYSTEM: string; USER_TEMPLATE: (context: any) => string } {
  return PROMPTS[key];
}

/**
 * Compose a full prompt with system and user messages
 */
export function composePrompt(
  systemMessage: string,
  userMessage: string
): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    { role: 'system', content: systemMessage },
    { role: 'user', content: userMessage }
  ];
}

/**
 * Format conversation history for context
 */
export function formatConversationContext(
  messages: Array<{ role: string; content: string }>
): string {
  return messages
    .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n\n---\n\n');
}
