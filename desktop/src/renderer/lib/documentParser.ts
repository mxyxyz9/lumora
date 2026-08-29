import * as XLSX from 'xlsx';
import { AttachedImage } from './aiService';

export interface AttachedDocument {
  id: string;
  name: string;
  type: 'spreadsheet' | 'image' | 'text' | 'json';
  mimeType: string;
  size: number;
  summary: string;
  parsedContent: string;
  previewUrl?: string; // for images
  attachedImage?: AttachedImage;
  rowCount?: number;
  sheetNames?: string[];
}

/**
 * Parses any user-uploaded file (Excel, CSV, Image, Text, JSON) into a structured
 * document ready for AI Copilot ingestion and task synthesis.
 * Uses universal modern Web APIs (arrayBuffer, text) compatible across Electron,
 * Browser, and Node/Vitest.
 */
export async function parseAttachedFile(file: File): Promise<AttachedDocument> {
  const id = `doc_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`;
  const name = file.name;
  const size = file.size;
  const ext = name.split('.').pop()?.toLowerCase() || '';

  // 1. Image Files
  if (file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext)) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(buffer).toString('base64');
    const previewUrl = `data:${file.type || 'image/png'};base64,${base64}`;

    const img: AttachedImage = {
      base64,
      mimeType: file.type || 'image/png',
      name,
      previewUrl,
    };

    return {
      id,
      name,
      type: 'image',
      mimeType: file.type || 'image/png',
      size,
      summary: `Image Screenshot (${(size / 1024).toFixed(1)} KB)`,
      parsedContent: `[Attached Image Screenshot: ${name}]`,
      previewUrl,
      attachedImage: img,
    };
  }

  // 2. Spreadsheet Files (.xlsx, .xls, .csv, .tsv)
  if (['xlsx', 'xls', 'csv', 'tsv'].includes(ext) || file.type.includes('spreadsheet') || file.type.includes('csv')) {
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetNames = workbook.SheetNames || [];
    let totalRows = 0;
    const markdownSheets: string[] = [];

    for (const sheetName of sheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;

      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (jsonData.length === 0) continue;

      const rows = jsonData.filter(r => r && r.length > 0 && r.some(cell => cell !== undefined && cell !== ''));
      totalRows += Math.max(0, rows.length - 1);

      // Format as Markdown table
      const headers = rows[0] || [];
      const headerRow = `| ${headers.map(h => String(h || '').trim() || '-').join(' | ')} |`;
      const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
      const dataRows = rows.slice(1).map(r => {
        const cells = headers.map((_, idx) => String(r[idx] !== undefined ? r[idx] : '').replace(/\r?\n/g, ' ').trim() || '-');
        return `| ${cells.join(' | ')} |`;
      });

      markdownSheets.push(`### Sheet: "${sheetName}" (${dataRows.length} rows)\n${headerRow}\n${separatorRow}\n${dataRows.join('\n')}`);
    }

    const parsedContent = markdownSheets.join('\n\n');
    return {
      id,
      name,
      type: 'spreadsheet',
      mimeType: file.type || (ext === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      size,
      summary: `Spreadsheet (${sheetNames.length} sheet${sheetNames.length > 1 ? 's' : ''}, ${totalRows} row${totalRows !== 1 ? 's' : ''})`,
      parsedContent,
      rowCount: totalRows,
      sheetNames,
    };
  }

  // 3. Text / JSON / Markdown / Log files
  const text = await file.text();
  const isJson = ext === 'json' || file.type === 'application/json';
  let formatted = text;

  if (isJson) {
    try {
      const parsed = JSON.parse(text);
      formatted = JSON.stringify(parsed, null, 2);
    } catch (_) {}
  }

  const lines = text.split('\n').length;
  return {
    id,
    name,
    type: isJson ? 'json' : 'text',
    mimeType: file.type || 'text/plain',
    size,
    summary: `${isJson ? 'JSON' : 'Text'} Document (${lines} lines, ${(size / 1024).toFixed(1)} KB)`,
    parsedContent: formatted,
    rowCount: lines,
  };
}
