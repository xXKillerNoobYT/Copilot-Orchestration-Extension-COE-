/**
 * Feature Breakdown AI Prompt Templates
 * 
 * Provides structured prompts for AI-assisted feature breakdown suggestions
 */

export interface FeatureBreakdownContext {
  projectType: string;
  projectDescription: string;
  techStack?: string[];
  existingFeatures?: Array<{
    name: string;
    description: string;
    priority: string;
  }>;
}

export interface FeatureSuggestion {
  name: string;
  description: string;
  category: 'UI' | 'API' | 'Database' | 'Integration' | 'Infrastructure' | 'Testing' | 'Documentation';
  estimatedHours: number;
  estimatedDays: number;
  suggestedPriority: 'critical' | 'high' | 'medium' | 'low';
  dependencies: string[];
  rationale: string;
}

export interface FeatureCategorizationSuggestion {
  featureName: string;
  suggestedCategory: string;
  confidence: number;
  rationale: string;
}

export interface EffortEstimation {
  featureName: string;
  estimatedHours: number;
  estimatedDays: number;
  complexity: 'low' | 'medium' | 'high' | 'very-high';
  rationale: string;
}

export interface DependencySuggestion {
  fromFeature: string;
  toFeature: string;
  dependencyType: 'required' | 'optional' | 'recommended';
  rationale: string;
}

/**
 * Generate prompt for AI feature name suggestions
 */
export function generateFeatureSuggestionsPrompt(context: FeatureBreakdownContext): string {
  return `You are an expert software architect helping to define features for a project.

Project Type: ${context.projectType}
Project Description: ${context.projectDescription}
${context.techStack ? `Technology Stack: ${context.techStack.join(', ')}` : ''}

Based on this project, suggest 5-10 specific features that would be needed. For each feature, provide:
1. Name (concise, 2-5 words)
2. Description (1-2 sentences)
3. Category (UI, API, Database, Integration, Infrastructure, Testing, or Documentation)
4. Estimated effort in hours (realistic estimate)
5. Estimated effort in days (assuming 8-hour workdays)
6. Suggested priority (critical, high, medium, low)
7. Dependencies (list of other feature names this depends on, or empty array)
8. Rationale (why this feature is important)

Return ONLY a valid JSON array of feature objects matching this structure:
{
  "name": "string",
  "description": "string",
  "category": "UI|API|Database|Integration|Infrastructure|Testing|Documentation",
  "estimatedHours": number,
  "estimatedDays": number,
  "suggestedPriority": "critical|high|medium|low",
  "dependencies": string[],
  "rationale": "string"
}

Focus on features that are:
- Essential for MVP or core functionality
- Commonly needed in ${context.projectType} projects
- Well-scoped and independently deliverable
- Properly ordered by dependencies`;
}

/**
 * Generate prompt for feature categorization
 */
export function generateCategorizationPrompt(
  features: Array<{ name: string; description: string }>,
  context: FeatureBreakdownContext
): string {
  const featureList = features.map((f, i) => `${i + 1}. ${f.name}: ${f.description}`).join('\n');

  return `You are an expert software architect categorizing project features.

Project Type: ${context.projectType}
Features to categorize:
${featureList}

For each feature, suggest the most appropriate category from:
- UI: User interface, frontend components, user-facing elements
- API: Backend endpoints, web services, REST/GraphQL APIs
- Database: Data models, migrations, database operations
- Integration: Third-party services, external APIs, webhooks
- Infrastructure: Deployment, CI/CD, monitoring, logging
- Testing: Test suites, test automation, quality assurance
- Documentation: User guides, API docs, architecture diagrams

Return ONLY a valid JSON array of categorization objects:
{
  "featureName": "string",
  "suggestedCategory": "string",
  "confidence": number (0-1),
  "rationale": "string"
}

Provide high-confidence (>0.8) categorizations. Consider the project type when categorizing.`;
}

/**
 * Generate prompt for effort estimation
 */
export function generateEffortEstimationPrompt(
  features: Array<{ name: string; description: string }>,
  context: FeatureBreakdownContext
): string {
  const featureList = features.map((f, i) => `${i + 1}. ${f.name}: ${f.description}`).join('\n');

  return `You are an experienced software project manager estimating feature development effort.

Project Type: ${context.projectType}
${context.techStack ? `Technology Stack: ${context.techStack.join(', ')}` : ''}

Features to estimate:
${featureList}

For each feature, provide realistic effort estimates considering:
- Implementation complexity
- Testing requirements
- Documentation needs
- Integration points
- Technology maturity

Return ONLY a valid JSON array of estimation objects:
{
  "featureName": "string",
  "estimatedHours": number,
  "estimatedDays": number (assuming 8-hour workdays),
  "complexity": "low|medium|high|very-high",
  "rationale": "string (explain the estimate)"
}

Be realistic. Include time for:
- Design and planning (10-15% of development time)
- Development
- Testing (20-30% of development time)
- Code review and refactoring (10-15%)
- Documentation (5-10%)`;
}

/**
 * Generate prompt for dependency suggestions
 */
export function generateDependencySuggestionsPrompt(
  features: Array<{ name: string; description: string }>,
  context: FeatureBreakdownContext
): string {
  const featureList = features.map((f, i) => `${i + 1}. ${f.name}: ${f.description}`).join('\n');

  return `You are an expert software architect analyzing feature dependencies.

Project Type: ${context.projectType}
Features to analyze:
${featureList}

Analyze these features and identify dependencies between them. A dependency exists when:
- Feature A requires Feature B to be completed first
- Feature A would benefit from Feature B being done first (optional)
- Feature A is recommended to follow Feature B (best practice)

Return ONLY a valid JSON array of dependency objects:
{
  "fromFeature": "string (exact feature name)",
  "toFeature": "string (exact feature name)",
  "dependencyType": "required|optional|recommended",
  "rationale": "string (explain why this dependency exists)"
}

Only include meaningful dependencies. Don't create circular dependencies.
Focus on technical dependencies, not just logical ordering.`;
}

/**
 * Parse AI response for feature suggestions
 */
export function parseFeatureSuggestions(response: string): FeatureSuggestion[] {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    
    const parsed = JSON.parse(jsonStr.trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[FeatureBreakdown] Failed to parse AI response:', error);
    return [];
  }
}

/**
 * Parse AI response for categorization suggestions
 */
export function parseCategorizationSuggestions(response: string): FeatureCategorizationSuggestion[] {
  try {
    const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    
    const parsed = JSON.parse(jsonStr.trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[FeatureBreakdown] Failed to parse categorization response:', error);
    return [];
  }
}

/**
 * Parse AI response for effort estimation
 */
export function parseEffortEstimations(response: string): EffortEstimation[] {
  try {
    const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    
    const parsed = JSON.parse(jsonStr.trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[FeatureBreakdown] Failed to parse effort estimation response:', error);
    return [];
  }
}

/**
 * Parse AI response for dependency suggestions
 */
export function parseDependencySuggestions(response: string): DependencySuggestion[] {
  try {
    const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    
    const parsed = JSON.parse(jsonStr.trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[FeatureBreakdown] Failed to parse dependency suggestions:', error);
    return [];
  }
}
