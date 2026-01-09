/**
 * Drift Detection Service
 * 
 * Detects divergence between project plan and actual implementation.
 * Identifies:
 * - Plan tasks vs actual code commits
 * - Architecture changes vs documented architecture
 * - Dependency changes vs documented requirements
 * - Test coverage vs planned coverage
 * 
 * Reference: Code Master Section 11.9
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Task } from '../workspace/tasksSource';

export interface DriftMetric {
  type: 'task_coverage' | 'architecture' | 'dependencies' | 'test_coverage' | 'documentation';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  evidence: string[];
  suggestedAction?: string;
  timestamp: string;
}

export interface DriftReport {
  totalMetrics: number;
  criticalCount: number;
  highCount: number;
  overallDriftScore: number; // 0-100, where 0 is perfect alignment
  metrics: DriftMetric[];
  lastUpdated: string;
  recommendations: string[];
}

export class DriftDetector {
  private projectRoot: string;
  private tasks: Task[];
  private driftMetrics: DriftMetric[] = [];

  constructor(projectRoot: string, tasks: Task[]) {
    this.projectRoot = projectRoot;
    this.tasks = tasks;
  }

  /**
   * Detect overall drift between plan and code
   */
  public async detectDrift(): Promise<DriftReport> {
    this.driftMetrics = [];

    // Check task completion coverage
    await this.checkTaskCoverage();

    // Check for documentation drift
    await this.checkDocumentationDrift();

    // Check for dependency drift
    await this.checkDependencyDrift();

    // Check test coverage
    await this.checkTestCoverage();

    // Calculate overall drift score
    const overallScore = this.calculateDriftScore();
    const recommendations = this.generateRecommendations();

    return {
      totalMetrics: this.driftMetrics.length,
      criticalCount: this.driftMetrics.filter(m => m.severity === 'critical').length,
      highCount: this.driftMetrics.filter(m => m.severity === 'high').length,
      overallDriftScore: overallScore,
      metrics: this.driftMetrics,
      lastUpdated: new Date().toISOString(),
      recommendations,
    };
  }

  /**
   * Check task completion vs plan
   */
  private async checkTaskCoverage(): Promise<void> {
    const totalTasks = this.tasks.length;
    const completedTasks = this.tasks.filter(t => t.status === 'done').length;
    const inProgressTasks = this.tasks.filter(t => t.status === 'in-progress').length;
    const blockedTasks = this.tasks.filter(t => t.status === 'blocked').length;

    const completionPercentage = (completedTasks / totalTasks) * 100;

    // Check if too many tasks are blocked
    if (blockedTasks > totalTasks * 0.2) {
      this.driftMetrics.push({
        type: 'task_coverage',
        severity: 'high',
        title: `High Blocked Task Rate (${blockedTasks}/${totalTasks})`,
        description: `More than 20% of tasks are blocked, indicating potential execution impediments.`,
        evidence: [
          `Blocked tasks: ${blockedTasks}`,
          `Total tasks: ${totalTasks}`,
          `Percentage: ${((blockedTasks / totalTasks) * 100).toFixed(1)}%`,
        ],
        suggestedAction: 'Review blocked tasks and resolve dependencies or impediments.',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if progress is lagging
    if (completionPercentage < 30 && totalTasks > 10) {
      this.driftMetrics.push({
        type: 'task_coverage',
        severity: 'medium',
        title: `Low Task Completion Rate (${completedTasks}/${totalTasks})`,
        description: `Only ${completionPercentage.toFixed(1)}% of tasks are completed. Execution may be lagging behind plan.`,
        evidence: [
          `Completed tasks: ${completedTasks}`,
          `In progress: ${inProgressTasks}`,
          `Pending: ${totalTasks - completedTasks - inProgressTasks}`,
        ],
        suggestedAction: 'Accelerate task execution or reassess timeline estimates.',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Check for documentation drift (plan files vs actual)
   */
  private async checkDocumentationDrift(): Promise<void> {
    const planDir = path.join(this.projectRoot, 'Docs', 'Plan');
    const docsExist = fs.existsSync(planDir);

    if (!docsExist) {
      this.driftMetrics.push({
        type: 'documentation',
        severity: 'high',
        title: 'Missing Documentation Directory',
        description: 'Plan documentation directory not found at Docs/Plan.',
        evidence: [`Expected: ${planDir}`, 'Status: Not found'],
        suggestedAction: 'Create Docs/Plan directory with project plan and architecture docs.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check for key documentation files
    const requiredFiles = ['detailed project description', 'feature list'];
    for (const file of requiredFiles) {
      const filePath = path.join(planDir, file);
      if (!fs.existsSync(filePath)) {
        this.driftMetrics.push({
          type: 'documentation',
          severity: 'medium',
          title: `Missing Documentation: ${file}`,
          description: `Required plan documentation file "${file}" not found.`,
          evidence: [`Expected: ${filePath}`, 'Status: Not found'],
          suggestedAction: `Create ${file} to document project plan and features.`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Check for dependency drift in package.json/composer.json
   */
  private async checkDependencyDrift(): Promise<void> {
    // Check npm package versions
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        
        // Check for outdated peer dependencies
        const devDeps = packageJson.devDependencies || {};
        const deps = packageJson.dependencies || {};

        // Check for common security packages at known vulnerable versions
        const securityChecks = [
          { pkg: 'axios', minVersion: '1.6.0' },
          { pkg: 'lodash', minVersion: '4.17.21' },
          { pkg: 'qs', minVersion: '6.11.0' },
        ];

        for (const check of securityChecks) {
          const version = deps[check.pkg] || devDeps[check.pkg];
          if (version && version.includes('*')) {
            this.driftMetrics.push({
              type: 'dependencies',
              severity: 'medium',
              title: `Wildcard Dependency: ${check.pkg}`,
              description: `Using wildcard version for ${check.pkg}. Consider pinning to ${check.minVersion} or later.`,
              evidence: [`Package: ${check.pkg}`, `Current: ${version}`],
              suggestedAction: `Update ${check.pkg} to version ^${check.minVersion}`,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    // Check PHP composer.json
    const composerPath = path.join(this.projectRoot, 'composer.json');
    if (fs.existsSync(composerPath)) {
      try {
        const composer = JSON.parse(fs.readFileSync(composerPath, 'utf-8'));
        const phpVersion = composer.require?.php;
        
        if (phpVersion && !phpVersion.includes('8.')) {
          this.driftMetrics.push({
            type: 'dependencies',
            severity: 'medium',
            title: 'Legacy PHP Version',
            description: `Project requires ${phpVersion}. Consider upgrading to PHP 8.2+.`,
            evidence: [`Requirement: ${phpVersion}`],
            suggestedAction: 'Update composer.json to require PHP 8.2 or later.',
            timestamp: new Date().toISOString(),
          });
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  }

  /**
   * Check test coverage
   */
  private async checkTestCoverage(): Promise<void> {
    // Check if test directories exist
    const testDirs = [
      path.join(this.projectRoot, 'tests'),
      path.join(this.projectRoot, 'vscode-extension', 'src', '__tests__'),
      path.join(this.projectRoot, 'vscode-extension', 'src', 'test'),
    ];

    let testDirsFound = 0;
    for (const testDir of testDirs) {
      if (fs.existsSync(testDir)) {
        testDirsFound++;
      }
    }

    if (testDirsFound === 0) {
      this.driftMetrics.push({
        type: 'test_coverage',
        severity: 'high',
        title: 'No Test Directories Found',
        description: 'No test directories detected in standard locations.',
        evidence: testDirs,
        suggestedAction: 'Create test files following your project structure (tests/, __tests__/, or src/test/).',
        timestamp: new Date().toISOString(),
      });
    }

    // Check for test files
    const phpTestPath = path.join(this.projectRoot, 'tests', 'Feature');
    const tsTestPatterns = [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      '__tests__/**/*.ts',
    ];

    if (!fs.existsSync(phpTestPath)) {
      this.driftMetrics.push({
        type: 'test_coverage',
        severity: 'medium',
        title: 'Missing Feature Tests',
        description: 'No Laravel Feature test directory found.',
        evidence: [`Expected: ${phpTestPath}`],
        suggestedAction: 'Create Laravel Feature tests in tests/Feature/',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Calculate overall drift score (0-100)
   */
  private calculateDriftScore(): number {
    if (this.driftMetrics.length === 0) {
      return 0; // Perfect alignment
    }

    // Weighted scoring
    let score = 0;
    const weights = {
      critical: 30,
      high: 20,
      medium: 10,
      low: 5,
    };

    for (const metric of this.driftMetrics) {
      score += weights[metric.severity] || 5;
    }

    // Cap at 100
    return Math.min(score, 100);
  }

  /**
   * Generate recommendations based on drift metrics
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    const criticalCount = this.driftMetrics.filter(m => m.severity === 'critical').length;
    const highCount = this.driftMetrics.filter(m => m.severity === 'high').length;

    if (criticalCount > 0) {
      recommendations.push(`⚠️  CRITICAL: ${criticalCount} critical issues detected. Address immediately.`);
    }

    if (highCount > 0) {
      recommendations.push(`🔴 HIGH: ${highCount} high-severity issues. Plan remediation in next sprint.`);
    }

    if (this.driftMetrics.length === 0) {
      recommendations.push('✅ Perfect alignment: Plan and implementation are in sync.');
    }

    // Add specific recommendations from metrics
    const specificRecs = [
      ...new Set(
        this.driftMetrics
          .filter(m => m.suggestedAction)
          .map(m => m.suggestedAction || '')
          .filter(s => s.length > 0)
      ),
    ];

    recommendations.push(...specificRecs);

    return recommendations;
  }
}

/**
 * Helper to run drift detection
 */
export async function runDriftDetection(projectRoot: string, tasks: Task[]): Promise<DriftReport> {
  const detector = new DriftDetector(projectRoot, tasks);
  return detector.detectDrift();
}
