import { describe, it, expect } from 'vitest';
import { Card } from '../src/renderer/lib/types';

describe('GlobalSearch Card Matching Logic', () => {
  const sampleCards: Card[] = [
    {
      _id: 'c1',
      title: 'Implement OAuth Login Flow',
      description: 'Support Google and GitHub OAuth providers with refresh tokens',
      boardId: 'b1',
      listId: 'l1',
      swimlaneId: 'sw1',
      archived: false,
      github: {
        repo: 'wekan/wekan',
        issueNumber: 4251,
        issueUrl: 'https://github.com/wekan/wekan/issues/4251',
        state: 'open',
        lastSyncedAt: '2026-08-29',
      },
    },
    {
      _id: 'c2',
      title: 'Fix SQLite memory leak in solo backend',
      description: 'Wal mode files grow unbounded after 1000 transactions',
      boardId: 'b1',
      listId: 'l2',
      swimlaneId: 'sw1',
      archived: false,
      customFields: [
        { _id: 'cf-num', value: 90210 },
        { _id: 'cf-tag', value: 'critical-infra' },
      ],
    },
    {
      _id: 'c3',
      title: 'Deprecated legacy migration script',
      description: 'Archive old v0.9 database schemas',
      boardId: 'b1',
      listId: 'l3',
      swimlaneId: 'sw2',
      archived: true,
    },
  ];

  function searchCards(cards: Card[], term: string, includeArchived: boolean): Card[] {
    const cleanTerm = term.trim();
    if (!cleanTerm) return [];

    let regex: RegExp;
    try {
      regex = new RegExp(cleanTerm, 'i');
    } catch {
      const escaped = cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(escaped, 'i');
    }

    return cards.filter((card) => {
      if (!includeArchived && card.archived) return false;
      if (regex.test(card.title)) return true;
      if (card.description && regex.test(card.description)) return true;
      if (card.github && (regex.test(String(card.github.issueNumber)) || regex.test(card.github.repo))) return true;
      if (card.customFields && Array.isArray(card.customFields)) {
        for (const cf of card.customFields) {
          if (cf.value !== undefined && cf.value !== null) {
            if (regex.test(String(cf.value))) return true;
          }
        }
      }
      return false;
    });
  }

  it('matches card title with case-insensitive regex', () => {
    const res = searchCards(sampleCards, 'oauth login', false);
    expect(res.length).toBe(1);
    expect(res[0]._id).toBe('c1');
  });

  it('matches card description text', () => {
    const res = searchCards(sampleCards, 'refresh tokens', false);
    expect(res.length).toBe(1);
    expect(res[0]._id).toBe('c1');
  });

  it('matches GitHub issue numbers', () => {
    const res = searchCards(sampleCards, '4251', false);
    expect(res.length).toBe(1);
    expect(res[0]._id).toBe('c1');
  });

  it('matches custom fields numeric and text values', () => {
    const numMatch = searchCards(sampleCards, '90210', false);
    expect(numMatch.length).toBe(1);
    expect(numMatch[0]._id).toBe('c2');

    const tagMatch = searchCards(sampleCards, 'critical-infra', false);
    expect(tagMatch.length).toBe(1);
    expect(tagMatch[0]._id).toBe('c2');
  });

  it('excludes archived cards by default', () => {
    const res = searchCards(sampleCards, 'legacy migration', false);
    expect(res.length).toBe(0);
  });

  it('includes archived cards when toggle is enabled', () => {
    const res = searchCards(sampleCards, 'legacy migration', true);
    expect(res.length).toBe(1);
    expect(res[0]._id).toBe('c3');
  });

  it('handles regex special characters safely without throwing', () => {
    expect(() => searchCards(sampleCards, '[broken(regex*+', false)).not.toThrow();
  });
});
