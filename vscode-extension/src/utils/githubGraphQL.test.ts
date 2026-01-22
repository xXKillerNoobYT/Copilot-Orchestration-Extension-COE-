import { GitHubGraphQLBuilder } from './githubGraphQL';

describe('GitHubGraphQLBuilder', () => {
    test('builds issue query', () => {
        const builder = new GitHubGraphQLBuilder();
        const q = builder.queryIssue('MDU6SXNzdWUx');
        expect(q).toContain('query');
        expect(q).toContain('Issue');
    });

    test('builds issues query with labels', () => {
        const builder = new GitHubGraphQLBuilder();
        const q = builder.queryIssues({ states: ['OPEN'], labels: ['bug', 'task'] });
        expect(q).toContain('issues');
        expect(q).toContain('labels');
    });

    test('builds update mutation', () => {
        const builder = new GitHubGraphQLBuilder();
        const m = builder.mutateIssue('MDU6SXNzdWUx', { title: 'New title', state: 'OPEN' });
        expect(m).toContain('mutation');
        expect(m).toContain('updateIssue');
    });
});
