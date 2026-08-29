import { Card, GitHubCardMetadata } from './types';
import { wekanApi } from './wekanApi';

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
  user: { login: string; avatar_url: string };
  comments: number;
}

export class GitHubSyncEngine {
  private pollerTimer: any = null;

  async testConnection(repo: string, pat: string): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'Synara-Kanban-App',
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, message: data.message || `GitHub error: HTTP ${res.status}` };
      }
      return { ok: true, message: 'Connected to repository successfully' };
    } catch (e: any) {
      return { ok: false, message: e.message || 'Network error connecting to GitHub' };
    }
  }

  async fetchIssues(repo: string, pat: string): Promise<GitHubIssue[]> {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues?state=all&per_page=50`, {
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Synara-Kanban-App',
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch GitHub issues: HTTP ${res.status}`);
    }
    return await res.json();
  }

  async createIssue(repo: string, pat: string, title: string, body?: string): Promise<GitHubIssue> {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Synara-Kanban-App',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, body: body || '' }),
    });
    if (!res.ok) {
      throw new Error(`Failed to create GitHub issue: HTTP ${res.status}`);
    }
    return await res.json();
  }

  async updateIssue(
    repo: string,
    pat: string,
    issueNumber: number,
    update: { title?: string; body?: string; state?: 'open' | 'closed' }
  ): Promise<GitHubIssue> {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues/${issueNumber}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Synara-Kanban-App',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update),
    });
    if (!res.ok) {
      throw new Error(`Failed to update GitHub issue #${issueNumber}: HTTP ${res.status}`);
    }
    return await res.json();
  }

  async closeIssue(repo: string, pat: string, issueNumber: number): Promise<any> {
    return await this.updateIssue(repo, pat, issueNumber, { state: 'closed' });
  }

  async postComment(repo: string, pat: string, issueNumber: number, comment: string): Promise<any> {

    const res = await fetch(`https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Synara-Kanban-App',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: comment }),
    });
    if (!res.ok) {
      throw new Error(`Failed to post GitHub comment: HTTP ${res.status}`);
    }
    return await res.json();
  }

  // --- Inbound Sync Loop ---
  async syncInbound(
    repo: string,
    pat: string,
    serverUrl: string,
    token: string,
    boardId: string,
    lists: { _id: string; title: string }[],
    swimlaneId: string,
    existingCards: Card[]
  ): Promise<{ addedCount: number; updatedCount: number }> {
    const issues = await this.fetchIssues(repo, pat);
    let addedCount = 0;
    let updatedCount = 0;

    const todoList = lists.find(l => /to\s*do|backlog|open/i.test(l.title)) || lists[0];
    const doneList = lists.find(l => /done|closed|complete/i.test(l.title)) || lists[lists.length - 1];

    if (!todoList) return { addedCount: 0, updatedCount: 0 };

    for (const issue of issues) {
      // Check if card already exists with this GitHub issueNumber
      const mappedCard = existingCards.find(c => c.github?.issueNumber === issue.number || c.title.includes(`#${issue.number}`));

      const targetListId = issue.state === 'closed' && doneList ? doneList._id : todoList._id;

      const githubMeta: GitHubCardMetadata = {
        repo,
        issueNumber: issue.number,
        issueId: issue.id,
        issueUrl: issue.html_url,
        state: issue.state,
        lastSyncedAt: new Date().toISOString(),
        syncDirection: 'bidirectional',
      };

      if (!mappedCard) {
        // Create new card mapped to GitHub issue
        const cardTitle = `#${issue.number} ${issue.title}`;
        const description = `${issue.body || ''}\n\n---\n*Synced from GitHub: [Issue #${issue.number}](${issue.html_url})*`;

        const res = await wekanApi.createCard(serverUrl, token, boardId, targetListId, swimlaneId, cardTitle, description);
        await wekanApi.updateCard(serverUrl, token, boardId, targetListId, res._id, {
          github: githubMeta,
        } as any);
        addedCount++;
      } else {
        // Update existing card state if changed
        if (mappedCard.github?.state !== issue.state || mappedCard.title !== `#${issue.number} ${issue.title}`) {
          await wekanApi.updateCard(serverUrl, token, boardId, mappedCard.listId, mappedCard._id, {
            title: `#${issue.number} ${issue.title}`,
            listId: targetListId,
            github: githubMeta,
          } as any);
          updatedCount++;
        }
      }
    }

    return { addedCount, updatedCount };
  }

  // --- Pull Request Management ---
  async createPullRequest(
    repo: string,
    pat: string,
    params: {
      title: string;
      head: string;
      base?: string;
      body?: string;
      draft?: boolean;
    }
  ): Promise<{ id: number; number: number; html_url: string; state: string; title: string }> {
    const res = await fetch(`https://api.github.com/repos/${repo}/pulls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Synara-Kanban-App',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: params.title,
        head: params.head,
        base: params.base || 'main',
        body: params.body || '',
        draft: params.draft || false,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(`Failed to create Pull Request: ${data.message || `HTTP ${res.status}`}`);
    }

    return await res.json();
  }

  async getPullRequest(repo: string, pat: string, prNumber: number): Promise<any> {
    const res = await fetch(`https://api.github.com/repos/${repo}/pulls/${prNumber}`, {
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Synara-Kanban-App',
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch PR #${prNumber}: HTTP ${res.status}`);
    }
    return await res.json();
  }

  async getPullRequestStatus(repo: string, pat: string, prNumber: number): Promise<{ state: string; merged: boolean; mergeable?: boolean; title: string; html_url: string }> {
    const pr = await this.getPullRequest(repo, pat, prNumber);
    return {
      state: pr.state,
      merged: pr.merged || false,
      mergeable: pr.mergeable,
      title: pr.title,
      html_url: pr.html_url,
    };
  }

  // --- Outbound Sync ---
  async syncOutboundCard(
    repo: string,
    pat: string,
    card: Card,
    isClosedList: boolean
  ): Promise<GitHubCardMetadata | null> {
    if (!card.github) return null;

    const targetState: 'open' | 'closed' = isClosedList ? 'closed' : 'open';
    if (card.github.state !== targetState) {
      await this.updateIssue(repo, pat, card.github.issueNumber, {
        state: targetState,
      });

      return {
        ...card.github,
        state: targetState,
        lastSyncedAt: new Date().toISOString(),
      };
    }
    return card.github;
  }
}

export const githubSync = new GitHubSyncEngine();

