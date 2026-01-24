/**
 * Live Preview System
 * 
 * Real-time preview update engine for the Plan Builder wizard.
 * Connects wizard answers to design preview with <200ms latency.
 * Shows live design updates as user answers questions.
 * 
 * Reference: Code Master Section 9 - Interactive Design Phase
 */

import { WizardState } from './wizardState';

export interface PreviewPageSection {
  id: string;
  title: string;
  description: string;
  icon?: string;
  status: 'planned' | 'in-progress' | 'incomplete' | 'complete';
  compatibility?: string[];
  issues?: string[];
}

export interface PreviewDesignState {
  projectName: string;
  description: string;
  architecture: string;
  pages: PreviewPageSection[];
  usersSection: PreviewPageSection;
  adminSection: PreviewPageSection;
  reportsSection: PreviewPageSection;
  settingsSection: PreviewPageSection;
  estimatedHours: number;
  riskLevel: 'low' | 'medium' | 'high';
  compatibilityIssues: string[];
  lastUpdated: number;
}

export interface PreviewUpdateEvent {
  timestamp: number;
  latency: number; // ms
  changedAnswerIds: string[];
  previewState: PreviewDesignState;
}

export class LivePreviewEngine {
  private lastPreviewState: PreviewDesignState | null = null;
  private updateListeners: ((event: PreviewUpdateEvent) => void)[] = [];
  private updateThrottleMs = 100; // Throttle updates to 100ms
  private lastUpdateTime = 0;
  private pendingUpdate: {
    answers: Record<string, unknown>;
    changedAnswers: string[];
  } | null = null;
  private updateTimer: NodeJS.Timeout | null = null;

  constructor() {}

