/**
 * Prisma Seed Script for The Furlong
 *
 * Seeds the database with:
 * - State commission rates (NSW/ACT: 10%, VIC/QLD/SA/WA/TAS/NT: 8%, NZ/INT: 6%)
 * - 150+ Australian/NZ tracks with state mappings
 * - 134 bookies from the Platinum Squad Bookie List
 * - Default user/profile for development
 *
 * Run: npx prisma db seed
 */

import 'dotenv/config'
import { PrismaClient, PromoVolume, RiskLevel } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { bookieListData } from '../src/modules/lay-manager/data/bookieListData'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

// ============================================================================
// State Commission Rates
// ============================================================================

const stateCommissionRates = [
  { code: 'nsw', name: 'New South Wales', defaultRate: 10.0 },
  { code: 'vic', name: 'Victoria', defaultRate: 8.0 },
  { code: 'qld', name: 'Queensland', defaultRate: 8.0 },
  { code: 'sa', name: 'South Australia', defaultRate: 8.0 },
  { code: 'wa', name: 'Western Australia', defaultRate: 8.0 },
  { code: 'tas', name: 'Tasmania', defaultRate: 8.0 },
  { code: 'nt', name: 'Northern Territory', defaultRate: 8.0 },
  { code: 'act', name: 'Australian Capital Territory', defaultRate: 10.0 },
  { code: 'nz', name: 'New Zealand', defaultRate: 6.0 },
  { code: 'int', name: 'International', defaultRate: 6.0 },
]

// ============================================================================
// Track to State Mapping
// ============================================================================

