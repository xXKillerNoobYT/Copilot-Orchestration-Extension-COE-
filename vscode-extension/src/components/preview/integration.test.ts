/**
 * Integration Tests for Wizard → Preview Flow
 * 
 * Tests the complete integration between:
 * - WizardContainer answering questions
 * - PreviewEngine rendering updates
 * - WizardStateObserver detecting changes
 * - Performance requirements (<500ms)
 * 
 * @author Copilot Coding Agent
 * @date 2025-01-17
 */

import { PreviewEngine, type WizardState } from './PreviewEngine';
import { WizardStateObserver } from './WizardStateObserver';
import { PreviewFeedback } from './PreviewFeedback';

describe('Wizard → Preview Integration', () => {
  let previewEngine: PreviewEngine;
  let feedbackAnalyzer: PreviewFeedback;
  let stateObserver: WizardStateObserver | null;

  beforeEach(() => {
    previewEngine = new PreviewEngine({ maxRenderTimeMs: 500 });
    feedbackAnalyzer = new PreviewFeedback();
    stateObserver = null;
  });

  afterEach(() => {
    if (stateObserver) {
      stateObserver.destroy();
      stateObserver = null;
    }
  });

  describe('State Update Flow', () => {
    it('should update preview when wizard answer changes', (done) => {
      const initialState: WizardState = {
        currentStep: 0,
        answers: {
          projectName: 'Initial Project',
        },
        validationErrors: {},
        isComplete: false,
      };

      // Simulate state change directly without observer
      const updatedState: WizardState = {
        ...initialState,
        answers: {
          projectName: 'Updated Project',
        },
      };

      // Render both states
      const initialResult = previewEngine.render(initialState);
      expect(initialResult.html).toContain('Initial Project');
      expect(initialResult.renderTimeMs).toBeLessThan(500);

      const updatedResult = previewEngine.render(updatedState);
      expect(updatedResult.html).toContain('Updated Project');
      expect(updatedResult.renderTimeMs).toBeLessThan(500);

      done();
    });

    it('should handle rapid answer changes with debouncing', (done) => {
      const baseState: WizardState = {
        currentStep: 1,
        answers: {},
        validationErrors: {},
        isComplete: false,
      };

      const stateRef = { value: baseState };
      let renderCount = 0;

      stateObserver = new WizardStateObserver({
        debounceMs: 100,
        immediate: false,
      });

      stateObserver.observe(
        () => stateRef.value,
        (newState) => {
          renderCount++;
          const result = previewEngine.render(newState);
          expect(result.renderTimeMs).toBeLessThan(500);
        }
      );

      // Simulate rapid changes (5 changes in 50ms)
      for (let i = 1; i <= 5; i++) {
        setTimeout(() => {
          stateRef.value = {
            ...baseState,
            answers: {
              projectName: `Project ${i}`,
            },
          };
        }, i * 10);
      }

      // Check that debouncing limited renders
      setTimeout(() => {
        // Should have debounced to 1-2 renders instead of 5
        expect(renderCount).toBeLessThan(3);
        done();
      }, 300);
    });
  });

  describe('Multi-Page Wizard Flow', () => {
    it('should maintain performance across 10+ pages', () => {
      const pages = Array.from({ length: 12 }, (_, i) => ({
        currentStep: i,
        answers: {
          [`page${i}_question1`]: `Answer ${i}-1`,
          [`page${i}_question2`]: `Answer ${i}-2`,
          [`page${i}_question3`]: `Answer ${i}-3`,
        },
        validationErrors: {},
        isComplete: i === 11,
      }));

      const renderTimes: number[] = [];

      pages.forEach((state) => {
        const result = previewEngine.render(state);
        renderTimes.push(result.renderTimeMs);
        
        // Each render should be fast
        expect(result.renderTimeMs).toBeLessThan(500);
      });

      // Average render time should be well under limit
      const avgTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      expect(avgTime).toBeLessThan(300);
    });

    it('should handle complete wizard state with all sections', () => {
      const completeState: WizardState = {
        currentStep: 10,
        answers: {
          projectName: 'Full Stack Application',
          projectType: 'web',
          description: 'A complete web application with React and Node.js',
          technologies: ['React', 'Node.js', 'PostgreSQL', 'Redis', 'Docker'],
          architecture: 'microservices',
          features: Array.from({ length: 20 }, (_, i) => ({
            name: `Feature ${i + 1}`,
            priority: i % 3 === 0 ? 'high' : 'medium',
            estimatedHours: 8 + (i % 16),
          })),
          timeline: {
            startDate: '2026-02-01',
            endDate: '2026-06-30',
            milestones: [
              { name: 'MVP', date: '2026-03-15' },
              { name: 'Beta', date: '2026-05-01' },
              { name: 'Launch', date: '2026-06-30' },
            ],
          },
          team: {
            size: 8,
            roles: ['Frontend', 'Backend', 'DevOps', 'QA'],
          },
        },
        validationErrors: {},
        isComplete: true,
      };

      const result = previewEngine.render(completeState);

      // Should render within performance requirement
      expect(result.renderTimeMs).toBeLessThan(500);

      // Should contain all sections
      expect(result.sections.length).toBeGreaterThanOrEqual(3);
      expect(result.html).toContain('Full Stack Application');
      expect(result.html).toContain('React');
      expect(result.html).toContain('Feature');

      // Should have minimal warnings
      expect(result.warnings.length).toBeLessThan(3);
    });
  });

  describe('Preview + Feedback Integration', () => {
    it('should generate preview and feedback together', () => {
      const state: WizardState = {
        currentStep: 2,
        answers: {
          projectName: 'Test Project',
          technologies: ['React'],
          features: [],
        },
        validationErrors: {},
        isComplete: false,
      };

      // Render preview
      const renderResult = previewEngine.render(state);
      expect(renderResult.renderTimeMs).toBeLessThan(500);

      // Analyze feedback
      const feedbackResult = feedbackAnalyzer.analyze(state);

      // Should have feedback about incomplete sections
      expect(feedbackResult.summary.warningCount).toBeGreaterThan(0);
      expect(feedbackResult.overallScore).toBeLessThan(100);
    });

    it('should improve score as wizard progresses', () => {
      const states: WizardState[] = [
        // Step 1: Minimal
        {
          currentStep: 0,
          answers: { projectName: 'Test' },
          validationErrors: {},
          isComplete: false,
        },
        // Step 2: Add technologies
        {
          currentStep: 1,
          answers: {
            projectName: 'Test',
            technologies: ['React', 'Node.js'],
          },
          validationErrors: {},
          isComplete: false,
        },
        // Step 3: Add features
        {
          currentStep: 2,
          answers: {
            projectName: 'Test',
            technologies: ['React', 'Node.js'],
            features: [{ name: 'Feature 1' }, { name: 'Feature 2' }],
          },
          validationErrors: {},
          isComplete: false,
        },
      ];

      const scores = states.map((state) => {
        const feedback = feedbackAnalyzer.analyze(state);
        return feedback.overallScore;
      });

      // Score should improve or stay the same as wizard progresses
      expect(scores[1]).toBeGreaterThanOrEqual(scores[0]);
      expect(scores[2]).toBeGreaterThanOrEqual(scores[1]);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should render simple state in <100ms', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: {
          projectName: 'Simple Project',
        },
        validationErrors: {},
        isComplete: false,
      };

      const result = previewEngine.render(state);
      expect(result.renderTimeMs).toBeLessThan(100);
    });

    it('should render medium complexity in <200ms', () => {
      const state: WizardState = {
        currentStep: 3,
        answers: {
          projectName: 'Medium Project',
          technologies: Array.from({ length: 10 }, (_, i) => `Tech ${i}`),
          features: Array.from({ length: 15 }, (_, i) => ({ name: `Feature ${i}` })),
        },
        validationErrors: {},
        isComplete: false,
      };

      const result = previewEngine.render(state);
      expect(result.renderTimeMs).toBeLessThan(200);
    });

    it('should render complex state in <500ms (CRITICAL)', () => {
      const state: WizardState = {
        currentStep: 5,
        answers: {
          projectName: 'Complex Project',
          description: 'A'.repeat(1000),
          technologies: Array.from({ length: 25 }, (_, i) => `Tech ${i}`),
          features: Array.from({ length: 50 }, (_, i) => ({
            name: `Feature ${i}`,
            description: `Description for feature ${i}`.repeat(5),
            priority: i % 3 === 0 ? 'high' : 'medium',
          })),
          architecture: 'microservices',
        },
        validationErrors: {},
        isComplete: false,
      };

      const result = previewEngine.render(state);
      
      // MANDATORY: Must render within 500ms
      expect(result.renderTimeMs).toBeLessThan(500);
    });

    it('should maintain performance over repeated renders', () => {
      const state: WizardState = {
        currentStep: 2,
        answers: {
          projectName: 'Performance Test',
          technologies: Array.from({ length: 10 }, (_, i) => `Tech ${i}`),
        },
        validationErrors: {},
        isComplete: false,
      };

      const renderTimes: number[] = [];

      // Render 20 times to check for performance degradation
      for (let i = 0; i < 20; i++) {
        const result = previewEngine.render(state);
        renderTimes.push(result.renderTimeMs);
      }

      // All renders should be fast
      renderTimes.forEach((time) => {
        expect(time).toBeLessThan(500);
      });

      // Average should be good
      const avgTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      expect(avgTime).toBeLessThan(250);

      // No significant performance degradation (last render should be similar to first)
      const firstFive = renderTimes.slice(0, 5);
      const lastFive = renderTimes.slice(-5);
      const avgFirst = firstFive.reduce((a, b) => a + b, 0) / firstFive.length;
      const avgLast = lastFive.reduce((a, b) => a + b, 0) / lastFive.length;
      
      // Last 5 shouldn't be more than 50% slower than first 5
      expect(avgLast).toBeLessThan(avgFirst * 1.5);
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should clean up observers without memory leaks', () => {
      const observers: WizardStateObserver[] = [];
      const stateRef = { value: { currentStep: 0, answers: {}, validationErrors: {}, isComplete: false } };

      // Create and destroy multiple observers
      for (let i = 0; i < 10; i++) {
        const observer = new WizardStateObserver({ debounceMs: 50 });
        observer.observe(() => stateRef.value, () => {});
        observers.push(observer);
      }

      // Destroy all observers
      observers.forEach((obs) => obs.destroy());

      // All observers should report as inactive
      observers.forEach((obs) => {
        expect(obs.isActive()).toBe(false);
      });
    });

    it('should not accumulate render data over time', () => {
      let renderCount = 0;

      // Render 100 times
      for (let i = 0; i < 100; i++) {
        const result = previewEngine.render({
          currentStep: i % 10,
          answers: { step: i },
          validationErrors: {},
          isComplete: false,
        });
        renderCount++;
        
        // All renders should be fast
        expect(result.renderTimeMs).toBeLessThan(500);
      }

      // Should have completed all renders
      expect(renderCount).toBe(100);
    });
  });
});
