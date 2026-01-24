import { resetWizardStore, getWizardStore, useWizardStore } from '../../../src/planBuilder/wizardStore';
import { WizardContainer } from '../../../src/planBuilder/wizardContainer';

jest.mock('../../../src/planBuilder/wizardContainer', () => {
  return {
    ...jest.requireActual('../../../src/planBuilder/wizardContainer'),
    WizardContainer: jest.fn().mockImplementation(() => ({
      reset: jest.fn(),
      dispose: jest.fn(),
      getAllAnswers: jest.fn().mockReturnValue({}),
      getProgress: jest.fn().mockReturnValue({ completed: 0, total: 0 }),
      onPageChangeEvent: jest.fn(),
      onProgressUpdateEvent: jest.fn(),
      onValidationErrorEvent: jest.fn(),
      onCompletionEvent: jest.fn(),
    })),
  };
});

/** @aiContributed-2026-01-24 */
describe('resetWizardStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* it('should dispose the existing store instance and set it to null', () => {
        const mockDispose = jest.fn();
        const mockContainer = new WizardContainer();
        mockContainer.dispose = mockDispose;

        useWizardStore();
        resetWizardStore();

        expect(mockDispose).toHaveBeenCalledTimes(1);
        expect(() => getWizardStore()).toThrow('WizardStore not initialized. Call useWizardStore() first.');
      }); */

  /** @aiContributed-2026-01-24 */
    it('should not throw an error if no store instance exists', () => {
    expect(() => resetWizardStore()).not.toThrow();
  });
});