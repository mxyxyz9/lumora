export interface AiConfig {
  provider: 'gemini' | 'ollama' | 'codex';
  geminiApiKey?: string;
  geminiModel?: string;
  ollamaEndpoint?: string;
  ollamaModel?: string;
  codexModel?: string;
  codexCommand?: string;
  codexServerUrl?: string;
  reasoningLevel?: 'low' | 'medium' | 'high';
}

// Image attachment for vision requests
export interface AttachedImage {
  base64: string;      // raw base64, no data-url prefix
  mimeType: string;    // e.g. 'image/png'
  name: string;        // original filename
  previewUrl: string;  // data URL for <img src=...>
}

// Proposed task extracted from image analysis
export interface ImageTaskProposal {
  title: string;
  description: string;
  suggestedListTitle: string;
  suggestedSwimlaneTitle: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  suggestedDueDays: number;
  clarifyingQuestions: string[];
  rawAnalysis: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Board Action Types (for AI-driven board manipulation)
// ──────────────────────────────────────────────────────────────────────────────
export type BoardActionType =
  | 'CREATE_CARD'
  | 'UPDATE_CARD'
  | 'MOVE_CARD'
  | 'DELETE_CARD'
  | 'CREATE_LIST'
  | 'NAVIGATE_PROJECT'
  | 'NAVIGATE_VIEW';

export interface BoardAction {
  type: BoardActionType;
  params: Record<string, string>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Action Parser — extracts [ACTION:TYPE param="value"] tags from AI text
// ──────────────────────────────────────────────────────────────────────────────
export function parseActionsFromText(text: string): { cleanText: string; actions: BoardAction[] } {
  const actions: BoardAction[] = [];
  const actionRegex = /\[ACTION:([A-Z_]+)((?:\s+\w+="[^"]*")*)\]/g;
  let match: RegExpExecArray | null;
  while ((match = actionRegex.exec(text)) !== null) {
    const type = match[1] as BoardActionType;
    const paramStr = match[2] || '';
    const params: Record<string, string> = {};
    const paramRegex = /(\w+)="([^"]*)"/g;
    let pm: RegExpExecArray | null;
    while ((pm = paramRegex.exec(paramStr)) !== null) {
      params[pm[1]] = pm[2];
    }
    actions.push({ type, params });
  }
  const cleanText = text.replace(actionRegex, '').replace(/\n{3,}/g, '\n\n').trim();
  return { cleanText, actions };
}

function safeGetStorage(key: string, defaultValue: string = ''): string {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key) || defaultValue;
  }
  return defaultValue;
}

