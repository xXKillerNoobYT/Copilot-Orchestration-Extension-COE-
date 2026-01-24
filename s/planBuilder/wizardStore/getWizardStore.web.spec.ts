import { getWizardStore, useWizardStore, resetWizardStore } from '../../../src/planBuilder/wizardStore';
import { WizardContainer } from '../../../src/planBuilder/wizardContainer';

jest.mock('../../../src/planBuilder/wizardContainer', () => {
  return {
    ...jest.requireActual('../../../src/planBuilder/wizardContainer'),
    WizardContainer: jest.fn().mockImplementation(() => ({
      getAllAnswers: jest.fn().mockReturnValue({}),
      getAllPages: jest.fn().mockReturnValue([]),
      getCurrentPage: jest.fn().mockReturnValue(null),
      getCurrentQuestions: jest.fn().mockReturnValue([]),
      getProgress: jest.fn().mockReturnValue({}),
      navigateNext: jest.fn().mockReturnValue(true),
      navigatePrevious: jest.fn().mockReturnValue(true),
      jumpToPage: jest.fn().mockReturnValue(true),
      setAnswer: jest.fn(),
      completeWizard: jest.fn().mockResolvedValue({}),
      reset: jest.fn(),
      dispose: jest.fn(),
      onPageChangeEvent: jest.fn(),
      onProgressUpdateEvent: jest.fn(),
      onValidationErrorEvent: jest.fn(),
      onCompletionEvent: jest.fn(),
    })),
  };
});

/** @aiContributed-2026-01-24 */
describe('getWizardStore', () => {
  beforeEach(() => {
    resetWizardStore();
  });

  /** @aiContributed-2026-01-24 */
    it('should throw an error if the store is not initialized', () => {
    expect(() => getWizardStore()).toThrow(
      'WizardStore not initialized. Call useWizardStore() first.'
    );
  });

  /* it('should return the store instance after initialization', () => {
        useWizardStore();
        const store = getWizardStore();
        expect(store).toBeDefined();
        expect(store.container).toBeInstanceOf((WizardContainer as jest.Mock));
      }); */

  /** @aiContributed-2026-01-24 */
    it('should reuse the existing store instance', () => {
    const store1 = useWizardStore();
    const store2 = getWizardStore();
    expect(store1).toBe(store2);
  });
});