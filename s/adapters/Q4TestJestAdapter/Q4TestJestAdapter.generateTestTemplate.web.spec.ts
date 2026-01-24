// ./Q4TestJestAdapter.Q4TestJestAdapter.generateTestTemplate.gptgen.web.spec.ts
import { Q4TestJestAdapter } from '../../../src/adapters/Q4TestJestAdapter';
import path from 'path';

jest.mock('path', () => ({
    ...jest.requireActual('path'),
    basename: jest.fn(),
}));

/** @aiContributed-2026-01-24 */
describe('Q4TestJestAdapter - generateTestTemplate', () => {
  let adapter: Q4TestJestAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new Q4TestJestAdapter('.q4testrc.json');
  });

  /** @aiContributed-2026-01-24 */
    it('should generate a test template with the correct file name and module name', () => {
    const mockScenarios = [
      { id: 'scenario1', description: 'Test scenario 1', category: 'Category A' },
      { id: 'scenario2', description: 'Test scenario 2', category: 'Category B' },
    ];
    const mockFileBeingTested = 'exampleFile.ts';
    const mockSourceFilePath = '/path/to/sourceFile.ts';

    (path.basename as jest.Mock).mockReturnValue('exampleFile.ts');

    jest.spyOn(adapter as any, 'groupScenariosByCategory').mockImplementation((scenarios) => {
      const grouped: Record<string, any[]> = {};
      scenarios.forEach((scenario: any) => {
        if (!grouped[scenario.category]) {
          grouped[scenario.category] = [];
        }
        grouped[scenario.category].push(scenario);
      });
      return grouped;
    });

    const result = adapter.generateTestTemplate(
      mockSourceFilePath,
      mockScenarios,
      mockFileBeingTested
    );

    expect(result).toContain('AUTO-GENERATED TEST SUITE BY Q4TEST');
    expect(result).toContain('exampleFile');
    expect(result).toContain('Test scenario 1');
    expect(result).toContain('Test scenario 2');
    expect(path.basename).toHaveBeenCalledWith(mockFileBeingTested);
  });

  /** @aiContributed-2026-01-24 */
    it('should include categorized test cases in the generated template', () => {
    const mockScenarios = [
      { id: 'scenario1', description: 'Category A - Test scenario 1', category: 'Category A' },
      { id: 'scenario2', description: 'Category B - Test scenario 2', category: 'Category B' },
    ];
    const mockFileBeingTested = 'exampleFile.ts';
    const mockSourceFilePath = '/path/to/sourceFile.ts';

    (path.basename as jest.Mock).mockReturnValue('exampleFile.ts');

    jest.spyOn(adapter as any, 'groupScenariosByCategory').mockImplementation((scenarios) => {
      const grouped: Record<string, any[]> = {};
      scenarios.forEach((scenario: any) => {
        if (!grouped[scenario.category]) {
          grouped[scenario.category] = [];
        }
        grouped[scenario.category].push(scenario);
      });
      return grouped;
    });

    jest.spyOn(adapter as any, 'generateTestCase').mockImplementation(
      (scenario: any) => `it('${scenario.description}', () => {});\n`
    );

    const result = adapter.generateTestTemplate(
      mockSourceFilePath,
      mockScenarios,
      mockFileBeingTested
    );

    expect(result).toContain('// ========== CATEGORY A TESTS ==========');
    expect(result).toContain("it('Category A - Test scenario 1', () => {});");
    expect(result).toContain('// ========== CATEGORY B TESTS ==========');
    expect(result).toContain("it('Category B - Test scenario 2', () => {});");
  });

  /** @aiContributed-2026-01-24 */
    it('should include the correct timestamp in the generated template', () => {
    const mockScenarios = [];
    const mockFileBeingTested = 'exampleFile.ts';
    const mockSourceFilePath = '/path/to/sourceFile.ts';

    (path.basename as jest.Mock).mockReturnValue('exampleFile.ts');

    const mockDate = new Date('2023-01-01T00:00:00.000Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as string);

    const result = adapter.generateTestTemplate(
      mockSourceFilePath,
      mockScenarios,
      mockFileBeingTested
    );

    expect(result).toContain('Generated At: 2023-01-01T00:00:00.000Z');
  });
});