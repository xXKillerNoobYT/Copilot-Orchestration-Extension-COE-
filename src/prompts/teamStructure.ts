/**
 * Team Structure AI Prompt Templates
 * 
 * Provides structured prompts for AI-assisted team structure suggestions
 */

export interface TeamStructureContext {
  projectType: string;
  projectDescription: string;
  techStack?: string[];
  projectDuration?: number; // in weeks
  complexity?: 'low' | 'medium' | 'high' | 'very-high';
  budget?: 'startup' | 'small' | 'medium' | 'enterprise';
}

export interface RoleSuggestion {
  role: string;
  count: number;
  essential: boolean;
  skills: string[];
  responsibilities: string[];
  experience: 'junior' | 'mid' | 'senior' | 'lead';
  allocation: number; // percentage (0-100)
  rationale: string;
}

export interface SkillRequirement {
  skill: string;
  category: 'technical' | 'soft-skill' | 'domain';
  proficiencyLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
  importance: 'critical' | 'high' | 'medium' | 'nice-to-have';
  requiredFor: string[]; // roles that need this skill
  rationale: string;
}

export interface TeamSizeRecommendation {
  minimumTeam: number;
  optimalTeam: number;
  maximumEfficient: number;
  breakdown: {
    frontend: number;
    backend: number;
    fullstack: number;
    devops: number;
    qa: number;
    design: number;
    product: number;
    other: number;
  };
  scalingStrategy: string;
  rationale: string;
}

export interface WorkloadDistribution {
  role: string;
  estimatedHoursPerWeek: number;
  allocation: number; // percentage
  tasks: Array<{
    task: string;
    hoursPerWeek: number;
    percentage: number;
  }>;
  overallocation: boolean;
  recommendations: string[];
}

/**
 * Generate prompt for role suggestions
 */
export function generateRoleSuggestionsPrompt(context: TeamStructureContext): string {
  return `You are an expert engineering manager recommending team roles for a software project.

Project Type: ${context.projectType}
Project Description: ${context.projectDescription}
${context.techStack ? `Technology Stack: ${context.techStack.join(', ')}` : ''}
${context.projectDuration ? `Project Duration: ${context.projectDuration} weeks` : ''}
${context.complexity ? `Complexity: ${context.complexity}` : ''}
${context.budget ? `Budget Category: ${context.budget}` : ''}

Based on this project, recommend the essential roles needed. For each role, provide:
1. Role name (e.g., 'Frontend Engineer', 'DevOps Engineer')
2. Number of people needed in this role
3. Whether this role is essential (vs. nice-to-have)
4. Required skills for this role
5. Key responsibilities
6. Expected experience level
7. Allocation percentage (how much of their time on this project)
8. Rationale for why this role is needed

Return ONLY a valid JSON array of role objects:
{
  "role": "string",
  "count": number,
  "essential": boolean,
  "skills": string[],
  "responsibilities": string[],
  "experience": "junior|mid|senior|lead",
  "allocation": number (0-100),
  "rationale": "string"
}

Consider:
- ${context.techStack ? `Tech stack requires: ${context.techStack.join(', ')}` : 'Typical roles for ' + context.projectType}
- ${context.complexity === 'high' || context.complexity === 'very-high' ? 'Complex projects need senior/lead engineers' : ''}
- ${context.budget === 'startup' ? 'Startup budget: prefer full-stack over specialists' : ''}
- ${context.budget === 'enterprise' ? 'Enterprise budget: can have specialized roles' : ''}
- Include both technical and non-technical roles (PM, Designer) if appropriate`;
}

/**
 * Generate prompt for skill requirements
 */
export function generateSkillRequirementsPrompt(
  roles: Array<{ role: string; skills?: string[] }>,
  context: TeamStructureContext
): string {
  const roleList = roles.map((r, i) => 
    `${i + 1}. ${r.role}${r.skills && r.skills.length > 0 ? ` (skills: ${r.skills.join(', ')})` : ''}`
  ).join('\n');

  return `You are an expert technical recruiter identifying skill requirements for a project.

Project Type: ${context.projectType}
${context.techStack ? `Technology Stack: ${context.techStack.join(', ')}` : ''}

Roles in the team:
${roleList}

For each skill needed across all roles, provide:
1. Skill name
2. Category (technical, soft-skill, or domain)
3. Required proficiency level
4. Importance to project success
5. Which roles need this skill
6. Rationale for why this skill is needed

Return ONLY a valid JSON array of skill requirement objects:
{
  "skill": "string (e.g., 'React', 'Kubernetes', 'Agile Methodology')",
  "category": "technical|soft-skill|domain",
  "proficiencyLevel": "basic|intermediate|advanced|expert",
  "importance": "critical|high|medium|nice-to-have",
  "requiredFor": string[] (role names),
  "rationale": "string"
}

Include:
- Technical skills (languages, frameworks, tools)
- Soft skills (communication, problem-solving)
- Domain knowledge (industry-specific expertise)
- Cover all roles, not just developers`;
}

