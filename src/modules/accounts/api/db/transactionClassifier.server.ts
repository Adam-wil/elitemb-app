/**
 * Transaction Classifier Service - Gemini AI Classification
 *
 * 3-step AI classification for bank transactions using Gemini 2.0 Flash:
 * 1. Is this gambling-related?
 * 2. Which bookie/exchange is this?
 * 3. Cross-reference with correction patterns (if confidence < 0.9)
 *
 * Falls back to fuzzy matching if Gemini unavailable.
 *
 * DO NOT use 'use server' directive - TanStack Start handles this via createServerFn()
 *
 * @see Story 4.8: AI-Powered Bookie Transaction Classification
 */

import { createServerFn } from '@tanstack/react-start'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { detectBookie } from '../../utils/bookieDetection'

// Dynamic import helper - prevents prisma from being bundled for client
async function getPrisma() {
  const { default: prisma } = await import('@/lib/prisma.server')
  return prisma
}
import type { ClassificationStatus } from '@prisma/client'

// ============================================================================
// Types
// ============================================================================

export interface TransactionInput {
  description: string
  amount: number
  direction: 'credit' | 'debit'
  institution?: string
  profileId?: string
}

export interface Step1Result {
  isGambling: boolean
  confidence: number
  reasoning: string
}

export interface Step2Result {
  bookieId: number | null
  bookieName: string | null
  isExchange: boolean
  confidence: number
  reasoning: string
}

export interface ClassificationResult {
  bookieId: number | null
  bookieName: string | null
  isExchange: boolean
  confidence: number
  reasoning: string
  status: ClassificationStatus
}

interface BookieContext {
  id: number
  name: string
  aliases: string[]
  isExchange: boolean
}

interface CorrectionPattern {
  descriptionPattern: string
  correctedBookieName: string
  occurrences: number
}

/**
 * Serialized BankTransactionClassification for TanStack Start RPC
 * Converts Prisma Decimal to number (Decimal has methods that can't be serialized)
 */
interface SerializedClassification {
  id: string
  profileId: string
  basiqTransactionId: string
  description: string
  amount: number
  direction: string
  transactionDate: Date
  institution: string | null
  classifiedBookieId: number | null
  classifiedBookieName: string | null
  isExchange: boolean
  confidence: number
  aiReasoning: string | null
  status: ClassificationStatus
  userCorrectedBookieId: number | null
  correctedAt: Date | null
  journalEntryId: string | null
  createdAt: Date
  updatedAt: Date
}

interface SerializedClassificationWithBookie extends SerializedClassification {
  ClassifiedBookie: {
    id: number
    name: string
    isExchange: boolean
  } | null
}

/**
 * Convert Prisma BankTransactionClassification to serializable format
 */
function serializeClassification<T extends { amount: { toNumber: () => number } }>(
  classification: T
): Omit<T, 'amount'> & { amount: number } {
  return {
    ...classification,
    amount: classification.amount.toNumber(),
  }
}

// ============================================================================
// Gemini Client Initialization
// ============================================================================

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set')
  }
  return new GoogleGenerativeAI(apiKey)
}

function getGeminiModel() {
  const genAI = getGeminiClient()
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
}

// ============================================================================
// Step 1: Is this gambling-related?
// ============================================================================

const STEP1_PROMPT = `You are analyzing a bank transaction to determine if it's gambling-related.

Signals that suggest gambling:
- Keywords: "bet", "wager", "gaming", "punt", "racing", "sportsbet", "tab", "betfair", "ladbrokes", "neds", "pointsbet"
- Company suffixes: "wagering", "betting", "gaming services"
- Round amounts ($50, $100, $200) are common for deposits
- Debit from bank often = deposit to gambling account

Signals that suggest NOT gambling:
- Retail purchases, utilities, subscriptions
- Payroll, government payments
- Generic merchant names without gambling keywords
- Food, entertainment, transport

Transaction to analyze:
Description: {description}
Amount: ${'{amount}'}
Direction: {direction} ({direction_explanation})
Bank: {institution}

Respond with ONLY a JSON object in this exact format:
{
  "isGambling": true or false,
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation"
}`

async function step1IsGambling(txn: TransactionInput): Promise<Step1Result> {
  const model = getGeminiModel()

  const prompt = STEP1_PROMPT
    .replace('{description}', txn.description)
    .replace('{amount}', Math.abs(txn.amount).toFixed(2))
    .replace('{direction}', txn.direction)
    .replace(
      '{direction_explanation}',
      txn.direction === 'credit' ? 'money IN to bank' : 'money OUT from bank'
    )
    .replace('{institution}', txn.institution || 'Unknown')

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse JSON from Gemini response')
  }

  return JSON.parse(jsonMatch[0]) as Step1Result
}