export class AiService {
  /**
   * Dynamically query Google AI Studio for all available models on this API Key
   */
  public static async listGeminiModels(apiKey: string): Promise<Array<{ id: string; name: string; description: string }>> {
    if (!apiKey?.trim()) return [];
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`);
      if (!res.ok) return [];
      const data = await res.json();
      const models: any[] = data.models || [];
      return models
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => ({
          id: m.name.replace(/^models\//, ''),
          name: m.displayName || m.name.replace(/^models\//, ''),
          description: m.description || '',
        }));
    } catch {
      return [];
    }
  }

  private static async callGeminiWithFallback(
    prompt: string,
    apiKey: string,
    systemInstruction?: string,
    preferredModel: string = 'gemini-3.6-flash',
    reasoningEffort: 'low' | 'medium' | 'high' = 'medium',
    images?: AttachedImage[]
  ): Promise<string> {
    const cleanKey = apiKey.trim();
    const candidateModels = [
      preferredModel,
      'gemini-3.7-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ];
    const uniqueModels = [...new Set(candidateModels)];

    let lastError: Error | null = null;
    for (const model of uniqueModels) {
      try {
        return await this.callGemini(prompt, cleanKey, systemInstruction, model, reasoningEffort, images);
      } catch (err: any) {
        lastError = err;
        const msg = err.message?.toLowerCase() || '';
        const isModelSpecific =
          msg.includes('not found') ||
          msg.includes('404') ||
          msg.includes('deprecated') ||
          msg.includes('unsupported') ||
          msg.includes('invalid argument');
        if (!isModelSpecific) {
          throw err;
        }
        console.warn(`[AiService] Gemini model ${model} unavailable (${err.message}), trying fallback candidate...`);
      }
    }
    throw lastError || new Error('All Gemini model candidates failed.');
  }

  private static async callGemini(
    prompt: string,
    apiKey: string,
    systemInstruction?: string,
    model: string = 'gemini-3.6-flash',
    reasoningEffort: 'low' | 'medium' | 'high' = 'medium',
    images?: AttachedImage[]
  ): Promise<string> {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      throw new Error('Gemini API key is required');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;

    const parts: any[] = [];

    if (images && images.length > 0) {
      for (const img of images) {
        if (img.base64 && img.mimeType) {
          parts.push({
            inline_data: {
              mime_type: img.mimeType,
              data: img.base64,
            },
          });
        }
      }
    }

    parts.push({ text: prompt });

    const body: any = {
      contents: [{ role: 'user', parts }],
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    if (model.includes('3.6') || model.includes('3.7') || model.includes('2.5') || model.includes('thinking')) {
      const budgetMap: Record<string, number> = {
        low: 1024,
        medium: 4096,
        high: 16384,
      };
      body.generationConfig = {
        thinkingConfig: {
          thinkingBudget: budgetMap[reasoningEffort] || 4096,
        },
      };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private static async callOllama(
    prompt: string,
    endpoint: string = 'http://localhost:11434',
    model: string = 'llama3.2'
  ): Promise<string> {
    const url = `${endpoint.replace(/\/$/, '')}/api/generate`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.response || '';
  }

  public static async generate(prompt: string, config: AiConfig, systemInstruction?: string, images?: AttachedImage[]): Promise<string> {
    const provider = config.provider || safeGetStorage('kanso_ai_provider', 'gemini');

    if (provider === 'codex') {
      if (typeof window !== 'undefined' && window.electronAPI?.codexRunDiagnosis) {
        try {
          const res = await window.electronAPI.codexRunDiagnosis({
            cardId: `copilot-${Date.now()}`,
            title: prompt.slice(0, 80),
            description: prompt,
            learnings: systemInstruction || '',
          });
          if (res.success && res.diagnosis) {
            return `${res.diagnosis.details}\n\n**Verdict:** ${res.diagnosis.verdict.toUpperCase()}`;
          }
          if (res.error) {
            const geminiKey = config.geminiApiKey || safeGetStorage('kanso_gemini_key', '');
            if (geminiKey.trim()) {
              console.warn('[AiService] Codex ACP error encountered, automatically falling back to Google Gemini:', res.error);
              const model = config.geminiModel || safeGetStorage('kanso_gemini_model', 'gemini-3.6-flash');
              const reasoning = config.reasoningLevel || (safeGetStorage('kanso_gemini_reasoning', 'medium') as any);
              return await this.callGeminiWithFallback(prompt, geminiKey, systemInstruction, model, reasoning, images);
            }
            throw new Error(`Codex ACP: ${res.error}`);
          }
        } catch (codexErr: any) {
          const geminiKey = config.geminiApiKey || safeGetStorage('kanso_gemini_key', '');
          if (geminiKey.trim()) {
            console.warn('[AiService] Codex ACP failed, falling back to Google Gemini:', codexErr.message);
            const model = config.geminiModel || safeGetStorage('kanso_gemini_model', 'gemini-3.6-flash');
            const reasoning = config.reasoningLevel || (safeGetStorage('kanso_gemini_reasoning', 'medium') as any);
            return await this.callGeminiWithFallback(prompt, geminiKey, systemInstruction, model, reasoning, images);
          }
          throw codexErr;
        }
      }
      throw new Error('Codex ACP service is not initialized or available.');
    }

    if (provider === 'gemini') {
      const apiKey = config.geminiApiKey || safeGetStorage('kanso_gemini_key', '');
      if (!apiKey.trim()) {
        throw new Error('Please configure your Gemini API Key in Settings or the Copilot panel.');
      }
      const model = config.geminiModel || safeGetStorage('kanso_gemini_model', 'gemini-3.6-flash');
      const reasoning = config.reasoningLevel || (safeGetStorage('kanso_gemini_reasoning', 'medium') as any);
      return this.callGeminiWithFallback(prompt, apiKey, systemInstruction, model, reasoning, images);
    } else {
      const endpoint = config.ollamaEndpoint || safeGetStorage('kanso_ollama_endpoint', 'http://localhost:11434');
      const model = config.ollamaModel || safeGetStorage('kanso_ollama_model', 'llama3.2');
      return this.callOllama(prompt, endpoint, model);
    }
  }

  public static async generateTaskBreakdown(cardTitle: string, config: AiConfig, cardDesc?: string): Promise<string[]> {
    const prompt = `You are a project management assistant. Break down the following task into 4 to 6 concise, actionable checklist items.
Task Title: "${cardTitle}"
${cardDesc ? `Description: "${cardDesc}"` : ''}

Output ONLY a raw JSON array of strings with no markdown code fences, e.g. ["Subtask 1", "Subtask 2", "Subtask 3"]`;

    const text = await this.generate(prompt, config, 'You are an expert agile task breakdown assistant.');
    try {
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) {
        return parsed.map(s => String(s).trim()).filter(Boolean);
      }
    } catch (_) {}

    return text
      .split('\n')
      .map(line => line.replace(/^[-*•\d.]+\s*/, '').trim())
      .filter(line => line.length > 2)
      .slice(0, 6);
  }

  public static async generateTaskDescription(
    cardTitle: string,
    config: AiConfig,
    existingDescription?: string,
    images?: AttachedImage[]
  ): Promise<string> {
    let prompt = `Write a clean, structured, and professional Markdown technical specification for the following Kanban card:\nTitle: "${cardTitle}"`;

    if (existingDescription && existingDescription.trim()) {
      prompt += `\n\nExisting Draft Content / Notes:\n"""\n${existingDescription.trim()}\n"""\nIncorporate, refine, and structure these draft notes into the final specification without omitting user details.`;
    }

    if (images && images.length > 0) {
      prompt += `\n\nAttached Screenshots & Visual Evidence:\n- Inspect the attached ${images.length} image(s)/screenshot(s) closely.\n- Identify any error messages, broken UI elements, stack traces, or mockups shown.\n- Accurately describe observed visual symptoms, reproduction steps, and root-cause indicators based on the screenshots.`;
    }

    prompt += `\n\nFormat your output as Markdown with the following structure:
# ${cardTitle}

## Objective
A clear, concise 1-2 sentence summary of the goal.

## Problem & Visual Evidence
Observed symptoms, error details, and expected behavior.

## Acceptance Criteria
- [ ] List of verifiable criteria
- [ ] Edge cases and testing notes`;

    return await this.generate(prompt, config, 'You are a Senior Software Architect and Technical Spec Specialist. Write clean, complete Markdown specifications based on task titles, draft notes, and visual screenshots.', images);
  }

  public static async chatWithBoard(
    messages: { role: 'user' | 'assistant'; content: string }[],
    boardContext: {
      allBoards: Array<{ id: string; title: string }>;
      activeBoardId: string;
      boardTitle: string;
      subfolders: Array<{ id: string; title: string }>;
      lists: Array<{ id: string; title: string; cardCount: number }>;
      cards: Array<{ id: string; title: string; listTitle: string; listId: string; swimlaneTitle: string; swimlaneId: string; dueAt?: string; description?: string }>;
      totalCards: number;
    },
    config: AiConfig,
    images?: AttachedImage[],
    documents?: Array<{ name: string; summary: string; parsedContent: string }>
  ): Promise<string> {

    const persona = localStorage.getItem('lumora_ai_persona') || 'architect';
    let personaInstruction = 'You are Lumora Copilot, an expert technical and agile project assistant.';
    if (persona === 'architect') {
      personaInstruction = 'You are a Senior System Architect embedded in Lumora Kanban. Provide structured Markdown specs, architectural invariants, edge cases, and acceptance tests.';
    } else if (persona === 'agile') {
      personaInstruction = 'You are an Agile Product Manager embedded in Lumora Kanban. Focus on user stories, acceptance criteria, velocity breakdown, and business value.';
    } else if (persona === 'minimalist') {
      personaInstruction = 'You are a Minimalist Tech Lead embedded in Lumora Kanban. Provide ultra-concise bullet points, zero fluff, straight to execution.';
    }

    const boardList = boardContext.allBoards.map(b =>
      `  - "${b.title}" (id: ${b.id})${b.id === boardContext.activeBoardId ? ' ← ACTIVE' : ''}`
    ).join('\n');

    const subfolderList = boardContext.subfolders.map(s =>
      `  - "${s.title}" (id: ${s.id})`
    ).join('\n');

    const listsList = boardContext.lists.map(l =>
      `  - "${l.title}" (id: ${l.id}, ${l.cardCount} cards)`
    ).join('\n');

    const cardsList = boardContext.cards.slice(0, 60).map(c =>
      `  - [${c.id}] "${c.title}" | list: "${c.listTitle}" (${c.listId}) | subfolder: "${c.swimlaneTitle}" (${c.swimlaneId})${c.dueAt ? ` | due: ${c.dueAt}` : ''}`
    ).join('\n');

    const systemPrompt = `${personaInstruction}

You are embedded inside **Lumora** — a powerful offline-first Kanban project management application built on Electron + React. You have full knowledge of the user's workspace and can help them manage their projects.

## Your Capabilities
- Analyzing sprint health, bottlenecks, backlog stagnation, and WIP limits
- Prioritizing tasks by complexity, urgency, and impact
- Writing technical specs, acceptance criteria, and task descriptions
- **Executing board actions** by embedding structured action tags
## Board Action System
Embed action tags at the END of your response on their own lines. Only use real IDs from context.

[ACTION:CREATE_CARD listId="<list-id>" title="<Card Title>" swimlaneId="<subfolder-id>" description="<Markdown Description>" dueDays="<days until deadline, e.g. 3, 7, 14>"]
[ACTION:MOVE_CARD cardId="<card-id>" toListId="<list-id>" toSwimlaneId="<optional-subfolder-id>"]
[ACTION:UPDATE_CARD cardId="<card-id>" title="<New Title>" description="<New Description>"]
[ACTION:DELETE_CARD cardId="<card-id>"]
[ACTION:NAVIGATE_PROJECT boardId="<board-id>"]
[ACTION:NAVIGATE_VIEW view="board"]

Only embed actions when the user explicitly asks or when Actions Mode is enabled and the user wants to log/create/modify a task. Never invent non-existent IDs.

## Screenshot & Image Issue Analysis
When an image or screenshot is attached:
1. **Visual Diagnostic**: Analyze the error, stack trace, broken UI, terminal output, or mockup.
2. **Task Synthesis**: Derive an accurate task title, detailed Markdown description (with Problem, Steps, Expected), the most appropriate List (e.g. "Reported Issues", "Bug", or "Backlog"), Subfolder, Urgency/Priority, and suggested Deadline.
3. **Action Execution**: Append [ACTION:CREATE_CARD ...] tag with the suggested listId, swimlaneId, description, and dueDays!

## Spreadsheet, Excel, CSV & Multi-Task Ingestion (Intelligent Decomposition)
When the user dumps an Excel spreadsheet (.xlsx/.xls), CSV/TSV table, test case matrix, or vague list of tasks/ideas:
1. **Structured Extraction**: Parse every distinct row, test case, bug, or bulleted requirement.
2. **Intelligent Subfolder (Swimlane) Assignment**:
   - Inspect the subfolders/workstreams available in the workspace.
   - Match each task to the most fitting subfolder (e.g. match QA/test items to a QA or Testing subfolder, UI to Frontend, API to Backend). If only one general subfolder exists or none match, use the primary subfolder ID.
3. **Intelligent Column (List) Placement**:
   - Inspect the available lists/columns in the workspace.
   - Assign test failures/bugs to "Reported Issues" or "Bug Backlog".
   - Assign new features or open tasks to "Backlog" or "To Do".
   - Assign items already in flight or marked in-progress to "In Progress".
4. **Rich Card Content**:
   - Title: Crisp, descriptive task summary.
   - Description: Comprehensive Markdown detailing summary, steps, criteria, and table metadata.
   - Subtasks: Include checklist items when applicable.
5. **Batch Action Generation**:
   - For every extracted item, emit a separate [ACTION:CREATE_CARD listId="..." title="..." swimlaneId="..." description="..." dueDays="..."] tag at the end of your response!


## Current Workspace Context

### All Projects (Boards):
${boardList}

### Active Board: "${boardContext.boardTitle}"

### Subfolders / Workstreams:
${subfolderList}

### Lists (Columns):
${listsList}

### All Cards (${boardContext.totalCards} total):
${cardsList}`;

    const conversationHistory = messages
      .slice(-12)
      .map(m => `${m.role === 'user' ? 'User' : 'Lumora Copilot'}: ${m.content}`)
      .join('\n\n');

    let documentContext = '';
    if (documents && documents.length > 0) {
      documentContext = `\n\n## Attached Documents & Data Sources (${documents.length}):\n` +
        documents.map(d => `### File: "${d.name}" (${d.summary})\n\`\`\`\n${d.parsedContent.slice(0, 10000)}\n\`\`\``).join('\n\n');
    }

