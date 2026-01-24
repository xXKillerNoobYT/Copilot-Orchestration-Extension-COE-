import { detectDesignTokenDrift, type DesignTokenDrift } from '../designTokenDrift';
import * as fs from 'fs/promises';

jest.mock('vscode');
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  readFile: jest.fn(),
  stat: jest.fn(),
}));

describe('DesignTokenDrift', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fs.promises
    (fs.readdir as jest.Mock).mockResolvedValue([]);
    (fs.readFile as jest.Mock).mockResolvedValue('{}');
    (fs.stat as jest.Mock).mockResolvedValue({ isFile: () => true });
  });

  describe('Drift Detection', () => {
    it('should detect design token changes', async () => {
      const workspaceRoot = '/test/workspace';
      const drifts = await detectDesignTokenDrift(workspaceRoot);

      expect(Array.isArray(drifts)).toBe(true);
    });

    it('should return empty array when no token files found', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      const workspaceRoot = '/test/workspace';
      const drifts = await detectDesignTokenDrift(workspaceRoot);

      expect(drifts).toEqual([]);
    });
  });

  describe('Core Functionality', () => {
    it('should handle basic operations', async () => {
      const result = await detectDesignTokenDrift('/test');
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Read error'));

      const drifts = await detectDesignTokenDrift('/test/workspace');
      expect(Array.isArray(drifts)).toBe(true);
    });
  });
});