// ============================================================================
// Step 2: Which bookie/exchange is this?
// ============================================================================

const STEP2_PROMPT = `You are identifying which Australian betting operator this transaction belongs to.

CRITICAL: Distinguish between EXCHANGES and BOOKIES:

EXCHANGES (isExchange: true):
- Betfair: "BETFAIR", "PPB", "PADDY POWER BETFAIR", "FLUTTER", "CROWN RESORTS"
- Exchanges are where users LAY bets (bet against outcomes)
- Betfair withdrawals are the PRIMARY profit extraction point for matched bettors

REGULAR BOOKIES (isExchange: false):
- Sportsbet: "SPORTSBET", "SPORTSBET PTY", "SP BET"
- Ladbrokes: "LADBROKES", "ENTAIN", "ENTAIN GROUP"
- Neds: "NEDS", "NEDS BETTING"
- PointsBet: "POINTSBET", "POINTSBET PTY"
- TAB: "TAB", "TABCORP", "TAB BETTING", "TAB LIMITED"
- Bet365: "BET365", "HILLSIDE"
- BlueBet: "BLUEBET", "BLUE BET"
- PlayUp: "PLAYUP", "PLAY UP"
- Unibet: "UNIBET", "KINDRED"
- BetRight: "BETRIGHT", "BET RIGHT"

Bank-Specific Formatting:
- CBA: Clean format, e.g., "SPORTSBET PTY LTD"
- Westpac: Prefix, e.g., "DIRECT DEBIT SPORTSBET MELBOURNE"
- NAB: "DD -" prefix, e.g., "DD - SPORTSBET AUSTRALIA"
- ANZ: Adds location, e.g., "SPORTSBET PTY LTD MELBOURNE AU"
- ING: Transfer prefix, e.g., "Transfer to SPORTSBET"
- Up/Neobanks: May truncate, e.g., "SPORTBET P"

Common wrappers to look through:
- PayPal: "PAYPAL *SPORTSBET"
- POLi: "POLI *LADBROKES"
- Bank prefixes: "DIRECT DEBIT", "DD -", "Transfer to/from"

Previous analysis determined this IS gambling-related:
{step1_reasoning}

Transaction:
Description: {description}
Amount: ${'{amount}'}
Direction: {direction}
Bank: {institution}

Known bookies in system:
{bookie_list}

Identify the specific operator. Use the bookieId from the known bookies list.
If unsure, set bookieId to null but explain why.

Respond with ONLY a JSON object in this exact format:
{
  "bookieId": number or null,
  "bookieName": "string" or null,
  "isExchange": true or false,
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation"
}`

async function step2IdentifyBookie(
  txn: TransactionInput,
  step1Result: Step1Result,
  bookieContext: BookieContext[]
): Promise<Step2Result> {
  const model = getGeminiModel()

  // Build bookie context string with IDs
  const bookieList = bookieContext
    .map((b) => `- ${b.name} (id: ${b.id}, isExchange: ${b.isExchange}): ${b.aliases.join(', ')}`)
    .join('\n')

  const prompt = STEP2_PROMPT
    .replace('{step1_reasoning}', step1Result.reasoning)
    .replace('{description}', txn.description)
    .replace('{amount}', Math.abs(txn.amount).toFixed(2))
    .replace('{direction}', txn.direction)
    .replace('{institution}', txn.institution || 'Unknown')
    .replace('{bookie_list}', bookieList || 'No bookies in system yet')

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse JSON from Gemini response')
  }

  return JSON.parse(jsonMatch[0]) as Step2Result
}

// ============================================================================
// Step 3: Cross-reference with corrections (only if Step 2 confidence < 0.9)
// ============================================================================

const STEP3_PROMPT = `You are making a final classification decision using all available context.

Previous analysis:
Step 1 (Is gambling?): {step1_reasoning}
Step 2 (Which bookie?): {step2_reasoning}
Step 2 suggested: {step2_bookie} with {step2_confidence}% confidence

User correction history for similar transactions:
{correction_patterns}

Transaction:
Description: {description}
Amount: ${'{amount}'}

Based on ALL context, make your final decision. User corrections are highly reliable -
if a similar pattern was corrected before, trust that correction.

Known bookies in system:
{bookie_list}

Respond with ONLY a JSON object in this exact format:
{
  "bookieId": number or null,
  "bookieName": "string" or null,
  "isExchange": true or false,
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation"
}`

