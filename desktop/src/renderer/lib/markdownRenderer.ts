/**
 * Lightweight Markdown Renderer for Kanso AI Copilot
 * Converts AI-generated markdown to safe HTML for display in the chat drawer.
 */

export function renderMarkdown(md: string): string {
  if (!md) return '';
  let html = escapeHtml(md);

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m: string, lang: string, code: string) => {
    const langLabel = lang ? `<span class="md-code-lang">${lang}</span>` : '';
    return `<div class="md-code-block">${langLabel}<pre><code>${code.trim()}</code></pre></div>`;
  });

  // Inline code
  html = html.replace(/`([^`\n]+)`/g, '<code class="md-inline-code">$1</code>');

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');

  // Horizontal rule
  html = html.replace(/^---+$/gm, '<hr class="md-hr" />');

  // Blockquote
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="md-blockquote">$1</blockquote>');

  // Ordered lists
  html = html.replace(/((?:^[0-9]+\. .+\n?)+)/gm, (block: string) => {
    const items = block
      .trim()
      .split('\n')
      .map((line: string) => {
        const m = line.match(/^[0-9]+\. (.+)$/);
        return m ? `<li>${m[1]}</li>` : '';
      })
      .join('');
    return `<ol class="md-ol">${items}</ol>`;
  });

  // Unordered lists
  html = html.replace(/((?:^[-*•] .+\n?)+)/gm, (block: string) => {
    const items = block
      .trim()
      .split('\n')
      .map((line: string) => {
        const m = line.match(/^[-*•] (.+)$/);
        return m ? `<li>${m[1]}</li>` : '';
      })
      .join('');
    return `<ul class="md-ul">${items}</ul>`;
  });

  // Tables
  html = html.replace(/((?:^\|.+\|\n?)+)/gm, (block: string) => {
    const rows = block.trim().split('\n').filter((r: string) => !/^\|[-| :]+\|$/.test(r.trim()));
    if (rows.length === 0) return block;
    const [header, ...body] = rows;
    const thCells = header
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c: string) => `<th>${c.trim()}</th>`)
      .join('');
    const bodyRows = body
      .map((row: string) => {
        const cells = row
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((c: string) => `<td>${c.trim()}</td>`)
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');
    return `<table class="md-table"><thead><tr>${thCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  });

  // Bold & italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Paragraphs & line breaks
  const splitBlocks = html.split(/\n{2,}/);
  html = splitBlocks
    .map((block: string) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<ol') ||
        trimmed.startsWith('<table') ||
        trimmed.startsWith('<div') ||
        trimmed.startsWith('<hr') ||
        trimmed.startsWith('<blockquote')
      ) {
        return trimmed;
      }
      return `<p class="md-p">${trimmed.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
