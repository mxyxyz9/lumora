import { describe, it, expect } from 'vitest';
import { parseAcpModels, resolveTargetAcpModelId } from '../src/renderer/lib/acpModelParser';

describe('ACP Model Parser & Thinking Tier Resolver', () => {
  it('parses raw composite ACP model IDs into clean base models and thinking tiers', () => {
    const rawModels = [
      { id: 'gpt-5.6-sol[low]', name: 'GPT-5.6-Sol (low)' },
      { id: 'gpt-5.6-sol[medium]', name: 'GPT-5.6-Sol (medium)' },
      { id: 'gpt-5.6-sol[high]', name: 'GPT-5.6-Sol (high)' },
      { id: 'gpt-5.6-sol[xhigh]', name: 'GPT-5.6-Sol (xhigh)' },
      { id: 'gpt-5.6-sol[max]', name: 'GPT-5.6-Sol (max)' },
      { id: 'gpt-5.6-sol[ultra]', name: 'GPT-5.6-Sol (ultra)' },
      { id: 'gpt-5.6-sol', name: 'GPT-5.6-Sol' },
      { id: 'gpt-5.6-terra[low]', name: 'GPT-5.6-Terra (low)' },
      { id: 'gpt-5.6-terra[medium]', name: 'GPT-5.6-Terra (medium)' },
      { id: 'gpt-5.6-luna[low]', name: 'GPT-5.6-Luna (low)' },
      { id: 'gpt-5.4-mini[low]', name: 'GPT-5.4-Mini (low)' },
    ];

    const parsed = parseAcpModels(rawModels);

    expect(parsed.length).toBe(4); // gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna, gpt-5.4-mini

    const sol = parsed.find(m => m.baseId === 'gpt-5.6-sol');
    expect(sol).toBeDefined();
    expect(sol?.displayName).toBe('GPT-5.6 Sol');
    expect(sol?.thinkingTiers.length).toBe(6);
    expect(sol?.thinkingTiers.map(t => t.id)).toEqual(['low', 'medium', 'high', 'xhigh', 'max', 'ultra']);
  });

  it('resolves correct target ACP model composite string', () => {
    const rawModels = [
      { id: 'gpt-5.6-sol[low]', name: 'GPT-5.6-Sol (low)' },
      { id: 'gpt-5.6-sol[high]', name: 'GPT-5.6-Sol (high)' },
      { id: 'gpt-5.6-sol', name: 'GPT-5.6-Sol' },
    ];
    const parsed = parseAcpModels(rawModels);

    const resolved = resolveTargetAcpModelId('gpt-5.6-sol', 'high', parsed);
    expect(resolved).toBe('gpt-5.6-sol[high]');
  });
});
