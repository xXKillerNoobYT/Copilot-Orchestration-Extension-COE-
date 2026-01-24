// ./wizardStore.useWizardStore.gptgen.web.spec.ts
import { useWizardStore, resetWizardStore } from '../../../src/planBuilder/wizardStore';
import { WizardContainer } from '../../../src/planBuilder/wizardContainer';

jest.mock('../../../src/planBuilder/wizardContainer', () => {
  const originalModule = jest.requireActual('../../../src/planBuilder/wizardContainer');
  return {
    ...originalModule,
    WizardContainer: jest.fn().mockImplementation(() => ({
      getAllPages: jest.fn(() => [
        { id: 'page1', title: 'Page 1', questions: [] },
        { id: 'page2', title: 'Page 2', questions: [] },
      ]),
      getCurrentPage: jest.fn(() => ({ id: 'page1', title: 'Page 1', questions: [] })),
      getCurrentQuestions: jest.fn(() => []),
      navigateNext: jest.fn(() => true),
      navigatePrevious: jest.fn(() => true),
      jumpToPage: jest.fn(() => true),
      getAllAnswers: jest.fn(() => ({})),
      setAnswer: jest.fn(),
      getAnswer: jest.fn(),
      getProgress: jest.fn(() => ({
        currentPageIndex: 0,
        totalPages: 2,
        completedPageCount: 0,
        progressPercentage: 0,
        estimatedTimeRemaining: 0,
      })),
      validatePage: jest.fn(() => ({ valid: true, errors: [] })),
      completeWizard: jest.fn(async () => ({})),
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
describe('useWizardStore', () => {
  beforeEach(() => {
    resetWizardStore();
    jest.clearAllMocks();
  });

  /** @aiContributed-2026-01-24 */
    it('should initialize the wizard store correctly', () => {
    const store = useWizardStore();
    expect(store.currentPageIndex).toBe(0);
    expect(store.allPages.length).toBe(2);
    expect(store.currentPage?.id).toBe('page1');
  });

  /** @aiContributed-2026-01-24 */
    it('should navigate to the next page', () => {
    const store = useWizardStore();
    const result = store.navigateNext();
    expect(result).toBe(true);
    expect(store.container.navigateNext).toHaveBeenCalled();
  });

  /** @aiContributed-2026-01-24 */
    it('should navigate to the previous page', () => {
    const store = useWizardStore();
    const result = store.navigatePrevious();
    expect(result).toBe(true);
    expect(store.container.navigatePrevious).toHaveBeenCalled();
  });

  /** @aiContributed-2026-01-24 */
    it('should jump to a specific page', () => {
    const store = useWizardStore();
    const result = store.jumpToPage('page2');
    expect(result).toBe(true);
    expect(store.container.jumpToPage).toHaveBeenCalledWith('page2');
  });

  /** @aiContributed-2026-01-24 */
    it('should set and get an answer', () => {
    const store = useWizardStore();
    store.setAnswer('question1', 'answer1');
    expect(store.container.setAnswer).toHaveBeenCalledWith('question1', 'answer1');
    store.container.getAnswer.mockReturnValueOnce('answer1');
    const answer = store.getAnswer('question1');
    expect(answer).toBe('answer1');
  });

  /** @aiContributed-2026-01-24 */
    it('should validate the current page', () => {
    const store = useWizardStore();
    const result = store.validateCurrentPage();
    expect(result).toBe(true);
    expect(store.container.validatePage).toHaveBeenCalledWith('page1');
  });

  /** @aiContributed-2026-01-24 */
    it('should complete the wizard', async () => {
    const store = useWizardStore();
    const plan = await store.completeWizard();
    expect(plan).toEqual({});
    expect(store.container.completeWizard).toHaveBeenCalled();
  });

  /** @aiContributed-2026-01-24 */
    it('should reset the wizard store', () => {
    const store = useWizardStore();
    store.reset();
    expect(store.container.reset).toHaveBeenCalled();
    expect(store.currentPageIndex).toBe(0);
  });

  /** @aiContributed-2026-01-24 */
    it('should dispose the wizard store', () => {
    const store = useWizardStore();
    store.dispose();
    expect(store.container.dispose).toHaveBeenCalled();
  });
});