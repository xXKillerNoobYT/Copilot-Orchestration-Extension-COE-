// ./wizardContainer.WizardContainer.getAllPages.gptgen.web.spec.ts
import { WizardContainer } from '../../../src/planBuilder/wizardContainer';
import { QuestionFramework, WizardPage } from '../../../src/planBuilder/questionFramework';
import { WizardStateManager } from '../../../src/planBuilder/wizardState';

jest.mock('../../../src/planBuilder/questionFramework', () => ({
    ...jest.requireActual('../../../src/planBuilder/questionFramework'),
    QuestionFramework: jest.fn().mockImplementation(() => ({
        getPages: jest.fn(),
    })),
}));

jest.mock('../../../src/planBuilder/wizardState', () => ({
    ...jest.requireActual('../../../src/planBuilder/wizardState'),
    WizardStateManager: jest.fn().mockImplementation(() => ({
        getAllAnswers: jest.fn(),
        getState: jest.fn(),
    })),
}));

/** @aiContributed-2026-01-24 */
describe('WizardContainer - getAllPages', () => {
    let wizardContainer: WizardContainer;
    let mockFramework: jest.Mocked<QuestionFramework>;
    let mockStateManager: jest.Mocked<WizardStateManager>;

    beforeEach(() => {
        mockFramework = new QuestionFramework() as jest.Mocked<QuestionFramework>;
        mockStateManager = new WizardStateManager() as jest.Mocked<WizardStateManager>;
        wizardContainer = Object.create(WizardContainer.prototype);
        (wizardContainer as any).framework = mockFramework;
        (wizardContainer as any).stateManager = mockStateManager;

        // Mock restoreSession to prevent undefined errors
        jest.spyOn(wizardContainer as any, 'restoreSession').mockImplementation(() => {});
    });

    /** @aiContributed-2026-01-24 */
    it('should return all pages from the framework based on current answers', () => {
        const mockAnswers = { question1: 'answer1', question2: 'answer2' };
        const mockPages: WizardPage[] = [
            { id: 'page1', title: 'Page 1', description: '', questions: [] },
            { id: 'page2', title: 'Page 2', description: '', questions: [] },
        ];

        mockStateManager.getAllAnswers.mockReturnValue(mockAnswers);
        mockFramework.getPages.mockReturnValue(mockPages);

        const result = wizardContainer.getAllPages();

        expect(mockStateManager.getAllAnswers).toHaveBeenCalledTimes(1);
        expect(mockFramework.getPages).toHaveBeenCalledWith(mockAnswers);
        expect(result).toEqual(mockPages);
    });

    /** @aiContributed-2026-01-24 */
    it('should return an empty array if no pages are available', () => {
        const mockAnswers = {};
        const mockPages: WizardPage[] = [];

        mockStateManager.getAllAnswers.mockReturnValue(mockAnswers);
        mockFramework.getPages.mockReturnValue(mockPages);

        const result = wizardContainer.getAllPages();

        expect(mockStateManager.getAllAnswers).toHaveBeenCalledTimes(1);
        expect(mockFramework.getPages).toHaveBeenCalledWith(mockAnswers);
        expect(result).toEqual([]);
    });
});