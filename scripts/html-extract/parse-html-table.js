/**
 * HTML Table Parser
 * Extracts table data from Google Sheets HTML export files
 *
 * Usage: node parse-html-table.js <input-html-file> [output-json-file]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get input file from command line or use default
const inputFile = process.argv[2] || path.join(__dirname, '../../__Platinum Squad Bookie List by The System - Last updated 14_11_25 - Google Drive - new.html');
const outputFile = process.argv[3] || path.join(__dirname, 'table-data.json');

if (!fs.existsSync(inputFile)) {
  console.error(`Input file not found: ${inputFile}`);
  process.exit(1);
}

console.log(`Reading: ${inputFile}`);
const html = fs.readFileSync(inputFile, 'utf8');

// Find all table rows
const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
let rows = [];
let match;

while ((match = trPattern.exec(html)) !== null) {
  const rowHtml = match[1];
  let cells = [];
  const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/g;
  let cellMatch;

  while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
    // Strip HTML tags and decode entities
    let content = cellMatch[1]
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    cells.push(content);
  }

  if (cells.length > 0) {
    rows.push(cells);
  }
}

// Write JSON output
fs.writeFileSync(outputFile, JSON.stringify(rows, null, 2), 'utf8');
console.log(`Extracted ${rows.length} rows to: ${outputFile}`);
