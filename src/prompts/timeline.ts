/**
 * Timeline AI Prompt Templates
 * 
 * Provides structured prompts for AI-assisted timeline planning suggestions
 */

export interface TimelineContext {
  projectType: string;
  projectDescription: string;
  teamSize?: number;
  complexity?: 'low' | 'medium' | 'high' | 'very-high';
  featureCount?: number;
  features?: Array<{
    name: string;
    estimatedDays?: number;
  }>;
}

export interface TimelineSuggestion {
  totalDuration: {
    weeks: number;
    months: number;
  };
  milestones: MilestoneSuggestion[];
  rationale: string;
  bufferPercentage: number;
}

export interface MilestoneSuggestion {
  name: string;
  phase: 'planning' | 'design' | 'development' | 'testing' | 'deployment';
  durationWeeks: number;
  startWeek: number;
  endWeek: number;
  deliverables: string[];
  criticalPath: boolean;
  rationale: string;
}

export interface ResourceAllocation {
  milestone: string;
  phase: string;
  recommendedTeamSize: number;
  roles: Array<{
    role: string;
    count: number;
    allocation: number; // percentage (0-100)
  }>;
  rationale: string;
}

export interface CriticalPathAnalysis {
  milestones: string[];
  totalDuration: number;
  bottlenecks: Array<{
    milestone: string;
    reason: string;
    mitigation: string;
  }>;
  parallelizable: Array<{
    milestones: string[];
    canRunInParallel: boolean;
    requirements: string;
  }>;
}

/**
 * Generate prompt for AI timeline recommendations
 */
export function generateTimelineRecommendationPrompt(context: TimelineContext): string {
  return `You are an expert project manager providing timeline recommendations for a software project.

Project Type: ${context.projectType}
Project Description: ${context.projectDescription}
${context.teamSize ? `Team Size: ${context.teamSize} people` : ''}
${context.complexity ? `Complexity: ${context.complexity}` : ''}
${context.featureCount ? `Number of Features: ${context.featureCount}` : ''}

Provide a realistic project timeline with milestones. Consider:
1. Industry-standard development phases
2. Team velocity and capacity
3. Complexity and risk factors
4. Buffer time for unknowns (15-25%)

Return ONLY a valid JSON object matching this structure:
{
  "totalDuration": {
    "weeks": number,
    "months": number
  },
  "milestones": [
    {
      "name": "string",
      "phase": "planning|design|development|testing|deployment",
      "durationWeeks": number,
      "startWeek": number,
      "endWeek": number,
      "deliverables": string[],
      "criticalPath": boolean,
      "rationale": "string"
    }
  ],
  "rationale": "string (explain overall timeline)",
  "bufferPercentage": number
}

Guidelines:
- ${context.teamSize && context.teamSize < 3 ? 'Small team: add extra time for context switching' : ''}
- ${context.complexity === 'high' || context.complexity === 'very-high' ? 'High complexity: include discovery/spike phases' : ''}
- Include at least 2-3 milestones
- Ensure milestones are sequential with no gaps
- Mark critical path items (typically 60-70% of milestones)`;
}

/**
 * Generate prompt for milestone suggestions
 */
export function generateMilestoneSuggestionsPrompt(
  features: Array<{ name: string; estimatedDays?: number }>,
  context: TimelineContext
): string {
  const featureList = features.map((f, i) => 
    `${i + 1}. ${f.name}${f.estimatedDays ? ` (est. ${f.estimatedDays} days)` : ''}`
  ).join('\n');

  return `You are an expert project manager suggesting project milestones.

Project Type: ${context.projectType}
${context.teamSize ? `Team Size: ${context.teamSize}` : ''}

Features to deliver:
${featureList}

Based on these features, suggest 4-6 meaningful milestones that:
1. Group related features
2. Represent demonstrable deliverables
3. Allow for incremental releases
4. Follow logical dependency order

Return ONLY a valid JSON array of milestone objects:
{
  "name": "string (e.g., 'MVP Release', 'Beta Launch')",
  "phase": "planning|design|development|testing|deployment",
  "durationWeeks": number,
  "startWeek": number,
  "endWeek": number,
  "deliverables": string[] (specific features or outcomes),
  "criticalPath": boolean,
  "rationale": "string"
}

Ensure milestones are:
- Time-boxed and realistic
- Incrementally valuable
- Testable and demonstrable
- Properly sequenced`;
}

