import { Card, List, PipelineStage, PipelineCardStatus } from './types';
import { codexAcpClient } from './codexAcpClient';
import { wekanApi } from './wekanApi';
import { pmSyncManager } from './pmSyncManager';

export type PipelineEventListener = (status: PipelineCardStatus) => void;


export class PipelineOrchestrator {
  private activeJobs: Set<string> = new Set();
  private cardStatuses: Map<string, PipelineCardStatus> = new Map();
  private listeners: Set<PipelineEventListener> = new Set();
  private diagnosisCache: Map<string, string> = new Map();

  public subscribe(listener: PipelineEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(status: PipelineCardStatus) {
    this.cardStatuses.set(status.cardId, status);
    this.listeners.forEach((fn) => {
      try {
        fn(status);
      } catch (e) {
        console.error('[PipelineOrchestrator] Listener error:', e);
      }
    });
  }

  public getCardStatus(cardId: string): PipelineCardStatus | undefined {
    return this.cardStatuses.get(cardId);
  }

  public getAllStatuses(): Map<string, PipelineCardStatus> {
    return this.cardStatuses;
  }

  public async runCardDiagnosis(card: Card) {
    const { useBoardStore } = await import('../store/boardStore');
    const store = useBoardStore.getState();
    const board = store.activeBoard;
    const swimlane = store.swimlanes.find(s => s._id === card.swimlaneId);
    const session = store.session;
    return await codexAcpClient.runDiagnosis(card, {
      boardId: board?._id || '',
      boardTitle: board?.title,
      swimlaneTitle: swimlane?.title,
      serverUrl: session?.serverUrl,
      token: session?.token,
    });
  }

  public async runCardExecution(card: Card) {
    const { useBoardStore } = await import('../store/boardStore');
    const store = useBoardStore.getState();
    const board = store.activeBoard;
    const session = store.session;
    const settings = store.settings;
    const diagnosisReport = this.diagnosisCache.get(card._id) || card.description || '';
    return await codexAcpClient.runExecution(card, diagnosisReport, {
      boardId: board?._id || '',
      serverUrl: session?.serverUrl,
      token: session?.token,
      githubRepo: settings.githubRepo,
      githubPat: settings.githubPat,
    });
  }


  /**
   * Determine pipeline stage from list title
   */
  public detectStage(listTitle: string): PipelineStage {
    if (!listTitle) return 'unknown';
    const clean = listTitle.trim().toLowerCase();

    if (/diagnos|context|investigat|triage/i.test(clean)) {
      return 'diagnosis';
    }
    if (/in\s*progress|execut|build|develop|coding/i.test(clean)) {
      return 'execution';
    }
    if (/review|verif|pr\s*verif|qa|test/i.test(clean)) {
      return 'review';
    }
    if (/shipped|closed|done|complet|finish/i.test(clean)) {
      return 'shipped';
    }
    if (/backlog|reported|to\s*do|open|issue/i.test(clean)) {
      return 'backlog';
    }

    return 'unknown';
  }

  /**
   * Hook called when a card's listId or properties change
   */
  public async handleCardTransition(
    card: Card,
    previousListId: string | undefined,
    allLists: List[],
    context: {
      boardId: string;
      boardTitle?: string;
      swimlaneTitle?: string;
      serverUrl?: string;
      token?: string;
      githubRepo?: string;
      githubPat?: string;
    }
  ) {
    if (!card || !card.listId) return;

    // Check if card moved to a new list
    if (previousListId && previousListId === card.listId) {
      return;
    }

    const currentList = allLists.find((l) => l._id === card.listId);
    if (!currentList) return;

    const targetStage = this.detectStage(currentList.title);

    // Prevent duplicate concurrent runs on same card
    if (this.activeJobs.has(card._id)) {
      return;
    }

    // Sync status change to external PM tools (Jira, Linear, Asana, GitHub)
    try {
      await pmSyncManager.handleCardMoved(card, currentList);
    } catch (_) {}

    if (targetStage === 'diagnosis') {
      await this.executeDiagnosisStage(card, currentList, allLists, context);
    } else if (targetStage === 'execution') {
      await this.executeExecutionStage(card, currentList, allLists, context);
    } else {
      // Update status map for other stages
      this.notify({
        cardId: card._id,
        stage: targetStage,
        isRunning: false,
        lastRunAt: new Date().toISOString(),
        statusMessage: `Card is in ${currentList.title}`,
      });
    }
  }


  private async executeDiagnosisStage(
    card: Card,
    currentList: List,
    allLists: List[],
    context: {
      boardId: string;
      boardTitle?: string;
      swimlaneTitle?: string;
      serverUrl?: string;
      token?: string;
    }
  ) {
    this.activeJobs.add(card._id);
    this.notify({
      cardId: card._id,
      stage: 'diagnosis',
      isRunning: true,
      lastRunAt: new Date().toISOString(),
      statusMessage: 'Running Codex diagnosis & reproduction...',
    });

    try {
      const res = await codexAcpClient.runDiagnosis(card, context);

      if (res.success && res.diagnosis) {
        if (res.report) {
          this.diagnosisCache.set(card._id, res.report);
        }

        this.notify({
          cardId: card._id,
          stage: 'diagnosis',
          isRunning: false,
          lastRunAt: new Date().toISOString(),
          statusMessage: `Diagnosis Complete: Verdict [${res.diagnosis.verdict.toUpperCase()}]`,
          diagnosisReport: res.diagnosis,
        });
      } else {
        this.notify({
          cardId: card._id,
          stage: 'diagnosis',
          isRunning: false,
          lastRunAt: new Date().toISOString(),
          statusMessage: `Diagnosis Error: ${res.error || 'Unknown error'}`,
        });
      }
    } catch (err: any) {
      this.notify({
        cardId: card._id,
        stage: 'diagnosis',
        isRunning: false,
        lastRunAt: new Date().toISOString(),
        statusMessage: `Diagnosis Exception: ${err.message}`,
      });
    } finally {
      this.activeJobs.delete(card._id);
    }
  }

  private async executeExecutionStage(
    card: Card,
    currentList: List,
    allLists: List[],
    context: {
      boardId: string;
      boardTitle?: string;
      swimlaneTitle?: string;
      serverUrl?: string;
      token?: string;
      githubRepo?: string;
      githubPat?: string;
    }
  ) {
    this.activeJobs.add(card._id);
    this.notify({
      cardId: card._id,
      stage: 'execution',
      isRunning: true,
      lastRunAt: new Date().toISOString(),
      statusMessage: 'Codex implementing changes & running quality gates...',
    });

    try {
      const diagnosisNotes = this.diagnosisCache.get(card._id) || '';

      const execRes = await codexAcpClient.runExecution(card, diagnosisNotes, {
        boardId: context.boardId,
        serverUrl: context.serverUrl,
        token: context.token,
        githubRepo: context.githubRepo,
        githubPat: context.githubPat,
      });

      if (execRes.success) {
        this.notify({
          cardId: card._id,
          stage: 'execution',
          isRunning: false,
          lastRunAt: new Date().toISOString(),
          statusMessage: `Execution passed quality gate on ${execRes.branch}`,
          executionResult: execRes,
        });

        // Auto-advance card to Review list
        const reviewList = allLists.find((l) => this.detectStage(l.title) === 'review');
        if (reviewList && context.serverUrl && context.token && context.boardId) {
          try {
            await wekanApi.moveCard(
              context.serverUrl,
              context.token,
              context.boardId,
              currentList._id,
              card._id,
              reviewList._id
            );
          } catch (moveErr) {
            console.warn('[PipelineOrchestrator] Failed to auto-advance card to Review list:', moveErr);
          }
        }
      } else {
        this.notify({
          cardId: card._id,
          stage: 'execution',
          isRunning: false,
          lastRunAt: new Date().toISOString(),
          statusMessage: `Execution failed quality gate: ${execRes.error || 'Unknown error'}`,
          executionResult: execRes,
        });
      }
    } catch (err: any) {
      this.notify({
        cardId: card._id,
        stage: 'execution',
        isRunning: false,
        lastRunAt: new Date().toISOString(),
        statusMessage: `Execution Exception: ${err.message}`,
      });
    } finally {
      this.activeJobs.delete(card._id);
    }
  }
}

export const pipelineOrchestrator = new PipelineOrchestrator();
