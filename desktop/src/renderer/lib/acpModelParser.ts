export interface RawAcpModel {
  id: string;
  name: string;
  description?: string;
}

export interface ParsedThinkingTier {
  id: string;
  label: string;
  fullModelId: string;
}

export interface ParsedBaseModel {
  baseId: string;
  displayName: string;
  description?: string;
  tag?: string;
  thinkingTiers: ParsedThinkingTier[];
  defaultThinkingTier: string;
}

export function formatBaseModelName(baseId: string): string {
  let formatted = baseId.replace(/^gpt-/i, 'GPT-');
  formatted = formatted.replace(/-([a-zA-Z])/g, (_, char) => ' ' + char.toUpperCase());
  return formatted;
}


export function formatTierLabel(tierId: string): string {
  switch (tierId.toLowerCase()) {
    case 'low':
      return 'Low (Instant / Fast)';
    case 'medium':
      return 'Medium (Balanced)';
    case 'high':
      return 'High (Deep Reasoning)';
    case 'xhigh':
      return 'Extra High (Intensive)';
    case 'max':
      return 'Max (Maximum Depth)';
    case 'ultra':
      return 'Ultra (Frontier Reasoning)';
    default:
      return tierId.charAt(0).toUpperCase() + tierId.slice(1);
  }
}

export function parseAcpModels(rawModels: RawAcpModel[]): ParsedBaseModel[] {
  if (!rawModels || rawModels.length === 0) return [];

  const baseMap = new Map<
    string,
    {
      baseId: string;
      displayName: string;
      description?: string;
      tiers: Map<string, ParsedThinkingTier>;
    }
  >();

  for (const raw of rawModels) {
    if (!raw.id) continue;
    const match = raw.id.match(/^(.+?)\[([a-zA-Z0-9_\-]+)\]$/);

    if (match) {
      const baseId = match[1];
      const tierId = match[2].toLowerCase();
      const baseDisplayName = formatBaseModelName(baseId);
      const tierLabel = formatTierLabel(tierId);

      if (!baseMap.has(baseId)) {
        baseMap.set(baseId, {
          baseId,
          displayName: baseDisplayName,
          description: raw.description,
          tiers: new Map(),
        });
      }

      const entry = baseMap.get(baseId)!;
      entry.tiers.set(tierId, {
        id: tierId,
        label: tierLabel,
        fullModelId: raw.id,
      });
    } else {
      const baseId = raw.id;
      const baseDisplayName = raw.name || formatBaseModelName(baseId);

      if (!baseMap.has(baseId)) {
        baseMap.set(baseId, {
          baseId,
          displayName: baseDisplayName,
          description: raw.description,
          tiers: new Map(),
        });
      }
    }
  }

  const result: ParsedBaseModel[] = [];

  for (const entry of baseMap.values()) {
    const tiersArray = Array.from(entry.tiers.values());

    const canonicalOrder = ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'];
    tiersArray.sort((a, b) => {
      const ia = canonicalOrder.indexOf(a.id);
      const ib = canonicalOrder.indexOf(b.id);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.id.localeCompare(b.id);
    });

    let tag = '';
    if (entry.baseId.includes('sol')) tag = 'Flagship';
    else if (entry.baseId.includes('terra')) tag = 'Balanced';
    else if (entry.baseId.includes('luna') || entry.baseId.includes('mini')) tag = 'Fast';
    else if (entry.baseId.includes('5.5')) tag = 'Advanced';

    const defaultTier = tiersArray.find((t) => t.id === 'medium')?.id || tiersArray[0]?.id || 'medium';

    result.push({
      baseId: entry.baseId,
      displayName: entry.displayName,
      description: entry.description,
      tag,
      thinkingTiers: tiersArray,
      defaultThinkingTier: defaultTier,
    });
  }

  return result;
}

export function resolveTargetAcpModelId(
  baseModelId: string,
  thinkingTier: string,
  parsedModels: ParsedBaseModel[]
): string {
  const model = parsedModels.find((m) => m.baseId === baseModelId);
  if (model && model.thinkingTiers.length > 0) {
    const tier = model.thinkingTiers.find((t) => t.id === thinkingTier);
    if (tier) return tier.fullModelId;
    return `${baseModelId}[${thinkingTier}]`;
  }
  return baseModelId;
}
