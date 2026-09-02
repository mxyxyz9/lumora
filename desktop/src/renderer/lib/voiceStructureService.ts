import { AiService, AiConfig } from './aiService';
import { VoiceCandidateNote } from './types';

export interface VoiceAiConfig {
  provider: 'gemini' | 'ollama';
  geminiApiKey?: string;
  geminiModel?: string;
  ollamaEndpoint?: string;
  ollamaModel?: string;
}

export class VoiceStructureService {
  /**
   * Performs the structure pass on a voice transcript, converting raw spoken thoughts
   * into structured candidate notes/tasks using Gemini or Ollama (excluding the Codex ACP dev pipeline).
   */
  public static async structureTranscript(
    transcript: string,
    config: VoiceAiConfig | AiConfig,
    availableLists?: string[]
  ): Promise<VoiceCandidateNote[]> {
    if (!transcript || !transcript.trim()) {
      return [];
    }

    // Explicitly scope structure pass to Gemini/Ollama (Codex ACP is reserved for the code agent pipeline)
    const effectiveConfig: AiConfig = {
      provider: config.provider === 'codex' ? 'gemini' : config.provider,
      geminiApiKey: config.geminiApiKey,
      geminiModel: config.geminiModel,
      ollamaEndpoint: config.ollamaEndpoint,
      ollamaModel: config.ollamaModel,
    };

    const cleanTranscript = transcript.trim();

    const listsContext =
      availableLists && availableLists.length > 0
        ? `\nAvailable Kanban Lists for classification: ${availableLists.join(', ')}`
        : '\nDefault Lists: To Do, In Progress, Review, Done, Backlog';

    const prompt = `You are an expert Agile Project Manager and Executive Assistant.
Analyze the following raw spoken voice transcript and extract 1 to 6 clear, actionable candidate notes and tasks.
${listsContext}

Voice Transcript:
"""
${cleanTranscript}
"""

Output ONLY a raw, valid JSON array of objects with NO markdown code fences and NO conversational preamble. Each item must match this exact JSON schema:
[
  {
    "title": "Clear, imperative task title (e.g., 'Fix login token expiration in Safari')",
    "description": "Succinct context or action steps mentioned in the voice note",
    "suggestedList": "Name of best fitting board list (e.g., 'To Do')",
    "urgency": "low" | "medium" | "high" | "critical",
    "tags": ["relevant", "keywords"]
  }
]`;

    try {
      const rawText = await AiService.generate(
        prompt,
        effectiveConfig,
        'You are an expert voice-to-kanban structure assistant. Output only raw JSON.'
      );

      return this.parseCandidateNotesFromAiText(rawText, cleanTranscript);
    } catch (err) {
      console.warn('[VoiceStructureService] AI extraction failed or errored, using heuristic fallback:', err);
      return this.fallbackHeuristicExtraction(cleanTranscript);
    }
  }

  /**
   * Defensively parses AI response into structured VoiceCandidateNote array
   */
  public static parseCandidateNotesFromAiText(rawText: string, fallbackTranscript: string): VoiceCandidateNote[] {
    if (!rawText || !rawText.trim()) {
      return this.fallbackHeuristicExtraction(fallbackTranscript);
    }

    // 1. Try parsing JSON directly after cleaning markdown fences
    try {
      const cleanJson = rawText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .filter(item => item && typeof item === 'object' && (item.title || item.task || item.name))
          .map((item, idx) => ({
            id: `vnote_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
            title: String(item.title || item.task || item.name || 'Untitled Note').trim(),
            description: item.description ? String(item.description).trim() : undefined,
            suggestedList: item.suggestedList ? String(item.suggestedList).trim() : 'To Do',
            urgency: this.normalizeUrgency(item.urgency),
            tags: Array.isArray(item.tags)
              ? item.tags.map((t: any) => String(t).trim().toLowerCase()).filter(Boolean)
              : [],
            status: 'candidate',
          }));
      }
    } catch (_) {
      // Continue to regex / bullet extraction
    }

    // 2. Try regex extraction for embedded JSON array
    try {
      const match = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) {
        const extractedJson = JSON.parse(match[0]);
        if (Array.isArray(extractedJson) && extractedJson.length > 0) {
          return extractedJson.map((item, idx) => ({
            id: `vnote_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
            title: String(item.title || item.task || item.name || 'Untitled Note').trim(),
            description: item.description ? String(item.description).trim() : undefined,
            suggestedList: item.suggestedList ? String(item.suggestedList).trim() : 'To Do',
            urgency: this.normalizeUrgency(item.urgency),
            tags: Array.isArray(item.tags)
              ? item.tags.map((t: any) => String(t).trim().toLowerCase()).filter(Boolean)
              : [],
            status: 'candidate',
          }));
        }
      }
    } catch (_) {}

    // 3. Fallback: Parse bullet lines or numbered list
    const lines = rawText
      .split('\n')
      .map(l => l.replace(/^[-*•\d.]+\s*/, '').trim())
      .filter(l => l.length > 3 && !l.startsWith('{') && !l.startsWith('}') && !l.startsWith('[') && !l.startsWith(']'));

    if (lines.length > 0) {
      return lines.slice(0, 6).map((line, idx) => ({
        id: `vnote_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        title: line,
        suggestedList: 'To Do',
        urgency: 'medium',
        tags: ['voice-note'],
        status: 'candidate',
      }));
    }

    return this.fallbackHeuristicExtraction(fallbackTranscript);
  }

  /**
   * Deterministic local fallback when LLM is offline or unconfigured
   */
  public static fallbackHeuristicExtraction(transcript: string): VoiceCandidateNote[] {
    if (!transcript || !transcript.trim()) return [];

    // Split sentences by punctuation or common speech conjunctions
    const segments = transcript
      .split(/(?:[.!?]|\balso\b|\band then\b|\bnext\b|\bfurthermore\b|\badditionally\b)/i)
      .map(s => s.trim())
      .filter(s => s.length > 4);

    if (segments.length === 0) {
      return [
        {
          id: `vnote_${Date.now()}_0`,
          title: transcript.slice(0, 80) + (transcript.length > 80 ? '...' : ''),
          description: transcript,
          suggestedList: 'To Do',
          urgency: 'medium',
          tags: ['dictation'],
          status: 'candidate',
        },
      ];
    }

    return segments.slice(0, 6).map((segment, idx) => {
      // Capitalize first letter
      const capitalized = segment.charAt(0).toUpperCase() + segment.slice(1);
      const isUrgent = /\b(urgent|asap|critical|blocking|broken|immediately)\b/i.test(segment);

      return {
        id: `vnote_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        title: capitalized.length > 90 ? capitalized.slice(0, 87) + '...' : capitalized,
        description: capitalized.length > 90 ? capitalized : undefined,
        suggestedList: 'To Do',
        urgency: isUrgent ? 'high' : 'medium',
        tags: ['voice-note'],
        status: 'candidate',
      };
    });
  }

  private static normalizeUrgency(u: any): 'low' | 'medium' | 'high' | 'critical' {
    const val = String(u || '').toLowerCase();
    if (val === 'critical' || val === 'highest') return 'critical';
    if (val === 'high') return 'high';
    if (val === 'low') return 'low';
    return 'medium';
  }
}