async function step3CrossReference(
  txn: TransactionInput,
  step1Result: Step1Result,
  step2Result: Step2Result,
  correctionPatterns: CorrectionPattern[],
  bookieContext: BookieContext[]
): Promise<Step2Result> {
  const model = getGeminiModel()

  const patternsText =
    correctionPatterns.length > 0
      ? correctionPatterns
          .map((p) => `- "${p.descriptionPattern}" -> ${p.correctedBookieName} (used ${p.occurrences}x)`)
          .join('\n')
      : 'No previous corrections found for similar patterns.'

  const bookieList = bookieContext
    .map((b) => `- ${b.name} (id: ${b.id}, isExchange: ${b.isExchange})`)
    .join('\n')

  const prompt = STEP3_PROMPT
    .replace('{step1_reasoning}', step1Result.reasoning)
    .replace('{step2_reasoning}', step2Result.reasoning)
    .replace('{step2_bookie}', step2Result.bookieName || 'Unknown')
    .replace('{step2_confidence}', (step2Result.confidence * 100).toFixed(0))
    .replace('{correction_patterns}', patternsText)
    .replace('{description}', txn.description)
    .replace('{amount}', Math.abs(txn.amount).toFixed(2))
    .replace('{bookie_list}', bookieList || 'No bookies in system yet')

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse JSON from Gemini response')
  }

  return JSON.parse(jsonMatch[0]) as Step2Result
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get bookie context from database for AI prompts
 */
async function getBookieContext(): Promise<BookieContext[]> {
  const prisma = await getPrisma()
  const bookies = await prisma.bookie.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      normalizedName: true,
      isExchange: true,
    },
  })

  // Build aliases from bookie name and normalized name
  return bookies.map((b) => ({
    id: b.id,
    name: b.name,
    aliases: [b.name, b.normalizedName].filter(Boolean),
    isExchange: b.isExchange,
  }))
}

/**
 * Find matching correction patterns using simple text matching
 * (Full-text search will be implemented in Task 10)
 */
async function findMatchingPatterns(
  profileId: string | undefined,
  description: string
): Promise<CorrectionPattern[]> {
  // For now, return empty - will be implemented with CorrectionPattern table in Task 10
  // This is a placeholder that allows the 3-step flow to work
  return []
}

/**
 * Determine classification status based on confidence
 */
function determineStatus(confidence: number, isGambling: boolean): ClassificationStatus {
  if (!isGambling) {
    return 'IGNORED'
  }
  if (confidence >= 0.9) {
    return 'AUTO_JOURNALED'
  }
  return 'PENDING_REVIEW'
}

// ============================================================================
// Main Classification Function (3-Step Chain)
// ============================================================================

/**
 * Core classification logic - can be called directly from scripts
 * This is the isomorphic version that doesn't require TanStack runtime
 */
export async function classifyTransactionCore(
  data: TransactionInput
): Promise<ClassificationResult> {
  try {
    // Check if Gemini API key is available
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not set, falling back to fuzzy matching')
      return fallbackToFuzzyMatching(data)
    }

    // Step 1: Is this gambling-related?
    const step1 = await step1IsGambling(data)

    if (!step1.isGambling || step1.confidence < 0.5) {
      return {
        bookieId: null,
        bookieName: null,
        isExchange: false,
        confidence: step1.confidence,
        reasoning: `Not gambling: ${step1.reasoning}`,
        status: 'IGNORED',
      }
    }

    // Get bookie context from database
    const bookieContext = await getBookieContext()

    // Step 2: Which bookie/exchange?
    const step2 = await step2IdentifyBookie(data, step1, bookieContext)

    // If high confidence, skip Step 3
    if (step2.confidence >= 0.9) {
      return {
        bookieId: step2.bookieId,
        bookieName: step2.bookieName,
        isExchange: step2.isExchange,
        confidence: step2.confidence,
        reasoning: step2.reasoning,
        status: 'AUTO_JOURNALED',
      }
    }

    // Step 3: Cross-reference with correction patterns
    const patterns = await findMatchingPatterns(data.profileId, data.description)
    const step3 = await step3CrossReference(data, step1, step2, patterns, bookieContext)

    return {
      bookieId: step3.bookieId,
      bookieName: step3.bookieName,
      isExchange: step3.isExchange,
      confidence: step3.confidence,
      reasoning: step3.reasoning,
      status: determineStatus(step3.confidence, true),
    }
  } catch (error) {
    // Fallback to fuzzy matching if Gemini fails
    console.error('Gemini classification failed, falling back to fuzzy:', error)
    return fallbackToFuzzyMatching(data)
  }
}

