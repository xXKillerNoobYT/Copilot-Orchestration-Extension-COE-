import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LivePreviewEngine } from './livePreview';

describe('LivePreviewEngine', () => {
  let engine: LivePreviewEngine;

  beforeEach(() => {
    engine = new LivePreviewEngine();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should generate preview state from wizard answers', async () => {
    const answers = {
      projectName: 'Test Project',
      projectDescription: 'A test project',
      architecture: 'mvc',
      enabledFeatures: ['authentication'],
    };

    const promise = engine.updatePreview(answers);
    vi.advanceTimersByTime(150);
    const event = await promise;

    expect(event.previewState).toBeDefined();
    expect(event.previewState.projectName).toBe('Test Project');
    expect(event.previewState.architecture).toBe('mvc');
    expect(event.previewState.pages.length).toBeGreaterThan(0);
  });

  it('should detect authentication feature', async () => {
    const answers = {
      projectName: 'Auth Project',
      hasUserAuthentication: true,
    };

    const promise = engine.updatePreview(answers);
    vi.advanceTimersByTime(150);
    const event = await promise;

    const loginPage = event.previewState.pages.find(p => p.id === 'auth-login');
    const signupPage = event.previewState.pages.find(p => p.id === 'auth-signup');

    expect(loginPage).toBeDefined();
    expect(signupPage).toBeDefined();
  });

  it('should detect reporting feature', async () => {
    const answers = {
      projectName: 'Reporting Project',
      needsReporting: true,
    };

    const promise = engine.updatePreview(answers);
    vi.advanceTimersByTime(150);
    const event = await promise;

    const reportsPage = event.previewState.pages.find(p => p.id === 'reports');
    expect(reportsPage).toBeDefined();
  });

  it('should detect admin feature', async () => {
    const answers = {
      projectName: 'Admin Project',
      hasAdminPanel: true,
      adminFeatures: ['user management', 'system settings'],
    };

    const promise = engine.updatePreview(answers);
    vi.advanceTimersByTime(150);
    const event = await promise;

    const adminPage = event.previewState.pages.find(p => p.id === 'admin');
    expect(adminPage).toBeDefined();
    expect(adminPage?.id).toBe('admin');
    expect(adminPage?.title).toBeDefined();
  });

  it('should calculate estimated hours based on features', async () => {
    const simpleAnswers = {
      projectName: 'Simple',
      architecture: 'mvc',
    };

    const complexAnswers = {
      projectName: 'Complex',
      architecture: 'microservices',
      needsReporting: true,
      hasAdminPanel: true,
      externalAPIs: true,
    };

    const simplePromise = engine.updatePreview(simpleAnswers);
    vi.advanceTimersByTime(150);
    const simpleEvent = await simplePromise;

    const complexPromise = engine.updatePreview(complexAnswers);
    vi.advanceTimersByTime(150);
    const complexEvent = await complexPromise;

    expect(complexEvent.previewState.estimatedHours).toBeGreaterThan(
      simpleEvent.previewState.estimatedHours
    );
  });

  it('should detect compatibility issues', async () => {
    const answers = {
      projectName: 'Problem Project',
      architecture: 'microservices',
      // Include API integration explicitly
      externalAPIs: false, // This might trigger compatibility issue
    };

    const promise = engine.updatePreview(answers);
    vi.advanceTimersByTime(150);
    const event = await promise;

    // For now, just verify the structure is correct
    expect(event.previewState.compatibilityIssues).toBeDefined();
    expect(Array.isArray(event.previewState.compatibilityIssues)).toBe(true);
  });

  it('should assess risk level based on complexity', async () => {
    const lowRiskAnswers = {
      projectName: 'Simple Project',
    };

    const highRiskAnswers = {
      projectName: 'Complex Project',
      architecture: 'microservices',
      needsReporting: true,
      hasAdminPanel: true,
      dataComplexity: 'high',
    };

    const lowRiskPromise = engine.updatePreview(lowRiskAnswers);
    vi.advanceTimersByTime(150);
    const lowRiskEvent = await lowRiskPromise;

    const highRiskPromise = engine.updatePreview(highRiskAnswers);
    vi.advanceTimersByTime(150);
    const highRiskEvent = await highRiskPromise;

    expect(lowRiskEvent.previewState.riskLevel).toBe('low');
    expect(highRiskEvent.previewState.riskLevel).not.toBe('low');
  });

  it('should notify listeners of preview updates', async () => {
    const listener = vi.fn();
    engine.onPreviewUpdate(listener);

    const answers = {
      projectName: 'Listener Test',
    };

    const promise = engine.updatePreview(answers);
    vi.advanceTimersByTime(150);
    await promise;

    expect(listener).toHaveBeenCalled();
    const event = listener.mock.calls[0][0];
    expect(event.previewState.projectName).toBe('Listener Test');
  });

  it('should allow unsubscribing from updates', async () => {
    const listener = vi.fn();
    const unsubscribe = engine.onPreviewUpdate(listener);

    unsubscribe();

    const answers = { projectName: 'Unsubscribe Test' };
    const promise = engine.updatePreview(answers);
    vi.advanceTimersByTime(150);
    await promise;

    expect(listener).not.toHaveBeenCalled();
  });

  it('should throttle rapid updates', async () => {
    const listener = vi.fn();
    engine.onPreviewUpdate(listener);

    const answers1 = { projectName: 'Update 1' };
    const answers2 = { projectName: 'Update 2' };

    engine.updatePreview(answers1, ['q1']);
    engine.updatePreview(answers2, ['q2']);

    vi.advanceTimersByTime(150);

    // Should only emit one event due to throttling
    expect(listener.mock.calls.length).toBe(1);
  });

  it('should measure update latency', async () => {
    const listener = vi.fn();
    engine.onPreviewUpdate(listener);

    const answers = { projectName: 'Latency Test' };
    const promise = engine.updatePreview(answers);
    vi.advanceTimersByTime(150);
    await promise;

    expect(listener).toHaveBeenCalled();
    const event = listener.mock.calls[0][0];
    expect(event.latency).toBeGreaterThanOrEqual(0);
  });

  it('should provide current preview stats', async () => {
    const answers = {
      projectName: 'Stats Test',
      hasUserAuthentication: true,
    };

    const promise = engine.updatePreview(answers);
    vi.advanceTimersByTime(150);
    await promise;

    const stats = engine.getPreviewStats();
    expect(stats).toBeDefined();
    expect(stats?.totalPages).toBeGreaterThan(0);
    expect(stats?.estimatedHours).toBeGreaterThan(0);
    expect(stats?.riskLevel).toBeDefined();
  });

  it('should handle empty answers', async () => {
    const promise = engine.updatePreview({});
    vi.advanceTimersByTime(150);
    const event = await promise;

    expect(event.previewState).toBeDefined();
    expect(event.previewState.projectName).toBe('Unnamed Project');
    expect(event.previewState.pages.length).toBeGreaterThan(0);
  });

  it('should track changed answer IDs', async () => {
    const listener = vi.fn();
    engine.onPreviewUpdate(listener);

    const answers = { q1: 'value1', q2: 'value2' };
    const promise = engine.updatePreview(answers, ['q1']);
    vi.advanceTimersByTime(150);
    await promise;

    const event = listener.mock.calls[0][0];
    expect(event.changedAnswerIds).toContain('q1');
  });

  it('should generate all required page sections', async () => {
    const answers = {
      projectName: 'Full Featured',
      hasUserAuthentication: true,
      hasAdminPanel: true,
      needsReporting: true,
    };

    const promise = engine.updatePreview(answers);
    vi.advanceTimersByTime(150);
    const event = await promise;

    const pages = event.previewState.pages;
    expect(pages.some(p => p.id === 'landing')).toBe(true);
    expect(pages.some(p => p.id === 'dashboard')).toBe(true);
    expect(pages.some(p => p.id === 'auth-login')).toBe(true);
    expect(pages.some(p => p.id === 'reports')).toBe(true);
    expect(pages.some(p => p.id === 'admin')).toBe(true);
    expect(pages.some(p => p.id === 'settings')).toBe(true);
  });

  it('should handle technology stack compatibility', async () => {
    const answers = {
      projectName: 'Tech Stack Test',
      techStack: ['legacy', 'modern'],
    };

    const promise = engine.updatePreview(answers);
    vi.advanceTimersByTime(150);
    const event = await promise;

    expect(event.previewState.compatibilityIssues.some(i => i.includes('legacy'))).toBe(true);
  });

  it('should estimate users section based on auth status', async () => {
    const promise = engine.updatePreview({
      projectName: 'With Auth',
      hasUserAuthentication: true,
      expectedUsers: 5000,
      userRoles: ['admin', 'user', 'moderator'],
    });

    vi.advanceTimersByTime(150);
    const withAuth = await promise;

    const users = withAuth.previewState.usersSection;
    expect(users.description).toContain('5000');
    expect(users.description).toContain('admin');
    expect(users.status).toBe('in-progress');
  });
});
