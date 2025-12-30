require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Count all tables
  const racingCount = await prisma.racingTrackerEntry.count();
  const layCount = await prisma.layManagerEntry.count();
  const journalCount = await prisma.journalEntry.count();
  const accountCount = await prisma.account.count();

  console.log('=== TABLE COUNTS ===');
  console.log(`RacingTrackerEntry: ${racingCount}`);
  console.log(`LayManagerEntry: ${layCount}`);
  console.log(`JournalEntry: ${journalCount}`);
  console.log(`Account: ${accountCount}`);

  // Get all racing entries
  if (racingCount > 0) {
    console.log('\n=== RACING TRACKER ENTRIES ===');
    const entries = await prisma.racingTrackerEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    entries.forEach(e => {
      console.log(`${e.track} R${e.raceNumber} | ${e.backBookie} | Stake: ${e.backStake} | Outcome: ${e.outcome} | Locked: ${e.readOnly}`);
    });
  }

  // Get all lay entries
  if (layCount > 0) {
    console.log('\n=== LAY MANAGER ENTRIES ===');
    const entries = await prisma.layManagerEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    entries.forEach(e => {
      console.log(`${e.track} R${e.raceNumber} | ${e.backBookie} | Stake: ${e.backStake} | Outcome: ${e.outcome} | Locked: ${e.readOnly}`);
    });
  }

  // Get all journal entries
  if (journalCount > 0) {
    console.log('\n=== JOURNAL ENTRIES ===');
    const journals = await prisma.journalEntry.findMany({
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    journals.forEach(j => {
      console.log(`${j.entryType} | ${j.description} | Void: ${j.isVoid} | Lines: ${j.lines.length}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
