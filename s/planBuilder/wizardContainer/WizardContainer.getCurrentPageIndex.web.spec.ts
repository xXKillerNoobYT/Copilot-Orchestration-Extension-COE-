// ./wizardContainer.WizardContainer.getCurrentPageIndex.gptgen.web.spec.ts
import { WizardContainer } from '../../../src/planBuilder/wizardContainer';

/** @aiContributed-2026-01-24 */
describe('WizardContainer - getCurrentPageIndex', () => {
  let wizardContainer: WizardContainer;

  beforeEach(() => {
    wizardContainer = new WizardContainer();
  });

  /** @aiContributed-2026-01-24 */
    it('should return the current page index when called', () => {
    const currentPageIndex = (wizardContainer as any).getCurrentPageIndex();
    expect(currentPageIndex).toBe(0); // Assuming the initial index is 0
  });

  /** @aiContributed-2026-01-24 */
    it('should reflect the updated page index after navigation', () => {
    (wizardContainer as any).currentPageIndex = 1; // Manually updating the page index
    const currentPageIndex = (wizardContainer as any).getCurrentPageIndex();
    expect(currentPageIndex).toBe(1); // Updated expected value
  });
});