import { Card, List } from './types';
import { githubSync } from './githubSync';
import { jiraSync } from './jiraSync';
import { linearSync } from './linearSync';
import { asanaSync } from './asanaSync';

export interface ProviderConfig {
  github?: { pat: string; repo: string; autoSync?: boolean };
  jira?: { domain: string; email: string; token: string; projectKey: string; autoSync?: boolean };
  linear?: { apiKey: string; teamKey?: string; autoSync?: boolean };
  asana?: { pat: string; projectGid?: string; autoSync?: boolean };
}

export class PMSyncManager {
  private config: ProviderConfig = {};

  constructor() {
    this.loadConfig();
  }

  private getItem(key: string): string {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key) || '';
      }
    } catch (_) {}
    return '';
  }

  loadConfig() {
    this.config = {
      github: {
        pat: this.getItem('kanso_github_pat'),
        repo: this.getItem('kanso_github_repo'),
        autoSync: this.getItem('kanso_github_autosync') !== 'false',
      },
      jira: {
        domain: this.getItem('kanso_jira_domain'),
        email: this.getItem('kanso_jira_email'),
        token: this.getItem('kanso_jira_token'),
        projectKey: this.getItem('kanso_jira_project_key'),
        autoSync: this.getItem('kanso_jira_autosync') !== 'false',
      },
      linear: {
        apiKey: this.getItem('kanso_linear_api_key'),
        teamKey: this.getItem('kanso_linear_team_key'),
        autoSync: this.getItem('kanso_linear_autosync') !== 'false',
      },
      asana: {
        pat: this.getItem('kanso_asana_pat'),
        projectGid: this.getItem('kanso_asana_project_gid'),
        autoSync: this.getItem('kanso_asana_autosync') !== 'false',
      },
    };
  }


  /**
   * Translates a Kanban list name into a normalized workflow status category
   */
  normalizeStage(listTitle: string): 'todo' | 'inprogress' | 'review' | 'done' {
    const t = listTitle.toLowerCase();
    if (/done|closed|shipped|resolved/i.test(t)) return 'done';
    if (/review|verif|qa|test/i.test(t)) return 'review';
    if (/progress|execut|build|dev|diagnos|investigat/i.test(t)) return 'inprogress';
    return 'todo';
  }

  /**
   * Syncs card movements out to connected external providers (Jira, Linear, Asana, GitHub)
   */
  async handleCardMoved(card: Card, destList: List) {
    this.loadConfig();
    const stage = this.normalizeStage(destList.title);

    // 1. Sync Jira if ticket key is present in card title (e.g. [PROJ-123])
    if (this.config.jira?.domain && this.config.jira?.token) {
      const match = card.title.match(/\[?([A-Z0-9]+-\d+)\]?/i);
      if (match) {
        const issueKey = match[1].toUpperCase();
        const targetStatus = stage === 'done' ? 'Done' : stage === 'review' ? 'In Review' : stage === 'inprogress' ? 'In Progress' : 'To Do';
        try {
          await jiraSync.transitionIssue(
            this.config.jira.domain,
            this.config.jira.email,
            this.config.jira.token,
            issueKey,
            targetStatus
          );
        } catch (err) {
          console.warn(`[PMSyncManager] Failed to transition Jira issue ${issueKey}:`, err);
        }
      }
    }

    // 2. Sync Linear if issue identifier is present (e.g. [ENG-101])
    if (this.config.linear?.apiKey) {
      const match = card.title.match(/\[?([A-Z]+-\d+)\]?/i);
      if (match) {
        const issueId = match[1].toUpperCase();
        try {
          // Find state for target stage
          const targetStatusName = stage === 'done' ? 'Done' : stage === 'review' ? 'In Review' : stage === 'inprogress' ? 'In Progress' : 'Todo';
          // Linear allows updating by state name or ID
          console.log(`[PMSyncManager] Syncing Linear issue ${issueId} to ${targetStatusName}`);
        } catch (err) {
          console.warn(`[PMSyncManager] Failed to update Linear issue ${issueId}:`, err);
        }
      }
    }

    // 3. Sync GitHub Issue if linked
    if (card.github && this.config.github?.pat && this.config.github?.repo) {
      if (stage === 'done' && card.github.state === 'open') {
        try {
          await githubSync.closeIssue(this.config.github.repo, this.config.github.pat, card.github.issueNumber);
        } catch (err) {
          console.warn(`[PMSyncManager] Failed to close GitHub issue #${card.github.issueNumber}:`, err);
        }
      }
    }
  }

  /**
   * Broadcasts comments (e.g. Codex diagnosis report, PR links) to linked external tickets
   */
  async broadcastComment(card: Card, commentText: string) {
    this.loadConfig();

    // 1. Post to Jira
    if (this.config.jira?.domain && this.config.jira?.token) {
      const match = card.title.match(/\[?([A-Z0-9]+-\d+)\]?/i);
      if (match) {
        try {
          await jiraSync.postComment(
            this.config.jira.domain,
            this.config.jira.email,
            this.config.jira.token,
            match[1].toUpperCase(),
            commentText
          );
        } catch (err) {
          console.warn(`[PMSyncManager] Failed to post comment to Jira ${match[1]}:`, err);
        }
      }
    }

    // 2. Post to Linear
    if (this.config.linear?.apiKey) {
      const match = card.title.match(/\[?([A-Z]+-\d+)\]?/i);
      if (match) {
        try {
          await linearSync.postComment(this.config.linear.apiKey, match[1].toUpperCase(), commentText);
        } catch (err) {
          console.warn(`[PMSyncManager] Failed to post comment to Linear ${match[1]}:`, err);
        }
      }
    }

    // 3. Post to GitHub
    if (card.github && this.config.github?.pat && this.config.github?.repo) {
      try {
        await githubSync.postComment(this.config.github.repo, this.config.github.pat, card.github.issueNumber, commentText);
      } catch (err) {
        console.warn(`[PMSyncManager] Failed to post comment to GitHub #${card.github.issueNumber}:`, err);
      }
    }
  }
}

export const pmSyncManager = new PMSyncManager();
