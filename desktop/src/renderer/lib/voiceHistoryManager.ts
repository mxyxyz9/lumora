import { VoiceCandidateNote } from './types';

export interface VoiceHistorySession {
  id: string;
  timestamp: string;
  rawTranscript: string;
  audioDuration?: number;
  notes: VoiceCandidateNote[];
  engineUsed?: string;
  boardId?: string;
  boardTitle?: string;
  routedCardIds?: string[];
}

const STORAGE_KEY = 'lumora_voice_dictation_history_v1';
const MAX_SESSIONS = 200;

export class VoiceHistoryManager {
  /**
   * Retrieves all saved dictation history sessions from persistent storage
   */
  public static getSessions(): VoiceHistorySession[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
    } catch (e) {
      console.warn('[VoiceHistoryManager] Error reading history from storage:', e);
    }
    return [];
  }

  /**
   * Persists a new or updated dictation session
   */
  public static saveSession(
    sessionData: Omit<VoiceHistorySession, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
  ): VoiceHistorySession {
    const sessions = this.getSessions();

    const session: VoiceHistorySession = {
      id: sessionData.id || `vsession_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: sessionData.timestamp || new Date().toISOString(),
      rawTranscript: sessionData.rawTranscript || '',
      audioDuration: sessionData.audioDuration,
      notes: sessionData.notes || [],
      engineUsed: sessionData.engineUsed || 'whisper',
      boardId: sessionData.boardId,
      boardTitle: sessionData.boardTitle,
      routedCardIds: sessionData.routedCardIds || [],
    };

    // Replace if existing, or prepend
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    let updatedSessions: VoiceHistorySession[];

    if (existingIndex >= 0) {
      updatedSessions = [...sessions];
      updatedSessions[existingIndex] = session;
    } else {
      updatedSessions = [session, ...sessions].slice(0, MAX_SESSIONS);
    }

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
      }
    } catch (e) {
      console.warn('[VoiceHistoryManager] Error saving history to storage:', e);
    }

    return session;
  }

  /**
   * Searches past dictation sessions across transcripts, note titles, descriptions, and tags
   */
  public static searchSessions(
    query: string,
    filter?: { tag?: string; boardId?: string }
  ): VoiceHistorySession[] {
    const sessions = this.getSessions();
    const cleanQuery = query.trim().toLowerCase();

    return sessions.filter(session => {
      // Board filter
      if (filter?.boardId && session.boardId && session.boardId !== filter.boardId) {
        return false;
      }

      // Tag filter
      if (filter?.tag) {
        const hasTag = session.notes.some(n =>
          n.tags?.some(t => t.toLowerCase() === filter.tag!.toLowerCase())
        );
        if (!hasTag) return false;
      }

      // Query filter
      if (!cleanQuery) return true;

      // Match transcript
      if (session.rawTranscript.toLowerCase().includes(cleanQuery)) return true;

      // Match note titles / descriptions / tags
      const noteMatch = session.notes.some(
        n =>
          n.title.toLowerCase().includes(cleanQuery) ||
          (n.description && n.description.toLowerCase().includes(cleanQuery)) ||
          n.tags?.some(t => t.toLowerCase().includes(cleanQuery)) ||
          (n.suggestedList && n.suggestedList.toLowerCase().includes(cleanQuery))
      );

      return noteMatch;
    });
  }

  /**
   * Records that a candidate note from a session was routed to a Wekan card
   */
  public static markNoteRouted(sessionId: string, noteId: string, cardId: string) {
    const sessions = this.getSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    session.notes = session.notes.map(n =>
      n.id === noteId ? { ...n, status: 'accepted', acceptedAt: new Date().toISOString() } : n
    );

    if (!session.routedCardIds) session.routedCardIds = [];
    if (!session.routedCardIds.includes(cardId)) {
      session.routedCardIds.push(cardId);
    }

    this.saveSession(session);
  }

  /**
   * Deletes a specific session by ID
   */
  public static deleteSession(id: string): boolean {
    const sessions = this.getSessions();
    const filtered = sessions.filter(s => s.id !== id);
    if (filtered.length !== sessions.length) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        }
        return true;
      } catch (e) {
        console.warn('[VoiceHistoryManager] Error updating storage:', e);
      }
    }
    return false;
  }

  /**
   * Clears entire dictation session history
   */
  public static clearAllSessions(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('[VoiceHistoryManager] Error clearing storage:', e);
    }
  }
}
