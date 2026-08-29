import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PipelineOrchestrator } from '../src/renderer/lib/pipelineOrchestrator';
import { Card, List } from '../src/renderer/lib/types';
import { codexAcpClient } from '../src/renderer/lib/codexAcpClient';
import { wekanApi } from '../src/renderer/lib/wekanApi';

describe('PipelineOrchestrator Unit Tests', () => {
  let orchestrator: PipelineOrchestrator;

  const mockLists: List[] = [
    { _id: 'list-1', title: '1 - Reported Issues & Backlog', boardId: 'board-1', sort: 1 },
    { _id: 'list-2', title: '2 - Gathering Context & Diagnosis', boardId: 'board-1', sort: 2 },
    { _id: 'list-3', title: '3 - In Progress / Codex Execution', boardId: 'board-1', sort: 3 },
    { _id: 'list-4', title: '4 - Code Review & PR Verification', boardId: 'board-1', sort: 4 },
    { _id: 'list-5', title: '5 - Shipped & Closed', boardId: 'board-1', sort: 5 },
  ];

  beforeEach(() => {
    orchestrator = new PipelineOrchestrator();
    vi.restoreAllMocks();
  });

  describe('Stage Detection', () => {
    it('correctly maps list names to pipeline stages', () => {
      expect(orchestrator.detectStage('1 - Reported Issues & Backlog')).toBe('backlog');
      expect(orchestrator.detectStage('Backlog')).toBe('backlog');
      expect(orchestrator.detectStage('To Do')).toBe('backlog');

      expect(orchestrator.detectStage('2 - Gathering Context & Diagnosis')).toBe('diagnosis');
      expect(orchestrator.detectStage('Diagnosis')).toBe('diagnosis');
      expect(orchestrator.detectStage('Triage & Investigation')).toBe('diagnosis');

      expect(orchestrator.detectStage('3 - In Progress / Codex Execution')).toBe('execution');
      expect(orchestrator.detectStage('In Progress')).toBe('execution');
      expect(orchestrator.detectStage('Codex Build')).toBe('execution');

      expect(orchestrator.detectStage('4 - Code Review & PR Verification')).toBe('review');
      expect(orchestrator.detectStage('Code Review')).toBe('review');
      expect(orchestrator.detectStage('PR Verification')).toBe('review');

      expect(orchestrator.detectStage('5 - Shipped & Closed')).toBe('shipped');
      expect(orchestrator.detectStage('Done')).toBe('shipped');
      expect(orchestrator.detectStage('Closed')).toBe('shipped');

      expect(orchestrator.detectStage('Custom Column')).toBe('unknown');
    });
  });

  describe('Stage 2: Diagnosis Gate', () => {
    it('runs diagnosis, records findings, and stays in list (human approval gate)', async () => {
      const card: Card = {
        _id: 'card-diag-1',
        title: 'Fix race condition in card sync',
        description: 'Cards sometimes overwrite each other on concurrent updates',
        boardId: 'board-1',
        listId: 'list-2', // Diagnosis list
        swimlaneId: 'sw-1',
      };

      const moveSpy = vi.spyOn(wekanApi, 'moveCard').mockResolvedValue({ _id: 'card-diag-1' });
      const diagSpy = vi.spyOn(codexAcpClient, 'runDiagnosis').mockResolvedValue({
        success: true,
        report: '### Diagnosis: Confirmed race condition in boardStore.ts',
        diagnosis: {
          title: card.title,
          reproSteps: ['Simulate 2 concurrent updates'],
          verdict: 'confirmed',
          suggestedSeverity: 'high',
          details: 'Root cause in boardStore.ts line 1340',
          rawReport: 'Full report',
        },
      });

      await orchestrator.handleCardTransition(card, 'list-1', mockLists, {
        boardId: 'board-1',
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
      });

      expect(diagSpy).toHaveBeenCalledTimes(1);
      // Human gate verification: card MUST NOT auto-advance to execution
      expect(moveSpy).not.toHaveBeenCalled();

      const status = orchestrator.getCardStatus(card._id);
      expect(status).toBeDefined();
      expect(status?.stage).toBe('diagnosis');
      expect(status?.diagnosisReport?.verdict).toBe('confirmed');
    });
  });

  describe('Stage 3: Execution Gate', () => {
    it('runs execution, verifies quality gate, and auto-advances to Review list', async () => {
      const card: Card = {
        _id: 'card-exec-1',
        title: 'Implement retry logic in ddpClient',
        description: 'Auto-reconnect with exponential backoff',
        boardId: 'board-1',
        listId: 'list-3', // In Progress list
        swimlaneId: 'sw-1',
      };

      const moveSpy = vi.spyOn(wekanApi, 'moveCard').mockResolvedValue({ _id: 'card-exec-1' });
      const execSpy = vi.spyOn(codexAcpClient, 'runExecution').mockResolvedValue({
        success: true,
        branch: 'feat/kanso-exec-1-retry-logic',
        prUrl: 'https://github.com/wekan/wekan/pull/9999',
        prNumber: 9999,
        filesChanged: ['desktop/src/renderer/lib/ddpClient.ts'],
        lintPassed: true,
        summary: 'Implemented backoff logic and unit tests',
      });

      await orchestrator.handleCardTransition(card, 'list-2', mockLists, {
        boardId: 'board-1',
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
        githubRepo: 'wekan/wekan',
        githubPat: 'ghp_test',
      });

      expect(execSpy).toHaveBeenCalledTimes(1);
      // Verify auto-advance to list-4 (Review list)
      expect(moveSpy).toHaveBeenCalledWith(
        'http://localhost:3000',
        'test-token',
        'board-1',
        'list-3',
        'card-exec-1',
        'list-4'
      );

      const status = orchestrator.getCardStatus(card._id);
      expect(status?.stage).toBe('execution');
      expect(status?.executionResult?.lintPassed).toBe(true);
      expect(status?.executionResult?.prNumber).toBe(9999);
    });

    it('does NOT auto-advance if quality gate or execution fails', async () => {
      const card: Card = {
        _id: 'card-exec-fail',
        title: 'Broken task',
        boardId: 'board-1',
        listId: 'list-3',
        swimlaneId: 'sw-1',
      };

      const moveSpy = vi.spyOn(wekanApi, 'moveCard').mockResolvedValue({ _id: 'card-exec-fail' });
      vi.spyOn(codexAcpClient, 'runExecution').mockResolvedValue({
        success: false,
        branch: 'feat/kanso-fail',
        lintPassed: false,
        summary: 'Typecheck failed',
        error: 'tsc failed with 2 errors',
      });

      await orchestrator.handleCardTransition(card, 'list-2', mockLists, {
        boardId: 'board-1',
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
      });

      expect(moveSpy).not.toHaveBeenCalled();
      const status = orchestrator.getCardStatus(card._id);
      expect(status?.executionResult?.lintPassed).toBe(false);
    });
  });
});
