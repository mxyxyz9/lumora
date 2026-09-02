# Kanso AI-Agent Dev Pipeline Continuity Log: Open Questions & Considerations

## Review Points for Rushil

### 1. GitHub PR Creation Fallback
- **Context**: In Stage 3 (Execution), on completion, the pipeline creates a GitHub Pull Request using `githubSync.ts`.
- **Current State**: If GitHub PAT or repo is not configured (or if operating in Guest/Solo offline mode), the pipeline will create and commit to a local feature branch (`feat/<card-id>-<slug>`), post the branch name and commit details as a card comment, and still advance the card to the Review list.
- **Confirmation**: Does Rushil want this local branch fallback behavior when GitHub credentials are not present in settings? (Recommended: Yes).

### 2. Auto-Detection of Pipeline Columns
- **Context**: Different boards may have slightly varying column names (e.g. "Context & Diagnosis" vs "Diagnosis" vs "Triage").
- **Current Strategy**: Use flexible case-insensitive regex matching for the 5 pipeline stages, with optional explicit list role configuration in Board/Subfolder settings.
- **Confirmation**: Is regex matching with standard fallback list titles sufficient for default operation? (Recommended: Yes).

### 3. Execution Working Directory
- **Context**: When Codex executes code or runs deterministic gates, it needs a working directory root.
- **Current Strategy**: Default to the current repository workspace (`/Users/rushil.dev/Desktop/wekan-main` or project root) with isolated git branch/worktree checkout.

### 4. Lumora Voice Post-MVP Route Mapping (Step 4) [RESOLVED]
- **Status**: Completed in `VoicePanel.tsx` via `useBoardStore.getState().createCard()`.
- **Implementation**: Maps `suggestedList` case-insensitively with primary list fallback, embeds urgency & hashtag labels in description, and marks history audit.

### 5. Kokoro-82M TTS Invocation Strategy (Step 6) [RESOLVED]
- **Status**: Completed in `kokoroTtsService.ts` and `CardDetailModal.tsx`.
- **Implementation**: Thin local ONNX/Python synthesis supporting 54 preset voices on CPU with automatic Web Speech fallback.


