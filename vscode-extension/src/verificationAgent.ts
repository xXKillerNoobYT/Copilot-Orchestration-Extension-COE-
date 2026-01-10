import { ParsedTask } from './taskParser';

export interface VerificationResult {
  approved: boolean;
  status: 'complete' | 'incomplete' | 'needs-revision';
  score: number; // 0-100
  checklist: ChecklistItem[];
  issues: Issue[];
  recommendations: string[];
  signedOff: boolean;
  reviewer: string;
  timestamp: string;
}

export interface ChecklistItem {
  criterion: string;
  met: boolean;
  notes?: string;
  weight: number; // Importance 1-10
}

export interface Issue {
  severity: 'critical' | 'major' | 'minor';
  description: string;
  location?: string;
  suggestion?: string;
}

export interface VerificationOptions {
  strictMode?: boolean;
  requiredScore?: number;
  customCriteria?: string[];
  reviewerName?: string;
}

export class VerificationAgent {
  private readonly strictMode: boolean;
  private readonly requiredScore: number;
  private readonly reviewerName: string;

  constructor(options?: VerificationOptions) {
    this.strictMode = options?.strictMode ?? false;
    this.requiredScore = options?.requiredScore ?? 70;
    this.reviewerName = options?.reviewerName ?? 'VerificationAgent';
  }

