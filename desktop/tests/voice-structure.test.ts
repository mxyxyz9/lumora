import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceStructureService } from '../src/renderer/lib/voiceStructureService';
import { AiService, AiConfig } from '../src/renderer/lib/aiService';
import { lumoraVoiceService } from '../src/main/lumoraVoiceService';

describe('Lumora Voice Structure Pass (MVP Checkpoint)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly parses raw JSON candidate notes array from AI response', () => {
    const rawAiOutput = JSON.stringify([
      {
        title: 'Fix Safari session token bug',
        description: 'Session expiry cookies are dropped on Safari restart',
        suggestedList: 'To Do',
        urgency: 'high',
        tags: ['safari', 'auth', 'bug'],
      },
      {
        title: 'Add unit tests for DDP sync',
        description: 'Increase test coverage for ddpClient reconnect logic',
        suggestedList: 'In Progress',
        urgency: 'medium',
        tags: ['testing', 'ddp'],
      },
    ]);

    const result = VoiceStructureService.parseCandidateNotesFromAiText(
      rawAiOutput,
      'Fix Safari session token bug and add unit tests for DDP sync'
    );

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Fix Safari session token bug');
    expect(result[0].description).toBe('Session expiry cookies are dropped on Safari restart');
    expect(result[0].suggestedList).toBe('To Do');
    expect(result[0].urgency).toBe('high');
    expect(result[0].tags).toEqual(['safari', 'auth', 'bug']);
    expect(result[0].status).toBe('candidate');

    expect(result[1].title).toBe('Add unit tests for DDP sync');
    expect(result[1].suggestedList).toBe('In Progress');
  });

  it('handles markdown code fences (```json ... ```) gracefully', () => {
    const rawAiWithFences = `\`\`\`json
[
  {
    "title": "Upgrade electron-builder config",
    "description": "Add multi-platform target artifacts",
    "suggestedList": "Backlog",
    "urgency": "low",
    "tags": ["build", "packaging"]
  }
]
\`\`\``;

    const result = VoiceStructureService.parseCandidateNotesFromAiText(
      rawAiWithFences,
      'Upgrade electron-builder config'
    );

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Upgrade electron-builder config');
    expect(result[0].suggestedList).toBe('Backlog');
    expect(result[0].urgency).toBe('low');
    expect(result[0].status).toBe('candidate');
  });

  it('falls back to bullet list parsing if AI does not return JSON', () => {
    const plainBulletAiOutput = `
- Fix login redirection loop on OAuth callback
- Update user settings dropdown UI styling
- Prepare changelog for version 1.0.3 release
`;

    const result = VoiceStructureService.parseCandidateNotesFromAiText(
      plainBulletAiOutput,
      'Fix login redirection loop and update settings'
    );

    expect(result).toHaveLength(3);
    expect(result[0].title).toBe('Fix login redirection loop on OAuth callback');
    expect(result[1].title).toBe('Update user settings dropdown UI styling');
    expect(result[2].title).toBe('Prepare changelog for version 1.0.3 release');
    expect(result[0].suggestedList).toBe('To Do');
  });

  it('uses heuristic sentence splitter when LLM fails or is empty', () => {
    const transcript =
      'Refactor audio capture pipeline. Additionally investigate memory leaks during long recordings. Also update settings view.';

    const result = VoiceStructureService.fallbackHeuristicExtraction(transcript);

    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].title).toContain('Refactor audio capture pipeline');
    expect(result[0].status).toBe('candidate');
  });

  it('extracts candidate notes via AiService.generateTaskBreakdown-style provider call', async () => {
    const mockAiResponse = JSON.stringify([
      {
        title: 'Investigate speech-to-text latency',
        description: 'Profile whisper-cli execution time on 16kHz mono audio',
        suggestedList: 'In Progress',
        urgency: 'high',
        tags: ['voice', 'performance'],
      },
    ]);

    vi.spyOn(AiService, 'generate').mockResolvedValueOnce(mockAiResponse);

    const config: AiConfig = {
      provider: 'gemini',
      geminiApiKey: 'test-key',
    };

    const notes = await VoiceStructureService.structureTranscript(
      'We need to investigate speech to text latency on whisper-cli',
      config,
      ['To Do', 'In Progress', 'Done']
    );

    expect(AiService.generate).toHaveBeenCalledTimes(1);
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe('Investigate speech-to-text latency');
    expect(notes[0].suggestedList).toBe('In Progress');
    expect(notes[0].status).toBe('candidate');
  });

  it('returns empty array when transcript is whitespace or empty', async () => {
    const config: AiConfig = { provider: 'gemini' };
    const notes = await VoiceStructureService.structureTranscript('   ', config);
    expect(notes).toEqual([]);
  });

  it('normalizes codex provider to gemini/ollama for voice structure pass', async () => {
    const mockAiResponse = JSON.stringify([
      {
        title: 'Fix audio buffer overrun',
        description: 'Prevent buffer overflow in long dictation sessions',
        suggestedList: 'To Do',
        urgency: 'high',
      },
    ]);

    const spy = vi.spyOn(AiService, 'generate').mockResolvedValueOnce(mockAiResponse);

    const config: any = {
      provider: 'codex',
      geminiApiKey: 'test-key',
    };

    const notes = await VoiceStructureService.structureTranscript('Fix audio buffer overrun', config);

    expect(spy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ provider: 'gemini' }),
      expect.any(String)
    );
    expect(notes).toHaveLength(1);
  });

  it('lumoraVoiceService reports status and detects whisper config with OpenWhispr registry', () => {
    const status = lumoraVoiceService.getStatus();
    expect(status).toHaveProperty('isRecording');
    expect(status).toHaveProperty('isTranscribing');
    expect(status).toHaveProperty('activeHotkey');
    expect(status).toHaveProperty('localWhisperAvailable');
    expect(status).toHaveProperty('modelsFound');
    expect(status).toHaveProperty('supportedWhisperModels');
    expect(status.supportedWhisperModels!.length).toBeGreaterThan(0);
    expect(status.isRecording).toBe(false);
  });

  it('lumoraVoiceService checks permissions via systemPreferences', async () => {
    const perms = await lumoraVoiceService.checkPermissions();
    expect(perms).toHaveProperty('mic');
    expect(perms).toHaveProperty('accessibility');
  });

  it('lumoraVoiceService safely handles text injection errors when empty', async () => {
    const res = await lumoraVoiceService.injectTextIntoFocusedApp('');
    expect(res.success).toBe(false);
    expect(res.error).toBe('No text to inject');
  });
});
