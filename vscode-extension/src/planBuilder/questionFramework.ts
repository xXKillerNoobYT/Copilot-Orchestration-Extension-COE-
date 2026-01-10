/**
 * Question Framework for Interactive Plan Builder
 * 
 * Implements the question engine with branching logic and validation
 * for the 10-page guided wizard.
 * 
 * Reference: Code Master Section 9.1-9.3
 */

export type QuestionType = 
  | 'text' 
  | 'select' 
  | 'multi-select' 
  | 'boolean' 
  | 'number' 
  | 'range' 
  | 'file'
  | 'textarea';

export type ValidationRule = {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: string | number;
  message: string;
  validator?: (value: unknown) => boolean;
};

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: unknown;
  options?: QuestionOption[];
  validation?: ValidationRule[];
  showIf?: (answers: Record<string, unknown>) => boolean;
  helpText?: string;
  category?: string;
}

export interface WizardPage {
  id: string;
  title: string;
  description: string;
  icon?: string;
  questions: Question[];
  showIf?: (answers: Record<string, unknown>) => boolean;
}

export class QuestionFramework {
  private pages: WizardPage[];

  constructor() {
    this.pages = this.initializePages();
  }

  /**
   * Get all wizard pages with conditional visibility applied
   */
  getPages(answers: Record<string, unknown> = {}): WizardPage[] {
    return this.pages.filter(page => {
      if (!page.showIf) return true;
      return page.showIf(answers);
    });
  }

  /**
   * Get questions for a specific page with conditional visibility
   */
  getQuestionsForPage(pageId: string, answers: Record<string, unknown> = {}): Question[] {
    const page = this.pages.find(p => p.id === pageId);
    if (!page) return [];

    return page.questions.filter(q => {
      if (!q.showIf) return true;
      return q.showIf(answers);
    });
  }