  /**
   * Verify task output against task description and requirements
   */
  async verify(
    task: ParsedTask,
    output: string,
    options?: { context?: string; testResults?: any }
  ): Promise<VerificationResult> {
    const checklist: ChecklistItem[] = [];
    const issues: Issue[] = [];
    const recommendations: string[] = [];

    // 1. Completeness check
    const completeness = this.checkCompleteness(task, output);
    checklist.push(completeness);
    if (!completeness.met) {
      issues.push({
        severity: 'major',
        description: 'Output appears incomplete',
        suggestion: 'Ensure all task requirements are addressed',
      });
    }

    // 2. Relevance check
    const relevance = this.checkRelevance(task, output);
    checklist.push(relevance);
    if (!relevance.met) {
      issues.push({
        severity: 'major',
        description: 'Output does not appear relevant to task',
        suggestion: 'Review task description and align output accordingly',
      });
    }

    // 3. Quality check
    const quality = this.checkQuality(output);
    checklist.push(quality);
    if (!quality.met) {
      issues.push({
        severity: 'minor',
        description: 'Output quality could be improved',
        suggestion: 'Add more detail, examples, or documentation',
      });
    }

    // 4. Format check
    const format = this.checkFormat(output);
    checklist.push(format);
    if (!format.met) {
      issues.push({
        severity: 'minor',
        description: 'Output formatting needs improvement',
        suggestion: 'Use consistent formatting and structure',
      });
    }

    // 5. Dependency check
    if (task.dependencies && task.dependencies.length > 0) {
      const dependencies = this.checkDependencies(task, output);
      checklist.push(dependencies);
      if (!dependencies.met) {
        issues.push({
          severity: 'major',
          description: 'Dependencies not properly addressed',
          suggestion: `Review dependencies: ${task.dependencies.join(', ')}`,
        });
      }
    }

    // 6. Type-specific checks
    const typeCheck = this.checkTaskType(task, output);
    checklist.push(typeCheck);
    if (!typeCheck.met) {
      recommendations.push(`Consider ${task.type}-specific best practices`);
    }

    // 7. Test results integration
    if (options?.testResults) {
      const testCheck = this.checkTestResults(options.testResults);
      checklist.push(testCheck);
      if (!testCheck.met) {
        issues.push({
          severity: 'critical',
          description: 'Tests failed',
          suggestion: 'Fix failing tests before marking complete',
        });
      }
    }

    // Calculate score
    const score = this.calculateScore(checklist);
    const approved = score >= this.requiredScore && issues.filter(i => i.severity === 'critical').length === 0;
    
    // Determine status
    let status: 'complete' | 'incomplete' | 'needs-revision';
    if (approved && score >= 90) {
      status = 'complete';
    } else if (score >= this.requiredScore) {
      status = 'needs-revision';
    } else {
      status = 'incomplete';
    }

    // Sign off only if approved in non-strict mode, or if perfect score in strict mode
    const signedOff = this.strictMode ? (score === 100 && issues.length === 0) : approved;

    // Add recommendations
    if (score < 100) {
      recommendations.push('Review all checklist items and address unmet criteria');
    }
    if (issues.length > 0) {
      recommendations.push('Resolve all issues before final approval');
    }

    return {
      approved,
      status,
      score,
      checklist,
      issues,
      recommendations,
      signedOff,
      reviewer: this.reviewerName,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check if output is complete
   */
  private checkCompleteness(task: ParsedTask, output: string): ChecklistItem {
    const outputLength = output.trim().length;
    const hasContent = outputLength > 100;
    const mentionsTask = this.containsKeywords(output, this.extractKeywords(task.title));
    const hasDescription = task.description ? this.containsKeywords(output, this.extractKeywords(task.description)) : true;

    const met = hasContent && (mentionsTask || hasDescription);

    return {
      criterion: 'Completeness - Output addresses task requirements',
      met,
      notes: met ? 'Output appears complete' : `Output length: ${outputLength} chars, mentions task: ${mentionsTask}`,
      weight: 10,
    };
  }

  /**
   * Check if output is relevant to task
   */
  private checkRelevance(task: ParsedTask, output: string): ChecklistItem {
    const keywords = [
      ...this.extractKeywords(task.title),
      ...this.extractKeywords(task.description),
    ];

    const relevanceScore = this.calculateKeywordRelevance(output, keywords);
    const met = relevanceScore > 0.3; // At least 30% keyword match

    return {
      criterion: 'Relevance - Output relates to task context',
      met,
      notes: `Relevance score: ${(relevanceScore * 100).toFixed(1)}%`,
      weight: 9,
    };
  }

  /**
   * Check output quality
   */
  private checkQuality(output: string): ChecklistItem {
    const hasCodeBlocks = /```[\s\S]*?```/g.test(output);
    const hasStructure = /#{1,6}\s+/g.test(output) || /\n\n/g.test(output);
    const hasSubstance = output.length > 300;
    const hasDetails = output.split('\n').length > 10;

    const qualityPoints = [hasCodeBlocks, hasStructure, hasSubstance, hasDetails].filter(Boolean).length;
    const met = qualityPoints >= 2;

    return {
      criterion: 'Quality - Output is well-structured and detailed',
      met,
      notes: `Quality indicators: ${qualityPoints}/4 (code blocks, structure, substance, details)`,
      weight: 8,
    };
  }

  /**
   * Check output formatting
   */
  private checkFormat(output: string): ChecklistItem {
    const hasHeadings = /#{1,6}\s+/g.test(output);
    const hasLists = /^[\s]*[-*+]\s+/gm.test(output) || /^\d+\.\s+/gm.test(output);
    const hasLineBreaks = output.includes('\n\n');
    const notTooLong = output.split('\n').every(line => line.length < 200);

    const formatPoints = [hasHeadings, hasLists, hasLineBreaks, notTooLong].filter(Boolean).length;
    const met = formatPoints >= 2;

    return {
      criterion: 'Format - Output uses proper formatting',
      met,
      notes: `Format indicators: ${formatPoints}/4 (headings, lists, breaks, line length)`,
      weight: 6,
    };
  }

  /**
   * Check if dependencies are addressed
   */
  private checkDependencies(task: ParsedTask, output: string): ChecklistItem {
    if (!task.dependencies || task.dependencies.length === 0) {
      return {
        criterion: 'Dependencies - No dependencies to check',
        met: true,
        notes: 'No dependencies specified',
        weight: 5,
      };
    }

    // Check if dependency IDs or related terms appear in output
    const mentionedDeps = task.dependencies.filter(dep =>
      output.includes(dep) || output.toLowerCase().includes(dep.toLowerCase())
    );

    const met = mentionedDeps.length >= task.dependencies.length * 0.5; // At least 50% mentioned

    return {
      criterion: 'Dependencies - Output acknowledges task dependencies',
      met,
      notes: `${mentionedDeps.length}/${task.dependencies.length} dependencies referenced`,
      weight: 7,
    };
  }

  /**
   * Check task type-specific requirements
   */
  private checkTaskType(task: ParsedTask, output: string): ChecklistItem {
    const taskType = task.type || 'feature';
    let typeSpecificCheck = false;
    let notes = '';

    switch (taskType) {
      case 'bug':
        // Bug fixes should mention the issue and solution
        typeSpecificCheck = /fix|resolve|solve|issue|bug/i.test(output);
        notes = typeSpecificCheck ? 'Mentions fix/resolution' : 'Should describe the fix';
        break;

      case 'feature':
        // Features should describe implementation
        typeSpecificCheck = /implement|add|create|feature|functionality/i.test(output);
        notes = typeSpecificCheck ? 'Describes implementation' : 'Should describe feature implementation';
        break;

      case 'refactor':
        // Refactoring should mention improvements
        typeSpecificCheck = /refactor|improve|optimize|clean|restructure/i.test(output);
        notes = typeSpecificCheck ? 'Mentions improvements' : 'Should describe refactoring changes';
        break;

      case 'testing':
        // Testing should include test cases
        typeSpecificCheck = /test|spec|expect|assert|should/i.test(output);
        notes = typeSpecificCheck ? 'Includes test terminology' : 'Should include test cases';
        break;

      case 'documentation':
        // Documentation should be comprehensive
        typeSpecificCheck = output.length > 500 && /example|usage|API|guide/i.test(output);
        notes = typeSpecificCheck ? 'Comprehensive documentation' : 'Should include examples and usage';
        break;

      default:
        typeSpecificCheck = true;
        notes = 'Generic task type';
    }

    return {
      criterion: `Task Type (${taskType}) - Type-specific requirements met`,
      met: typeSpecificCheck,
      notes,
      weight: 7,
    };
  }

  /**
   * Check test results
   */
  private checkTestResults(testResults: any): ChecklistItem {
    const passed = testResults?.passed ?? false;
    const total = testResults?.total ?? 0;
    const passCount = testResults?.passCount ?? 0;

    return {
      criterion: 'Tests - All tests pass',
      met: passed && total > 0,
      notes: `${passCount}/${total} tests passed`,
      weight: 10,
    };
  }

  /**
   * Calculate overall score from checklist
   */
  private calculateScore(checklist: ChecklistItem[]): number {
    const totalWeight = checklist.reduce((sum, item) => sum + item.weight, 0);
    const earnedWeight = checklist
      .filter(item => item.met)
      .reduce((sum, item) => sum + item.weight, 0);

    return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Remove common words and extract meaningful terms
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));

    return [...new Set(words)]; // Unique keywords
  }

