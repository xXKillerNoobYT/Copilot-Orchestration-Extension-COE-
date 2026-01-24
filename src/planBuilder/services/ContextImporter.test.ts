/**
 * ContextImporter Service Tests
 * 
 * Tests for context import functionality including:
 * - Finding workspace files
 * - Reading workspace files
 * - Topic extraction from content
 * - Template suggestion based on topics
 * - Backend API integration
 */

import { ContextImportService } from './ContextImporter';
import * as vscode from 'vscode';

// Mock vscode module
jest.mock('vscode', () => ({
  workspace: {
    workspaceFolders: undefined,
    getConfiguration: jest.fn(() => ({
      get: jest.fn(() => 'http://localhost:8000')
    })),
    findFiles: jest.fn(),
    fs: {
      stat: jest.fn(),
      readFile: jest.fn()
    },
    asRelativePath: jest.fn((uri: any) => uri.path)
  },
  Uri: {
    joinPath: jest.fn((base: any, ...paths: string[]) => ({
      path: `${base.path}/${paths.join('/')}`
    }))
  },
  RelativePattern: jest.fn()
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('ContextImportService', () => {
  let service: ContextImportService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ContextImportService();
  });

  describe('Topic Extraction', () => {
    it('should detect API-related topics', async () => {
      const content = 'This project is a REST API with GraphQL endpoints and HTTP request handling.';
      const result = await service.analyzeContext(content);
      
      expect(result.topics).toContain('api');
    });

    it('should detect database topics', async () => {
      const content = 'We use PostgreSQL database with MongoDB for caching and Redis for storage.';
      const result = await service.analyzeContext(content);
      
      expect(result.topics).toContain('database');
    });

    it('should detect frontend topics', async () => {
      const content = 'Build a React web app with Vue components and Angular UI elements.';
      const result = await service.analyzeContext(content);
      
      expect(result.topics).toContain('frontend');
    });

    it('should detect multiple topics', async () => {
      const content = 'Build a REST API with React frontend, PostgreSQL database, and Docker deployment.';
      const result = await service.analyzeContext(content);
      
      expect(result.topics.length).toBeGreaterThan(2);
      expect(result.topics).toContain('api');
      expect(result.topics).toContain('frontend');
      expect(result.topics).toContain('database');
      expect(result.topics).toContain('devops');
    });

    it('should handle content with no clear topics', async () => {
      const content = 'This is a generic project with no specific technology mentioned.';
      const result = await service.analyzeContext(content);
      
      expect(result.topics).toBeDefined();
      expect(Array.isArray(result.topics)).toBe(true);
    });
  });

  describe('Template Suggestion', () => {
    it('should suggest api-service template for API-only projects', async () => {
      const content = 'Create HTTP endpoints for processing GraphQL requests and responses.';
      const result = await service.analyzeContext(content);
      
      expect(result.suggestedTemplate).toBe('core-api-service');
    });

    it('should suggest web-app template for frontend projects', async () => {
      const content = 'Create React components with user interface elements.';
      const result = await service.analyzeContext(content);
      
      expect(result.suggestedTemplate).toBe('core-web-app');
    });

    it('should suggest web-app template for full-stack projects', async () => {
      const content = 'Build an application with React components and HTTP endpoints.';
      const result = await service.analyzeContext(content);
      
      expect(result.suggestedTemplate).toBe('core-web-app');
    });

    it('should suggest blank template for unclear projects', async () => {
      const content = 'A new project with different objectives.';
      const result = await service.analyzeContext(content);
      
      // This should not detect any specific topics, so should be blank
      expect(result.suggestedTemplate).toBe('core-blank');
    });
  });

  describe('Summary Generation', () => {
    it('should generate summary from first sentences', async () => {
      const content = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
      const result = await service.analyzeContext(content);
      
      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.summary).toContain('First sentence');
    });

    it('should truncate long summaries to 200 characters', async () => {
      const longContent = 'A'.repeat(300) + '. More content here. And even more.';
      const result = await service.analyzeContext(longContent);
      
      expect(result.summary.length).toBeLessThanOrEqual(203); // 200 + "..."
      expect(result.summary).toContain('...');
    });
  });

  describe('Duration Estimation', () => {
    it('should estimate 2-4 weeks for simple projects', async () => {
      const content = 'Simple API project with basic authentication.';
      const result = await service.analyzeContext(content);
      
      expect(result.estimatedDuration).toBe('2-4 weeks');
    });

    it('should estimate 1-3 months for moderate projects', async () => {
      const content = 'API with database, authentication, testing, and monitoring.';
      const result = await service.analyzeContext(content);
      
      expect(result.estimatedDuration).toBe('1-3 months');
    });

    it('should estimate 3-6 months for complex projects', async () => {
      const content = 'Full-stack app with API, frontend, database, authentication, testing, monitoring, and DevOps.';
      const result = await service.analyzeContext(content);
      
      expect(result.estimatedDuration).toBe('3-6 months');
    });
  });

  describe('Team Size Estimation', () => {
    it('should recommend 1 developer for simple projects', async () => {
      const content = 'Simple backend service.';
      const result = await service.analyzeContext(content);
      
      expect(result.recommendedTeamSize).toBe(1);
    });

    it('should recommend 3 developers for full-stack projects', async () => {
      const content = 'Full-stack application with React frontend and REST API backend.';
      const result = await service.analyzeContext(content);
      
      expect(result.recommendedTeamSize).toBe(3);
    });

    it('should recommend 2 developers for DevOps projects', async () => {
      const content = 'Setup Docker and Kubernetes infrastructure with CI/CD.';
      const result = await service.analyzeContext(content);
      
      expect(result.recommendedTeamSize).toBe(2);
    });
  });

  describe('Workspace File Discovery', () => {
    it('should return empty array when no workspace folder', async () => {
      (vscode.workspace as any).workspaceFolders = undefined;
      
      const files = await service.findWorkspaceFiles();
      
      expect(files).toEqual([]);
    });

    it('should find README files in workspace', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { path: '/workspace' } }];
      (vscode.workspace.findFiles as jest.Mock).mockResolvedValue([
        { path: '/workspace/README.md' }
      ]);
      (vscode.workspace.fs.stat as jest.Mock).mockResolvedValue({ size: 1024 });
      (vscode.workspace.asRelativePath as jest.Mock).mockReturnValue('README.md');
      
      const files = await service.findWorkspaceFiles();
      
      expect(files.length).toBeGreaterThan(0);
    });

    it('should filter out files larger than 10MB', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { path: '/workspace' } }];
      (vscode.workspace.findFiles as jest.Mock).mockResolvedValue([
        { path: '/workspace/large.md' }
      ]);
      (vscode.workspace.fs.stat as jest.Mock).mockResolvedValue({ size: 20 * 1024 * 1024 }); // 20MB
      
      const files = await service.findWorkspaceFiles();
      
      expect(files).toEqual([]);
    });
  });

  describe('Backend API Integration', () => {
    it('should call backend API for analysis', async () => {
      const mockResponse = {
        success: true,
        suggestedTemplate: 'core-api-service',
        topics: ['api', 'backend'],
        summary: 'API project summary',
        estimatedDuration: '2-4 weeks',
        recommendedTeamSize: 2
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.analyzeContext('Test content');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/plans/analyze-context',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('Test content')
        })
      );

      expect(result.suggestedTemplate).toBe('core-api-service');
      expect(result.topics).toEqual(['api', 'backend']);
    });

    it('should fallback to local analysis when backend fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.analyzeContext('Test API project');

      expect(result).toBeDefined();
      expect(result.topics).toBeDefined();
      expect(result.suggestedTemplate).toBeDefined();
    });
  });
});
