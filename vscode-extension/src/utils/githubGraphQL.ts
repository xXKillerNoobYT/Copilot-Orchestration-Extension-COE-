export type Operation = 'query' | 'mutation';

export class GitHubGraphQLBuilder {
  queryIssue(issueId: string): string {
    return `query { node(id: "${issueId}") { ... on Issue { number title body state labels(first: 20) { nodes { name } } assignees(first: 20) { nodes { login } } } } }`;
  }

  queryIssues(filters: { states?: string[]; labels?: string[] } = {}): string {
    const states = (filters.states || ['OPEN']).map(s => `"${s}"`).join(',');
    const labelFilter = filters.labels && filters.labels.length > 0 ? ` labels: [${filters.labels.map(l => `"${l}"`).join(',')}]` : '';
    return `query { repository(owner: "$OWNER", name: "$REPO") { issues(first: 50, states: [${states}]${labelFilter}) { nodes { number title state labels(first: 20) { nodes { name } } } } } }`;
  }

  mutateIssue(id: string, updates: { title?: string; body?: string; state?: 'OPEN' | 'CLOSED' }): string {
    const parts: string[] = [];
    if (updates.title) parts.push(`title: "${updates.title.replace(/"/g, '\\"')}"`);
    if (updates.body) parts.push(`body: "${updates.body.replace(/"/g, '\\"')}"`);
    if (updates.state) parts.push(`state: ${updates.state}`);
    const input = parts.join(', ');
    return `mutation { updateIssue(input: { id: "${id}", ${input} }) { issue { number title body state } } }`;
  }

  build(operation: Operation, body: string): string {
    return `${operation} ${body}`;
  }
}