const TRACK_TO_STATE: Record<string, string> = {
  // New South Wales (NSW) - 10%
  RANDWICK: 'nsw',
  ROSEHILL: 'nsw',
  'ROSEHILL GARDENS': 'nsw',
  'WARWICK FARM': 'nsw',
  CANTERBURY: 'nsw',
  'CANTERBURY PARK': 'nsw',
  GOSFORD: 'nsw',
  NEWCASTLE: 'nsw',
  'KEMBLA GRANGE': 'nsw',
  HAWKESBURY: 'nsw',
  WYONG: 'nsw',
  SCONE: 'nsw',
  GRAFTON: 'nsw',
  TAMWORTH: 'nsw',
  MUSWELLBROOK: 'nsw',
  DUBBO: 'nsw',
  ALBURY: 'nsw',
  WAGGA: 'nsw',
  'WAGGA WAGGA': 'nsw',
  'PORT MACQUARIE': 'nsw',
  'COFFS HARBOUR': 'nsw',
  MORUYA: 'nsw',
  NOWRA: 'nsw',
  QUEANBEYAN: 'nsw',
  TAREE: 'nsw',
  BATHURST: 'nsw',
  MUDGEE: 'nsw',
  GOULBURN: 'nsw',
  GUNDAGAI: 'nsw',
  BALLINA: 'nsw',
  LISMORE: 'nsw',
  CASINO: 'nsw',
  MOREE: 'nsw',
  INVERELL: 'nsw',
  ARMIDALE: 'nsw',
  COONAMBLE: 'nsw',
  COONABARABRAN: 'nsw',
  NARROMINE: 'nsw',
  PARKES: 'nsw',
  ORANGE: 'nsw',
  WELLINGTON: 'nsw',
  GILGANDRA: 'nsw',
  CONDOBOLIN: 'nsw',
  FORBES: 'nsw',
  COWRA: 'nsw',
  YOUNG: 'nsw',
  COOTAMUNDRA: 'nsw',
  TEMORA: 'nsw',
  JUNEE: 'nsw',
  COROWA: 'nsw',
  DENILIQUIN: 'nsw',
  HAY: 'nsw',
  'BROKEN HILL': 'nsw',
  BOURKE: 'nsw',
  NYNGAN: 'nsw',

  // Victoria (VIC) - 8%
  FLEMINGTON: 'vic',
  CAULFIELD: 'vic',
  'MOONEE VALLEY': 'vic',
  SANDOWN: 'vic',
  'SANDOWN HILLSIDE': 'vic',
  'SANDOWN LAKESIDE': 'vic',
  CRANBOURNE: 'vic',
  PAKENHAM: 'vic',
  MORNINGTON: 'vic',
  BALLARAT: 'vic',
  GEELONG: 'vic',
  BENDIGO: 'vic',
  SALE: 'vic',
  WARRNAMBOOL: 'vic',
  KYNETON: 'vic',
  ECHUCA: 'vic',
  WANGARATTA: 'vic',
  BENALLA: 'vic',
  SEYMOUR: 'vic',
  'YARRA VALLEY': 'vic',
  'BAL-SYNTH': 'vic',
  TATURA: 'vic',
  MOE: 'vic',
  BAIRNSDALE: 'vic',
  STAWELL: 'vic',
  ARARAT: 'vic',
  HAMILTON: 'vic',
  COLAC: 'vic',
  CAMPERDOWN: 'vic',
  TERANG: 'vic',
  MORTLAKE: 'vic',
  WODONGA: 'vic',
  KILMORE: 'vic',
  'HANGING ROCK': 'vic',
  DONALD: 'vic',
  'ST ARNAUD': 'vic',
  'STONY CREEK': 'vic',
  MILDURA: 'vic',
  'SWAN HILL': 'vic',
  KERANG: 'vic',
  AVOCA: 'vic',
  BALLAN: 'vic',
  CASTERTON: 'vic',
  COLERAINE: 'vic',
  DUNKELD: 'vic',
  HORSHAM: 'vic',
  NHILL: 'vic',
  EDENHOPE: 'vic',
  'GREAT WESTERN': 'vic',
  WERRIBEE: 'vic',
  'SPORTSBET-PAKENHAM': 'vic',

  // Queensland (QLD) - 8%
  'EAGLE FARM': 'qld',
  DOOMBEN: 'qld',
  'GOLD COAST': 'qld',
  'SUNSHINE COAST': 'qld',
  IPSWICH: 'qld',
  TOOWOOMBA: 'qld',
  CAIRNS: 'qld',
  TOWNSVILLE: 'qld',
  MACKAY: 'qld',
  ROCKHAMPTON: 'qld',
  BUNDABERG: 'qld',
  'CALLAGHAN PARK': 'qld',
  BEAUDESERT: 'qld',
  GATTON: 'qld',
  KILCOY: 'qld',
  NANANGO: 'qld',
  GYMPIE: 'qld',
  DALBY: 'qld',
  WARWICK: 'qld',
  STANTHORPE: 'qld',
  ROMA: 'qld',
  CHARLEVILLE: 'qld',
  CUNNAMULLA: 'qld',
  LONGREACH: 'qld',
  BARCALDINE: 'qld',
  EMERALD: 'qld',
  CLERMONT: 'qld',
  MORANBAH: 'qld',
  BOWEN: 'qld',
  PROSERPINE: 'qld',
  INNISFAIL: 'qld',
  ATHERTON: 'qld',
  MAREEBA: 'qld',
  'MOUNT ISA': 'qld',
  CLONCURRY: 'qld',
  'JULIA CREEK': 'qld',
  RICHMOND: 'qld',
  HUGHENDEN: 'qld',
  'CHARTERS TOWERS': 'qld',
  AYR: 'qld',
  'HOME HILL': 'qld',
  COLLINSVILLE: 'qld',
  GLADSTONE: 'qld',
  BILOELA: 'qld',
  MONTO: 'qld',
  CHINCHILLA: 'qld',
  MILES: 'qld',
  GOONDIWINDI: 'qld',
  'ST GEORGE': 'qld',
  DIRRANBANDI: 'qld',
  THANGOOL: 'qld',

  // South Australia (SA) - 8%
  MORPHETTVILLE: 'sa',
  'MORPHETTVILLE PARKS': 'sa',
  'MURRAY BRIDGE': 'sa',
  GAWLER: 'sa',
  STRATHALBYN: 'sa',
  'PORT LINCOLN': 'sa',
  'MOUNT GAMBIER': 'sa',
  BORDERTOWN: 'sa',
  NARACOORTE: 'sa',
  PENOLA: 'sa',
  MILLICENT: 'sa',
  'PORT AUGUSTA': 'sa',
  BALAKLAVA: 'sa',
  CLARE: 'sa',
  'PORT PIRIE': 'sa',
  KADINA: 'sa',
  CEDUNA: 'sa',
  OAKBANK: 'sa',

  // Western Australia (WA) - 8%
  ASCOT: 'wa',
  BELMONT: 'wa',
  'BELMONT PARK': 'wa',
  PINJARRA: 'wa',
  BUNBURY: 'wa',
  KALGOORLIE: 'wa',
  ALBANY: 'wa',
  GERALDTON: 'wa',
  NORTHAM: 'wa',
  YORK: 'wa',
  NARROGIN: 'wa',
  'LARK HILL': 'wa',
  BROOME: 'wa',
  CARNARVON: 'wa',
  ESPERANCE: 'wa',
  'MT BARKER': 'wa',
  BEVERLEY: 'wa',
  CUNDERDIN: 'wa',
  MERREDIN: 'wa',
  MOORA: 'wa',
  'WONGAN HILLS': 'wa',
  WAGIN: 'wa',
  KATANNING: 'wa',
  PINGELLY: 'wa',
  KULIN: 'wa',
  CORRIGIN: 'wa',
  TOODYAY: 'wa',

  // Tasmania (TAS) - 8%
  HOBART: 'tas',
  LAUNCESTON: 'tas',
  DEVONPORT: 'tas',
  SPREYTON: 'tas',
  SCOTTSDALE: 'tas',
  LONGFORD: 'tas',
  BURNIE: 'tas',

  // Northern Territory (NT) - 8%
  DARWIN: 'nt',
  'FANNIE BAY': 'nt',
  'ALICE SPRINGS': 'nt',
  KATHERINE: 'nt',
  'TENNANT CREEK': 'nt',

  // Australian Capital Territory (ACT) - 10%
  CANBERRA: 'act',
  'THOROUGHBRED PARK': 'act',

  // New Zealand (NZ) - 6%
  ELLERSLIE: 'nz',
  TRENTHAM: 'nz',
  RICCARTON: 'nz',
  'TE RAPA': 'nz',
  HASTINGS: 'nz',
  OTAKI: 'nz',
  AWAPUNI: 'nz',
  WANGANUI: 'nz',
  'NEW PLYMOUTH': 'nz',
  HAWERA: 'nz',
  'TE AROHA': 'nz',
  MATAMATA: 'nz',
  CAMBRIDGE: 'nz',
  ROTORUA: 'nz',
  TAUPO: 'nz',
  TAURANGA: 'nz',
  RUAKAKA: 'nz',
  PUKEKOHE: 'nz',
  AVONDALE: 'nz',
  WAIKATO: 'nz',
  WAIPA: 'nz',
  WOODVILLE: 'nz',
  WAVERLEY: 'nz',
  TAUHERENIKAU: 'nz',
  WINGATUI: 'nz',
  'ASCOT PARK': 'nz',
  INVERCARGILL: 'nz',
  GORE: 'nz',
  CROMWELL: 'nz',
  OAMARU: 'nz',
  TIMARU: 'nz',
  ASHBURTON: 'nz',
  RANGIORA: 'nz',
  METHVEN: 'nz',
  WESTPORT: 'nz',
  GREYMOUTH: 'nz',
  REEFTON: 'nz',
  HOKITIKA: 'nz',
  KUMARA: 'nz',
  NELSON: 'nz',
  BLENHEIM: 'nz',
  KUROW: 'nz',
  WAIMATE: 'nz',
  WYNDHAM: 'nz',
  RIVERTON: 'nz',
  WAIKOUAITI: 'nz',
  ROXBURGH: 'nz',
  OMAKAU: 'nz',
  TAPANUI: 'nz',
  BALCLUTHA: 'nz',
}

