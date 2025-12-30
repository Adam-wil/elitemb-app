const fs = require('fs');
const path = require('path');

const htmlPath = 'C:/Users/adam/Music/bookieslists-edited/dec25/__Platinum Squad Bookie List by The System - Last updated 14_11_25 - Google Drive - new.html';
const outputPath = path.join(__dirname, '../src/modules/lay-manager/data/bookieListData.ts');

const html = fs.readFileSync(htmlPath, 'utf8');

// Find all rows
const rowMatches = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g);

// Parse data rows (skip first 5 header rows)
const bookies = [];
for (let i = 5; i < rowMatches.length; i++) {
  const cells = rowMatches[i].match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g);
  if (!cells || cells.length < 18) continue;

  // Extract text from cell, check for checkbox
  const getCellText = (cell) => {
    if (!cell) return '';
    // Check for checkbox SVG
    if (cell.includes('#checked-checkbox-id')) return 'Yes';
    if (cell.includes('#unchecked-checkbox-id')) return 'No';
    let text = cell.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    // Decode HTML entities
    text = text.replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    return text;
  };

  const bookie = getCellText(cells[1]);
  if (!bookie || bookie.length < 2) continue;

  // Skip if this looks like a header or empty row
  if (bookie === 'Bookie' || bookie.includes('general bookie') || bookie === 'This is a') continue;

  bookies.push({
    id: bookies.length + 1,
    bookie: bookie,
    learnBetfairFirst: getCellText(cells[3]) || '',
    signUpOffers: getCellText(cells[4]) || '',
    linkedBookies: getCellText(cells[5]) || '',
    accountSetupNotes: getCellText(cells[6]) || '',
    promoVolume: getCellText(cells[7]) || '',
    banRisk: getCellText(cells[8]) || '',
    defenceNotes: getCellText(cells[9]) || '',
    horseSystem: getCellText(cells[10]) || '',
    sportSystem: getCellText(cells[11]) || '',
    femaleAccounts: getCellText(cells[12]) || '',
    statDecRisk: getCellText(cells[13]) || '',
    oddsRating: getCellText(cells[14]) || '',
    minimumRunners: getCellText(cells[15]) || '',
    website: getCellText(cells[16]) || '',
    bookieSoftware: getCellText(cells[17]) || '',
    stateOfRegistration: getCellText(cells[18]) || ''
  });
}

// Escape string for TypeScript
const escapeStr = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

// Generate TypeScript file
let tsContent = `// Platinum Squad Bookie List Data
// Last updated: 14/11/25
// Total bookies: ${bookies.length}

export interface BookieData {
  id: number
  bookie: string
  learnBetfairFirst: string
  signUpOffers: string
  linkedBookies: string
  accountSetupNotes: string
  promoVolume: string
  banRisk: string
  defenceNotes: string
  horseSystem: string
  sportSystem: string
  femaleAccounts: string
  statDecRisk: string
  oddsRating: string
  minimumRunners: string
  website: string
  bookieSoftware: string
  stateOfRegistration: string
}

export const bookieListData: BookieData[] = [
`;

bookies.forEach((b) => {
  tsContent += `  {
    id: ${b.id},
    bookie: '${escapeStr(b.bookie)}',
    learnBetfairFirst: '${escapeStr(b.learnBetfairFirst)}',
    signUpOffers: '${escapeStr(b.signUpOffers)}',
    linkedBookies: '${escapeStr(b.linkedBookies)}',
    accountSetupNotes: '${escapeStr(b.accountSetupNotes)}',
    promoVolume: '${escapeStr(b.promoVolume)}',
    banRisk: '${escapeStr(b.banRisk)}',
    defenceNotes: '${escapeStr(b.defenceNotes)}',
    horseSystem: '${b.horseSystem}',
    sportSystem: '${b.sportSystem}',
    femaleAccounts: '${b.femaleAccounts}',
    statDecRisk: '${escapeStr(b.statDecRisk)}',
    oddsRating: '${escapeStr(b.oddsRating)}',
    minimumRunners: '${escapeStr(b.minimumRunners)}',
    website: '${escapeStr(b.website)}',
    bookieSoftware: '${escapeStr(b.bookieSoftware)}',
    stateOfRegistration: '${escapeStr(b.stateOfRegistration)}',
  },
`;
});

tsContent += `]
`;

fs.writeFileSync(outputPath, tsContent);
console.log('Written', bookies.length, 'bookies to:', outputPath);
console.log('\nSample data:');
console.log('Bookie 1:', bookies[0].bookie, '- Horse:', bookies[0].horseSystem, ', Sport:', bookies[0].sportSystem, ', Female:', bookies[0].femaleAccounts);
console.log('Bookie 9 (BetNation):', bookies[8].bookie, '- Horse:', bookies[8].horseSystem, ', Sport:', bookies[8].sportSystem, ', Female:', bookies[8].femaleAccounts);
