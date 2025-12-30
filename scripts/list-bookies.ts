import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const bookies = await prisma.bookie.findMany({
    select: { id: true, name: true },
    orderBy: { id: 'asc' }
  })

  console.log('All bookies:')
  bookies.forEach(b => console.log(`${b.id}: ${b.name}`))

  await prisma.$disconnect()
}

main().catch(console.error)