  /**
   * Register a listener for preview updates
   */
  onPreviewUpdate(callback: (event: PreviewUpdateEvent) => void): () => void {
    this.updateListeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.updateListeners = this.updateListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Generate preview state from wizard answers
   * Called when wizard answers change
   */
  updatePreview(
    wizardAnswers: Record<string, unknown>,
    changedAnswers: string[] = []
  ): PreviewUpdateEvent {
    const startTime = performance.now();

    // Throttle updates to prevent excessive re-renders
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.pendingUpdate = { answers: wizardAnswers, changedAnswers };

    return new Promise((resolve) => {
      this.updateTimer = setTimeout(() => {
        if (!this.pendingUpdate) return;

        const { answers, changedAnswers: pendingChanged } = this.pendingUpdate;
        const previewState = this.generatePreviewState(answers);
        const latency = performance.now() - startTime;

        const event: PreviewUpdateEvent = {
          timestamp: Date.now(),
          latency,
          changedAnswerIds: pendingChanged,
          previewState,
        };

        this.lastPreviewState = previewState;
        this.lastUpdateTime = Date.now();

        // Notify all listeners
        this.updateListeners.forEach(listener => {
          try {
            listener(event);
          } catch (error) {
            console.error('Error in preview update listener:', error);
          }
        });

        this.pendingUpdate = null;
        this.updateTimer = null;

        resolve(event);
      }, this.updateThrottleMs);
    }) as any;
  }

  /**
   * Get current preview state
   */
  getCurrentPreview(): PreviewDesignState | null {
    return this.lastPreviewState;
  }

  /**
   * Generate preview design state from wizard answers
   * Maps wizard questions to design components
   */
  private generatePreviewState(answers: Record<string, unknown>): PreviewDesignState {
    const projectName = (answers['projectName'] as string) || 'Unnamed Project';
    const projectDescription = (answers['projectDescription'] as string) || '';
    const architecture = (answers['architecture'] as string) || 'mvc';
    const userRole = (answers['userRole'] as string) || 'designer';

    // Extract feature requirements
    const hasAuthentication = this.isFeatureEnabled(answers, 'authentication');
    const hasReporting = this.isFeatureEnabled(answers, 'reporting');
    const hasAdmin = this.isFeatureEnabled(answers, 'administration');
    const hasAPIIntegration = this.isFeatureEnabled(answers, 'apiIntegration');

    const pages: PreviewPageSection[] = this.generatePageSections(
      answers,
      hasAuthentication,
      hasReporting,
      hasAdmin
    );

    const compatibilityIssues = this.checkCompatibilityIssues(
      answers,
      architecture,
      hasAPIIntegration
    );

    const estimatedHours = this.estimateProjectHours(
      pages.length,
      hasReporting,
      hasAdmin,
      hasAPIIntegration
    );

    const riskLevel = this.assessRiskLevel(pages, compatibilityIssues, architecture);

    return {
      projectName,
      description: projectDescription,
      architecture,
      pages,
      usersSection: this.generateUsersSection(hasAuthentication, answers),
      adminSection: this.generateAdminSection(hasAdmin, answers),
      reportsSection: this.generateReportsSection(hasReporting, answers),
      settingsSection: this.generateSettingsSection(answers),
      estimatedHours,
      riskLevel,
      compatibilityIssues,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Check if a feature is enabled by checking various answer patterns
   */
  private isFeatureEnabled(answers: Record<string, unknown>, feature: string): boolean {
    const enabledFeatures = (answers['enabledFeatures'] as string[]) || [];
    if (enabledFeatures.includes(feature)) return true;

    // Check by specific question keys
    switch (feature) {
      case 'authentication':
        return answers['hasUserAuthentication'] === true || answers['authentication'] === 'yes';
      case 'reporting':
        return answers['needsReporting'] === true || answers['analytics'] === 'yes';
      case 'administration':
        return answers['hasAdminPanel'] === true || answers['administration'] === 'yes';
      case 'apiIntegration':
        return answers['externalAPIs'] === true || answers['integrations'] !== 'none';
      default:
        return false;
    }
  }

  /**
   * Generate main page sections based on answers
   */
  private generatePageSections(
    answers: Record<string, unknown>,
    hasAuth: boolean,
    hasReporting: boolean,
    hasAdmin: boolean
  ): PreviewPageSection[] {
    const pages: PreviewPageSection[] = [];

    // Landing/Home page
    pages.push({
      id: 'landing',
      title: 'Landing Page',
      description: 'Welcome and project overview',
      icon: '🏠',
      status: 'planned',
    });

    // Main dashboard/content page
    pages.push({
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Main content and navigation hub',
      icon: '📊',
      status: 'planned',
    });

    // Authentication pages (if enabled)
    if (hasAuth) {
      pages.push({
        id: 'auth-login',
        title: 'Login',
        description: 'User authentication entry point',
        icon: '🔐',
        status: 'planned',
      });

      pages.push({
        id: 'auth-signup',
        title: 'Registration',
        description: 'New user onboarding',
        icon: '👤',
        status: 'planned',
      });
    }

    // Reporting/Analytics pages (if enabled)
    if (hasReporting) {
      pages.push({
        id: 'reports',
        title: 'Reports',
        description: 'Analytics and data visualization',
        icon: '📈',
        status: 'planned',
      });
    }

    // Admin pages (if enabled)
    if (hasAdmin) {
      pages.push({
        id: 'admin',
        title: 'Administration',
        description: 'Admin dashboard and controls',
        icon: '⚙️',
        status: 'planned',
      });
    }

    // Settings page
    pages.push({
      id: 'settings',
      title: 'Settings',
      description: 'User preferences and configuration',
      icon: '⚡',
      status: 'planned',
    });

    return pages;
  }

  /**
   * Generate users section details
   */
  private generateUsersSection(
    hasAuth: boolean,
    answers: Record<string, unknown>
  ): PreviewPageSection {
    const maxUsers = (answers['expectedUsers'] as number) || 1000;
    const userRoles = (answers['userRoles'] as string[]) || ['user'];

    return {
      id: 'users',
      title: 'Users & Access Control',
      description: `Supports ${maxUsers} users with roles: ${userRoles.join(', ')}`,
      icon: '👥',
      status: hasAuth ? 'in-progress' : 'incomplete',
      compatibility: hasAuth ? ['✓ Authentication enabled'] : ['⚠ No authentication'],
    };
  }

  /**
   * Generate admin section details
   */
  private generateAdminSection(
    hasAdmin: boolean,
    answers: Record<string, unknown>
  ): PreviewPageSection {
    if (!hasAdmin) {
      return {
        id: 'admin',
        title: 'Administration',
        description: 'Admin features not enabled',
        status: 'incomplete',
      };
    }

    const adminFeatures = (answers['adminFeatures'] as string[]) || [
      'user management',
      'settings',
    ];

    return {
      id: 'admin',
      title: 'Administration',
      description: `Admin features: ${adminFeatures.join(', ')}`,
      icon: '⚙️',
      status: 'planned',
      compatibility: adminFeatures.map(f => `✓ ${f}`),
    };
  }

  /**
   * Generate reports section details
   */
  private generateReportsSection(
    hasReporting: boolean,
    answers: Record<string, unknown>
  ): PreviewPageSection {
    if (!hasReporting) {
      return {
        id: 'reports',
        title: 'Reports & Analytics',
        description: 'Reporting features not enabled',
        status: 'incomplete',
      };
    }

    const reportTypes = (answers['reportTypes'] as string[]) || [
      'usage',
      'performance',
    ];

    return {
      id: 'reports',
      title: 'Reports & Analytics',
      description: `Report types: ${reportTypes.join(', ')}`,
      icon: '📊',
      status: 'planned',
      compatibility: reportTypes.map(t => `✓ ${t}`),
    };
  }

  /**
   * Generate settings section details
   */
  private generateSettingsSection(answers: Record<string, unknown>): PreviewPageSection {
    const settings = (answers['settingsOptions'] as string[]) || [
      'profile',
      'notifications',
    ];

    return {
      id: 'settings',
      title: 'Settings & Preferences',
      description: `Configuration: ${settings.join(', ')}`,
      icon: '⚡',
      status: 'planned',
      compatibility: settings.map(s => `✓ ${s}`),
    };
  }

  /**
   * Check for architecture/technology compatibility issues
   */
  private checkCompatibilityIssues(
    answers: Record<string, unknown>,
    architecture: string,
    hasAPIIntegration: boolean
  ): string[] {
    const issues: string[] = [];

    // Check architecture-specific issues
    if (architecture === 'microservices') {
      if (!hasAPIIntegration) {
        issues.push(
          'Microservices architecture requires API integration but none selected'
        );
      }
    }

    // Check technology stack compatibility
    const techStack = (answers['techStack'] as string[]) || [];
    if (techStack.includes('legacy') && techStack.includes('modern')) {
      issues.push('Mixing legacy and modern technologies may cause compatibility issues');
    }

    // Check database requirements
    const hasComplexData = (answers['dataComplexity'] as string) === 'high';
    const database = answers['database'] as string;
    if (hasComplexData && !database) {
      issues.push('Complex data requirements specified but no database selected');
    }

    return issues;
  }

  /**
   * Estimate project hours based on features and complexity
   */
  private estimateProjectHours(
    pageCount: number,
    hasReporting: boolean,
    hasAdmin: boolean,
    hasAPIIntegration: boolean
  ): number {
    let hours = 0;

    // Base hours per page
    hours += pageCount * 8;

    // Feature multipliers
    if (hasReporting) hours += 20;
    if (hasAdmin) hours += 16;
    if (hasAPIIntegration) hours += 24;

    // Add buffer for complexity
    hours = Math.round(hours * 1.15);

    return hours;
  }

  /**
   * Assess overall project risk level
   */
  private assessRiskLevel(
    pages: PreviewPageSection[],
    compatibilityIssues: string[],
    architecture: string
  ): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Higher page count = higher risk
    if (pages.length > 8) riskScore += 2;
    if (pages.length > 12) riskScore += 2;

    // Compatibility issues increase risk
    riskScore += compatibilityIssues.length * 2;

    // Architecture complexity
    if (architecture === 'microservices') riskScore += 1;

    return riskScore >= 5 ? 'high' : riskScore >= 2 ? 'medium' : 'low';
  }

  /**
   * Get preview statistics
   */
  getPreviewStats() {
    if (!this.lastPreviewState) return null;

    const stats = {
      totalPages: this.lastPreviewState.pages.length,
      estimatedHours: this.lastPreviewState.estimatedHours,
      riskLevel: this.lastPreviewState.riskLevel,
      compatibilityIssues: this.lastPreviewState.compatibilityIssues.length,
      lastUpdate: this.lastPreviewState.lastUpdated,
    };

    return stats;
  }
}

// Export singleton instance
export const livePreviewEngine = new LivePreviewEngine();
