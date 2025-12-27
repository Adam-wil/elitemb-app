/**
 * The Stable - Bonus Storage Utilities
 * Handles localStorage operations for bonus data
 */

import dayjs from 'dayjs'
import type { Bonus, StableSummary } from '../types'

const STORAGE_KEY = 'the-stable-bonuses'

/**
 * Get all bonuses from storage
 */
export function getAllBonuses(): Bonus[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    return JSON.parse(data) as Bonus[]
  } catch (error) {
    console.error('[TheStable] Error reading bonuses from storage:', error)
    return []
  }
}

/**
 * Save all bonuses to storage
 */
export function saveBonuses(bonuses: Bonus[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bonuses))
  } catch (error) {
    console.error('[TheStable] Error saving bonuses to storage:', error)
  }
}

/**
 * Add a new bonus
 */
export function addBonus(bonus: Bonus): void {
  const bonuses = getAllBonuses()
  bonuses.push(bonus)
  saveBonuses(bonuses)
}

/**
 * Update an existing bonus
 */
export function updateBonus(id: string, updates: Partial<Bonus>): Bonus | null {
  const bonuses = getAllBonuses()
  const index = bonuses.findIndex((b) => b.id === id)
  if (index === -1) return null

  bonuses[index] = { ...bonuses[index], ...updates }
  saveBonuses(bonuses)
  return bonuses[index]
}

/**
 * Delete a bonus
 */
export function deleteBonus(id: string): boolean {
  const bonuses = getAllBonuses()
  const filtered = bonuses.filter((b) => b.id !== id)
  if (filtered.length === bonuses.length) return false

  saveBonuses(filtered)
  return true
}

/**
 * Get a single bonus by ID
 */
export function getBonusById(id: string): Bonus | null {
  const bonuses = getAllBonuses()
  return bonuses.find((b) => b.id === id) || null
}

/**
 * Get bonuses by status
 */
export function getBonusesByStatus(status: Bonus['status']): Bonus[] {
  return getAllBonuses().filter((b) => b.status === status)
}

/**
 * Get bonuses expiring within N days
 */
export function getBonusesExpiringWithin(days: number): Bonus[] {
  const cutoff = dayjs().add(days, 'day').format('YYYY-MM-DD')
  const today = dayjs().format('YYYY-MM-DD')

  return getAllBonuses().filter((b) => {
    return b.status === 'pending' && b.expiryDate >= today && b.expiryDate <= cutoff
  })
}

/**
 * Mark expired bonuses as expired
 * Call this on app load or periodically
 */
export function markExpiredBonuses(): number {
  const today = dayjs().format('YYYY-MM-DD')
  const bonuses = getAllBonuses()
  let expiredCount = 0

  const updated = bonuses.map((b) => {
    if (b.status === 'pending' && b.expiryDate < today) {
      expiredCount++
      return { ...b, status: 'expired' as const }
    }
    return b
  })

  if (expiredCount > 0) {
    saveBonuses(updated)
  }

  return expiredCount
}

/**
 * Calculate summary statistics
 */
export function calculateSummary(): StableSummary {
  const bonuses = getAllBonuses()
  const today = dayjs()
  const startOfMonth = today.startOf('month').format('YYYY-MM-DD')
  const threeDaysFromNow = today.add(3, 'day').format('YYYY-MM-DD')
  const todayStr = today.format('YYYY-MM-DD')

  const pending = bonuses.filter((b) => b.status === 'pending')
  const expiringSoon = pending.filter(
    (b) => b.expiryDate >= todayStr && b.expiryDate <= threeDaysFromNow
  )
  const turnedOverThisMonth = bonuses.filter(
    (b) =>
      b.status === 'turned_over' &&
      b.turnedOverAt &&
      b.turnedOverAt.slice(0, 10) >= startOfMonth
  )
  const expiredThisMonth = bonuses.filter(
    (b) =>
      b.status === 'expired' &&
      b.expiryDate >= startOfMonth
  )

  return {
    totalPending: pending.length,
    totalPendingValue: pending.reduce((sum, b) => sum + b.amount, 0),
    expiringWithin3Days: expiringSoon.length,
    turnedOverThisMonth: turnedOverThisMonth.length,
    bonusTurnoverProfitThisMonth: turnedOverThisMonth.reduce(
      (sum, b) => sum + (b.bonusTurnoverProfit || 0),
      0
    ),
    expiredThisMonth: expiredThisMonth.length,
  }
}

/**
 * Check if a bonus already exists for a source entry
 */
export function bonusExistsForEntry(sourceEntryId: string): boolean {
  const bonuses = getAllBonuses()
  return bonuses.some((b) => b.sourceEntryId === sourceEntryId)
}

/**
 * Get pending bonuses for a specific bookie
 * Used by Lay Manager to select which bonus to turn over
 */
export function getPendingBonusesByBookie(bookie: string): Bonus[] {
  if (!bookie) return []
  const bonuses = getAllBonuses()
  return bonuses.filter(
    (b) => b.status === 'pending' && b.bookie.toLowerCase() === bookie.toLowerCase()
  )
}

/**
 * Get all pending bonuses
 * Used by Lay Manager to show available bonuses for turnover
 */
export function getAllPendingBonuses(): Bonus[] {
  return getAllBonuses().filter((b) => b.status === 'pending')
}

/**
 * Mark a bonus as turned over
 * Called when a race using this bonus completes
 */
export function markBonusAsTurnedOver(id: string, bonusTurnoverProfit?: number): Bonus | null {
  return updateBonus(id, {
    status: 'turned_over',
    turnedOverAt: new Date().toISOString(),
    bonusTurnoverProfit,
  })
}