/**
 * Classify a single transaction using 3-step AI reasoning
 * TanStack server function wrapper for client-side calls
 */
export const classifyTransaction = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      description: string
      amount: number
      direction: 'credit' | 'debit'
      institution?: string
      profileId?: string
    }) => input
  )
  .handler(async ({ data }): Promise<ClassificationResult> => {
    return classifyTransactionCore(data)
  })

/**
 * Fallback to fuzzy matching when AI is unavailable
 */
function fallbackToFuzzyMatching(data: TransactionInput): ClassificationResult {
  const fuzzyResult = detectBookie(data.description)

  // Convert string bookieId to number if present
  const bookieId = fuzzyResult.bookieId ? parseInt(fuzzyResult.bookieId, 10) : null

  return {
    bookieId: isNaN(bookieId as number) ? null : bookieId,
    bookieName: fuzzyResult.bookieName,
    isExchange: fuzzyResult.isExchange,
    confidence: fuzzyResult.confidence,
    reasoning: 'Fallback: Fuzzy matching (AI unavailable)',
    status: 'PENDING_REVIEW', // Always review fallback results
  }
}

// ============================================================================
// Batch Classification
// ============================================================================

export interface BatchClassificationInput {
  transactions: Array<{
    id: string
    description: string
    amount: number
    direction: 'credit' | 'debit'
    institution?: string
  }>
  profileId: string
}

export interface BatchClassificationResult {
  results: Array<{
    transactionId: string
    classification: ClassificationResult
  }>
  processedCount: number
  errorCount: number
}

/**
 * Classify multiple transactions
 * Processes each transaction individually through the 3-step chain
 */
export const classifyTransactionsBatch = createServerFn({ method: 'POST' })
  .inputValidator((input: BatchClassificationInput) => input)
  .handler(async ({ data }): Promise<BatchClassificationResult> => {
    const results: BatchClassificationResult['results'] = []
    let errorCount = 0

    for (const txn of data.transactions) {
      try {
        const classification = await classifyTransaction({
          data: {
            description: txn.description,
            amount: txn.amount,
            direction: txn.direction,
            institution: txn.institution,
            profileId: data.profileId,
          },
        })

        results.push({
          transactionId: txn.id,
          classification,
        })
      } catch (error) {
        console.error(`Failed to classify transaction ${txn.id}:`, error)
        errorCount++

        // Add fallback result
        results.push({
          transactionId: txn.id,
          classification: fallbackToFuzzyMatching({
            description: txn.description,
            amount: txn.amount,
            direction: txn.direction,
            institution: txn.institution,
          }),
        })
      }
    }

    return {
      results,
      processedCount: data.transactions.length,
      errorCount,
    }
  })

// ============================================================================
// Store Classification Result
// ============================================================================

export interface StoreClassificationInput {
  profileId: string
  basiqTransactionId: string
  description: string
  amount: number
  direction: 'credit' | 'debit'
  transactionDate: Date
  institution?: string
  classification: ClassificationResult
}

/**
 * Store a classification result in the database
 */
export const storeClassification = createServerFn({ method: 'POST' })
  .inputValidator((input: StoreClassificationInput) => input)
  .handler(async ({ data }): Promise<SerializedClassification> => {
    const prisma = await getPrisma()
    const classification = await prisma.bankTransactionClassification.create({
      data: {
        profileId: data.profileId,
        basiqTransactionId: data.basiqTransactionId,
        description: data.description,
        amount: data.amount,
        direction: data.direction,
        transactionDate: data.transactionDate,
        institution: data.institution,
        classifiedBookieId: data.classification.bookieId,
        classifiedBookieName: data.classification.bookieName,
        isExchange: data.classification.isExchange,
        confidence: data.classification.confidence,
        aiReasoning: data.classification.reasoning,
        status: data.classification.status,
      },
    })

    return serializeClassification(classification)
  })

// ============================================================================
// Get Pending Reviews
// ============================================================================

/**
 * Get transactions pending review for a profile
 */
export const getPendingReviews = createServerFn({ method: 'GET' })
  .inputValidator((input: { profileId: string; limit?: number }) => input)
  .handler(async ({ data }): Promise<SerializedClassificationWithBookie[]> => {
    const prisma = await getPrisma()
    const classifications = await prisma.bankTransactionClassification.findMany({
      where: {
        profileId: data.profileId,
        status: 'PENDING_REVIEW',
      },
      orderBy: { transactionDate: 'desc' },
      take: data.limit || 50,
      include: {
        ClassifiedBookie: {
          select: { id: true, name: true, isExchange: true },
        },
      },
    })

    return classifications.map((c) => serializeClassification(c)) as SerializedClassificationWithBookie[]
  })

