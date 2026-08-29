export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  state: { id: string; name: string; type: string };
  priority: number;
  assignee?: { id: string; name: string };
  url: string;
}

export class LinearSyncEngine {
  private async queryGraphQL(apiKey: string, query: string, variables: any = {}): Promise<any> {
    const res = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': apiKey.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      throw new Error(`Linear API error: HTTP ${res.status}`);
    }

    const json = await res.json();
    if (json.errors && json.errors.length > 0) {
      throw new Error(json.errors[0].message || 'Linear GraphQL error');
    }

    return json.data;
  }

  async testConnection(apiKey: string): Promise<{ ok: boolean; message: string; viewer?: any }> {
    try {
      const data = await this.queryGraphQL(apiKey, `
        query {
          viewer {
            id
            name
            email
          }
        }
      `);
      return { ok: true, message: `Connected as ${data.viewer.name} (${data.viewer.email})`, viewer: data.viewer };
    } catch (e: any) {
      return { ok: false, message: e.message || 'Linear connection failed' };
    }
  }

  async fetchIssues(apiKey: string, teamKey?: string): Promise<LinearIssue[]> {
    const query = `
      query GetIssues($filter: IssueFilter) {
        issues(first: 50, filter: $filter) {
          nodes {
            id
            identifier
            title
            description
            url
            priority
            state {
              id
              name
              type
            }
            assignee {
              id
              name
            }
          }
        }
      }
    `;

    const variables = teamKey ? { filter: { team: { key: { eq: teamKey } } } } : {};
    const data = await this.queryGraphQL(apiKey, query, variables);
    return data.issues?.nodes || [];
  }

  async createIssue(apiKey: string, teamId: string, title: string, description?: string): Promise<LinearIssue> {
    const mutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            description
            url
            state {
              id
              name
              type
            }
          }
        }
      }
    `;

    const data = await this.queryGraphQL(apiKey, mutation, {
      input: { teamId, title, description },
    });

    if (!data.issueCreate?.success) {
      throw new Error('Failed to create Linear issue');
    }

    return data.issueCreate.issue;
  }

  async updateIssueStatus(apiKey: string, issueId: string, stateId: string): Promise<boolean> {
    const mutation = `
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
        }
      }
    `;

    const data = await this.queryGraphQL(apiKey, mutation, {
      id: issueId,
      input: { stateId },
    });

    return !!data.issueUpdate?.success;
  }

  async postComment(apiKey: string, issueId: string, body: string): Promise<boolean> {
    const mutation = `
      mutation CreateComment($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
        }
      }
    `;

    const data = await this.queryGraphQL(apiKey, mutation, {
      input: { issueId, body },
    });

    return !!data.commentCreate?.success;
  }
}

export const linearSync = new LinearSyncEngine();
