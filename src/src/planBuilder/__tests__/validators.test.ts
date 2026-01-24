import { Validators } from '../validators';

jest.mock('vscode');

describe('Validators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize correctly', () => {
      expect(Validators).toBeDefined();
    });
  });

  describe('Core Functionality', () => {
    it('should validate required fields', () => {
      const validResult = Validators.required('test value');
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = Validators.required('');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toHaveLength(1);
    });

    it('should validate min length/value', () => {
      const validString = Validators.min('hello', 3);
      expect(validString.valid).toBe(true);

      const invalidString = Validators.min('hi', 3);
      expect(invalidString.valid).toBe(false);

      const validNumber = Validators.min(10, 5);
      expect(validNumber.valid).toBe(true);

      const invalidNumber = Validators.min(2, 5);
      expect(invalidNumber.valid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', () => {
      const result = Validators.required(null, 'Custom error message');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toBe('Custom error message');
    });
  });
});