/**
 * Get count of pending reviews for a profile
 */
export const getPendingReviewCount = createServerFn({ method: 'GET' })
  .inputValidator((input: { profileId: string }) => input)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const count = await prisma.bankTransactionClassification.count({
      where: {
        profileId: data.profileId,
        status: 'PENDING_REVIEW',
      },
    })

    return { count }
  })

// ============================================================================
// Basiq Sync Integration
// ============================================================================

export interface ProcessTransactionsInput {
  profileId: string
  transactions: Array<{
    id: string
    description: string
    amount: string
    direction: 'credit' | 'debit'
    transactionDate: string
    institution: string
  }>
}

export interface ProcessTransactionsResult {
  processed: number
  skipped: number
  classified: number
  autoJournaled: number
  pendingReview: number
  ignored: number
  errors: number
}

/**
 * Process Basiq transactions through AI classification
 *
 * This is the main integration point for Basiq sync.
 * - Skips transactions that are already classified (idempotent)
 * - Classifies new transactions using the 3-step AI chain
 * - Stores classification results in the database
 * - Auto-journals high-confidence classifications (>= 0.9)
 *
 * Call this after fetching transactions from Basiq.
 */
export const processBasiqTransactions = createServerFn({ method: 'POST' })
  .inputValidator((input: ProcessTransactionsInput) => input)
  .handler(async ({ data }): Promise<ProcessTransactionsResult> => {
    const prisma = await getPrisma()
    const result: ProcessTransactionsResult = {
      processed: 0,
      skipped: 0,
      classified: 0,
      autoJournaled: 0,
      pendingReview: 0,
      ignored: 0,
      errors: 0,
    }

    // Get existing classifications to skip already-processed transactions
    const existingIds = await prisma.bankTransactionClassification.findMany({
      where: {
        profileId: data.profileId,
        basiqTransactionId: { in: data.transactions.map((t) => t.id) },
      },
      select: { basiqTransactionId: true },
    })

    const existingIdSet = new Set(existingIds.map((e) => e.basiqTransactionId))

    // Filter to only new transactions
    const newTransactions = data.transactions.filter((t) => !existingIdSet.has(t.id))
    result.skipped = data.transactions.length - newTransactions.length

    // Process each new transaction
    for (const txn of newTransactions) {
      result.processed++

      try {
        // Classify the transaction
        const classification = await classifyTransaction({
          data: {
            description: txn.description,
            amount: parseFloat(txn.amount),
            direction: txn.direction,
            institution: txn.institution,
            profileId: data.profileId,
          },
        })

        // Store the classification initially
        const classificationRecord = await prisma.bankTransactionClassification.create({
          data: {
            profileId: data.profileId,
            basiqTransactionId: txn.id,
            description: txn.description,
            amount: parseFloat(txn.amount),
            direction: txn.direction,
            transactionDate: new Date(txn.transactionDate),
            institution: txn.institution,
            classifiedBookieId: classification.bookieId,
            classifiedBookieName: classification.bookieName,
            isExchange: classification.isExchange,
            confidence: classification.confidence,
            aiReasoning: classification.reasoning,
            status: classification.status,
          },
        })

        result.classified++

        // Track status counts and auto-journal if high confidence
        if (classification.status === 'AUTO_JOURNALED' && classification.bookieId) {
          try {
            // Auto-journal: Create bank transaction journal entry
            const journalResult = await autoJournalClassification({
              classificationId: classificationRecord.id,
              profileId: data.profileId,
              bookieId: classification.bookieId,
              isExchange: classification.isExchange,
              amount: Math.abs(parseFloat(txn.amount)),
              direction: txn.direction,
              transactionDate: txn.transactionDate,
              basiqTransactionId: txn.id,
              description: txn.description,
              institution: txn.institution,
            })

            if (journalResult.success) {
              result.autoJournaled++
            } else {
              // Failed to journal - downgrade to pending review
              await prisma.bankTransactionClassification.update({
                where: { id: classificationRecord.id },
                data: { status: 'PENDING_REVIEW' },
              })
              result.pendingReview++
            }
          } catch (journalError) {
            console.error(`Failed to auto-journal transaction ${txn.id}:`, journalError)
            // Downgrade to pending review on error
            await prisma.bankTransactionClassification.update({
              where: { id: classificationRecord.id },
              data: { status: 'PENDING_REVIEW' },
            })
            result.pendingReview++
          }
        } else if (classification.status === 'PENDING_REVIEW') {
          result.pendingReview++
        } else if (classification.status === 'IGNORED') {
          result.ignored++
        }
      } catch (error) {
        console.error(`Failed to classify transaction ${txn.id}:`, error)
        result.errors++
      }
    }

    return result
  })

