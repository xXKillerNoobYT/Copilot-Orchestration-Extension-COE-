/**
 * AI Wizard Assistant Tests
 * Unit tests for wizard-specific AI assistance
 */

import { AiWizardAssistant, getAiWizardAssistant } from '../../src/services/aiWizardAssistant';
import { AiAssistanceService } from '../../src/services/aiAssistanceService';

// Mock dependencies
jest.mock('../../src/services/aiAssistanceService');

describe('AiWizardAssistant', () => {
  let assistant: AiWizardAssistant;
  let mockAiService: jest.Mocked<AiAssistanceService>;

  beforeEach(() => {
    // Create mock AI service
    mockAiService = {
      getSuggestions: jest.fn(),
    } as any;

    // Replace the internal service with our mock
    assistant = new AiWizardAssistant();
    (assistant as any).aiService = mockAiService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Feature Breakdown Methods', () => {
    describe('suggestFeatures', () => {
      it('should return AI-suggested features', async () => {
        const mockResponse = {
          suggestions: [
            {
              question: 'test',
              suggestion: JSON.stringify([
                {
                  name: 'User Authentication',
                  description: 'Login and signup functionality',
                  category: 'API',
                  estimatedHours: 16,
                  estimatedDays: 2,
                  suggestedPriority: 'critical',
                  dependencies: [],
                  rationale: 'Essential for user management',
                },
              ]),
              confidence: 0.9,
            },
          ],
        };

        mockAiService.getSuggestions.mockResolvedValueOnce(mockResponse);

        const result = await assistant.suggestFeatures({
          projectType: 'Web Application',
          projectDescription: 'E-commerce platform',
          techStack: ['React', 'Node.js'],
        });

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('User Authentication');
        expect(result[0].category).toBe('API');
        expect(result[0].estimatedDays).toBe(2);
      });

      it('should handle parsing errors gracefully', async () => {
        const mockResponse = {
          suggestions: [
            {
              question: 'test',
              suggestion: 'invalid json',
              confidence: 0.9,
            },
          ],
        };

        mockAiService.getSuggestions.mockResolvedValueOnce(mockResponse);

        const result = await assistant.suggestFeatures({
          projectType: 'API',
          projectDescription: 'RESTful API',
        });

        expect(result).toEqual([]);
      });

      it('should handle AI service errors', async () => {
        mockAiService.getSuggestions.mockRejectedValueOnce(new Error('AI error'));

        const result = await assistant.suggestFeatures({
          projectType: 'CLI',
          projectDescription: 'Command line tool',
        });

        expect(result).toEqual([]);
      });
    });

    describe('categorizeFeatures', () => {
      it('should return feature categorizations', async () => {
        const mockResponse = {
          suggestions: [
            {
              question: 'test',
              suggestion: JSON.stringify([
                {
                  featureName: 'Login Form',
                  suggestedCategory: 'UI',
                  confidence: 0.95,
                  rationale: 'Frontend user interface component',
                },
              ]),
              confidence: 0.9,
            },
          ],
        };

        mockAiService.getSuggestions.mockResolvedValueOnce(mockResponse);

        const result = await assistant.categorizeFeatures(
          [{ name: 'Login Form', description: 'User login interface' }],
          { projectType: 'Web App', projectDescription: 'Test app' }
        );

        expect(result).toHaveLength(1);
        expect(result[0].suggestedCategory).toBe('UI');
        expect(result[0].confidence).toBe(0.95);
      });
    });

    describe('estimateEffort', () => {
      it('should return effort estimations', async () => {
        const mockResponse = {
          suggestions: [
            {
              question: 'test',
              suggestion: JSON.stringify([
                {
                  featureName: 'Payment Integration',
                  estimatedHours: 40,
                  estimatedDays: 5,
                  complexity: 'high',
                  rationale: 'Third-party API integration with security requirements',
                },
              ]),
              confidence: 0.85,
            },
          ],
        };

        mockAiService.getSuggestions.mockResolvedValueOnce(mockResponse);

        const result = await assistant.estimateEffort(
          [{ name: 'Payment Integration', description: 'Stripe payment processing' }],
          { projectType: 'E-commerce', projectDescription: 'Online store' }
        );

        expect(result).toHaveLength(1);
        expect(result[0].estimatedDays).toBe(5);
        expect(result[0].complexity).toBe('high');
      });
    });

    describe('suggestDependencies', () => {
      it('should return dependency suggestions', async () => {
        const mockResponse = {
          suggestions: [
            {
              question: 'test',
              suggestion: JSON.stringify([
                {
                  fromFeature: 'User Dashboard',
                  toFeature: 'User Authentication',
                  dependencyType: 'required',
                  rationale: 'Dashboard requires authenticated user',
                },
              ]),
              confidence: 0.9,
            },
          ],
        };

        mockAiService.getSuggestions.mockResolvedValueOnce(mockResponse);

        const result = await assistant.suggestDependencies(
          [
            { name: 'User Authentication', description: 'Login system' },
            { name: 'User Dashboard', description: 'User home page' },
          ],
          { projectType: 'Web App', projectDescription: 'SaaS platform' }
        );

        expect(result).toHaveLength(1);
        expect(result[0].dependencyType).toBe('required');
      });
    });
  });

  describe('Timeline Methods', () => {
    describe('recommendTimeline', () => {
      it('should return timeline recommendations', async () => {
        const mockResponse = {
          suggestions: [
            {
              question: 'test',
              suggestion: JSON.stringify({
                totalDuration: { weeks: 12, months: 3 },
                milestones: [
                  {
                    name: 'MVP Release',
                    phase: 'development',
                    durationWeeks: 8,
                    startWeek: 1,
                    endWeek: 8,
                    deliverables: ['Core features', 'Basic UI'],
                    criticalPath: true,
                    rationale: 'First release to customers',
                  },
                ],
                rationale: 'Realistic timeline for MVP delivery',
                bufferPercentage: 20,
              }),
              confidence: 0.85,
            },
          ],
        };

        mockAiService.getSuggestions.mockResolvedValueOnce(mockResponse);

        const result = await assistant.recommendTimeline({
          projectType: 'Web App',
          projectDescription: 'SaaS platform',
          teamSize: 5,
          complexity: 'medium',
          featureCount: 10,
        });

        expect(result).not.toBeNull();
        expect(result?.totalDuration.weeks).toBe(12);
        expect(result?.milestones).toHaveLength(1);
      });
    });

    describe('suggestMilestones', () => {
      it('should return milestone suggestions', async () => {
        const mockResponse = {
          suggestions: [
            {
              question: 'test',
              suggestion: JSON.stringify([
                {
                  name: 'Alpha Release',
                  phase: 'testing',
                  durationWeeks: 2,
                  startWeek: 6,
                  endWeek: 8,
                  deliverables: ['Internal testing'],
                  criticalPath: false,
                  rationale: 'Internal validation before beta',
                },
              ]),
              confidence: 0.8,
            },
          ],
        };

        mockAiService.getSuggestions.mockResolvedValueOnce(mockResponse);

        const result = await assistant.suggestMilestones(
          [
            { name: 'Feature A', estimatedDays: 5 },
            { name: 'Feature B', estimatedDays: 3 },
          ],
          { projectType: 'API', projectDescription: 'REST API' }
        );

        expect(result).toHaveLength(1);
        expect(result[0].phase).toBe('testing');
      });
    });

    describe('allocateResources', () => {
      it('should return resource allocation', async () => {
        const mockResponse = {
          suggestions: [
            {
              question: 'test',
              suggestion: JSON.stringify([
                {
                  milestone: 'Development',
                  phase: 'development',
                  recommendedTeamSize: 5,
                  roles: [
                    { role: 'Frontend Engineer', count: 2, allocation: 100 },
                    { role: 'Backend Engineer', count: 2, allocation: 100 },
                    { role: 'DevOps', count: 1, allocation: 50 },
                  ],
                  rationale: 'Full team during development phase',
                },
              ]),
              confidence: 0.85,
            },
          ],
        };

        mockAiService.getSuggestions.mockResolvedValueOnce(mockResponse);

        const result = await assistant.allocateResources(
          [{ name: 'Development', phase: 'development' }],
          { projectType: 'Web App', projectDescription: 'SaaS', teamSize: 5 }
        );

        expect(result).toHaveLength(1);
        expect(result[0].recommendedTeamSize).toBe(5);
        expect(result[0].roles).toHaveLength(3);
      });
    });

    describe('analyzeCriticalPath', () => {
      it('should return critical path analysis', async () => {
        const mockResponse = {
          suggestions: [
            {
              question: 'test',
              suggestion: JSON.stringify({
                milestones: ['Planning', 'Development', 'Testing', 'Deployment'],
                totalDuration: 12,
                bottlenecks: [
                  {
                    milestone: 'Development',
                    reason: 'Complex features require extra time',
                    mitigation: 'Add senior developer or split into phases',
                  },
                ],
                parallelizable: [
                  {
                    milestones: ['Testing', 'Documentation'],
                    canRunInParallel: true,
                    requirements: 'Separate teams for testing and docs',
                  },
                ],
              }),
              confidence: 0.8,
            },
          ],
        };

        mockAiService.getSuggestions.mockResolvedValueOnce(mockResponse);

        const result = await assistant.analyzeCriticalPath(
          [
            { name: 'Planning', dependencies: [] },
            { name: 'Development', dependencies: ['Planning'] },
          ],
          { projectType: 'Web App', projectDescription: 'SaaS' }
        );

        expect(result).not.toBeNull();
        expect(result?.milestones).toHaveLength(4);
        expect(result?.bottlenecks).toHaveLength(1);
      });
    });
  });

  describe('Team Structure Methods', () => {
    describe('suggestRoles', () => {
      it('should return role suggestions', async () => {
        const mockResponse = {
          suggestions: [
            {
              question: 'test',
              suggestion: JSON.stringify([
                {
                  role: 'Frontend Engineer',
                  count: 2,
                  essential: true,
                  skills: ['React', 'TypeScript', 'CSS'],
                  responsibilities: ['Build UI components', 'Implement designs'],
                  experience: 'mid',
                  allocation: 100,
                  rationale: 'Frontend-heavy application',
                },
              ]),
              confidence: 0.9,
            },
          ],
        };

        mockAiService.getSuggestions.mockResolvedValueOnce(mockResponse);

        const result = await assistant.suggestRoles({
          projectType: 'Web App',
          projectDescription: 'React dashboard',
          techStack: ['React', 'Node.js'],
          complexity: 'medium',
        });

        expect(result).toHaveLength(1);
        expect(result[0].role).toBe('Frontend Engineer');
        expect(result[0].essential).toBe(true);
      });
    });

    describe('identifySkills', () => {
      it('should return skill requirements', async () => {
        const mockResponse = {
          suggestions: [
            {
              question: 'test',
              suggestion: JSON.stringify([
                {
                  skill: 'React',
                  category: 'technical',
                  proficiencyLevel: 'advanced',
                  importance: 'critical',
                  requiredFor: ['Frontend Engineer'],
                  rationale: 'Primary frontend framework',
                },
              ]),
              confidence: 0.9,
            },
          ],
        };

        mockAiService.getSuggestions.mockResolvedValueOnce(mockResponse);

        const result = await assistant.identifySkills(
          [{ role: 'Frontend Engineer', skills: ['React'] }],
          { projectType: 'Web App', projectDescription: 'Dashboard' }
        );

        expect(result).toHaveLength(1);
        expect(result[0].proficiencyLevel).toBe('advanced');
        expect(result[0].importance).toBe('critical');
      });
    });

    describe('recommendTeamSize', () => {
      it('should return team size recommendations', async () => {
        const mockResponse = {
          suggestions: [
            {
              question: 'test',
              suggestion: JSON.stringify({
                minimumTeam: 3,
                optimalTeam: 5,
                maximumEfficient: 8,
                breakdown: {
                  frontend: 2,
                  backend: 2,
                  fullstack: 0,
                  devops: 1,
                  qa: 1,
                  design: 1,
                  product: 1,
                  other: 0,
                },
                scalingStrategy: 'Start with 5, scale to 8 if needed',
                rationale: 'Optimal size for communication and velocity',
              }),
              confidence: 0.85,
            },
          ],
        };

        mockAiService.getSuggestions.mockResolvedValueOnce(mockResponse);

        const result = await assistant.recommendTeamSize({
          projectType: 'Web App',
          projectDescription: 'SaaS platform',
          complexity: 'high',
          budget: 'medium',
        });

        expect(result).not.toBeNull();
        expect(result?.optimalTeam).toBe(5);
        expect(result?.breakdown.frontend).toBe(2);
      });
    });

    describe('distributeWorkload', () => {
      it('should return workload distribution', async () => {
        const mockResponse = {
          suggestions: [
            {
              question: 'test',
              suggestion: JSON.stringify([
                {
                  role: 'Backend Engineer',
                  estimatedHoursPerWeek: 40,
                  allocation: 100,
                  tasks: [
                    { task: 'API Development', hoursPerWeek: 28, percentage: 70 },
                    { task: 'Code Review', hoursPerWeek: 6, percentage: 15 },
                    { task: 'Meetings', hoursPerWeek: 6, percentage: 15 },
                  ],
                  overallocation: false,
                  recommendations: [],
                },
              ]),
              confidence: 0.8,
            },
          ],
        };

        mockAiService.getSuggestions.mockResolvedValueOnce(mockResponse);

        const result = await assistant.distributeWorkload(
          [{ role: 'Backend Engineer', allocation: 100 }],
          { projectType: 'API', projectDescription: 'REST API' }
        );

        expect(result).toHaveLength(1);
        expect(result[0].overallocation).toBe(false);
        expect(result[0].tasks).toHaveLength(3);
      });
    });
  });

  describe('Tracking & Metrics', () => {
    describe('trackAcceptance', () => {
      it('should track acceptance rates', () => {
        assistant.trackAcceptance('suggest-features', true);
        assistant.trackAcceptance('suggest-features', true);
        assistant.trackAcceptance('suggest-features', false);

        const rate = assistant.getAcceptanceRate('suggest-features');
        expect(rate).toBeCloseTo(0.667, 2);
      });

      it('should return 0 for unknown suggestion types', () => {
        const rate = assistant.getAcceptanceRate('unknown-type');
        expect(rate).toBe(0);
      });
    });

    describe('getAllAcceptanceStats', () => {
      it('should return all acceptance statistics', () => {
        assistant.trackAcceptance('suggest-features', true);
        assistant.trackAcceptance('suggest-features', false);
        assistant.trackAcceptance('suggest-roles', true);

        const stats = assistant.getAllAcceptanceStats();
        
        expect(stats['suggest-features']).toEqual({
          accepted: 1,
          total: 2,
          rate: 0.5,
        });
        expect(stats['suggest-roles']).toEqual({
          accepted: 1,
          total: 1,
          rate: 1,
        });
      });
    });

    describe('Performance Metrics', () => {
      it('should calculate p50, p95, p99', () => {
        // Manually record some performance metrics
        const metrics = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
        metrics.forEach(duration => {
          (assistant as any).recordPerformance('test-operation', duration);
        });

        const result = assistant.getPerformanceMetrics('test-operation');
        
        expect(result).not.toBeNull();
        expect(result?.p50).toBeGreaterThan(0);
        expect(result?.p95).toBeGreaterThan(result?.p50);
        expect(result?.p99).toBeGreaterThan(result?.p95);
      });

      it('should return null for unknown operations', () => {
        const result = assistant.getPerformanceMetrics('unknown');
        expect(result).toBeNull();
      });
    });

    describe('Timeout and Retry Logic', () => {
      it('should enforce timeout correctly', async () => {
        // Mock a slow response that exceeds timeout
        mockAiService.getSuggestions.mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({ suggestions: [] }), 2000))
        );

        const startTime = Date.now();
        
        try {
          await assistant.suggestFeatures(
            { projectType: 'Web App', projectDescription: 'Test' },
            { timeout: 100, retries: 0 }
          );
          fail('Should have thrown timeout error');
        } catch (error: any) {
          const elapsed = Date.now() - startTime;
          expect(elapsed).toBeLessThan(500); // Should timeout quickly
          expect(error.message).toContain('timeout');
        }
      });

      it('should retry on failure', async () => {
        let attempts = 0;
        mockAiService.getSuggestions.mockImplementation(() => {
          attempts++;
          if (attempts < 3) {
            return Promise.reject(new Error('Temporary failure'));
          }
          return Promise.resolve({
            suggestions: [
              {
                question: 'test',
                suggestion: JSON.stringify([{ name: 'Feature', description: 'Test' }]),
                confidence: 0.9,
              },
            ],
          });
        });

        const result = await assistant.suggestFeatures(
          { projectType: 'Web App', projectDescription: 'Test' },
          { timeout: 5000, retries: 2 }
        );

        expect(attempts).toBe(3); // Should have retried twice before success
        expect(result).toHaveLength(0); // Parsing will fail but shouldn't throw
      });

      it('should throw error after exhausting retries', async () => {
        mockAiService.getSuggestions.mockRejectedValue(new Error('Persistent failure'));

        try {
          await assistant.suggestFeatures(
            { projectType: 'API', projectDescription: 'Test' },
            { timeout: 1000, retries: 2 }
          );
          fail('Should have thrown error');
        } catch (error: any) {
          expect(error.message).toContain('Persistent failure');
        }
      });
    });
  });

  describe('getAiWizardAssistant singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getAiWizardAssistant();
      const instance2 = getAiWizardAssistant();
      
      expect(instance1).toBe(instance2);
    });
  });
});
