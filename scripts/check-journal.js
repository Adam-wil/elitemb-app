const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get Cranbourne entries
  const entries = await prisma.racingTrackerEntry.findMany({
    where: { track: { contains: 'CRANBOURNE', mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('=== TRACKER ENTRIES ===');
  entries.forEach(e => {
    console.log(`ID: ${e.id.slice(0,8)}... | Track: ${e.track} R${e.raceNumber} | Outcome: ${e.outcome} | ReadOnly: ${e.readOnly} | Stake: ${e.backStake}`);
  });

  // Get all journal entries
  const journals = await prisma.journalEntry.findMany({
    where: { isVoid: false },
    include: { lines: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('\n=== JOURNAL ENTRIES ===');
  if (journals.length === 0) {
    console.log('No journal entries found!');
  }
  journals.forEach(j => {
    console.log(`ID: ${j.id.slice(0,8)}... | Type: ${j.entryType} | Desc: ${j.description || 'none'}`);
    console.log(`  RefType: ${j.referenceType || 'none'} | RefID: ${j.referenceId ? j.referenceId.slice(0,8) + '...' : 'none'}`);
    console.log(`  Lines: ${j.lines.length}`);
  });

  // Check for specific tracker entry journal
  if (entries.length > 0) {
    const trackerId = entries[0].id;
    console.log(`\n=== CHECKING JOURNAL FOR TRACKER ${trackerId.slice(0,8)}... ===`);
    const trackerJournals = await prisma.journalEntry.findMany({
      where: { referenceId: trackerId },
      include: { lines: true }
    });
    if (trackerJournals.length === 0) {
      console.log('NO JOURNAL ENTRIES FOUND for this tracker entry!');
      console.log('This means either:');
      console.log('1. The entry was never locked in (readOnly = false)');
      console.log('2. The lock-in happened before journal integration was added');
      console.log('3. There was an error creating the journal entry');
    } else {
      trackerJournals.forEach(j => {
        console.log(`Found: ${j.entryType} - ${j.description}`);
      });
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
