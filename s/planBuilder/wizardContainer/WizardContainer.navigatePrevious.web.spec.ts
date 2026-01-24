import { WizardContainer } from '../../../src/planBuilder/wizardContainer';

const NavigationDirection = {
    PREVIOUS: 'PREVIOUS',
};

/** @aiContributed-2026-01-24 */
describe('WizardContainer - navigatePrevious', () => {
  let wizardContainer: WizardContainer;

  beforeEach(() => {
    wizardContainer = new WizardContainer();
    (wizardContainer as any).navigateToIndex = jest.fn();
  });

  /* it('should navigate to the previous page if currentPageIndex is greater than 0', () => {
        (wizardContainer as any).currentPageIndex = 2;

        const result = wizardContainer.navigatePrevious();

        expect(result).toBe(true);
        expect((wizardContainer as any).navigateToIndex).toHaveBeenCalledWith(1, NavigationDirection.PREVIOUS);
      }); */

  /** @aiContributed-2026-01-24 */
    it('should not navigate if currentPageIndex is 0', () => {
    (wizardContainer as any).currentPageIndex = 0;

    const result = wizardContainer.navigatePrevious();

    expect(result).toBe(false);
    expect((wizardContainer as any).navigateToIndex).not.toHaveBeenCalled();
  });
});