  /**
   * Check if output contains keywords
   */
  private containsKeywords(output: string, keywords: string[]): boolean {
    const lowerOutput = output.toLowerCase();
    return keywords.some(keyword => lowerOutput.includes(keyword));
  }

  /**
   * Calculate keyword relevance score
   */
  private calculateKeywordRelevance(output: string, keywords: string[]): number {
    if (keywords.length === 0) return 1;

    const lowerOutput = output.toLowerCase();
    const matchedKeywords = keywords.filter(keyword => lowerOutput.includes(keyword));

    return matchedKeywords.length / keywords.length;
  }

  /**
   * Generate verification report
   */
  generateReport(result: VerificationResult): string {
    const statusEmoji = result.approved ? '✅' : '❌';
    const signOffEmoji = result.signedOff ? '✍️ SIGNED OFF' : '⏳ PENDING';

    const report = `
# Verification Report ${statusEmoji}

**Status:** ${result.status.toUpperCase()}  
**Score:** ${result.score}/100  
**Approved:** ${result.approved ? 'Yes' : 'No'}  
**Signed Off:** ${signOffEmoji}  
**Reviewer:** ${result.reviewer}  
**Timestamp:** ${new Date(result.timestamp).toLocaleString()}

---

## Checklist (${result.checklist.filter(c => c.met).length}/${result.checklist.length} passed)

${result.checklist
  .map(
    item =>
      `${item.met ? '✅' : '❌'} **${item.criterion}** (Weight: ${item.weight}/10)  
   ${item.notes ? `   _${item.notes}_` : ''}`
  )
  .join('\n\n')}

---

## Issues (${result.issues.length})

${
  result.issues.length > 0
    ? result.issues
        .map(
          issue =>
            `### ${issue.severity.toUpperCase()}: ${issue.description}
${issue.location ? `**Location:** ${issue.location}  ` : ''}
${issue.suggestion ? `**Suggestion:** ${issue.suggestion}` : ''}`
        )
        .join('\n\n')
    : '_No issues found._'
}

---

## Recommendations

${
  result.recommendations.length > 0
    ? result.recommendations.map(rec => `- ${rec}`).join('\n')
    : '_No additional recommendations._'
}

---

## Summary

${
  result.approved
    ? '✅ **Task output meets requirements and is approved.**'
    : '❌ **Task output requires revision before approval.**'
}

${
  result.signedOff
    ? '✍️ **Formally signed off and ready for completion.**'
    : '⏳ **Awaiting final sign-off after revisions.**'
}
`;

    return report.trim();
  }

  /**
   * Quick verify with default options
   */
  async quickVerify(task: ParsedTask, output: string): Promise<boolean> {
    const result = await this.verify(task, output);
    return result.approved;
  }
}

/**
 * Default verification agent instance
 */
export const defaultVerificationAgent = new VerificationAgent();

/**
 * Utility: Verify and generate report in one call
 */
export async function verifyAndReport(
  task: ParsedTask,
  output: string,
  options?: VerificationOptions
): Promise<string> {
  const agent = new VerificationAgent(options);
  const result = await agent.verify(task, output);
  return agent.generateReport(result);
}
