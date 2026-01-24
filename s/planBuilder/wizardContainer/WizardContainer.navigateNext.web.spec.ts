import { WizardContainer } from '../../../src/planBuilder/wizardContainer';
import { WizardStateManager } from '../../../src/planBuilder/wizardState';
import { QuestionFramework } from '../../../src/planBuilder/questionFramework';

jest.mock('../../../src/planBuilder/wizardState', () => ({
  ...jest.requireActual('../../../src/planBuilder/wizardState'),
  WizardStateManager: jest.fn().mockImplementation(() => ({
    markPageCompleted: jest.fn(),
    isPageCompleted: jest.fn(),
    getState: jest.fn(),
    getAllAnswers: jest.fn(),
  })),
}));

jest.mock('../../../src/planBuilder/questionFramework', () => ({
  ...jest.requireActual('../../../src/planBuilder/questionFramework'),
  QuestionFramework: jest.fn().mockImplementation(() => ({
    getPages: jest.fn(),
  })),
}));

/** @aiContributed-2026-01-24 */
describe('WizardContainer - navigateNext', () => {
  let wizardContainer: WizardContainer;

  beforeEach(() => {
    jest.spyOn(WizardContainer.prototype as any, 'restoreSession').mockImplementation(() => {});
    wizardContainer = new WizardContainer();
  });

  /* it('should validate the current page and navigate to the next page if validation passes', () => {
        const mockPages = [
          { id: 'page1', questions: [] },
          { id: 'page2', questions: [] },
        ];
        const mockCurrentPage = { id: 'page1', questions: [] };
        const mockValidationResult = { valid: true, errors: [] };

        jest.spyOn(wizardContainer, 'getAllPages').mockReturnValue(mockPages);
        jest.spyOn(wizardContainer, 'getCurrentPage').mockReturnValue(mockCurrentPage);
        jest.spyOn(wizardContainer, 'validatePage').mockReturnValue(mockValidationResult);
        const navigateToIndexSpy = jest.spyOn(wizardContainer as any, 'navigateToIndex');

        const result = wizardContainer.navigateNext();

        expect(result).toBe(true);
        expect(wizardContainer.validatePage).toHaveBeenCalledWith('page1');
        expect(navigateToIndexSpy).toHaveBeenCalledWith(1, expect.anything());
      }); */

  /** @aiContributed-2026-01-24 */
    it('should not navigate to the next page if validation fails', () => {
    const mockCurrentPage = { id: 'page1', questions: [] };
    const mockValidationResult = { valid: false, errors: ['Error'] };

    jest.spyOn(wizardContainer, 'getCurrentPage').mockReturnValue(mockCurrentPage);
    jest.spyOn(wizardContainer, 'validatePage').mockReturnValue(mockValidationResult);
    const onValidationErrorSpy = jest.fn();
    wizardContainer.onValidationErrorEvent(onValidationErrorSpy);

    const result = wizardContainer.navigateNext();

    expect(result).toBe(false);
    expect(wizardContainer.validatePage).toHaveBeenCalledWith('page1');
    expect(onValidationErrorSpy).toHaveBeenCalledWith(['Error']);
  });

  /** @aiContributed-2026-01-24 */
    it('should return false if there are no more pages to navigate', () => {
    const mockPages = [{ id: 'page1', questions: [] }];
    const mockCurrentPage = { id: 'page1', questions: [] };
    const mockValidationResult = { valid: true, errors: [] };

    jest.spyOn(wizardContainer, 'getAllPages').mockReturnValue(mockPages);
    jest.spyOn(wizardContainer, 'getCurrentPage').mockReturnValue(mockCurrentPage);
    jest.spyOn(wizardContainer, 'validatePage').mockReturnValue(mockValidationResult);

    const result = wizardContainer.navigateNext();

    expect(result).toBe(false);
  });
});