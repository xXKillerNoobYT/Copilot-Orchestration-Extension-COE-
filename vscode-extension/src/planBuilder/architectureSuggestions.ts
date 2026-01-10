/**
 * LLM-powered architecture suggestions for Plan Builder
 */

import { openaiClient } from '../llm/openaiClient';
import type { Message } from '../transport/transport';

export interface ArchitectureContext {
  projectName: string;
  projectType: string;
  techStack: string[];
  teamSize: number;
  scale: string;
  integrations: string[];
  timeline: string;
}

export interface ArchitectureSuggestion {
  pattern: string;
  rationale: string;
  frameworks: string[];
  folderStructure: {
    directory: string;
    purpose: string;
  }[];
  ciCdSetup: string;
  bestPractices: string[];
}

export interface SuggestionResponse {
  suggestions: ArchitectureSuggestion[];
  reasoning: string;
  alternatives: string[];
  risks: string[];
  recommendations: string[];
}

/**
 * Generate architecture suggestions based on user's plan
 */
export async function generateArchitectureSuggestions(
  context: ArchitectureContext
): Promise<SuggestionResponse> {
  try {
    // Compose the prompt
    const prompt = composeArchitecturePrompt(context);

    // Call LLM
    const messages: Message[] = [
      {
        role: 'user',
        content: prompt
      }
    ];

    // Get LLM response with timeout
    const response = await Promise.race([
      openaiClient.chat(messages),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('LLM request timeout')), 30000)
      )
    ]);

    // Parse the response
    const suggestions = parseArchitectureSuggestions(response);
    return suggestions;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to generate architecture suggestions: ${message}`);
  }
}

/**
 * Compose a detailed prompt for architecture suggestions
 */
function composeArchitecturePrompt(context: ArchitectureContext): string {
  return `You are an expert software architect. Based on the following project requirements, provide detailed architecture suggestions.

PROJECT CONTEXT:
- Name: ${context.projectName}
- Type: ${context.projectType}
- Tech Stack: ${context.techStack.join(', ')}
- Team Size: ${context.teamSize} people
- Scale: ${context.scale}
- Required Integrations: ${context.integrations.join(', ')}
- Timeline: ${context.timeline}

PROVIDE YOUR RESPONSE IN THE FOLLOWING JSON FORMAT:
{
  "suggestions": [
    {
      "pattern": "Architecture pattern name (e.g., Microservices, Monolithic, Layered)",
      "rationale": "Why this pattern fits the project requirements",
      "frameworks": ["List", "of", "recommended", "frameworks"],
      "folderStructure": [
        {"directory": "src/", "purpose": "Application source code"},
        {"directory": "tests/", "purpose": "Test files"}
      ],
      "ciCdSetup": "Recommended CI/CD pipeline setup (e.g., GitHub Actions → Build → Test → Deploy)",
      "bestPractices": ["Practice 1", "Practice 2", "Practice 3"]
    }
  ],
  "reasoning": "Overall architectural reasoning",
  "alternatives": ["Alternative 1", "Alternative 2"],
  "risks": ["Risk 1", "Risk 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

IMPORTANT:
- Be specific and actionable
- Consider scalability and maintainability
- Suggest modern best practices
- Include security considerations
- Provide clear rationale for each suggestion`;
}

/**
 * Parse LLM response into structured suggestions
 */
function parseArchitectureSuggestions(response: string): SuggestionResponse {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response;

    // Try to find JSON block
    const jsonMatch = response.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else if (response.startsWith('{')) {
      jsonStr = response;
    } else {
      // Try to extract JSON object
      const startIdx = response.indexOf('{');
      const endIdx = response.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = response.substring(startIdx, endIdx + 1);
      }
    }

    const parsed = JSON.parse(jsonStr);

    // Validate structure
    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
      throw new Error('Invalid response structure: missing suggestions array');
    }

    return {
      suggestions: parsed.suggestions,
      reasoning: parsed.reasoning || 'No reasoning provided',
      alternatives: parsed.alternatives || [],
      risks: parsed.risks || [],
      recommendations: parsed.recommendations || []
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parsing error';
    throw new Error(`Failed to parse architecture suggestions: ${message}`);
  }
}

/**
 * Format suggestions for display in UI
 */
export function formatSuggestionsForDisplay(response: SuggestionResponse): string {
  let output = `## Architecture Suggestions\n\n`;

  response.suggestions.forEach((suggestion, index) => {
    output += `### Option ${index + 1}: ${suggestion.pattern}\n`;
    output += `**Rationale:** ${suggestion.rationale}\n\n`;

    output += `**Recommended Frameworks:**\n`;
    suggestion.frameworks.forEach(fw => {
      output += `- ${fw}\n`;
    });

    output += `\n**Folder Structure:**\n`;
    suggestion.folderStructure.forEach(folder => {
      output += `- \`${folder.directory}\` - ${folder.purpose}\n`;
    });

    output += `\n**CI/CD Setup:** ${suggestion.ciCdSetup}\n\n`;

    output += `**Best Practices:**\n`;
    suggestion.bestPractices.forEach(practice => {
      output += `- ${practice}\n`;
    });

    output += `\n---\n\n`;
  });

  if (response.recommendations.length > 0) {
    output += `## Recommendations\n`;
    response.recommendations.forEach(rec => {
      output += `- ${rec}\n`;
    });
    output += `\n`;
  }

  if (response.risks.length > 0) {
    output += `## Risks to Consider\n`;
    response.risks.forEach(risk => {
      output += `- ${risk}\n`;
    });
  }

  return output;
}