    const userPrompt = `Here is the recent conversation history:

${conversationHistory}${documentContext}

Respond to the user's latest message with insightful, actionable guidance. Format in clean Markdown.
If spreadsheets, images, or vague multi-task ideas are provided, decompose them into cards and match them to the best subfolder and list.
If executing board actions, embed [ACTION:CREATE_CARD ...] tags at the end.${images && images.length > 0 ? `\n\nNote: The user has attached ${images.length} image(s)/screenshot(s). Analyze them thoroughly.` : ''}`;

    return await this.generate(userPrompt, config, systemPrompt, images);
  }


  /**
   * Vision: Analyze an attached screenshot and extract a structured task proposal.
   * Returns an ImageTaskProposal with title, description, urgency, clarifying questions, etc.
   */
  public static async analyzeImageForTask(
    images: AttachedImage[],
    userContext: string,
    boardContext: {
      boardTitle: string;
      lists: Array<{ id: string; title: string }>;
      subfolders: Array<{ id: string; title: string }>;
    },
    config: AiConfig
  ): Promise<ImageTaskProposal> {
    const listNames = boardContext.lists.map(l => l.title).join(', ');
    const subfolderNames = boardContext.subfolders.length > 0
      ? boardContext.subfolders.map(s => s.title).join(', ')
      : 'None';

    const prompt = `You are a project management assistant analyzing a screenshot to create a Kanban task.

User context: "${userContext || 'No additional context provided'}"
Board: "${boardContext.boardTitle}"
Available lists (columns): ${listNames}
Available subfolders/workstreams: ${subfolderNames}

Analyze the attached screenshot and respond with ONLY valid JSON in this exact format (no markdown fences):
{
  "title": "Short descriptive task title (max 80 chars)",
  "description": "Detailed Markdown description: what the issue/feature is, what was observed, steps to reproduce (if bug), expected vs actual behavior",
  "suggestedListTitle": "One of the exact list titles above that best fits",
  "suggestedSwimlaneTitle": "One of the exact subfolder titles above, or empty string",
  "urgency": "low|medium|high|critical",
  "suggestedDueDays": 7,
  "clarifyingQuestions": ["Question if needed — max 2, empty array [] if all clear"],
  "rawAnalysis": "2-3 sentence summary of what you see and why you chose these values"
}

Rules:
- Error/exception screenshots → urgency "high" or "critical"
- UI bugs → list with "Bug" or "Issue" in name, or Backlog
- Feature/design screenshots → Backlog or To Do
- suggestedDueDays: 3=critical, 7=high, 14=medium, 30=low
- Only ask clarifying questions if the answer changes title/description/list`;

    const apiKey = config.geminiApiKey || localStorage.getItem('kanso_gemini_key') || '';
    const model = config.geminiModel || localStorage.getItem('kanso_gemini_model') || 'gemini-3.6-flash';

    const raw = await this.callGeminiWithFallback(prompt, apiKey, undefined, model, 'low', images);

    try {
      const clean = raw
        .replace(/^```json\s*/m, '')
        .replace(/^```\s*/m, '')
        .replace(/```\s*$/m, '')
        .trim();
      const parsed = JSON.parse(clean);
      return {
        title: parsed.title || 'Untitled Issue',
        description: parsed.description || '',
        suggestedListTitle: parsed.suggestedListTitle || boardContext.lists[0]?.title || 'Backlog',
        suggestedSwimlaneTitle: parsed.suggestedSwimlaneTitle || '',
        urgency: parsed.urgency || 'medium',
        suggestedDueDays: parseInt(parsed.suggestedDueDays, 10) || 7,
        clarifyingQuestions: Array.isArray(parsed.clarifyingQuestions) ? parsed.clarifyingQuestions : [],
        rawAnalysis: parsed.rawAnalysis || raw,
      };
    } catch {
      return {
        title: 'Issue from screenshot',
        description: raw,
        suggestedListTitle: boardContext.lists[0]?.title || 'Backlog',
        suggestedSwimlaneTitle: '',
        urgency: 'medium',
        suggestedDueDays: 7,
        clarifyingQuestions: ['What project does this belong to?', 'What is the expected behavior?'],
        rawAnalysis: raw,
      };
    }
  }
}
