/**
 * Context Import Service
 * 
 * Handles loading, parsing, and analyzing uploaded files and pasted content
 * for the Plan Builder wizard.
 */

import * as vscode from 'vscode';
import * as path from 'path';

interface WorkspaceFile {
  path: string;
  size: number;
  type: string;
}

interface ContextAnalysis {
  suggestedTemplate: string;
  topics: string[];
  summary: string;
  estimatedDuration: string;
  recommendedTeamSize: number;
}

export class ContextImportService {
  private backendUrl: string;

  constructor() {
    // Get backend URL from VS Code configuration
    this.backendUrl = vscode.workspace.getConfiguration('copilot-orchestrator').get('backendUrl') || 'http://localhost:8000';
  }

  /**
   * Find relevant files in workspace (README, architecture docs, etc.)
   */
  async findWorkspaceFiles(): Promise<WorkspaceFile[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return [];
    }

    const files: WorkspaceFile[] = [];
    const patterns = [
      '**/README.md',
      '**/readme.md',
      '**/architecture.md',
      '**/ARCHITECTURE.md',
      '**/requirements.md',
      '**/REQUIREMENTS.md',
      '**/requirements.json',
      '**/requirements.yaml',
      '**/package.json',
      '**/tsconfig.json',
      '**/openapi.json',
      '**/openapi.yaml',
      '**/.github/workflows/*.yml',
      '**/PRD.md',
      '**/PRD.json',
    ];

    for (const folder of workspaceFolders) {
      for (const pattern of patterns) {
        const found = await vscode.workspace.findFiles(
          new vscode.RelativePattern(folder, pattern),
          '**/node_modules/**',
          100
        );

        for (const uri of found) {
          try {
            const stat = await vscode.workspace.fs.stat(uri);
            // Only include files under 10MB
            if (stat.size < 10 * 1024 * 1024) {
              files.push({
                path: vscode.workspace.asRelativePath(uri),
                size: stat.size,
                type: this.getFileType(uri.path)
              });
            }
          } catch (error) {
            // Skip files that can't be accessed
            console.warn(`Could not access file ${uri.path}:`, error);
          }
        }
      }
    }

    // Remove duplicates based on path
    return Array.from(new Map(files.map(f => [f.path, f])).values());
  }

  /**
   * Read file from workspace
   */
  async readWorkspaceFile(filePath: string): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      throw new Error('No workspace folder open');
    }

    const uri = vscode.Uri.joinPath(workspaceFolders[0].uri, filePath);
    const content = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder().decode(content);
  }

  /**
   * Analyze imported content and suggest template
   * Calls backend API for AI analysis
   */
  async analyzeContext(content: string): Promise<ContextAnalysis> {
    try {
      // Call backend API
      const response = await fetch(`${this.backendUrl}/api/v1/plans/analyze-context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Backend analysis failed');
      }

      return {
        suggestedTemplate: data.suggestedTemplate,
        topics: data.topics,
        summary: data.summary,
        estimatedDuration: data.estimatedDuration,
        recommendedTeamSize: data.recommendedTeamSize
      };
    } catch (error) {
      // Fallback to local analysis if backend is unavailable
      console.warn('Backend unavailable, using fallback analysis:', error);
      return this.fallbackAnalyze(content);
    }
  }

  /**
   * Fallback analysis when backend is unavailable
   */
  private fallbackAnalyze(content: string): ContextAnalysis {
    const topics = this.extractTopics(content);
    const suggestedTemplate = this.suggestTemplate(topics);

    return {
      suggestedTemplate,
      topics,
      summary: this.generateSummary(content),
      estimatedDuration: this.estimateDuration(topics),
      recommendedTeamSize: this.estimateTeamSize(topics)
    };
  }

  /**
   * Extract topics from content
   */
  private extractTopics(content: string): string[] {
    const topics = new Set<string>();
    const lowerContent = content.toLowerCase();

    const keywordMap: { [key: string]: string[] } = {
      'api': ['rest api', 'graphql', 'api', 'endpoint', 'http', 'request', 'response'],
      'database': ['database', 'sql', 'mongodb', 'postgres', 'mysql', 'redis', 'cache'],
      'frontend': ['react', 'vue', 'angular', 'ui', 'component', 'frontend', 'web app'],
      'backend': ['backend', 'server', 'node', 'python', 'go', 'java', 'service'],
      'mobile': ['mobile', 'ios', 'android', 'react native', 'flutter'],
      'devops': ['docker', 'kubernetes', 'ci/cd', 'deployment', 'infrastructure', 'cloud'],
      'authentication': ['auth', 'login', 'oauth', 'jwt', 'session', 'password'],
      'testing': ['test', 'jest', 'unittest', 'integration test', 'e2e', 'qc'],
      'monitoring': ['monitoring', 'logging', 'sentry', 'metrics', 'alerting'],
      'documentation': ['documentation', 'docs', 'api docs', 'openapi', 'swagger']
    };

    for (const [topic, keywords] of Object.entries(keywordMap)) {
      if (keywords.some(kw => lowerContent.includes(kw))) {
        topics.add(topic);
      }
    }

    return Array.from(topics);
  }

  /**
   * Suggest template based on detected topics
   */
  private suggestTemplate(topics: string[]): string {
    if (topics.includes('api') && !topics.includes('frontend')) {
      return 'core-api-service';
    }
    if (topics.includes('frontend') && !topics.includes('api')) {
      return 'core-web-app';
    }
    if (topics.includes('frontend') && topics.includes('api')) {
      return 'core-web-app';
    }
    if (topics.includes('mobile')) {
      return 'core-web-app'; // Use web-app as fallback for mobile
    }
    return 'core-blank';
  }

  /**
   * Generate summary of content
   */
  private generateSummary(content: string): string {
    // Extract first few sentences
    const sentences = content.split(/[.!?]+/).slice(0, 3).join('. ');
    const summary = sentences.substring(0, 200);
    return summary + (summary.length >= 200 ? '...' : '');
  }

  /**
   * Estimate project duration based on topics
   */
  private estimateDuration(topics: string[]): string {
    if (topics.length > 5) {
      return '3-6 months';
    }
    if (topics.length > 3) {
      return '1-3 months';
    }
    return '2-4 weeks';
  }

  /**
   * Estimate team size based on topics
   */
  private estimateTeamSize(topics: string[]): number {
    if (topics.includes('frontend') && topics.includes('api')) {
      return 3; // Full-stack
    }
    if (topics.includes('devops')) {
      return 2;
    }
    return 1;
  }

  /**
   * Get file type from path
   */
  private getFileType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const typeMap: { [key: string]: string } = {
      '.md': 'markdown',
      '.txt': 'text',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.pdf': 'pdf'
    };
    return typeMap[ext] || 'unknown';
  }
}
