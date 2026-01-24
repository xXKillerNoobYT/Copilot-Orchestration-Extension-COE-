// ./wizardContainer.WizardContainer.getCurrentPage.gptgen.web.spec.ts
import { WizardContainer } from '../../../src/planBuilder/wizardContainer';
import { QuestionFramework, WizardPage } from '../../../src/planBuilder/questionFramework';

jest.mock('../../../src/planBuilder/questionFramework', () => ({
    ...jest.requireActual('../../../src/planBuilder/questionFramework'),
    QuestionFramework: jest.fn().mockImplementation(() => ({
        getPages: jest.fn(),
    })),
}));

/** @aiContributed-2026-01-24 */
describe('WizardContainer - getCurrentPage', () => {
    let wizardContainer: WizardContainer;

    beforeEach(() => {
        jest.spyOn(WizardContainer.prototype as any, 'restoreSession').mockImplementation(() => {});
        wizardContainer = new WizardContainer();
    });

    /** @aiContributed-2026-01-24 */
    it('should return the current page when currentPageIndex is valid', () => {
        const mockPages: WizardPage[] = [
            { id: 'page1', title: 'Page 1', description: '', questions: [] },
            { id: 'page2', title: 'Page 2', description: '', questions: [] },
        ];

        jest.spyOn(wizardContainer, 'getAllPages').mockReturnValue(mockPages);
        (wizardContainer as any).currentPageIndex = 1;

        const currentPage = wizardContainer.getCurrentPage();

        expect(currentPage).toEqual(mockPages[1]);
    });

    /** @aiContributed-2026-01-24 */
    it('should return null when currentPageIndex is out of bounds', () => {
        const mockPages: WizardPage[] = [
            { id: 'page1', title: 'Page 1', description: '', questions: [] },
        ];

        jest.spyOn(wizardContainer, 'getAllPages').mockReturnValue(mockPages);
        (wizardContainer as any).currentPageIndex = 5;

        const currentPage = wizardContainer.getCurrentPage();

        expect(currentPage).toBeNull();
    });

    /** @aiContributed-2026-01-24 */
    it('should return null when there are no pages', () => {
        jest.spyOn(wizardContainer, 'getAllPages').mockReturnValue([]);
        (wizardContainer as any).currentPageIndex = 0;

        const currentPage = wizardContainer.getCurrentPage();

        expect(currentPage).toBeNull();
    });
});