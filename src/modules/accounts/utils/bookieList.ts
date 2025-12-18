/**
 * Bookie List for Transaction Detection
 *
 * Contains 130+ Australian bookies with aliases for matching
 * bank transaction descriptions.
 *
 * Aliases include:
 * - Common abbreviations
 * - Pty Ltd variations
 * - Payment processor names
 * - All-caps variations
 */

import type { BookieDefinition } from '../types'

/**
 * Master list of Australian bookies with bank statement aliases
 */
export const BOOKIE_DEFINITIONS: BookieDefinition[] = [
  // ============================================================================
  // EXCHANGES (Betfair, Smarkets)
  // ============================================================================
  {
    id: 'betfair',
    name: 'Betfair',
    aliases: ['BETFAIR', 'BET FAIR', 'FLUTTER', 'PADDY POWER BETFAIR', 'PPB'],
    isExchange: true,
  },
  {
    id: 'smarkets',
    name: 'Smarkets',
    aliases: ['SMARKETS', 'SMARKET'],
    isExchange: true,
  },

  // ============================================================================
  // MAJOR BOOKIES (Corporates - High Value)
  // ============================================================================
  {
    id: 'bet365',
    name: 'bet365',
    aliases: ['BET365', 'BET 365', 'HILLSIDE', 'HILLSIDE AU'],
    website: 'https://www.bet365.com.au',
    isExchange: false,
  },
  {
    id: 'tab',
    name: 'TAB',
    aliases: ['TAB', 'TABCORP', 'TAB LIMITED', 'TABCORP HOLDINGS', 'TAB LTD'],
    website: 'https://www.tab.com.au',
    isExchange: false,
  },
  {
    id: 'sportsbet',
    name: 'Sportsbet',
    aliases: ['SPORTSBET', 'SPORTS BET', 'SP BET', 'SPORTSBET PTY', 'SPORTSBET DIGITAL'],
    website: 'https://www.sportsbet.com.au',
    isExchange: false,
  },
  {
    id: 'ladbrokes',
    name: 'Ladbrokes',
    aliases: ['LADBROKES', 'LADBROKE', 'ENTAIN', 'ENTAIN AU', 'LADBROKES AU'],
    linkedBookies: ['neds'],
    website: 'https://www.ladbrokes.com.au',
    isExchange: false,
  },
  {
    id: 'neds',
    name: 'Neds',
    aliases: ['NEDS', 'NED', 'NEDS AU', 'ENTAIN'],
    linkedBookies: ['ladbrokes'],
    website: 'https://www.neds.com.au',
    isExchange: false,
  },
  {
    id: 'pointsbet',
    name: 'Pointsbet',
    aliases: ['POINTSBET', 'POINTS BET', 'POINTSBET PTY', 'POINTSBET AU'],
    linkedBookies: ['alphabet'],
    website: 'https://pointsbet.com.au',
    isExchange: false,
  },
  {
    id: 'betr',
    name: 'Betr',
    aliases: ['BETR', 'BETR PTY', 'BETR HOLDINGS', 'BETR AU'],
    website: 'https://betr.com.au',
    isExchange: false,
  },
  {
    id: 'unibet',
    name: 'Unibet',
    aliases: ['UNIBET', 'UNI BET', 'KINDRED', 'KINDRED GROUP'],
    website: 'https://www.unibet.com.au',
    isExchange: false,
  },
  {
    id: 'dabble',
    name: 'Dabble',
    aliases: ['DABBLE', 'DABBLE PTY', 'DABBLE AU'],
    website: 'https://dabble.com.au',
    isExchange: false,
  },
  {
    id: 'betright',
    name: 'BetRight',
    aliases: ['BETRIGHT', 'BET RIGHT', 'BETRIGHT AU'],
    website: 'https://www.betright.com.au',
    isExchange: false,
  },
  {
    id: 'palmerbet',
    name: 'Palmerbet',
    aliases: ['PALMERBET', 'PALMER BET', 'PALMERBET AU'],
    website: 'https://www.palmerbet.com',
    isExchange: false,
  },
  {
    id: 'tabtouch',
    name: 'TABtouch',
    aliases: ['TABTOUCH', 'TAB TOUCH', 'RWWA', 'RACING AND WAGERING WA'],
    website: 'https://www.tabtouch.com.au',
    isExchange: false,
  },
  {
    id: 'picklebet',
    name: 'Picklebet',
    aliases: ['PICKLEBET', 'PICKLE BET', 'PICKLEBET AU'],
    website: 'https://picklebet.com',
    isExchange: false,
  },
  {
    id: 'playup',
    name: 'PlayUp',
    aliases: ['PLAYUP', 'PLAY UP', 'PLAYUP AU', 'PLAYUP PTY'],
    website: 'https://www.playup.com.au',
    isExchange: false,
  },
  {
    id: 'betm',
    name: 'betM',
    aliases: ['BETM', 'BET M', 'BETM AU'],
    website: 'https://betm.com.au',
    isExchange: false,
  },

  // ============================================================================
  // AMUSED GROUP (Linked - ban on one = ban on all)
  // ============================================================================
  {
    id: 'betnation',
    name: 'BetNation',
    aliases: ['BETNATION', 'BET NATION', 'BLACKSTREAM'],
    linkedBookies: ['betdeluxe', 'surge', 'noisy', 'pulsebet', 'bigbet', 'mightybet', 'yesbet', 'betjet', 'betxpress'],
    website: 'https://betnation.com.au',
    isExchange: false,
  },
  {
    id: 'betdeluxe',
    name: 'BetDeluxe',
    aliases: ['BETDELUXE', 'BET DELUXE', 'BLACKSTREAM'],
    linkedBookies: ['betnation'],
    website: 'https://betdeluxe.com.au',
    isExchange: false,
  },
  {
    id: 'surge',
    name: 'Surge',
    aliases: ['SURGE', 'SURGE BET', 'BLACKSTREAM'],
    linkedBookies: ['betnation'],
    isExchange: false,
  },
  {
    id: 'noisy',
    name: 'Noisy',
    aliases: ['NOISY', 'NOISY BET', 'BLACKSTREAM'],
    linkedBookies: ['betnation'],
    isExchange: false,
  },
  {
    id: 'pulsebet',
    name: 'Pulsebet',
    aliases: ['PULSEBET', 'PULSE BET', 'BLACKSTREAM'],
    linkedBookies: ['betnation'],
    website: 'https://www.pulsebet.com.au',
    isExchange: false,
  },
  {
    id: 'bigbet',
    name: 'BigBet',
    aliases: ['BIGBET', 'BIG BET', 'BLACKSTREAM'],
    linkedBookies: ['betnation'],
    website: 'https://www.bigbet.com.au',
    isExchange: false,
  },
  {
    id: 'mightybet',
    name: 'MightyBet',
    aliases: ['MIGHTYBET', 'MIGHTY BET', 'BLACKSTREAM'],
    linkedBookies: ['betnation'],
    website: 'https://www.mightybet.com.au',
    isExchange: false,
  },
  {
    id: 'yesbet',
    name: 'YesBet',
    aliases: ['YESBET', 'YES BET', 'BLACKSTREAM'],
    linkedBookies: ['betnation'],
    website: 'https://www.yesbet.com.au',
    isExchange: false,
  },
  {
    id: 'betjet',
    name: 'BetJet',
    aliases: ['BETJET', 'BET JET', 'BLACKSTREAM'],
    linkedBookies: ['betnation'],
    website: 'https://www.betjet.com.au',
    isExchange: false,
  },
  {
    id: 'betxpress',
    name: 'BetXpress',
    aliases: ['BETXPRESS', 'BET XPRESS', 'BETEXPRESS', 'BET EXPRESS', 'BLACKSTREAM'],
    linkedBookies: ['betnation'],
    website: 'https://www.betexpress.com.au',
    isExchange: false,
  },

  // ============================================================================
  // MINTBET / BETBUZZ (Linked)
  // ============================================================================
  {
    id: 'mintbet',
    name: 'MintBet',
    aliases: ['MINTBET', 'MINT BET', 'PUNTERSTECH'],
    linkedBookies: ['betbuzz'],
    website: 'https://mintbet.com.au',
    isExchange: false,
  },
  {
    id: 'betbuzz',
    name: 'BetBuzz',
    aliases: ['BETBUZZ', 'BET BUZZ', 'PUNTERSTECH'],
    linkedBookies: ['mintbet'],
    website: 'https://www.betbuzz.au',
    isExchange: false,
  },

  // ============================================================================
  // BETMAKERS PLATFORM
  // ============================================================================
  {
    id: 'crossbet',
    name: 'Crossbet',
    aliases: ['CROSSBET', 'CROSS BET', 'BETMAKERS'],
    website: 'https://crossbet.com.au',
    isExchange: false,
  },
  {
    id: 'diamondbet',
    name: 'DiamondBet',
    aliases: ['DIAMONDBET', 'DIAMOND BET', 'BETMAKERS'],
    website: 'https://diamondbet.com.au',
    isExchange: false,
  },
  {
    id: 'chasebet',
    name: 'ChaseBet',
    aliases: ['CHASEBET', 'CHASE BET', 'BETMAKERS'],
    linkedBookies: ['next2go'],
    website: 'https://chasebet.com.au',
    isExchange: false,
  },
  {
    id: 'robwaterhouse',
    name: 'Rob Waterhouse',
    aliases: ['ROB WATERHOUSE', 'ROBWATERHOUSE', 'WATERHOUSE', 'BETMAKERS'],
    website: 'https://www.robwaterhouse.com',
    isExchange: false,
  },
  {
    id: 'realbookie',
    name: 'RealBookie',
    aliases: ['REALBOOKIE', 'REAL BOOKIE', 'BETMAKERS'],
    website: 'https://www.realbookie.com.au',
    isExchange: false,
  },
  {
    id: 'betestate',
    name: 'BetEstate',
    aliases: ['BETESTATE', 'BET ESTATE', 'BETMAKERS'],
    website: 'https://betestate.com.au',
    isExchange: false,
  },
  {
    id: 'playwest',
    name: 'Playwest',
    aliases: ['PLAYWEST', 'PLAY WEST', 'PLAYWESTBET', 'BETMAKERS'],
    website: 'https://playwestbet.com',
    isExchange: false,
  },
  {
    id: 'ponybet',
    name: 'Ponybet',
    aliases: ['PONYBET', 'PONY BET', 'BETMAKERS'],
    website: 'https://ponybet.com.au',
    isExchange: false,
  },
  {
    id: 'swiftbet',
    name: 'Swiftbet',
    aliases: ['SWIFTBET', 'SWIFT BET', 'BETMAKERS'],
    website: 'https://swiftbet.com.au',
    isExchange: false,
  },
  {
    id: 'baggybet',
    name: 'BaggyBet',
    aliases: ['BAGGYBET', 'BAGGY BET', 'BETMAKERS'],
    website: 'https://www.baggybet.com.au',
    isExchange: false,
  },
  {
    id: 'terrybet',
    name: 'Terrybet',
    aliases: ['TERRYBET', 'TERRY BET', 'BETMAKERS'],
    website: 'https://terrybet.com.au',
    isExchange: false,
  },
  {
    id: 'next2go',
    name: 'Next2Go',
    aliases: ['NEXT2GO', 'NEXT 2 GO', 'BETMAKERS'],
    linkedBookies: ['chasebet'],
    website: 'https://next2go.com.au',
    isExchange: false,
  },
  {
    id: 'upcoz',
    name: 'UpCoz',
    aliases: ['UPCOZ', 'UP COZ', 'BETMAKERS'],
    website: 'https://www.upcoz.com',
    isExchange: false,
  },
  {
    id: 'betlocal',
    name: 'Bet Local',
    aliases: ['BETLOCAL', 'BET LOCAL', 'BETMAKERS'],
    website: 'https://betlocal.com.au',
    isExchange: false,
  },
  {
    id: 'marantellibet',
    name: 'Marantellibet',
    aliases: ['MARANTELLIBET', 'MARANTELLI BET', 'MARANTELLI', 'BETMAKERS'],
    website: 'https://www.marantellibet.com',
    isExchange: false,
  },
  {
    id: 'punt123',
    name: 'Punt123',
    aliases: ['PUNT123', 'PUNT 123', 'BETMAKERS'],
    website: 'https://punt123.bet',
    isExchange: false,
  },
  {
    id: 'okebet',
    name: 'OkeBet',
    aliases: ['OKEBET', 'OKE BET', 'BETMAKERS'],
    website: 'https://okebet.com.au',
    isExchange: false,
  },
  {
    id: 'betaus',
    name: 'BetAus',
    aliases: ['BETAUS', 'BET AUS', 'BETMAKERS'],
    website: 'https://betaus.com.au',
    isExchange: false,
  },
  {
    id: 'betlegends',
    name: 'BetLegends',
    aliases: ['BETLEGENDS', 'BET LEGENDS', 'BETMAKERS'],
    website: 'https://betlegends.com.au',
    isExchange: false,
  },
  {
    id: 'betit',
    name: 'Betit',
    aliases: ['BETIT', 'BET IT', 'BETMAKERS'],
    website: 'https://betit.com.au',
    isExchange: false,
  },
  {
    id: 'puntx',
    name: 'PuntX',
    aliases: ['PUNTX', 'PUNT X', 'BETMAKERS'],
    website: 'https://puntx.com.au',
    isExchange: false,
  },
  {
    id: 'readybet',
    name: 'ReadyBet',
    aliases: ['READYBET', 'READY BET', 'BETMAKERS'],
    website: 'https://www.readybet.com.au',
    isExchange: false,
  },
  {
    id: 'betsupreme',
    name: 'BetSupreme',
    aliases: ['BETSUPREME', 'BET SUPREME', 'BETMAKERS'],
    website: 'https://betsupreme.com.au',
    isExchange: false,
  },
  {
    id: 'dowbet',
    name: 'DowBet',
    aliases: ['DOWBET', 'DOW BET', 'BETMAKERS'],
    website: 'https://dowbet.com.au',
    isExchange: false,
  },
  {
    id: 'picnicbet',
    name: 'PicnicBet',
    aliases: ['PICNICBET', 'PICNIC BET', 'BETMAKERS'],
    website: 'https://www.picnicbet.com',
    isExchange: false,
  },
  {
    id: 'zbet',
    name: 'ZBet',
    aliases: ['ZBET', 'Z BET', 'BETMAKERS'],
    website: 'https://zbet.com.au',
    isExchange: false,
  },
  {
    id: 'wishbet',
    name: 'WishBet',
    aliases: ['WISHBET', 'WISH BET', 'BETMAKERS'],
    linkedBookies: ['puntcity', 'junglebet'],
    website: 'https://www.wishbet.com.au',
    isExchange: false,
  },

  // ============================================================================
  // GEN WEB PLATFORM
  // ============================================================================
  {
    id: 'boombet',
    name: 'Boombet',
    aliases: ['BOOMBET', 'BOOM BET', 'GEN WEB'],
    website: 'https://www.boombet.com.au',
    isExchange: false,
  },
  {
    id: 'elitebet',
    name: 'Elitebet',
    aliases: ['ELITEBET', 'ELITE BET', 'GEN WEB'],
    website: 'https://www.elitebet.com.au',
    isExchange: false,
  },
  {
    id: 'goldbet',
    name: 'Goldbet',
    aliases: ['GOLDBET', 'GOLD BET', 'GEN WEB'],
    linkedBookies: ['ultrabet'],
    website: 'https://www.goldbet.com.au',
    isExchange: false,
  },
  {
    id: 'ultrabet',
    name: 'Ultrabet',
    aliases: ['ULTRABET', 'ULTRA BET', 'GEN WEB'],
    linkedBookies: ['goldbet'],
    website: 'https://www.ultrabet.com.au',
    isExchange: false,
  },
  {
    id: 'colossal',
    name: 'Colossal',
    aliases: ['COLOSSAL', 'COLOSSALBET', 'COLOSSAL BET', 'GEN WEB'],
    website: 'https://www.colossalbet.com.au',
    isExchange: false,
  },
  {
    id: 'midasbet',
    name: 'MidasBet',
    aliases: ['MIDASBET', 'MIDAS BET', 'GEN WEB'],
    linkedBookies: ['winnersbet', 'puntnow', 'justbet'],
    website: 'https://www.midasbet.com.au',
    isExchange: false,
  },
  {
    id: 'winnersbet',
    name: 'WinnersBet',
    aliases: ['WINNERSBET', 'WINNERS BET', 'GEN WEB'],
    linkedBookies: ['midasbet', 'puntnow', 'justbet'],
    website: 'https://www.winnersbet.com.au',
    isExchange: false,
  },
  {
    id: 'justbet',
    name: 'JustBet',
    aliases: ['JUSTBET', 'JUST BET', 'GEN WEB'],
    linkedBookies: ['midasbet', 'winnersbet', 'puntnow'],
    website: 'https://www.justbet.com.au',
    isExchange: false,
  },
  {
    id: 'puntnow',
    name: 'PuntNow',
    aliases: ['PUNTNOW', 'PUNT NOW', 'GEN WEB'],
    linkedBookies: ['midasbet', 'winnersbet', 'justbet'],
    website: 'https://www.puntnow.com.au',
    isExchange: false,
  },
  {
    id: 'mybet',
    name: 'MyBet',
    aliases: ['MYBET', 'MY BET', 'GEN WEB'],
    website: 'https://www.mybet.com.au',
    isExchange: false,
  },
  {
    id: 'vicbet',
    name: 'VicBet',
    aliases: ['VICBET', 'VIC BET', 'GEN WEB'],
    website: 'https://www.vicbet.com',
    isExchange: false,
  },
  {
    id: 'letsbet',
    name: 'LetsBet',
    aliases: ['LETSBET', 'LETS BET', 'GEN WEB'],
    website: 'https://letsbet.net.au',
    isExchange: false,
  },
  {
    id: 'puntzone',
    name: 'PuntZone',
    aliases: ['PUNTZONE', 'PUNT ZONE', 'GEN WEB'],
    linkedBookies: ['dashbet'],
    website: 'https://www.puntzone.com.au',
    isExchange: false,
  },
  {
    id: 'betnova',
    name: 'BetNova',
    aliases: ['BETNOVA', 'BET NOVA', 'GEN WEB'],
    website: 'https://www.betnova.com.au',
    isExchange: false,
  },

  // ============================================================================
  // PUNTERSTECH PLATFORM
  // ============================================================================
  {
    id: 'starsports',
    name: 'Star Sports',
    aliases: ['STARSPORTS', 'STAR SPORTS', 'PUNTERSTECH'],
    website: 'https://www.starsports.com.au',
    isExchange: false,
  },
  {
    id: 'lightningbet',
    name: 'LightningBet',
    aliases: ['LIGHTNINGBET', 'LIGHTNING BET', 'PUNTERSTECH'],
    website: 'https://www.lightningbet.com.au',
    isExchange: false,
  },
  {
    id: 'wizbet',
    name: 'WizBet',
    aliases: ['WIZBET', 'WIZ BET', 'PUNTERSTECH'],
    website: 'https://www.wizbet.com.au',
    isExchange: false,
  },
  {
    id: 'truebet',
    name: 'TrueBet',
    aliases: ['TRUEBET', 'TRUE BET', 'PUNTERSTECH'],
    website: 'https://www.truebet.com.au',
    isExchange: false,
  },
  {
    id: 'tradiebet',
    name: 'TradieBet',
    aliases: ['TRADIEBET', 'TRADIE BET', 'PUNTERSTECH'],
    website: 'https://www.tradie.bet',
    isExchange: false,
  },
  {
    id: 'razoo',
    name: 'Razoo',
    aliases: ['RAZOO', 'RAZOO BET', 'PUNTERSTECH'],
    website: 'https://www.razoo.bet',
    isExchange: false,
  },
  {
    id: 'alphabet',
    name: 'AlphaBet',
    aliases: ['ALPHABET', 'ALPHA BET', 'PUNTERSTECH'],
    linkedBookies: ['pointsbet'],
    website: 'https://www.alphabetapp.com.au',
    isExchange: false,
  },
  {
    id: 'betchamps',
    name: 'BetChamps',
    aliases: ['BETCHAMPS', 'BET CHAMPS', 'PUNTERSTECH'],
    website: 'https://www.betchamps.com.au',
    isExchange: false,
  },
  {
    id: 'betfocus',
    name: 'BetFocus',
    aliases: ['BETFOCUS', 'BET FOCUS', 'PUNTERSTECH'],
    website: 'https://www.betfocus.com.au',
    isExchange: false,
  },
  {
    id: 'betzooka',
    name: 'Betzooka',
    aliases: ['BETZOOKA', 'PUNTERSTECH'],
    website: 'https://betzooka.com.au',
    isExchange: false,
  },
  {
    id: 'betblitz',
    name: 'BetBlitz',
    aliases: ['BETBLITZ', 'BET BLITZ', 'PUNTERSTECH'],
    website: 'https://www.betblitz.com.au',
    isExchange: false,
  },
  {
    id: 'topbet',
    name: 'TopBet',
    aliases: ['TOPBET', 'TOP BET', 'PUNTERSTECH'],
    website: 'https://www.topbet.au',
    isExchange: false,
  },
  {
    id: 'betreal',
    name: 'BetReal',
    aliases: ['BETREAL', 'BET REAL', 'PUNTERSTECH'],
    website: 'https://www.betreal.com.au',
    isExchange: false,
  },
  {
    id: 'teambet',
    name: 'TeamBet',
    aliases: ['TEAMBET', 'TEAM BET', 'PUNTERSTECH'],
    website: 'https://www.teambet.com.au',
    isExchange: false,
  },
  {
    id: 'ripperbet',
    name: 'RipperBet',
    aliases: ['RIPPERBET', 'RIPPER BET', 'PUNTERSTECH'],
    website: 'https://www.ripperbet.au',
    isExchange: false,
  },
  {
    id: 'betdragon',
    name: 'BetDragon',
    aliases: ['BETDRAGON', 'BET DRAGON', 'PUNTERSTECH'],
    linkedBookies: ['mintsports'],
    website: 'https://www.betdragon.au',
    isExchange: false,
  },
  {
    id: 'cashcage',
    name: 'Cash Cage',
    aliases: ['CASHCAGE', 'CASH CAGE', 'PUNTERSTECH'],
    website: 'https://www.cashcage.com.au',
    isExchange: false,
  },
  {
    id: 'pandabet',
    name: 'PandaBet',
    aliases: ['PANDABET', 'PANDA BET', 'PUNTERSTECH'],
    website: 'https://www.pandabet.com.au',
    isExchange: false,
  },

  // ============================================================================
  // BET CLOUD PLATFORM
  // ============================================================================
  {
    id: 'sterlingparker',
    name: 'Sterling Parker',
    aliases: ['STERLINGPARKER', 'STERLING PARKER', 'BET CLOUD'],
    website: 'https://sterlingparker.com.au',
    isExchange: false,
  },
  {
    id: 'goldenrush',
    name: 'GoldenRush',
    aliases: ['GOLDENRUSH', 'GOLDEN RUSH', 'BET CLOUD'],
    website: 'https://goldenrush.com.au',
    isExchange: false,
  },
  {
    id: 'buffalobet',
    name: 'BuffaloBet',
    aliases: ['BUFFALOBET', 'BUFFALO BET', 'BET CLOUD'],
    website: 'https://buffalobet.com.au',
    isExchange: false,
  },
  {
    id: 'puntgenie',
    name: 'PuntGenie',
    aliases: ['PUNTGENIE', 'PUNT GENIE', 'BET CLOUD'],
    website: 'https://puntgenie.com.au',
    isExchange: false,
  },
  {
    id: 'wellbet',
    name: 'WellBet',
    aliases: ['WELLBET', 'WELL BET', 'BET CLOUD'],
    website: 'https://wellbet.com.au',
    isExchange: false,
  },
  {
    id: 'betgalaxy',
    name: 'BetGalaxy',
    aliases: ['BETGALAXY', 'BET GALAXY', 'BET CLOUD'],
    website: 'https://betgalaxy.com.au',
    isExchange: false,
  },
  {
    id: 'questbet',
    name: 'Questbet',
    aliases: ['QUESTBET', 'QUEST BET', 'BET CLOUD'],
    website: 'https://questbet.com.au',
    isExchange: false,
  },
  {
    id: 'betroyale',
    name: 'BetRoyale',
    aliases: ['BETROYALE', 'BET ROYALE', 'BET CLOUD'],
    website: 'https://betroyale.com.au',
    isExchange: false,
  },
  {
    id: 'junglebet',
    name: 'JungleBet',
    aliases: ['JUNGLEBET', 'JUNGLE BET', 'BET CLOUD'],
    linkedBookies: ['wishbet', 'puntcity'],
    website: 'https://junglebet.com.au',
    isExchange: false,
  },
  {
    id: 'volcanobet',
    name: 'VolcanoBet',
    aliases: ['VOLCANOBET', 'VOLCANO BET', 'BET CLOUD'],
    website: 'https://volcanobet.com.au',
    isExchange: false,
  },
  {
    id: 'vikingbet',
    name: 'VikingBet',
    aliases: ['VIKINGBET', 'VIKING BET', 'BET CLOUD'],
    website: 'https://vikingbet.com.au',
    isExchange: false,
  },
  {
    id: 'fiestabet',
    name: 'FiestaBet',
    aliases: ['FIESTABET', 'FIESTA BET', 'BET CLOUD'],
    website: 'https://fiestabet.com.au',
    isExchange: false,
  },
  {
    id: 'betstride',
    name: 'BetStride',
    aliases: ['BETSTRIDE', 'BET STRIDE', 'BET CLOUD'],
    website: 'https://betstride.com.au',
    isExchange: false,
  },
  {
    id: 'betprofessor',
    name: 'BetProfessor',
    aliases: ['BETPROFESSOR', 'BET PROFESSOR', 'BET CLOUD'],
    website: 'https://betprofessor.com.au',
    isExchange: false,
  },
  {
    id: 'oldgill',
    name: 'OldGill',
    aliases: ['OLDGILL', 'OLD GILL', 'BET CLOUD'],
    website: 'https://oldgill.com.au',
    isExchange: false,
  },
  {
    id: 'bet777',
    name: 'Bet777',
    aliases: ['BET777', 'BET 777', 'BET CLOUD'],
    website: 'https://bet777.com.au',
    isExchange: false,
  },
  {
    id: 'goldenbet888',
    name: 'GoldenBet888',
    aliases: ['GOLDENBET888', 'GOLDEN BET 888', 'BET CLOUD'],
    website: 'https://goldenbet888.com.au',
    isExchange: false,
  },
  {
    id: 'slambet',
    name: 'SlamBet',
    aliases: ['SLAMBET', 'SLAM BET', 'BET CLOUD'],
    website: 'https://slambet.com.au',
    isExchange: false,
  },
  {
    id: 'templebet',
    name: 'TempleBet',
    aliases: ['TEMPLEBET', 'TEMPLE BET', 'BET CLOUD'],
    website: 'https://templebet.com.au',
    isExchange: false,
  },
  {
    id: 'sugarcastle',
    name: 'SugarCastle',
    aliases: ['SUGARCASTLE', 'SUGAR CASTLE', 'BET CLOUD'],
    website: 'https://sugarcastle.com.au',
    isExchange: false,
  },
  {
    id: 'chromabet',
    name: 'ChromaBet',
    aliases: ['CHROMABET', 'CHROMA BET', 'BET CLOUD'],
    website: 'https://chromabet.com.au',
    isExchange: false,
  },
  {
    id: 'bet575',
    name: 'Bet575',
    aliases: ['BET575', 'BET 575', 'BET CLOUD'],
    website: 'https://bet575.com.au',
    isExchange: false,
  },
  {
    id: 'titanbet',
    name: 'TitanBet',
    aliases: ['TITANBET', 'TITAN BET', 'BET CLOUD'],
    website: 'https://titanbet.com.au',
    isExchange: false,
  },
  {
    id: 'juicybet',
    name: 'JuicyBet',
    aliases: ['JUICYBET', 'JUICY BET', 'BET CLOUD'],
    website: 'https://juicybet.com.au',
    isExchange: false,
  },
  {
    id: 'puntcity',
    name: 'PuntCity',
    aliases: ['PUNTCITY', 'PUNT CITY', 'BET CLOUD'],
    linkedBookies: ['wishbet', 'junglebet'],
    website: 'https://puntcity.com.au',
    isExchange: false,
  },
  {
    id: 'betbetbet',
    name: 'BetBetBet',
    aliases: ['BETBETBET', 'BET BET BET', 'BET CLOUD'],
    linkedBookies: ['jimmybet'],
    website: 'https://www.betbetbet.net.au',
    isExchange: false,
  },
  {
    id: 'jimmybet',
    name: 'JimmyBet',
    aliases: ['JIMMYBET', 'JIMMY BET', 'BET CLOUD'],
    linkedBookies: ['betbetbet'],
    website: 'https://www.jimmybet.com.au',
    isExchange: false,
  },
  {
    id: 'gigabet',
    name: 'GigaBet',
    aliases: ['GIGABET', 'GIGA BET', 'BET CLOUD'],
    website: 'https://gigabet.com.au',
    isExchange: false,
  },

  // ============================================================================
  // OTHER / MISC PLATFORMS
  // ============================================================================
  {
    id: 'premiumbet',
    name: 'PremiumBet',
    aliases: ['PREMIUMBET', 'PREMIUM BET', 'BETMAKERS'],
    linkedBookies: ['bet66'],
    website: 'https://www.premiumbet.com.au',
    isExchange: false,
  },
  {
    id: 'bet66',
    name: 'Bet66',
    aliases: ['BET66', 'BET 66', 'BETMAKERS'],
    linkedBookies: ['premiumbet'],
    website: 'https://bet66.com.au',
    isExchange: false,
  },
  {
    id: 'betyoucan',
    name: 'BetYouCan',
    aliases: ['BETYOUCAN', 'BET YOU CAN', 'BETMAKERS'],
    website: 'https://betyoucan.au',
    isExchange: false,
  },
  {
    id: 'hotbet',
    name: 'HotBet',
    aliases: ['HOTBET', 'HOT BET', 'GEN WEB'],
    website: 'https://www.hotbet.com.au',
    isExchange: false,
  },
  {
    id: 'blondebet',
    name: 'BlondeBet',
    aliases: ['BLONDEBET', 'BLONDE BET', 'PUNTERSTECH'],
    website: 'https://www.blondebet.com.au',
    isExchange: false,
  },
  {
    id: 'havabet',
    name: 'HavaBet',
    aliases: ['HAVABET', 'HAVA BET', 'GEN WEB'],
    website: 'https://havabet.com.au',
    isExchange: false,
  },
  {
    id: 'bossbet',
    name: 'BossBet',
    aliases: ['BOSSBET', 'BOSS BET', 'BETMAKERS'],
    website: 'https://bossbet.com.au',
    isExchange: false,
  },
  {
    id: 'betgold',
    name: 'BetGold',
    aliases: ['BETGOLD', 'BET GOLD', 'BETMAKERS'],
    website: 'https://betgold.com.au',
    isExchange: false,
  },
  {
    id: 'xbet',
    name: 'XBet',
    aliases: ['XBET', 'X BET'],
    isExchange: false,
  },
  {
    id: 'betkings',
    name: 'BetKings',
    aliases: ['BETKINGS', 'BET KINGS'],
    website: 'https://www.betkings.com.au',
    isExchange: false,
  },
  {
    id: 'bearbet',
    name: 'BearBet',
    aliases: ['BEARBET', 'BEAR BET'],
    website: 'https://www.bearbet.com.au',
    isExchange: false,
  },
  {
    id: 'betmax',
    name: 'BetMax',
    aliases: ['BETMAX', 'BET MAX'],
    website: 'https://www.betmax.com.au',
    isExchange: false,
  },
  {
    id: 'dashbet',
    name: 'DashBet',
    aliases: ['DASHBET', 'DASH BET'],
    linkedBookies: ['puntzone'],
    website: 'https://www.dashbet.com.au',
    isExchange: false,
  },
  {
    id: 'allbets',
    name: 'AllBets',
    aliases: ['ALLBETS', 'ALL BETS'],
    website: 'https://allbets.com.au',
    isExchange: false,
  },
  {
    id: 'ninjabet',
    name: 'NinjaBet',
    aliases: ['NINJABET', 'NINJA BET'],
    website: 'https://www.ninjabet.com.au',
    isExchange: false,
  },
  {
    id: 'grsbet',
    name: 'GRSBet',
    aliases: ['GRSBET', 'GRS BET'],
    website: 'https://www.grsbet.com.au',
    isExchange: false,
  },
  {
    id: 'boostbet',
    name: 'BoostBet',
    aliases: ['BOOSTBET', 'BOOST BET'],
    website: 'https://www.boostbet.com.au',
    isExchange: false,
  },
  {
    id: 'puntondogs',
    name: 'PuntOnDogs',
    aliases: ['PUNTONDOGS', 'PUNT ON DOGS'],
    website: 'https://www.puntondogs.com.au',
    isExchange: false,
  },
  {
    id: 'betplay',
    name: 'BetPlay',
    aliases: ['BETPLAY', 'BET PLAY', 'WINNERS'],
    linkedBookies: ['bet123', 'favbet'],
    website: 'https://www.betplay.com.au',
    isExchange: false,
  },
  {
    id: 'favbet',
    name: 'FavBet',
    aliases: ['FAVBET', 'FAV BET', 'WINNERS'],
    linkedBookies: ['betplay', 'bet123'],
    website: 'https://www.favbet.com.au',
    isExchange: false,
  },
  {
    id: 'bet123',
    name: '123Bet',
    aliases: ['123BET', '123 BET', 'WINNERS'],
    linkedBookies: ['betplay', 'favbet'],
    website: 'https://www.123bet.com.au',
    isExchange: false,
  },
]

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get bookie by ID
 */
export function getBookieById(id: string): BookieDefinition | undefined {
  return BOOKIE_DEFINITIONS.find(b => b.id === id)
}

/**
 * Get bookie by name (case-insensitive)
 */
export function getBookieByName(name: string): BookieDefinition | undefined {
  const normalized = name.toLowerCase()
  return BOOKIE_DEFINITIONS.find(b => b.name.toLowerCase() === normalized)
}

/**
 * Get all exchange bookies
 */
export function getExchangeBookies(): BookieDefinition[] {
  return BOOKIE_DEFINITIONS.filter(b => b.isExchange)
}

/**
 * Get all regular (non-exchange) bookies
 */
export function getRegularBookies(): BookieDefinition[] {
  return BOOKIE_DEFINITIONS.filter(b => !b.isExchange)
}

/**
 * Get all bookie names for autocomplete
 */
export function getAllBookieNames(): string[] {
  return BOOKIE_DEFINITIONS.map(b => b.name).sort()
}

/**
 * Get bookie count
 */
export function getBookieCount(): number {
  return BOOKIE_DEFINITIONS.length
}