// ============================================================================
// Auto-Journaling Helper
// ============================================================================

interface AutoJournalInput {
  classificationId: string
  profileId: string
  bookieId: number
  isExchange: boolean
  amount: number
  direction: 'credit' | 'debit'
  transactionDate: string
  basiqTransactionId: string
  description: string
  institution?: string
}

interface AutoJournalResult {
  success: boolean
  journalEntryId?: string
  error?: string
}

/**
 * Create a journal entry for a high-confidence classification
 *
 * Direction logic:
 * - credit (money IN to bank) from bookie = WITHDRAWAL from bookie
 * - debit (money OUT from bank) to bookie = DEPOSIT to bookie
 *
 * For exchanges (Betfair):
 * - Uses recordBetfairTransaction instead of recordBankTransaction
 */
async function autoJournalClassification(input: AutoJournalInput): Promise<AutoJournalResult> {
  const prisma = await getPrisma()
  const {
    classificationId,
    profileId,
    bookieId,
    isExchange,
    amount,
    direction,
    transactionDate,
    basiqTransactionId,
    description,
    institution,
  } = input

  try {
    // Determine transaction type based on bank perspective
    // credit = money coming INTO bank = withdrawal from bookie
    // debit = money going OUT OF bank = deposit to bookie
    const type = direction === 'credit' ? 'WITHDRAWAL' : 'DEPOSIT'

    let journalEntryId: string

    if (isExchange) {
      // Use Betfair-specific recording
      const { recordBetfairTransaction } = await import('./bankTransactionService.server')

      const result = await recordBetfairTransaction({
        data: {
          profileId,
          type,
          amount,
          bankName: institution || 'Unknown Bank',
          bankTransactionId: basiqTransactionId,
          notes: `AI classified from: ${description}`,
          entryDate: transactionDate,
        },
      })

      journalEntryId = result.journalEntry.id
    } else {
      // Use regular bookie recording
      const { recordBankTransaction } = await import('./bankTransactionService.server')

      const result = await recordBankTransaction({
        data: {
          profileId,
          type,
          bookieId,
          amount,
          bankName: institution || 'Unknown Bank',
          bankTransactionId: basiqTransactionId,
          notes: `AI classified from: ${description}`,
          entryDate: transactionDate,
        },
      })

      journalEntryId = result.journalEntry.id
    }

    // Link journal entry to classification
    await prisma.bankTransactionClassification.update({
      where: { id: classificationId },
      data: {
        journalEntryId,
        status: 'AUTO_JOURNALED',
      },
    })

    return { success: true, journalEntryId }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Auto-journal error:', errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Check if a transaction has already been classified
 */
export const isTransactionClassified = createServerFn({ method: 'GET' })
  .inputValidator((input: { basiqTransactionId: string }) => input)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const existing = await prisma.bankTransactionClassification.findUnique({
      where: { basiqTransactionId: data.basiqTransactionId },
      select: { id: true, status: true },
    })

    return {
      isClassified: !!existing,
      status: existing?.status || null,
    }
  })

/**
 * Get classification summary for a profile
 */
export const getClassificationSummary = createServerFn({ method: 'GET' })
  .inputValidator((input: { profileId: string }) => input)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const [total, pendingReview, autoJournaled, confirmed, corrected, rejected, ignored] =
      await Promise.all([
        prisma.bankTransactionClassification.count({
          where: { profileId: data.profileId },
        }),
        prisma.bankTransactionClassification.count({
          where: { profileId: data.profileId, status: 'PENDING_REVIEW' },
        }),
        prisma.bankTransactionClassification.count({
          where: { profileId: data.profileId, status: 'AUTO_JOURNALED' },
        }),
        prisma.bankTransactionClassification.count({
          where: { profileId: data.profileId, status: 'CONFIRMED' },
        }),
        prisma.bankTransactionClassification.count({
          where: { profileId: data.profileId, status: 'CORRECTED' },
        }),
        prisma.bankTransactionClassification.count({
          where: { profileId: data.profileId, status: 'REJECTED' },
        }),
        prisma.bankTransactionClassification.count({
          where: { profileId: data.profileId, status: 'IGNORED' },
        }),
      ])

    return {
      total,
      pendingReview,
      autoJournaled,
      confirmed,
      corrected,
      rejected,
      ignored,
    }
  })

// ============================================================================
// Combined Fetch and Classify (for hook integration)
// ============================================================================