  /**
   * Validate an answer against question rules
   */
  validateAnswer(questionId: string, value: unknown): { valid: boolean; errors: string[] } {
    const question = this.findQuestion(questionId);
    if (!question) {
      return { valid: false, errors: ['Question not found'] };
    }

    if (!question.validation || question.validation.length === 0) {
      return { valid: true, errors: [] };
    }

    const errors: string[] = [];

    for (const rule of question.validation) {
      switch (rule.type) {
        case 'required':
          if (value === undefined || value === null || value === '') {
            errors.push(rule.message);
          }
          break;

        case 'min':
          if (typeof value === 'string' && value.length < (rule.value as number)) {
            errors.push(rule.message);
          } else if (typeof value === 'number' && value < (rule.value as number)) {
            errors.push(rule.message);
          }
          break;

        case 'max':
          if (typeof value === 'string' && value.length > (rule.value as number)) {
            errors.push(rule.message);
          } else if (typeof value === 'number' && value > (rule.value as number)) {
            errors.push(rule.message);
          }
          break;

        case 'pattern':
          if (typeof value === 'string' && rule.value) {
            const regex = new RegExp(rule.value as string);
            if (!regex.test(value)) {
              errors.push(rule.message);
            }
          }
          break;

        case 'custom':
          if (rule.validator && !rule.validator(value)) {
            errors.push(rule.message);
          }
          break;
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Find a question by ID across all pages
   */
  private findQuestion(questionId: string): Question | undefined {
    for (const page of this.pages) {
      const question = page.questions.find(q => q.id === questionId);
      if (question) return question;
    }
    return undefined;
  }

  /**
   * Initialize all wizard pages with questions
   */
  private initializePages(): WizardPage[] {
    return [
      this.createIntroductionPage(),
      this.createProjectTypePage(),
      this.createArchitecturePage(),
      this.createIntegrationsPage(),
      this.createDeploymentPage(),
      this.createTestingPage(),
      this.createDocumentationPage(),
      this.createTeamPage(),
      this.createTimelinePage(),
      this.createReviewPage(),
    ];
  }

  private createIntroductionPage(): WizardPage {
    return {
      id: 'introduction',
      title: 'Welcome to Plan Builder',
      description: 'Let\'s create a comprehensive plan for your project',
      icon: '🎯',
      questions: [
        {
          id: 'project_name',
          type: 'text',
          title: 'What is your project name?',
          placeholder: 'My Awesome Project',
          validation: [
            { type: 'required', message: 'Project name is required' },
            { type: 'min', value: 3, message: 'Project name must be at least 3 characters' },
          ],
        },
        {
          id: 'project_description',
          type: 'textarea',
          title: 'Describe your project',
          description: 'Provide a brief overview of what you\'re building',
          placeholder: 'A web application that helps users...',
          validation: [
            { type: 'required', message: 'Project description is required' },
            { type: 'min', value: 20, message: 'Please provide more detail (min 20 characters)' },
          ],
        },
      ],
    };
  }

  private createProjectTypePage(): WizardPage {
    return {
      id: 'project_type',
      title: 'Project Type',
      description: 'What type of project are you building?',
      icon: '🏗️',
      questions: [
        {
          id: 'project_category',
          type: 'select',
          title: 'Select your project category',
          options: [
            { value: 'web_app', label: 'Web Application', description: 'Full-stack web application' },
            { value: 'mobile_app', label: 'Mobile Application', description: 'iOS, Android, or cross-platform' },
            { value: 'api', label: 'API/Backend Service', description: 'REST, GraphQL, or gRPC API' },
            { value: 'library', label: 'Library/Package', description: 'Reusable code library' },
            { value: 'cli', label: 'CLI Tool', description: 'Command-line interface' },
            { value: 'desktop', label: 'Desktop Application', description: 'Electron, Tauri, or native' },
            { value: 'extension', label: 'Browser/IDE Extension', description: 'VS Code, Chrome, etc.' },
            { value: 'other', label: 'Other', description: 'Custom project type' },
          ],
          validation: [{ type: 'required', message: 'Please select a project category' }],
        },
        {
          id: 'tech_stack',
          type: 'multi-select',
          title: 'Primary tech stack',
          description: 'Select the main technologies you\'ll use',
          options: [
            { value: 'typescript', label: 'TypeScript' },
            { value: 'javascript', label: 'JavaScript' },
            { value: 'python', label: 'Python' },
            { value: 'php', label: 'PHP' },
            { value: 'java', label: 'Java' },
            { value: 'csharp', label: 'C#' },
            { value: 'go', label: 'Go' },
            { value: 'rust', label: 'Rust' },
            { value: 'react', label: 'React' },
            { value: 'vue', label: 'Vue' },
            { value: 'angular', label: 'Angular' },
            { value: 'node', label: 'Node.js' },
            { value: 'laravel', label: 'Laravel' },
            { value: 'django', label: 'Django' },
          ],
          validation: [
            { type: 'required', message: 'Please select at least one technology' },
          ],
        },
      ],
    };
  }

  private createArchitecturePage(): WizardPage {
    return {
      id: 'architecture',
      title: 'Architecture',
      description: 'Define your project\'s architectural approach',
      icon: '🏛️',
      questions: [
        {
          id: 'architecture_pattern',
          type: 'select',
          title: 'Preferred architecture pattern',
          options: [
            { value: 'monolith', label: 'Monolithic', description: 'Single unified application' },
            { value: 'microservices', label: 'Microservices', description: 'Distributed services' },
            { value: 'serverless', label: 'Serverless', description: 'Function-as-a-Service' },
            { value: 'hybrid', label: 'Hybrid', description: 'Mix of approaches' },
            { value: 'modular_monolith', label: 'Modular Monolith', description: 'Modular but unified' },
          ],
          validation: [{ type: 'required', message: 'Please select an architecture pattern' }],
        },
        {
          id: 'database_type',
          type: 'multi-select',
          title: 'Database(s)',
          options: [
            { value: 'postgresql', label: 'PostgreSQL' },
            { value: 'mysql', label: 'MySQL/MariaDB' },
            { value: 'mongodb', label: 'MongoDB' },
            { value: 'redis', label: 'Redis' },
            { value: 'sqlite', label: 'SQLite' },
            { value: 'dynamodb', label: 'DynamoDB' },
            { value: 'cassandra', label: 'Cassandra' },
            { value: 'none', label: 'No database needed' },
          ],
        },
        {
          id: 'caching_strategy',
          type: 'select',
          title: 'Caching strategy',
          options: [
            { value: 'none', label: 'No caching' },
            { value: 'in_memory', label: 'In-memory (Redis/Memcached)' },
            { value: 'cdn', label: 'CDN caching' },
            { value: 'application', label: 'Application-level caching' },
            { value: 'database', label: 'Database query caching' },
          ],
        },
      ],
    };
  }

  private createIntegrationsPage(): WizardPage {
    return {
      id: 'integrations',
      title: 'Integrations',
      description: 'Third-party services and integrations',
      icon: '🔌',
      questions: [
        {
          id: 'auth_provider',
          type: 'select',
          title: 'Authentication',
          options: [
            { value: 'none', label: 'No authentication' },
            { value: 'custom', label: 'Custom auth' },
            { value: 'oauth', label: 'OAuth 2.0' },
            { value: 'auth0', label: 'Auth0' },
            { value: 'firebase', label: 'Firebase Auth' },
            { value: 'supabase', label: 'Supabase Auth' },
          ],
        },
        {
          id: 'payment_provider',
          type: 'select',
          title: 'Payment processing',
          options: [
            { value: 'none', label: 'Not needed' },
            { value: 'stripe', label: 'Stripe' },
            { value: 'paypal', label: 'PayPal' },
            { value: 'square', label: 'Square' },
            { value: 'custom', label: 'Custom integration' },
          ],
        },
        {
          id: 'email_service',
          type: 'select',
          title: 'Email service',
          options: [
            { value: 'none', label: 'Not needed' },
            { value: 'sendgrid', label: 'SendGrid' },
            { value: 'mailgun', label: 'Mailgun' },
            { value: 'ses', label: 'AWS SES' },
            { value: 'custom', label: 'Custom SMTP' },
          ],
        },
      ],
    };
  }

  private createDeploymentPage(): WizardPage {
    return {
      id: 'deployment',
      title: 'Deployment',
      description: 'How will you deploy and host your project?',
      icon: '🚀',
      questions: [
        {
          id: 'hosting_platform',
          type: 'select',
          title: 'Hosting platform',
          options: [
            { value: 'aws', label: 'AWS' },
            { value: 'gcp', label: 'Google Cloud' },
            { value: 'azure', label: 'Azure' },
            { value: 'vercel', label: 'Vercel' },
            { value: 'netlify', label: 'Netlify' },
            { value: 'heroku', label: 'Heroku' },
            { value: 'digitalocean', label: 'DigitalOcean' },
            { value: 'self_hosted', label: 'Self-hosted' },
          ],
          validation: [{ type: 'required', message: 'Please select a hosting platform' }],
        },
        {
          id: 'ci_cd',
          type: 'multi-select',
          title: 'CI/CD pipeline',
          options: [
            { value: 'github_actions', label: 'GitHub Actions' },
            { value: 'gitlab_ci', label: 'GitLab CI' },
            { value: 'circleci', label: 'CircleCI' },
            { value: 'jenkins', label: 'Jenkins' },
            { value: 'azure_pipelines', label: 'Azure Pipelines' },
            { value: 'none', label: 'Manual deployment' },
          ],
        },
      ],
    };
  }

  private createTestingPage(): WizardPage {
    return {
      id: 'testing',
      title: 'Testing Strategy',
      description: 'Define your testing approach',
      icon: '🧪',
      questions: [
        {
          id: 'test_coverage_target',
          type: 'range',
          title: 'Target test coverage (%)',
          defaultValue: 80,
          validation: [
            { type: 'min', value: 0, message: 'Coverage must be at least 0%' },
            { type: 'max', value: 100, message: 'Coverage cannot exceed 100%' },
          ],
        },
        {
          id: 'test_frameworks',
          type: 'multi-select',
          title: 'Testing frameworks',
          options: [
            { value: 'jest', label: 'Jest' },
            { value: 'vitest', label: 'Vitest' },
            { value: 'mocha', label: 'Mocha' },
            { value: 'pytest', label: 'Pytest' },
            { value: 'phpunit', label: 'PHPUnit' },
            { value: 'cypress', label: 'Cypress (E2E)' },
            { value: 'playwright', label: 'Playwright (E2E)' },
          ],
        },
      ],
    };
  }

  private createDocumentationPage(): WizardPage {
    return {
      id: 'documentation',
      title: 'Documentation',
      description: 'Documentation requirements',
      icon: '📚',
      questions: [
        {
          id: 'doc_tools',
          type: 'multi-select',
          title: 'Documentation tools',
          options: [
            { value: 'readme', label: 'README.md' },
            { value: 'wiki', label: 'GitHub Wiki' },
            { value: 'docusaurus', label: 'Docusaurus' },
            { value: 'vitepress', label: 'VitePress' },
            { value: 'swagger', label: 'Swagger/OpenAPI' },
            { value: 'storybook', label: 'Storybook' },
          ],
        },
        {
          id: 'api_docs',
          type: 'boolean',
          title: 'Generate API documentation?',
          defaultValue: true,
        },
      ],
    };
  }

  private createTeamPage(): WizardPage {
    return {
      id: 'team',
      title: 'Team',
      description: 'Team size and collaboration',
      icon: '👥',
      questions: [
        {
          id: 'team_size',
          type: 'select',
          title: 'Team size',
          options: [
            { value: 'solo', label: 'Solo developer' },
            { value: 'small', label: 'Small team (2-5)' },
            { value: 'medium', label: 'Medium team (6-15)' },
            { value: 'large', label: 'Large team (15+)' },
          ],
          validation: [{ type: 'required', message: 'Please select team size' }],
        },
        {
          id: 'collaboration_tools',
          type: 'multi-select',
          title: 'Collaboration tools',
          options: [
            { value: 'github', label: 'GitHub' },
            { value: 'gitlab', label: 'GitLab' },
            { value: 'jira', label: 'Jira' },
            { value: 'linear', label: 'Linear' },
            { value: 'slack', label: 'Slack' },
            { value: 'discord', label: 'Discord' },
          ],
        },
      ],
    };
  }

  private createTimelinePage(): WizardPage {
    return {
      id: 'timeline',
      title: 'Timeline',
      description: 'Project timeline and milestones',
      icon: '📅',
      questions: [
        {
          id: 'project_duration',
          type: 'select',
          title: 'Expected project duration',
          options: [
            { value: '1_week', label: '1 week or less' },
            { value: '1_month', label: '1 month' },
            { value: '3_months', label: '3 months' },
            { value: '6_months', label: '6 months' },
            { value: '1_year', label: '1 year' },
            { value: 'ongoing', label: 'Ongoing/No deadline' },
          ],
          validation: [{ type: 'required', message: 'Please select project duration' }],
        },
        {
          id: 'mvp_timeline',
          type: 'select',
          title: 'Time to MVP',
          description: 'When do you want a minimum viable product?',
          options: [
            { value: '1_week', label: '1 week' },
            { value: '2_weeks', label: '2 weeks' },
            { value: '1_month', label: '1 month' },
            { value: '2_months', label: '2 months' },
            { value: '3_months', label: '3+ months' },
          ],
        },
      ],
    };
  }

  private createReviewPage(): WizardPage {
    return {
      id: 'review',
      title: 'Review & Generate',
      description: 'Review your choices and generate your plan',
      icon: '✅',
      questions: [
        {
          id: 'generate_tasks',
          type: 'boolean',
          title: 'Auto-generate tasks from plan?',
          description: 'Use LLM to create detailed tasks with dependencies',
          defaultValue: true,
        },
        {
          id: 'export_format',
          type: 'multi-select',
          title: 'Export formats',
          options: [
            { value: 'json', label: 'JSON' },
            { value: 'markdown', label: 'Markdown' },
            { value: 'pdf', label: 'PDF' },
            { value: 'github_issues', label: 'GitHub Issues' },
          ],
          defaultValue: ['json', 'markdown'],
        },
      ],
    };
  }
}

// Singleton instance
export const questionFramework = new QuestionFramework();