/**
 * Generate prompt for team size recommendation
 */
export function generateTeamSizePrompt(context: TeamStructureContext): string {
  return `You are an expert engineering manager recommending team size for a software project.

Project Type: ${context.projectType}
Project Description: ${context.projectDescription}
${context.techStack ? `Technology Stack: ${context.techStack.join(', ')}` : ''}
${context.projectDuration ? `Project Duration: ${context.projectDuration} weeks` : ''}
${context.complexity ? `Complexity: ${context.complexity}` : ''}
${context.budget ? `Budget: ${context.budget}` : ''}

Recommend appropriate team sizes considering:
1. Brooks' Law (adding people to late projects makes them later)
2. Two-pizza team rule (5-9 people is optimal for communication)
3. Project complexity and scope
4. Technology stack breadth
5. Timeline constraints

Return ONLY a valid JSON object:
{
  "minimumTeam": number (minimum viable team),
  "optimalTeam": number (ideal team size),
  "maximumEfficient": number (max before diminishing returns),
  "breakdown": {
    "frontend": number,
    "backend": number,
    "fullstack": number,
    "devops": number,
    "qa": number,
    "design": number,
    "product": number,
    "other": number
  },
  "scalingStrategy": "string (how to grow the team)",
  "rationale": "string (explain the recommendation)"
}

Guidelines:
- Minimum team: What's absolutely necessary to ship
- Optimal team: Best size for velocity and communication
- Maximum: Point where adding more people slows down
- ${context.budget === 'startup' ? 'Startup: lean towards smaller team' : ''}
- ${context.complexity === 'very-high' ? 'Very high complexity: may need larger team' : ''}`;
}

/**
 * Generate prompt for workload distribution
 */
export function generateWorkloadDistributionPrompt(
  roles: Array<{ role: string; allocation?: number }>,
  context: TeamStructureContext
): string {
  const roleList = roles.map((r, i) => 
    `${i + 1}. ${r.role}${r.allocation ? ` (${r.allocation}% allocated)` : ''}`
  ).join('\n');

  return `You are an expert project manager analyzing workload distribution.

Project Type: ${context.projectType}
${context.projectDuration ? `Project Duration: ${context.projectDuration} weeks` : ''}

Team roles:
${roleList}

For each role, analyze workload and provide:
1. Estimated hours per week
2. Overall allocation percentage
3. Breakdown of tasks and time spent
4. Whether the role is over-allocated (>100%)
5. Recommendations to balance workload

Return ONLY a valid JSON array of workload objects:
{
  "role": "string (exact role name)",
  "estimatedHoursPerWeek": number (typically 35-40 for full-time),
  "allocation": number (percentage 0-100+),
  "tasks": [
    {
      "task": "string (e.g., 'Feature development', 'Code review')",
      "hoursPerWeek": number,
      "percentage": number
    }
  ],
  "overallocation": boolean (true if allocation > 100%),
  "recommendations": string[] (how to fix over-allocation)
}

Guidelines:
- Full-time = 40 hours/week, but only ~35 productive hours
- Over 100% allocation is unsustainable
- Include non-coding tasks (meetings, reviews, planning)
- Frontend devs: coding 70%, review 15%, meetings 15%
- Backend devs: coding 65%, review 15%, meetings 15%, ops 5%
- DevOps: infrastructure 50%, support 30%, meetings 20%
- QA: testing 60%, automation 25%, meetings 15%
- PM/Design: depends on team size and phase`;
}

/**
 * Parse AI response for role suggestions
 */
export function parseRoleSuggestions(response: string): RoleSuggestion[] {
  try {
    const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    
    const parsed = JSON.parse(jsonStr.trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[TeamStructure] Failed to parse role suggestions:', error);
    return [];
  }
}

/**
 * Parse AI response for skill requirements
 */
export function parseSkillRequirements(response: string): SkillRequirement[] {
  try {
    const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    
    const parsed = JSON.parse(jsonStr.trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[TeamStructure] Failed to parse skill requirements:', error);
    return [];
  }
}

/**
 * Parse AI response for team size recommendation
 */
export function parseTeamSizeRecommendation(response: string): TeamSizeRecommendation | null {
  try {
    const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    
    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error('[TeamStructure] Failed to parse team size recommendation:', error);
    return null;
  }
}

/**
 * Parse AI response for workload distribution
 */
export function parseWorkloadDistribution(response: string): WorkloadDistribution[] {
  try {
    const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    
    const parsed = JSON.parse(jsonStr.trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[TeamStructure] Failed to parse workload distribution:', error);
    return [];
  }
}