import { fetchAllTransactionsServer } from '../basiq/server'

export interface FetchAndClassifyInput {
  profileId: string
  basiqUserId: string
  fromDate: string // YYYY-MM-DD
  toDate: string // YYYY-MM-DD
  accountId?: string
}

export interface FetchAndClassifyResult {
  transactionCount: number
  classificationResult: ProcessTransactionsResult
}

/**
 * Fetch transactions from Basiq and classify them
 *
 * This is the primary integration point for the Basiq sync flow.
 * It combines fetching and classification in a single server call.
 */
export const fetchAndClassifyTransactions = createServerFn({ method: 'POST' })
  .inputValidator((input: FetchAndClassifyInput) => input)
  .handler(async ({ data }): Promise<FetchAndClassifyResult> => {
    // Step 1: Fetch all transactions from Basiq
    const fetchResult = await fetchAllTransactionsServer({
      data: {
        userId: data.basiqUserId,
        fromDate: data.fromDate,
        toDate: data.toDate,
        accountId: data.accountId,
      },
    })

    // Step 2: Transform to classification input format
    const transactionsForClassification = fetchResult.transactions.map((txn) => ({
      id: txn.id,
      description: txn.description || '',
      amount: txn.amount || '0',
      direction: (parseFloat(txn.amount || '0') >= 0 ? 'credit' : 'debit') as 'credit' | 'debit',
      transactionDate: txn.postDate || txn.transactionDate || new Date().toISOString(),
      institution: txn.institution || '',
    }))

    // Step 3: Process through AI classification
    const classificationResult = await processBasiqTransactions({
      data: {
        profileId: data.profileId,
        transactions: transactionsForClassification,
      },
    })

    return {
      transactionCount: fetchResult.transactions.length,
      classificationResult,
    }
  })

// ============================================================================
// Daily Sync Job
// ============================================================================

export interface SyncDailyTransactionsInput {
  profileId: string
  basiqUserId: string
  daysToSync?: number // Default 7 days
  forceFullSync?: boolean // Ignore last sync date
}

export interface SyncDailyTransactionsResult {
  success: boolean
  fromDate: string
  toDate: string
  transactionCount: number
  classificationResult: ProcessTransactionsResult
  lastSyncDate: string
  error?: string
}

/**
 * Sync daily transactions from Basiq and classify them
 *
 * This function:
 * 1. Determines the date range based on last sync or default lookback
 * 2. Fetches transactions from Basiq for that range
 * 3. Processes through AI classification
 * 4. Records the sync timestamp
 *
 * Can be triggered manually or via scheduled job (e.g., cron).
 */
export const syncDailyTransactions = createServerFn({ method: 'POST' })
  .inputValidator((input: SyncDailyTransactionsInput) => input)
  .handler(async ({ data }): Promise<SyncDailyTransactionsResult> => {
    const prisma = await getPrisma()
    const { profileId, basiqUserId, daysToSync = 7, forceFullSync = false } = data

    try {
      // Get last sync date from most recent classification
      let fromDate: string
      const toDate = new Date().toISOString().split('T')[0] // Today

      if (forceFullSync) {
        // Full sync: go back daysToSync days
        const from = new Date()
        from.setDate(from.getDate() - daysToSync)
        fromDate = from.toISOString().split('T')[0]
      } else {
        // Incremental sync: find last classified transaction date
        const lastClassification = await prisma.bankTransactionClassification.findFirst({
          where: { profileId },
          orderBy: { transactionDate: 'desc' },
          select: { transactionDate: true },
        })

        if (lastClassification) {
          // Start from last transaction date (might have more on same day)
          fromDate = lastClassification.transactionDate.toISOString().split('T')[0]
        } else {
          // No previous classifications - use default lookback
          const from = new Date()
          from.setDate(from.getDate() - daysToSync)
          fromDate = from.toISOString().split('T')[0]
        }
      }

      // Fetch and classify
      const result = await fetchAndClassifyTransactions({
        data: {
          profileId,
          basiqUserId,
          fromDate,
          toDate,
        },
      })

      // Note: Last sync is derived from most recent classification transactionDate

      return {
        success: true,
        fromDate,
        toDate,
        transactionCount: result.transactionCount,
        classificationResult: result.classificationResult,
        lastSyncDate: new Date().toISOString(),
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Daily sync error:', errorMessage)

      return {
        success: false,
        fromDate: '',
        toDate: '',
        transactionCount: 0,
        classificationResult: {
          processed: 0,
          skipped: 0,
          classified: 0,
          autoJournaled: 0,
          pendingReview: 0,
          ignored: 0,
          errors: 0,
        },
        lastSyncDate: '',
        error: errorMessage,
      }
    }
  })

/**
 * Get last sync information for a profile
 */
export const getLastSyncInfo = createServerFn({ method: 'GET' })
  .inputValidator((input: { profileId: string }) => input)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const lastClassification = await prisma.bankTransactionClassification.findFirst({
      where: { profileId: data.profileId },
      orderBy: { createdAt: 'desc' },
      select: { transactionDate: true, createdAt: true },
    })

    return {
      lastSyncAt: lastClassification?.createdAt?.toISOString() || null,
      lastTransactionDate: lastClassification?.transactionDate?.toISOString() || null,
    }
  })

