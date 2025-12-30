import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const count = await prisma.bookie.count()
  console.log('Total bookies in database:', count)

  // Get first bookie with ALL columns
  const firstBookie = await prisma.bookie.findFirst()
  console.log('\nFirst bookie (all columns):')
  console.log(JSON.stringify(firstBookie, null, 2))

  // Show column names
  if (firstBookie) {
    console.log('\nColumn names:', Object.keys(firstBookie).join(', '))
  }

  await prisma.$disconnect()
}

main().catch(console.error)