// ============================================================================
// Helper Functions
// ============================================================================

function parsePromoVolume(value: string): PromoVolume | null {
  const upper = value.toUpperCase()
  if (upper === 'HIGH') return 'HIGH'
  if (upper === 'MEDIUM') return 'MEDIUM'
  if (upper === 'LOW' || upper === 'NEXT TO NONE') return 'LOW'
  return null
}

function parseRiskLevel(value: string): RiskLevel | null {
  const upper = value.toUpperCase()
  if (upper === 'LOW') return 'LOW'
  if (upper === 'MEDIUM') return 'MEDIUM'
  if (upper === 'HIGH' || upper === 'INSTANT') return 'HIGH'
  return null
}

// Bookie data is now imported from bookieListData (134 bookies)

// ============================================================================
// Main Seed Function
// ============================================================================

async function main() {
  console.log('Starting database seed...')

  // 1. Seed State Commission Rates
  console.log('Seeding state commission rates...')
  for (const rate of stateCommissionRates) {
    await prisma.stateCommissionRate.upsert({
      where: { code: rate.code },
      update: { name: rate.name, defaultRate: rate.defaultRate },
      create: rate,
    })
  }
  console.log(`Seeded ${stateCommissionRates.length} state commission rates`)

  // 2. Seed Tracks
  console.log('Seeding tracks...')
  let trackCount = 0
  for (const [trackName, stateCode] of Object.entries(TRACK_TO_STATE)) {
    // Determine country based on state
    const country = stateCode === 'nz' ? 'NZ' : 'AU'

    await prisma.track.upsert({
      where: { name: trackName },
      update: { stateCode, country },
      create: {
        name: trackName,
        stateCode,
        country,
      },
    })
    trackCount++
  }
  console.log(`Seeded ${trackCount} tracks`)

  // 3. Seed Bookies (from imported bookieListData - 134 bookies)
  // First, delete all existing bookies to avoid conflicts
  await prisma.bookie.deleteMany({})
  console.log('Cleared existing bookies')

  console.log('Seeding bookies from bookieListData...')
  const seenNormalizedNames = new Set<string>()
  let skippedCount = 0
  let createdCount = 0

  for (const bookieItem of bookieListData) {
    const normalizedName = bookieItem.bookie.toLowerCase()

    // Skip duplicates (same name when normalized)
    if (seenNormalizedNames.has(normalizedName)) {
      console.log(`  Skipping duplicate: ${bookieItem.bookie}`)
      skippedCount++
      continue
    }
    seenNormalizedNames.add(normalizedName)

    const isExchange = bookieItem.bookieSoftware === 'Exchange'

    await prisma.bookie.create({
      data: {
        name: bookieItem.bookie,
        normalizedName,
        signUpOffers: bookieItem.signUpOffers || null,
        linkedBookies: bookieItem.linkedBookies || null,
        accountSetupNotes: bookieItem.accountSetupNotes || null,
        promoVolume: parsePromoVolume(bookieItem.promoVolume),
        banRisk: parseRiskLevel(bookieItem.banRisk),
        defenceNotes: bookieItem.defenceNotes || null,
        horseSystem: bookieItem.horseSystem || null,
        sportSystem: bookieItem.sportSystem || null,
        femaleAccounts: bookieItem.femaleAccounts || null,
        statDecRisk: parseRiskLevel(bookieItem.statDecRisk),
        learnBetfairFirst: bookieItem.learnBetfairFirst || null,
        oddsRating: bookieItem.oddsRating || null,
        minimumRunners: bookieItem.minimumRunners || null,
        website: bookieItem.website || null,
        bookieSoftware: bookieItem.bookieSoftware || null,
        stateOfRegistration: bookieItem.stateOfRegistration || null,
        isExchange,
      },
    })
    createdCount++
  }
  console.log(`Seeded ${createdCount} bookies (skipped ${skippedCount} duplicates)`)

  // 4. Create default user and profile for development
  console.log('Creating default user and profile...')
  const defaultUser = await prisma.user.upsert({
    where: { email: 'default@elitemb.local' },
    update: {},
    create: {
      email: 'default@elitemb.local',
      profiles: {
        create: {
          name: 'Default Profile',
          isDefault: true,
        },
      },
    },
    include: {
      profiles: true,
    },
  })
  console.log(`Default user created/updated: ${defaultUser.email}`)
  console.log(`Default profile: ${defaultUser.profiles[0]?.name || 'None'}`)

  console.log('Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