// ============================================================================
// User Actions: Confirm, Reject, Correct
// ============================================================================

/**
 * Confirm an AI classification and create journal entry
 */
export const confirmClassification = createServerFn({ method: 'POST' })
  .inputValidator((input: { classificationId: string; profileId: string }) => input)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const classification = await prisma.bankTransactionClassification.findUnique({
      where: { id: data.classificationId },
    })

    if (!classification) {
      throw new Error('Classification not found')
    }

    if (classification.profileId !== data.profileId) {
      throw new Error('Classification does not belong to this profile')
    }

    if (!classification.classifiedBookieId) {
      throw new Error('No bookie classified - cannot confirm')
    }

    // Create journal entry
    const journalResult = await autoJournalClassification({
      classificationId: classification.id,
      profileId: classification.profileId,
      bookieId: classification.classifiedBookieId,
      isExchange: classification.isExchange,
      amount: Math.abs(Number(classification.amount)),
      direction: classification.direction as 'credit' | 'debit',
      transactionDate: classification.transactionDate.toISOString(),
      basiqTransactionId: classification.basiqTransactionId,
      description: classification.description,
      institution: classification.institution || undefined,
    })

    if (!journalResult.success) {
      throw new Error(journalResult.error || 'Failed to create journal entry')
    }

    // Update status to CONFIRMED
    await prisma.bankTransactionClassification.update({
      where: { id: classification.id },
      data: {
        status: 'CONFIRMED',
        journalEntryId: journalResult.journalEntryId,
      },
    })

    return { success: true, journalEntryId: journalResult.journalEntryId }
  })

/**
 * Reject a classification (mark as non-bookie transaction)
 */
export const rejectClassification = createServerFn({ method: 'POST' })
  .inputValidator((input: { classificationId: string; profileId: string }) => input)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const classification = await prisma.bankTransactionClassification.findUnique({
      where: { id: data.classificationId },
    })

    if (!classification) {
      throw new Error('Classification not found')
    }

    if (classification.profileId !== data.profileId) {
      throw new Error('Classification does not belong to this profile')
    }

    // Update status to REJECTED
    await prisma.bankTransactionClassification.update({
      where: { id: classification.id },
      data: { status: 'REJECTED' },
    })

    return { success: true }
  })

/**
 * Correct a classification with a different bookie
 */
export const correctClassification = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { classificationId: string; profileId: string; bookieId: number }) => input
  )
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const classification = await prisma.bankTransactionClassification.findUnique({
      where: { id: data.classificationId },
    })

    if (!classification) {
      throw new Error('Classification not found')
    }

    if (classification.profileId !== data.profileId) {
      throw new Error('Classification does not belong to this profile')
    }

    // Get bookie info
    const bookie = await prisma.bookie.findUnique({
      where: { id: data.bookieId },
    })

    if (!bookie) {
      throw new Error('Bookie not found')
    }

    // Create journal entry with corrected bookie
    const journalResult = await autoJournalClassification({
      classificationId: classification.id,
      profileId: classification.profileId,
      bookieId: data.bookieId,
      isExchange: bookie.isExchange,
      amount: Math.abs(Number(classification.amount)),
      direction: classification.direction as 'credit' | 'debit',
      transactionDate: classification.transactionDate.toISOString(),
      basiqTransactionId: classification.basiqTransactionId,
      description: classification.description,
      institution: classification.institution || undefined,
    })

    if (!journalResult.success) {
      throw new Error(journalResult.error || 'Failed to create journal entry')
    }

    // Update classification with correction
    await prisma.bankTransactionClassification.update({
      where: { id: classification.id },
      data: {
        status: 'CORRECTED',
        userCorrectedBookieId: data.bookieId,
        correctedAt: new Date(),
        journalEntryId: journalResult.journalEntryId,
      },
    })

    return { success: true, journalEntryId: journalResult.journalEntryId }
  })
