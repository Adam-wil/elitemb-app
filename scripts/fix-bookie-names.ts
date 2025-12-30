import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Fixing bookie names...\n')

  // Fix "sports bet" -> "sportsbet" (ID 21)
  const sportbet = await prisma.bookie.update({
    where: { id: 21 },
    data: {
      name: 'sportsbet',
      normalizedName: 'sportsbet'
    }
  })
  console.log(`Fixed: "${sportbet.name}" (ID ${sportbet.id})`)

  // Fix "ROB WATERHOUSE .COM" -> "Rob Waterhouse" (ID 47)
  const robWaterhouse = await prisma.bookie.update({
    where: { id: 47 },
    data: {
      name: 'Rob Waterhouse',
      normalizedName: 'rob waterhouse'
    }
  })
  console.log(`Fixed: "${robWaterhouse.name}" (ID ${robWaterhouse.id})`)

  // Verify all fixes
  console.log('\nVerifying all fixes:')
  const fixed = await prisma.bookie.findMany({
    where: { id: { in: [21, 47, 64, 127] } },
    select: { id: true, name: true }
  })
  fixed.forEach(b => console.log(`  ${b.id}: "${b.name}"`))

  await prisma.$disconnect()
}

main().catch(console.error)
