import { describe, it, expect, vi } from 'vitest';
import { AiService, AttachedImage } from '../src/renderer/lib/aiService';

describe('AI Spec Enhancement & Multimodal Vision Unit Tests', () => {
  it('includes attached image screenshots and visual evidence in the generated prompt', async () => {
    let capturedPrompt = '';
    let capturedImages: AttachedImage[] | undefined;

    // Spy on generate
    const spy = vi.spyOn(AiService as any, 'generate').mockImplementation(async (prompt: string, config: any, sysInst?: string, images?: AttachedImage[]) => {
      capturedPrompt = prompt;
      capturedImages = images;
      return '# Generated Spec\n\n## Objective\nFix the bug depicted in screenshots.';
    });

    const mockImages: AttachedImage[] = [
      {
        name: 'screenshot-error.png',
        mimeType: 'image/png',
        base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        previewUrl: 'data:image/png;base64,...',
      },
    ];

    const result = await AiService.generateTaskDescription(
      'Bug: Code Tool in Toolbar is Not Working',
      { provider: 'gemini', geminiApiKey: 'test-key' },
      'The code button seems dead when clicked on selected text.',
      mockImages
    );

    expect(result).toContain('# Generated Spec');
    expect(capturedPrompt).toContain('Bug: Code Tool in Toolbar is Not Working');
    expect(capturedPrompt).toContain('Existing Draft Content / Notes:');
    expect(capturedPrompt).toContain('The code button seems dead when clicked');
    expect(capturedPrompt).toContain('Attached Screenshots & Visual Evidence:');
    expect(capturedPrompt).toContain('Inspect the attached 1 image(s)/screenshot(s)');
    expect(capturedImages).toHaveLength(1);
    expect(capturedImages![0].name).toBe('screenshot-error.png');

    spy.mockRestore();
  });

  it('correctly handles Codex ACP quota limits and falls back to Gemini if available', async () => {
    // Mock window.electronAPI with codex error
    (global as any).window = {
      electronAPI: {
        codexRunDiagnosis: vi.fn().mockResolvedValue({
          success: false,
          error: "You've hit your usage limit. Upgrade to Pro or try again at 2:03 PM.",
        }),
      },
    };

    const spyGemini = vi.spyOn(AiService as any, 'callGeminiWithFallback').mockResolvedValue('Gemini fallback response');

    const result = await AiService.generate(
      'Analyze project tasks',
      { provider: 'codex', geminiApiKey: 'gemini-fallback-key' }
    );

    expect(result).toBe('Gemini fallback response');
    expect(spyGemini).toHaveBeenCalled();

    spyGemini.mockRestore();
  });
});
