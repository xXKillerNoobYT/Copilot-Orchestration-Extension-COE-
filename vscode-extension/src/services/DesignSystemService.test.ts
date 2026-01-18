/**
 * Design System Service Tests
 * Tests for loading, caching, and managing design system files
 */

import { DesignSystemService, DesignSystem } from './DesignSystemService';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock vscode
jest.mock('vscode', () => ({
  window: {
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
  },
  workspace: {
    createFileSystemWatcher: jest.fn(() => ({
      onDidChange: jest.fn(),
      onDidCreate: jest.fn(),
      onDidDelete: jest.fn(),
      dispose: jest.fn(),
    })),
  },
  RelativePattern: jest.fn((base, pattern) => ({ base, pattern })),
}));

// Mock fs/promises
jest.mock('fs/promises');

// Mock yaml
jest.mock('yaml', () => ({
  parse: jest.fn((content: string) => JSON.parse(content)),
}));

describe('DesignSystemService', () => {
  let service: DesignSystemService;
  const mockWorkspaceRoot = '/test/workspace';

  const mockDesignSystem: DesignSystem = {
    colors: {
      primary: '#007AFF',
      secondary: '#5AC8FA',
      background: '#FFFFFF',
    },
    typography: [
      {
        name: 'Heading 1',
        fontFamily: 'Inter, sans-serif',
        fontSize: '32px',
        fontWeight: '700',
        lineHeight: '1.2',
      },
      {
        name: 'Body',
        fontFamily: 'Inter, sans-serif',
        fontSize: '16px',
        fontWeight: '400',
        lineHeight: '1.5',
      },
    ],
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
    },
    components: {
      Button: { doc: 'Button component' },
      Card: { doc: 'Card component' },
    },
    palette: [
      {
        name: 'Primary',
        hex: '#007AFF',
        shades: {
          50: '#E3F2FD',
          500: '#007AFF',
          900: '#003D7F',
        },
      },
    ],
    breakpoints: {
      sm: '640px',
      md: '1024px',
      lg: '1280px',
    },
    version: '1.0.0',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Get fresh instance for each test
    service = DesignSystemService.getInstance();
    // Clear any cached data
    (service as any).cache.clear();
    (service as any).designSystem = null;
  });

  afterEach(() => {
    service.dispose();
  });

  describe('loadDesignSystem', () => {
    it('should load design system from JSON file', async () => {
      const mockFilePath = path.join(mockWorkspaceRoot, 'design-system.json');
      
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockDesignSystem));

      const result = await service.loadDesignSystem(mockWorkspaceRoot);

      expect(result).toEqual(mockDesignSystem);
      expect(fs.readFile).toHaveBeenCalledWith(mockFilePath, 'utf-8');
    });

    it('should return null when no design system file found', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await service.loadDesignSystem(mockWorkspaceRoot);

      expect(result).toBeNull();
    });

    it('should use cached data when available', async () => {
      const mockFilePath = path.join(mockWorkspaceRoot, 'design-system.json');
      
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockDesignSystem));

      // First load
      await service.loadDesignSystem(mockWorkspaceRoot);
      
      // Clear mocks
      jest.clearAllMocks();

      // Second load should use cache
      const result = await service.loadDesignSystem(mockWorkspaceRoot);

      expect(result).toEqual(mockDesignSystem);
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('should force reload when forceReload is true', async () => {
      const mockFilePath = path.join(mockWorkspaceRoot, 'design-system.json');
      
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockDesignSystem));

      // First load
      await service.loadDesignSystem(mockWorkspaceRoot);
      
      // Clear mocks
      jest.clearAllMocks();
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockDesignSystem));

      // Second load with forceReload
      const result = await service.loadDesignSystem(mockWorkspaceRoot, true);

      expect(result).toEqual(mockDesignSystem);
      expect(fs.readFile).toHaveBeenCalled();
    });

    it('should load YAML files', async () => {
      const mockFilePath = path.join(mockWorkspaceRoot, 'design-system.yaml');
      
      (fs.access as jest.Mock)
        .mockRejectedValueOnce(new Error('JSON not found'))
        .mockResolvedValueOnce(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockDesignSystem));

      const result = await service.loadDesignSystem(mockWorkspaceRoot);

      expect(result).toEqual(mockDesignSystem);
      expect(fs.readFile).toHaveBeenCalledWith(mockFilePath, 'utf-8');
    });

    it('should handle invalid JSON gracefully', async () => {
      const mockFilePath = path.join(mockWorkspaceRoot, 'design-system.json');
      
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue('invalid json');

      const result = await service.loadDesignSystem(mockWorkspaceRoot);

      expect(result).toBeNull();
    });
  });

  describe('getDesignSystem', () => {
    it('should return current design system', async () => {
      const mockFilePath = path.join(mockWorkspaceRoot, 'design-system.json');
      
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockDesignSystem));

      await service.loadDesignSystem(mockWorkspaceRoot);
      const result = service.getDesignSystem();

      expect(result).toEqual(mockDesignSystem);
    });

    it('should return null when no design system loaded', () => {
      const result = service.getDesignSystem();
      expect(result).toBeNull();
    });
  });

  describe('getColor', () => {
    beforeEach(async () => {
      const mockFilePath = path.join(mockWorkspaceRoot, 'design-system.json');
      
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockDesignSystem));

      await service.loadDesignSystem(mockWorkspaceRoot);
    });

    it('should return hex color by default', () => {
      const color = service.getColor('primary');
      expect(color).toBe('#007AFF');
    });

    it('should convert hex to RGB', () => {
      const color = service.getColor('primary', 'rgb');
      expect(color).toBe('rgb(0, 122, 255)');
    });

    it('should convert hex to HSL', () => {
      const color = service.getColor('primary', 'hsl');
      expect(color).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
    });

    it('should return null for non-existent color', () => {
      const color = service.getColor('nonexistent');
      expect(color).toBeNull();
    });

    it('should return null when no design system loaded', () => {
      service.dispose();
      const color = service.getColor('primary');
      expect(color).toBeNull();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      const mockFilePath = path.join(mockWorkspaceRoot, 'design-system.json');
      
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockDesignSystem));

      await service.loadDesignSystem(mockWorkspaceRoot);
    });

    it('should search colors', () => {
      const results = service.search('primary');
      expect(results).toContainEqual({
        type: 'color',
        name: 'primary',
        value: '#007AFF',
      });
    });

    it('should search typography', () => {
      const results = service.search('heading');
      expect(results.some(r => r.type === 'typography' && r.name === 'Heading 1')).toBe(true);
    });

    it('should search spacing', () => {
      const results = service.search('sm');
      expect(results.some(r => r.type === 'spacing' && r.name === 'sm')).toBe(true);
    });

    it('should search components', () => {
      const results = service.search('button');
      expect(results.some(r => r.type === 'component' && r.name === 'Button')).toBe(true);
    });

    it('should return empty array when no design system loaded', () => {
      service.dispose();
      const results = service.search('primary');
      expect(results).toEqual([]);
    });

    it('should be case insensitive', () => {
      const results = service.search('PRIMARY');
      expect(results).toContainEqual({
        type: 'color',
        name: 'primary',
        value: '#007AFF',
      });
    });

    it('should return empty array when no matches found', () => {
      const results = service.search('nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('caching', () => {
    it('should cache loaded design system', async () => {
      const mockFilePath = path.join(mockWorkspaceRoot, 'design-system.json');
      
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockDesignSystem));

      // First load
      await service.loadDesignSystem(mockWorkspaceRoot);
      const firstCallCount = (fs.readFile as jest.Mock).mock.calls.length;

      // Second load should use cache
      await service.loadDesignSystem(mockWorkspaceRoot);
      const secondCallCount = (fs.readFile as jest.Mock).mock.calls.length;

      expect(firstCallCount).toBe(secondCallCount);
    });

    it('should expire cache after TTL', async () => {
      const mockFilePath = path.join(mockWorkspaceRoot, 'design-system.json');
      
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockDesignSystem));

      // First load
      await service.loadDesignSystem(mockWorkspaceRoot);

      // Manually expire cache
      const cache = (service as any).cache;
      const cached = cache.get(mockWorkspaceRoot);
      if (cached) {
        cached.timestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago
      }

      jest.clearAllMocks();
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockDesignSystem));

      // Second load should reload from file
      await service.loadDesignSystem(mockWorkspaceRoot);

      expect(fs.readFile).toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('should load design system and set up watcher', async () => {
      const mockFilePath = path.join(mockWorkspaceRoot, 'design-system.json');
      
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockDesignSystem));

      await service.initialize(mockWorkspaceRoot);

      expect(fs.readFile).toHaveBeenCalled();
      expect(service.getDesignSystem()).toEqual(mockDesignSystem);
    });

    it('should not throw when initialization fails', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Access denied'));

      await expect(service.initialize(mockWorkspaceRoot)).resolves.not.toThrow();
    });
  });

  describe('dispose', () => {
    it('should clean up resources', async () => {
      const mockFilePath = path.join(mockWorkspaceRoot, 'design-system.json');
      
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockDesignSystem));

      await service.loadDesignSystem(mockWorkspaceRoot);
      service.dispose();

      expect(service.getDesignSystem()).toBeNull();
      expect((service as any).cache.size).toBe(0);
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = DesignSystemService.getInstance();
      const instance2 = DesignSystemService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
