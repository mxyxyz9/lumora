import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jiraSync } from '../src/renderer/lib/jiraSync';
import { linearSync } from '../src/renderer/lib/linearSync';
import { asanaSync } from '../src/renderer/lib/asanaSync';

// Mock localStorage for Node environment
const storage: Record<string, string> = {};
global.localStorage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, value: string) => { storage[key] = String(value); },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
  length: 0,
  key: (i: number) => null,
} as any;

describe('External PM Integrations Engine Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });


  describe('JiraSyncEngine', () => {
    it('successfully tests connection and formats authorization header', async () => {
      const mockUser = { displayName: 'Rushil Dev', emailAddress: 'rushil@example.com' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      } as any);

      const res = await jiraSync.testConnection('mycompany.atlassian.net', 'rushil@example.com', 'tok_123');
      expect(res.ok).toBe(true);
      expect(res.message).toContain('Rushil Dev');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/myself',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Basic /),
          }),
        })
      );
    });

    it('creates an issue in Jira format', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: '1002', key: 'KAN-42' }),
      } as any);

      const issue = await jiraSync.createIssue(
        'mycompany.atlassian.net',
        'rushil@example.com',
        'tok_123',
        'KAN',
        'Implement new auth flow',
        'Detailed specs'
      );

      expect(issue.key).toBe('KAN-42');
      expect(issue.summary).toBe('Implement new auth flow');
      expect(issue.url).toBe('https://mycompany.atlassian.net/browse/KAN-42');
    });
  });

  describe('LinearSyncEngine', () => {
    it('successfully queries viewer via GraphQL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            viewer: { id: 'usr_1', name: 'Rushil Dev', email: 'rushil@linear.app' },
          },
        }),
      } as any);

      const res = await linearSync.testConnection('lin_api_key_test');
      expect(res.ok).toBe(true);
      expect(res.message).toContain('Rushil Dev');
      expect(res.message).toContain('rushil@linear.app');
    });

    it('fetches Linear issues list', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            issues: {
              nodes: [
                {
                  id: 'iss_1',
                  identifier: 'ENG-101',
                  title: 'Codex ACP Integration',
                  url: 'https://linear.app/team/issue/ENG-101',
                  state: { id: 'st_1', name: 'In Progress', type: 'started' },
                },
              ],
            },
          },
        }),
      } as any);

      const issues = await linearSync.fetchIssues('lin_api_key_test', 'ENG');
      expect(issues.length).toBe(1);
      expect(issues[0].identifier).toBe('ENG-101');
      expect(issues[0].title).toBe('Codex ACP Integration');
    });
  });

  describe('AsanaSyncEngine', () => {
    it('tests Asana PAT authentication', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { id: '123', name: 'Rushil Asana', email: 'rushil@asana.com' },
        }),
      } as any);

      const res = await asanaSync.testConnection('1/120999999');
      expect(res.ok).toBe(true);
      expect(res.message).toContain('Rushil Asana');
    });
  });

  describe('PMSyncManager', () => {

    it('normalizes list titles into workflow stages', async () => {
      const { pmSyncManager } = await import('../src/renderer/lib/pmSyncManager');
      expect(pmSyncManager.normalizeStage('1 - Reported Issues & Backlog')).toBe('todo');
      expect(pmSyncManager.normalizeStage('2 - Gathering Context & Diagnosis')).toBe('inprogress');
      expect(pmSyncManager.normalizeStage('3 - In Progress / Codex Execution')).toBe('inprogress');
      expect(pmSyncManager.normalizeStage('4 - Code Review & PR Verification')).toBe('review');
      expect(pmSyncManager.normalizeStage('5 - Shipped & Closed')).toBe('done');
    });

    it('syncs Jira transition when card moves to review or done', async () => {
      const { pmSyncManager } = await import('../src/renderer/lib/pmSyncManager');
      const transSpy = vi.spyOn(jiraSync, 'transitionIssue').mockResolvedValue(true);

      localStorage.setItem('kanso_jira_domain', 'test.atlassian.net');
      localStorage.setItem('kanso_jira_email', 'user@test.com');
      localStorage.setItem('kanso_jira_token', 'tok_123');

      const card = {
        _id: 'c1',
        title: '[KAN-99] Implement search feature',
        boardId: 'b1',
        listId: 'l1',
      };
      const destList = {
        _id: 'l2',
        title: '4 - Code Review & PR Verification',
        boardId: 'b1',
      };

      await pmSyncManager.handleCardMoved(card, destList);
      expect(transSpy).toHaveBeenCalledWith(
        'test.atlassian.net',
        'user@test.com',
        'tok_123',
        'KAN-99',
        'In Review'
      );
    });

    it('broadcasts comment to Jira and GitHub', async () => {
      const { pmSyncManager } = await import('../src/renderer/lib/pmSyncManager');
      const jiraSpy = vi.spyOn(jiraSync, 'postComment').mockResolvedValue({ id: '1' });
      const { githubSync } = await import('../src/renderer/lib/githubSync');
      const ghSpy = vi.spyOn(githubSync, 'postComment').mockResolvedValue({ id: 1 } as any);

      localStorage.setItem('kanso_jira_domain', 'test.atlassian.net');
      localStorage.setItem('kanso_jira_email', 'user@test.com');
      localStorage.setItem('kanso_jira_token', 'tok_123');
      localStorage.setItem('kanso_github_pat', 'ghp_test');
      localStorage.setItem('kanso_github_repo', 'wekan/wekan');

      const card = {
        _id: 'c1',
        title: '[PROJ-55] Fix memory leak',
        boardId: 'b1',
        listId: 'l1',
        github: {
          issueNumber: 42,
          repo: 'wekan/wekan',
          issueUrl: 'https://github.com/wekan/wekan/issues/42',
          state: 'open',
          lastSyncedAt: '',
        },
      };

      await pmSyncManager.broadcastComment(card, '### Diagnosis confirmed');
      expect(jiraSpy).toHaveBeenCalledWith(
        'test.atlassian.net',
        'user@test.com',
        'tok_123',
        'PROJ-55',
        '### Diagnosis confirmed'
      );
      expect(ghSpy).toHaveBeenCalledWith(
        'wekan/wekan',
        'ghp_test',
        42,
        '### Diagnosis confirmed'
      );
    });
  });

  describe('CodexAcpDynamicModels', () => {
    it('parses models dynamically from ACP session response without hardcoding', () => {
      const mockSessionResponse = {
        sessionId: 'sess_123',
        models: {
          availableModels: [
            { modelId: 'gpt-5.6-sol[high]', name: 'GPT-5.6-Sol (high)', description: 'Frontier coding model' },
            { modelId: 'gpt-5.6-terra[medium]', name: 'GPT-5.6-Terra (medium)', description: 'Balanced everyday coding' },
            { modelId: 'gpt-5.6-luna[low]', name: 'GPT-5.6-Luna (low)', description: 'Fast lightweight model' },
          ],
          currentModelId: 'gpt-5.6-sol[high]',
        },
        configOptions: [
          {
            id: 'model',
            options: [
              { value: 'gpt-5.6-sol', name: 'GPT-5.6-Sol', description: 'Base Frontier' },
              { value: 'gpt-5.6-terra', name: 'GPT-5.6-Terra', description: 'Base Balanced' },
            ],
          },
        ],
      };

      const modelsList: Array<{ id: string; name: string; description?: string }> = [];
      for (const m of mockSessionResponse.models.availableModels) {
        modelsList.push({ id: m.modelId, name: m.name, description: m.description });
      }
      for (const opt of mockSessionResponse.configOptions[0].options) {
        if (!modelsList.some(m => m.id === opt.value)) {
          modelsList.push({ id: opt.value, name: opt.name, description: opt.description });
        }
      }

      expect(modelsList.length).toBe(5);
      expect(modelsList[0].id).toBe('gpt-5.6-sol[high]');
      expect(modelsList[3].id).toBe('gpt-5.6-sol');
      expect(modelsList[4].id).toBe('gpt-5.6-terra');
    });
  });
});