/**
 * Generate prompt for resource allocation
 */
export function generateResourceAllocationPrompt(
  milestones: Array<{ name: string; phase: string }>,
  context: TimelineContext
): string {
  const milestoneList = milestones.map((m, i) => `${i + 1}. ${m.name} (${m.phase})`).join('\n');

  return `You are an expert resource manager allocating team members to project milestones.

Project Type: ${context.projectType}
${context.teamSize ? `Total Team Size: ${context.teamSize}` : ''}

Milestones:
${milestoneList}

For each milestone, recommend:
1. Optimal team size for that phase
2. Required roles and their allocation percentages
3. Ensure no individual is over-allocated (>120%)

Return ONLY a valid JSON array of resource allocation objects:
{
  "milestone": "string (exact milestone name)",
  "phase": "string",
  "recommendedTeamSize": number,
  "roles": [
    {
      "role": "string (e.g., 'Frontend Engineer', 'DevOps')",
      "count": number (how many people in this role),
      "allocation": number (percentage 0-100)
    }
  ],
  "rationale": "string"
}

Guidelines:
- Planning phase: lighter team, more leads/architects
- Development phase: full team allocation
- Testing phase: more QA, some developers
- Deployment phase: DevOps heavy, reduced developers
- No role should exceed 100% allocation
- Total allocation should match recommended team size`;
}

/**
 * Generate prompt for critical path analysis
 */
export function generateCriticalPathPrompt(
  milestones: Array<{ name: string; dependencies?: string[] }>,
  context: TimelineContext
): string {
  const milestoneList = milestones.map((m, i) => 
    `${i + 1}. ${m.name}${m.dependencies && m.dependencies.length > 0 ? ` (depends on: ${m.dependencies.join(', ')})` : ''}`
  ).join('\n');

  return `You are an expert project scheduler analyzing the critical path.

Project Type: ${context.projectType}
Milestones:
${milestoneList}

Analyze the critical path (longest sequence of dependent tasks) and identify:
1. Which milestones are on the critical path
2. Potential bottlenecks
3. Opportunities for parallelization

Return ONLY a valid JSON object:
{
  "milestones": string[] (milestone names in critical path order),
  "totalDuration": number (weeks),
  "bottlenecks": [
    {
      "milestone": "string",
      "reason": "string",
      "mitigation": "string (how to reduce impact)"
    }
  ],
  "parallelizable": [
    {
      "milestones": string[] (milestones that can run in parallel),
      "canRunInParallel": boolean,
      "requirements": "string (what's needed for parallel execution)"
    }
  ]
}

Focus on:
- Dependencies that create sequential bottlenecks
- Resource constraints
- Risk mitigation strategies
- Opportunities to accelerate timeline`;
}

/**
 * Parse AI response for timeline recommendation
 */
export function parseTimelineRecommendation(response: string): TimelineSuggestion | null {
  try {
    const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    
    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error('[Timeline] Failed to parse timeline recommendation:', error);
    return null;
  }
}

/**
 * Parse AI response for milestone suggestions
 */
export function parseMilestoneSuggestions(response: string): MilestoneSuggestion[] {
  try {
    const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    
    const parsed = JSON.parse(jsonStr.trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[Timeline] Failed to parse milestone suggestions:', error);
    return [];
  }
}

/**
 * Parse AI response for resource allocation
 */
export function parseResourceAllocation(response: string): ResourceAllocation[] {
  try {
    const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    
    const parsed = JSON.parse(jsonStr.trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[Timeline] Failed to parse resource allocation:', error);
    return [];
  }
}

/**
 * Parse AI response for critical path analysis
 */
export function parseCriticalPathAnalysis(response: string): CriticalPathAnalysis | null {
  try {
    const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    
    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error('[Timeline] Failed to parse critical path analysis:', error);
    return null;
  }
}
