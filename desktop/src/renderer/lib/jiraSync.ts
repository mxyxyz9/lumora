import { Card } from './types';
import { wekanApi } from './wekanApi';

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description: string;
  status: string;
  statusCategory: string;
  priority?: string;
  assignee?: string;
  url: string;
}

export class JiraSyncEngine {
  private formatAuthHeader(email: string, apiToken: string): string {
    const raw = `${email.trim()}:${apiToken.trim()}`;
    return `Basic ${btoa(raw)}`;
  }

  private normalizeDomain(domain: string): string {
    let clean = domain.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    if (!clean.includes('.') && !clean.includes('localhost')) {
      clean = `${clean}.atlassian.net`;
    }
    return clean;
  }

  async testConnection(domain: string, email: string, apiToken: string): Promise<{ ok: boolean; message: string; user?: any }> {
    try {
      const base = this.normalizeDomain(domain);
      const res = await fetch(`${base}/rest/api/3/myself`, {
        headers: {
          'Authorization': this.formatAuthHeader(email, apiToken),
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, message: data.message || `Jira authentication failed: HTTP ${res.status}` };
      }

      const user = await res.json();
      return { ok: true, message: `Connected as ${user.displayName || user.emailAddress || 'Jira User'}`, user };
    } catch (e: any) {
      return { ok: false, message: e.message || 'Network error connecting to Jira' };
    }
  }

  async fetchIssues(domain: string, email: string, apiToken: string, jql: string = 'ORDER BY updated DESC'): Promise<JiraIssue[]> {
    const base = this.normalizeDomain(domain);
    const res = await fetch(`${base}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=50`, {
      headers: {
        'Authorization': this.formatAuthHeader(email, apiToken),
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Jira issues: HTTP ${res.status}`);
    }

    const data = await res.json();
    return (data.issues || []).map((item: any) => ({
      id: item.id,
      key: item.key,
      summary: item.fields?.summary || item.key,
      description: typeof item.fields?.description === 'string'
        ? item.fields.description
        : JSON.stringify(item.fields?.description || ''),
      status: item.fields?.status?.name || 'To Do',
      statusCategory: item.fields?.status?.statusCategory?.name || 'To Do',
      priority: item.fields?.priority?.name,
      assignee: item.fields?.assignee?.displayName,
      url: `${base}/browse/${item.key}`,
    }));
  }

  async createIssue(
    domain: string,
    email: string,
    apiToken: string,
    projectKey: string,
    summary: string,
    description?: string,
    issueType: string = 'Task'
  ): Promise<JiraIssue> {
    const base = this.normalizeDomain(domain);
    const bodyPayload = {
      fields: {
        project: { key: projectKey },
        summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: description || '' }],
            },
          ],
        },
        issuetype: { name: issueType },
      },
    };

    const res = await fetch(`${base}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': this.formatAuthHeader(email, apiToken),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Failed to create Jira issue: ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    return {
      id: data.id,
      key: data.key,
      summary,
      description: description || '',
      status: 'To Do',
      statusCategory: 'To Do',
      url: `${base}/browse/${data.key}`,
    };
  }

  async postComment(domain: string, email: string, apiToken: string, issueKey: string, commentText: string): Promise<any> {
    const base = this.normalizeDomain(domain);
    const payload = {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: commentText }],
          },
        ],
      },
    };

    const res = await fetch(`${base}/rest/api/3/issue/${issueKey}/comment`, {
      method: 'POST',
      headers: {
        'Authorization': this.formatAuthHeader(email, apiToken),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Failed to post Jira comment on ${issueKey}: HTTP ${res.status}`);
    }

    return await res.json();
  }

  async transitionIssue(domain: string, email: string, apiToken: string, issueKey: string, targetStatusName: string): Promise<boolean> {
    const base = this.normalizeDomain(domain);
    // 1. Get available transitions
    const transRes = await fetch(`${base}/rest/api/3/issue/${issueKey}/transitions`, {
      headers: {
        'Authorization': this.formatAuthHeader(email, apiToken),
        'Accept': 'application/json',
      },
    });

    if (!transRes.ok) return false;
    const transData = await transRes.json();
    const match = (transData.transitions || []).find((t: any) =>
      t.name.toLowerCase().includes(targetStatusName.toLowerCase()) ||
      t.to?.name.toLowerCase().includes(targetStatusName.toLowerCase())
    );

    if (!match) return false;

    // 2. Perform transition
    const postRes = await fetch(`${base}/rest/api/3/issue/${issueKey}/transitions`, {
      method: 'POST',
      headers: {
        'Authorization': this.formatAuthHeader(email, apiToken),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transition: { id: match.id } }),
    });

    return postRes.ok;
  }
}

export const jiraSync = new JiraSyncEngine();
