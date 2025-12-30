# Accounts Module Enhancement - Product Requirements Document (PRD)

## Goals

- Transform disconnected tracking components into a unified double-entry accounting system
- Enable accurate calculated bookie balances derived from journal postings (not manual entry)
- Separate true P&L reporting from deposit match/bonus tracking
- Provide variance visibility when calculated balances don't match actual bookie balances
- Support scalability to 110+ bookie accounts per user profile
- Integrate all transaction sources (Racing Tracker, Lay Manager, Bank, Deposit Matches) into journal engine

## Background Context

The Elite MB Application has functional but siloed components: bank transactions via Basiq, racing trackers, bonus records, and account balances exist independently. The current "ledger" functions as a manual balance adjustment tool rather than a true general ledger derived from journal entries. Users cannot trace discrepancies, get accurate P&L, or reconcile bank statements systematically.

This PRD enhances the existing Accounts module to implement proper double-entry bookkeeping where every transaction generates balanced debit/credit entries, balances are calculated from the sum of journal postings, and users can reconcile calculated vs actual balances with full audit trail.

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2024-12-30 | 1.0 | Initial PRD | PM (John) |

---

## Requirements

### Functional Requirements

**Existing Tables to Preserve:**
- `Bookie` - Reference table of 110+ bookies (name, code, etc.)
- `StateCommissionRate` / `Track` - Commission rate lookup by state/track
- `RacingTrackerEntry` - Back-only bet tracking from Planner
- `LayManagerEntry` - Matched bet tracking
- `Bonus` - Bonus credit records
- `AccountLedger` - Enhance (do not delete) with new fields
- `AccountBalance` - Deprecated; replace with calculated view

**New Table Required:**
- `Account` - Chart of Accounts with category, subType, bookieId linkage

**New Fields on AccountLedger:**
- `debit` (Decimal) - Debit amount
- `credit` (Decimal) - Credit amount
- `accountId` (FK to Account) - Which account this entry affects
- `journalGroupId` (String) - Groups related debit/credit entries for a single transaction
- `status` (PENDING | POSTED | REVERSED)
- `sourceType` (RACING_TRACKER | LAY_MANAGER | BANK_DEPOSIT | BANK_WITHDRAWAL | DEPOSIT_MATCH | BONUS_CREDIT | BONUS_EXPIRY | MANUAL_ADJUSTMENT | OPENING_BALANCE)

**New Fields on RacingTrackerEntry (Multi-leg Support):**
- `betType` (WIN | PLACE | EACH_WAY | SRM | MULTI | SGM | QUADDIE | EXOTIC)
- `isMultiLeg` (Boolean)
- `parentBetId` (FK to self)
- `legNumber` (Int)
- `legCount` (Int)
- `combinedOdds` (Decimal)

**Functional Requirements List:**

| ID | Requirement |
|----|-------------|
| FR1 | Every bet placed creates PENDING journal entries (debit Pending Bets, credit source account) |
| FR2 | Every bet settled creates POSTED journal entries (settlement entries based on outcome) |
| FR3 | Every bank deposit/withdrawal creates journal entries (debit destination, credit source) |
| FR4 | Every bonus credit creates journal entries (debit Bookie Bonus, credit Bonus Income) |
| FR5 | Every bonus expiry creates journal entries (debit Bonus Expired expense, credit Bookie Bonus) |
| FR6 | All journal entries within a transaction share a journalGroupId |
| FR7 | Account balances are calculated from SUM(debit) - SUM(credit) per account |
| FR8 | Users can view all accounts with calculated balances on Ledger dashboard |
| FR9 | Users can drill down from any account to see constituent journal entries |
| FR10 | Users can enter "actual balance" for variance comparison |
| FR11 | Users can create manual adjustment entries with documented reason |
| FR12 | P&L report shows true profit (Income - Expenses) separately from bonus tracking |
| FR13 | System supports 110+ bookie accounts per user profile |
| FR14 | Accounts are provisioned on-demand (not pre-created for all bookies) |
| FR15 | Each user profile has independent Chart of Accounts (multi-tenant) |
| FR16 | System accounts (Income, Expense, Equity) are auto-created per profile |
| FR17 | Variance dashboard shows accounts where calculated != actual balance |
| FR18 | Multi-leg bets (SRM, Multi, Quaddie) use parent/child structure |
| FR19 | Commission rates use existing StateCommissionRate table lookup |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR1 | Ledger queries must return within 500ms for 110+ accounts |
| NFR2 | Journal entry creation must be atomic (all entries succeed or none) |
| NFR3 | All monetary values stored as Decimal(10,2) |
| NFR4 | Database view used for balance calculation (AccountBalanceView) |
| NFR5 | UI must be mobile-first responsive design |
| NFR6 | All existing tracker and bonus functionality must continue working |
| NFR7 | Audit trail preserved for all balance changes |

---

## User Interface Design Goals

### Overall UX Vision

A clean, mobile-first accounting interface that surfaces the most important information (total balance, variance alerts) prominently while enabling drill-down to transaction detail. The UI should feel like a modern fintech app - confident, trustworthy, and efficient.

### Key Interaction Paradigms

- **Card-based account list** - Each bookie account as a tappable card showing key metrics
- **Bottom sheet details** - Tap account to reveal transaction history in slide-up sheet
- **Filter chips** - Quick filtering by account type (Bookies/Exchange/Banks)
- **Pull-to-refresh** - Standard mobile pattern for data refresh
- **Inline adjustments** - Adjust balance without navigating away

### Core Screens and Views

| Screen | Purpose |
|--------|---------|
| Ledger Dashboard | Hero balance card, filter chips, scrollable account cards |
| Account Detail Sheet | Transaction history, stats, adjust balance action |
| Manual Transaction Form | Create adjustment or manual entries |
| Variance Dashboard | Accounts needing attention (calculated != actual) |
| P&L Report | True profit/loss with period filtering |
| Opening Balance Wizard | Onboarding flow for new users |
| Deposit Match Entry | Record deposit + bonus credit |

### Accessibility

WCAG AA compliance. Focus states, screen reader labels, sufficient color contrast.

### Branding

Consistent with existing Elite MB Application design language. Dark theme support.

### Target Platforms

Web Responsive (mobile-first). Primary use on mobile devices.

---

## Technical Assumptions

### Repository Structure

Monorepo - existing structure maintained.

### Service Architecture

Existing TanStack Start server functions pattern. No microservices.

### Testing Requirements

Unit tests for journal engine logic. Integration tests for transaction flows. Manual testing for UI.

### Additional Technical Assumptions

- PostgreSQL database view for balance calculation (AccountBalanceView)
- Prisma ORM for schema changes and migrations
- Existing server function pattern (`createServerFn`) for all database operations
- MUI components for UI consistency
- State commission rates from existing `StateCommissionRate` table
- All amounts in AUD (single currency)

---

## Epic List

| Epic | Title | Goal |
|------|-------|------|
| 1 | Foundation & Schema | Establish database schema changes, Account table, enhanced AccountLedger, and balance calculation view |
| 2 | Journal Engine & Manual Transactions | Implement core journal entry creation, validation, and manual transaction UI |
| 3 | Tracker Integration | Connect Racing Tracker and Lay Manager to automatically create journal entries |
| 4 | Account Views & Dashboard | Enhance existing UI components with new accounting data and add missing features |
| 5 | Reconciliation & Reporting | Build variance tracking, P&L reports, and reconciliation workflows |
| 6 | Opening Balances & Onboarding | Enable users to establish starting balances and migrate existing data |

---

## Epic 1: Foundation & Schema

**Goal:** Establish the database foundation for double-entry accounting by creating the Account table (Chart of Accounts), enhancing AccountLedger with debit/credit fields, and implementing the balance calculation database view.

### Story 1.1: Create Account Table Schema

**As a** developer,
**I want** to create the Account table with category, subType, and bookie linkage,
**So that** we have a proper Chart of Accounts structure for journal entries.

**Acceptance Criteria:**
1. Prisma schema includes Account model with fields: id, profileId, code, name, category, subType, bookieId, bookieName, bankName, isActive, isSystemAccount
2. AccountCategory enum: ASSET, LIABILITY, INCOME, EXPENSE, EQUITY
3. AccountSubType enum covers all types from brief (BOOKIE_CASH, BOOKIE_BONUS, BETFAIR_AVAILABLE, BANK, PENDING_BACK, PENDING_LAY, BETFAIR_LIABILITY, BACK_BET_WINS, LAY_BET_WINS, BONUS_INCOME, BACK_BET_LOSSES, LAY_BET_PAYOUTS, QUALIFYING_LOSS, BETFAIR_COMMISSION, BONUS_EXPIRED, ADJUSTMENT, OPENING_BALANCE_EQUITY)
4. Unique constraint on [profileId, code]
5. Unique constraint on [profileId, subType, bookieId] for bookie-specific accounts
6. Foreign key to Profile and optional FK to Bookie
7. Migration runs successfully without data loss

### Story 1.2: Enhance AccountLedger Schema

**As a** developer,
**I want** to add debit, credit, accountId, journalGroupId, status, and sourceType fields to AccountLedger,
**So that** entries can represent proper double-entry journal records.

**Acceptance Criteria:**
1. Add `debit` Decimal(10,2) defaulting to 0
2. Add `credit` Decimal(10,2) defaulting to 0
3. Add `accountId` FK to Account table
4. Add `journalGroupId` String for grouping related entries
5. Add `status` enum (PENDING, POSTED, REVERSED) defaulting to POSTED
6. Add `sourceType` enum (RACING_TRACKER, LAY_MANAGER, BANK_DEPOSIT, BANK_WITHDRAWAL, DEPOSIT_MATCH, BONUS_CREDIT, BONUS_EXPIRY, MANUAL_ADJUSTMENT, OPENING_BALANCE)
7. Preserve existing fields (amount, direction) for backward compatibility during migration
8. Migration runs successfully, existing data preserved

### Story 1.3: Create AccountBalanceView Database View

**As a** developer,
**I want** to create a PostgreSQL view that calculates account balances from journal entries,
**So that** balances are always derived from the ledger (not manually stored).

**Acceptance Criteria:**
1. View named `AccountBalanceView` created via raw SQL migration
2. View aggregates SUM(debit) - SUM(credit) as balance per account
3. View only includes entries with status = 'POSTED'
4. View includes all Account fields plus calculated balance
5. View filtered by profileId for multi-tenant support
6. Index created on AccountLedger(accountId, status) for performance
7. Query against view returns within 200ms for 500 entries

### Story 1.4: Create LedgerStatus and LedgerSourceType Enums

**As a** developer,
**I want** to define status and source type enums in Prisma schema,
**So that** journal entries can track their lifecycle and origin.

**Acceptance Criteria:**
1. LedgerStatus enum: PENDING, POSTED, REVERSED
2. LedgerSourceType enum: RACING_TRACKER, LAY_MANAGER, BANK_DEPOSIT, BANK_WITHDRAWAL, DEPOSIT_MATCH, BONUS_CREDIT, BONUS_EXPIRY, MANUAL_ADJUSTMENT, OPENING_BALANCE
3. Enums used in AccountLedger model
4. TypeScript types generated correctly

### Story 1.5: Add Multi-leg Bet Fields to RacingTrackerEntry

**As a** developer,
**I want** to add betType, isMultiLeg, parentBetId, legNumber, legCount, and combinedOdds to RacingTrackerEntry,
**So that** multi-leg bets (SRM, Multi, Quaddie) can be properly structured.

**Acceptance Criteria:**
1. BetType enum: WIN, PLACE, EACH_WAY, SRM, MULTI, SGM, QUADDIE, EXOTIC
2. Add `betType` field defaulting to WIN
3. Add `isMultiLeg` Boolean defaulting to false
4. Add `parentBetId` self-referencing FK (nullable)
5. Add `legNumber` Int (nullable)
6. Add `legCount` Int (nullable)
7. Add `combinedOdds` Decimal(10,3) (nullable)
8. Self-relation defined for parent/child legs
9. Existing entries unaffected (WIN, isMultiLeg=false)

### Story 1.6: Add Multi-leg Bet Fields to LayManagerEntry

**As a** developer,
**I want** to add the same multi-leg fields to LayManagerEntry,
**So that** matched multi-leg bets are also properly structured.

**Acceptance Criteria:**
1. Same BetType enum shared with RacingTrackerEntry
2. Add identical fields: betType, isMultiLeg, parentBetId, legNumber, legCount, combinedOdds
3. Self-relation for parent/child structure
4. Existing entries unaffected

### Story 1.7: Create System Account Seeder

**As a** developer,
**I want** to create a seeder that provisions system accounts for a profile,
**So that** Income, Expense, and Equity accounts exist when needed.

**Acceptance Criteria:**
1. Function `seedSystemAccounts(profileId)` creates all non-bookie accounts
2. Creates: Pending Back Bets, Pending Lay Bets, Betfair Available, Betfair Liability
3. Creates: Back Bet Wins, Lay Bet Wins, Bonus Income
4. Creates: Back Bet Losses, Lay Bet Payouts, Qualifying Loss, Betfair Commission, Bonus Expired
5. Creates: Manual Adjustments, Opening Balance Equity
6. Uses standardized account codes (1500, 1501, 2001, 4001, etc.)
7. Sets isSystemAccount = true
8. Idempotent - safe to run multiple times

### Story 1.8: Create Bookie Account Provisioner

**As a** developer,
**I want** to create a function that provisions Cash and Bonus accounts for a bookie on-demand,
**So that** accounts are created only when needed (not pre-created for all 110+ bookies).

**Acceptance Criteria:**
1. Function `provisionBookieAccounts(profileId, bookieId)` creates Cash and Bonus accounts
2. Links to Bookie table via bookieId
3. Sets bookieName from Bookie.name
4. Generates unique account codes (e.g., 1001, 1201 for first bookie)
5. Sets isSystemAccount = false
6. Returns existing accounts if already provisioned
7. Creates both BOOKIE_CASH and BOOKIE_BONUS subTypes

### Story 1.9: Create Bank Account Provisioner

**As a** developer,
**I want** to create a function that provisions Bank accounts,
**So that** users can track bank balances in the ledger.

**Acceptance Criteria:**
1. Function `provisionBankAccount(profileId, bankName)` creates a BANK account
2. Account code in 1400 range
3. Sets bankName field
4. Supports multiple bank accounts per profile (Bookie Bank, Betfair Bank)
5. Returns existing account if already provisioned with same name

---

## Epic 2: Journal Engine & Manual Transactions

**Goal:** Implement the core journal entry creation system that enforces double-entry rules (debits = credits), and build the manual transaction UI for adjustments and direct entries.

### Story 2.1: Create Journal Entry Service

**As a** developer,
**I want** to create a service that generates balanced journal entries,
**So that** all transactions follow double-entry accounting rules.

**Acceptance Criteria:**
1. `createJournalEntry()` function accepts array of line items (accountId, debit, credit)
2. Validates that total debits = total credits (throws if unbalanced)
3. Generates shared journalGroupId (UUID) for all entries in the transaction
4. Sets sourceType based on input parameter
5. All entries created atomically (Prisma transaction)
6. Returns created entries with journalGroupId

### Story 2.2: Create Journal Entry Validation

**As a** developer,
**I want** to validate journal entries before creation,
**So that** invalid entries are rejected with clear error messages.

**Acceptance Criteria:**
1. Validates all accountIds exist and belong to same profileId
2. Validates debit and credit are non-negative
3. Validates each line has either debit OR credit (not both)
4. Validates total debits = total credits
5. Validates required fields (description, entryDate)
6. Returns typed validation errors

### Story 2.3: Create Reverse Journal Entry Function

**As a** developer,
**I want** to create a function that reverses a journal entry,
**So that** incorrect entries can be corrected without deletion.

**Acceptance Criteria:**
1. `reverseJournalEntry(journalGroupId)` marks original entries as REVERSED
2. Creates new entries with debits/credits swapped
3. New entries reference original via description
4. New journalGroupId generated for reversal
5. Original entries retain their data (audit trail)
6. Only POSTED entries can be reversed

### Story 2.4: Manual Adjustment Entry Server Function

**As a** developer,
**I want** to create a server function for manual balance adjustments,
**So that** users can correct balances with documented reasons.

**Acceptance Criteria:**
1. Server function `createAdjustment(profileId, accountId, amount, reason)`
2. Positive amount: Debit target account, Credit Manual Adjustments
3. Negative amount: Debit Manual Adjustments, Credit target account
4. Reason stored in description field
5. sourceType = MANUAL_ADJUSTMENT
6. Returns created entries

### Story 2.5: Manual Transaction Form Component

**As a** user,
**I want** a form to create manual transactions,
**So that** I can record adjustments or entries not captured by trackers.

**Acceptance Criteria:**
1. Form fields: Account (dropdown), Amount, Type (Adjustment/Transfer), Reason
2. Account dropdown shows all user's accounts grouped by category
3. Transfer type requires two accounts (from/to)
4. Adjustment type creates balanced entry with Manual Adjustments account
5. Form validates all fields before submission
6. Success shows confirmation and clears form
7. Error displays clear message

### Story 2.6: Account Selector Component

**As a** developer,
**I want** a reusable account selector dropdown,
**So that** users can easily select accounts across the application.

**Acceptance Criteria:**
1. Grouped by AccountCategory (Assets, Liabilities, etc.)
2. Shows account name and current balance
3. Supports filtering/search
4. Keyboard accessible
5. Mobile-friendly (full-screen on mobile)
6. Can be filtered by subType if needed

### Story 2.7: Transfer Between Accounts Function

**As a** developer,
**I want** to create a function for transferring between accounts,
**So that** users can record money movements not tied to bets.

**Acceptance Criteria:**
1. `createTransfer(profileId, fromAccountId, toAccountId, amount, description)`
2. Creates: Debit toAccount, Credit fromAccount
3. Validates both accounts exist and belong to profile
4. sourceType = MANUAL_ADJUSTMENT (or new TRANSFER type)
5. Amount must be positive
6. Description required

### Story 2.8: Journal Entry List Component

**As a** user,
**I want** to view a list of journal entries for an account,
**So that** I can see all transactions affecting that account.

**Acceptance Criteria:**
1. Shows entries in reverse chronological order
2. Displays: Date, Description, Debit, Credit, Running Balance
3. Running balance calculated from first entry forward
4. Entries grouped by journalGroupId visually (subtle divider)
5. Tap entry shows full details (source, reference, etc.)
6. Pagination or infinite scroll for large datasets

### Story 2.9: Journal Group Detail View

**As a** user,
**I want** to see all entries in a journal group together,
**So that** I can understand the complete transaction.

**Acceptance Criteria:**
1. Shows all AccountLedger entries with same journalGroupId
2. Displays: Account name, Debit, Credit for each entry
3. Shows transaction metadata: Date, Source Type, Description
4. Total Debits and Total Credits shown (should match)
5. Link to source record if applicable (tracker entry, etc.)
6. Option to reverse entry (if authorized)

### Story 2.10: Entry Date vs Created Date Distinction

**As a** developer,
**I want** to separate entryDate (effective date) from createdAt (record date),
**So that** users can backdate entries when needed.

**Acceptance Criteria:**
1. `entryDate` field represents when the transaction occurred
2. `createdAt` represents when the record was created
3. Manual entries allow selecting entryDate (defaults to today)
4. Tracker-generated entries use race/bet date as entryDate
5. Balance calculations use entryDate for ordering
6. UI shows entryDate as primary date

### Story 2.11: Batch Journal Entry Creation

**As a** developer,
**I want** to support creating multiple journal groups in one operation,
**So that** bulk imports and migrations are efficient.

**Acceptance Criteria:**
1. `createBatchJournalEntries(profileId, journalGroups[])` accepts array of journal groups
2. Each group validated independently
3. All groups created in single database transaction
4. Partial success not allowed (all or nothing)
5. Returns all created entries grouped by journalGroupId
6. Handles 100+ groups in reasonable time (<5s)

### Story 2.12: Deposit Match Recording Function

**As a** developer,
**I want** to create a function that records deposit match transactions,
**So that** deposit + bonus credit creates proper journal entries.

**Acceptance Criteria:**
1. `recordDepositMatch(profileId, bookieId, depositAmount, bonusAmount)`
2. Creates two journal groups:
   - Deposit: Debit Bookie Cash, Credit Bank Account
   - Bonus: Debit Bookie Bonus, Credit Bonus Income
3. Both groups share reference linking them
4. sourceType = DEPOSIT_MATCH for deposit, BONUS_CREDIT for bonus
5. Provisions bookie accounts if not exists

### Story 2.13: Bonus Credit Recording Function

**As a** developer,
**I want** to create a function for standalone bonus credits,
**So that** bonuses not tied to deposits are recorded.

**Acceptance Criteria:**
1. `recordBonusCredit(profileId, bookieId, amount, reason)`
2. Creates: Debit Bookie Bonus, Credit Bonus Income
3. sourceType = BONUS_CREDIT
4. Description includes reason
5. Links to existing Bonus record if applicable

### Story 2.14: Bonus Expiry Recording Function

**As a** developer,
**I want** to create a function that records bonus expiry,
**So that** expired bonuses are removed from balance with proper accounting.

**Acceptance Criteria:**
1. `recordBonusExpiry(profileId, bookieId, amount, reason)`
2. Creates: Debit Bonus Expired (expense), Credit Bookie Bonus
3. sourceType = BONUS_EXPIRY
4. Validates bonus balance >= amount being expired
5. Links to Bonus record if applicable

---

## Epic 3: Tracker Integration

**Goal:** Connect the existing Racing Tracker and Lay Manager to automatically create journal entries when bets are placed and settled, ensuring all betting activity flows through the accounting system.

### Story 3.1: Racing Tracker Bet Placed Hook

**As a** developer,
**I want** to create journal entries when a back-only bet is placed,
**So that** the stake is moved from bookie balance to pending bets.

**Acceptance Criteria:**
1. Hook triggers when RacingTrackerEntry created with status PENDING
2. Creates: Debit Pending Back Bets, Credit Bookie Cash (or Bonus based on bet type)
3. sourceType = RACING_TRACKER
4. Links via trackerEntryId
5. Provisions bookie accounts if not exists
6. Entry description includes horse name and race details

### Story 3.2: Racing Tracker Win Settlement Hook

**As a** developer,
**I want** to create journal entries when a back bet wins,
**So that** returns are recorded as income.

**Acceptance Criteria:**
1. Hook triggers when RacingTrackerEntry updated to WIN
2. Creates: Debit Bookie Cash (returns), Credit Pending Back Bets (stake), Credit Back Bet Wins (profit)
3. Handles bonus bets (stake not returned, only profit)
4. Calculates returns from stake * odds
5. Status = POSTED
6. Reverses PENDING entry if exists

### Story 3.3: Racing Tracker Loss Settlement Hook

**As a** developer,
**I want** to create journal entries when a back bet loses,
**So that** losses are recorded as expense.

**Acceptance Criteria:**
1. Hook triggers when RacingTrackerEntry updated to LOSE
2. For cash bets: Debit Back Bet Losses, Credit Pending Back Bets
3. For bonus bets: Debit Qualifying Loss, Credit Pending Back Bets
4. Status = POSTED
5. Reverses PENDING entry if exists

### Story 3.4: Racing Tracker Void/Scratch Handling

**As a** developer,
**I want** to handle scratched or void bets,
**So that** stakes are returned correctly.

**Acceptance Criteria:**
1. Hook triggers when RacingTrackerEntry updated to VOID or SCRATCHED
2. For cash bets: Debit Bookie Cash, Credit Pending Back Bets (full refund)
3. For bonus bets: Debit Bookie Bonus, Credit Pending Back Bets (bonus returned)
4. Description indicates void/scratch reason
5. Reverses PENDING entry

### Story 3.5: Racing Tracker Dead Heat Handling

**As a** developer,
**I want** to handle dead heat results,
**So that** partial payouts are recorded correctly.

**Acceptance Criteria:**
1. Hook triggers when RacingTrackerEntry has deadHeat = true
2. Calculates reduced returns based on dead heat rule
3. Creates partial win entries (reduced profit)
4. Works for both cash and bonus bets
5. Description indicates dead heat factor

### Story 3.6: Lay Manager Matched Bet Placed Hook

**As a** developer,
**I want** to create journal entries when a matched bet is placed,
**So that** both back stake and lay liability are recorded as pending.

**Acceptance Criteria:**
1. Hook triggers when LayManagerEntry created with status PENDING
2. Creates journal group with 4 entries:
   - Debit Pending Back Bets, Credit Bookie Cash (back stake)
   - Debit Pending Lay Bets, Credit Betfair Available (lay liability)
3. Lay liability = (layOdds - 1) * layStake
4. sourceType = LAY_MANAGER
5. Links via layManagerEntryId

### Story 3.7: Lay Manager Back Wins Settlement

**As a** developer,
**I want** to create journal entries when the back bet wins (lay loses),
**So that** the complex settlement is recorded correctly.

**Acceptance Criteria:**
1. Hook triggers when LayManagerEntry back wins
2. Back side: Debit Bookie Cash (returns), Credit Pending Back Bets, Credit Back Bet Wins
3. Lay side: Debit Lay Bet Payouts (liability), Credit Pending Lay Bets
4. All entries share journalGroupId
5. Net result shows in P&L correctly

### Story 3.8: Lay Manager Lay Wins Settlement

**As a** developer,
**I want** to create journal entries when the lay bet wins (back loses),
**So that** commission is calculated and recorded.

**Acceptance Criteria:**
1. Hook triggers when LayManagerEntry lay wins
2. Back side: Debit Back Bet Losses, Credit Pending Back Bets
3. Lay side: Debit Betfair Available (liability return + profit - commission), Credit Pending Lay Bets, Credit Lay Bet Wins
4. Betfair Commission: Debit Betfair Commission expense, Credit Betfair Available
5. Commission rate from StateCommissionRate based on track
6. All entries share journalGroupId

### Story 3.9: Multi-leg Bet Parent Entry Handling

**As a** developer,
**I want** to create journal entries for multi-leg bet parents only,
**So that** stake is recorded once (not per leg).

**Acceptance Criteria:**
1. Only parent entry (parentBetId = null) creates journal entries
2. Child legs store details but don't create separate journal entries
3. Combined odds used for return calculations
4. All legs must settle before parent journal entries finalized
5. Partial settlements handled (some legs win, waiting on others)

### Story 3.10: Multi-leg Bet Settlement Logic

**As a** developer,
**I want** to settle multi-leg bets based on all leg outcomes,
**So that** the parent entry reflects combined result.

**Acceptance Criteria:**
1. Multi wins only if ALL legs win
2. Parent status updated when all legs settled
3. Settlement journal entries created on parent only
4. Partial refunds if some legs scratched (dead heat rules apply)
5. combinedOdds recalculated if legs scratched

### Story 3.11: Bank Transaction Integration

**As a** developer,
**I want** to create journal entries from Basiq bank transactions,
**So that** deposits and withdrawals are recorded.

**Acceptance Criteria:**
1. Function `recordBankTransaction(profileId, type, bookieId, amount, bankAccountId)`
2. Deposit: Debit Bookie Cash, Credit Bank Account
3. Withdrawal: Debit Bank Account, Credit Bookie Cash
4. sourceType = BANK_DEPOSIT or BANK_WITHDRAWAL
5. Links to Basiq transaction if available
6. Can be triggered manually or from Basiq import

### Story 3.12: Betfair Deposit/Withdrawal Recording

**As a** developer,
**I want** to record Betfair deposits and withdrawals,
**So that** exchange balance changes are tracked.

**Acceptance Criteria:**
1. Similar to bookie but uses Betfair Available account
2. Separate bank account (Betfair Bank) used
3. sourceType = BANK_DEPOSIT or BANK_WITHDRAWAL
4. Can record pending deposits (status = PENDING)

### Story 3.13: Tracker Entry Edit Journal Update

**As a** developer,
**I want** to update journal entries when tracker entries are edited,
**So that** the ledger stays in sync with corrections.

**Acceptance Criteria:**
1. When tracker entry updated (odds, stake, outcome), related journals updated
2. Reversal entry created for original
3. New entries created with corrected values
4. Audit trail maintained (original visible as REVERSED)
5. Only unsettled changes allowed without reversal chain

---

## Epic 4: Account Views & Dashboard

**Goal:** Enhance existing UI components with the new accounting data and add missing features like deposit match entry and variance indicators.

### Story 4.1: Enhance BalanceSummaryCard with Calculated Balance

**As a** user,
**I want** the hero balance card to show calculated balance from journal entries,
**So that** I see accurate totals derived from the ledger.

**Acceptance Criteria:**
1. BalanceSummaryCard reads from AccountBalanceView
2. Total Balance = sum of all BOOKIE_CASH + BOOKIE_BONUS + BETFAIR_AVAILABLE
3. Total P&L = sum of Income accounts - sum of Expense accounts
4. Shows variance indicator if any account has calculated != actual
5. Loading state while fetching
6. Error state with retry

### Story 4.2: Enhance AccountCard with New Fields

**As a** user,
**I want** account cards to show cash/bonus split and variance indicator,
**So that** I can quickly assess each account's status.

**Acceptance Criteria:**
1. Shows Cash balance and Bonus balance separately
2. Shows variance badge if actualBalance differs from calculated
3. Tap opens AccountDetailSheet with full history
4. Supports both bookie and exchange accounts
5. Visual distinction for accounts needing attention

### Story 4.3: Enhance AccountDetailSheet with Journal Entries

**As a** user,
**I want** the account detail sheet to show journal entry history,
**So that** I can see all transactions affecting this account.

**Acceptance Criteria:**
1. Shows AccountLedger entries for selected account
2. Entries displayed in reverse chronological order
3. Each entry shows: Date, Description, Debit/Credit, Running Balance
4. Tap entry to see full journal group
5. Pagination for large history
6. Filter by date range option

### Story 4.4: Add Actual Balance Input to AccountDetailSheet

**As a** user,
**I want** to input my actual bookie balance,
**So that** I can compare it to the calculated balance.

**Acceptance Criteria:**
1. Input field for "Actual Balance" in AccountDetailSheet
2. Shows calculated balance alongside for comparison
3. Variance displayed (actual - calculated)
4. Save updates AccountBalance.actualBalance field
5. Timestamp recorded for when actual was entered
6. Visual indicator when variance exceeds threshold (e.g., $10)

### Story 4.5: Add Quick Adjustment Action

**As a** user,
**I want** a quick action to adjust balance from the account detail sheet,
**So that** I can correct discrepancies without navigating away.

**Acceptance Criteria:**
1. "Adjust Balance" button opens inline form
2. Pre-fills variance amount as suggested adjustment
3. Requires reason for adjustment
4. Creates proper journal entry via manual adjustment function
5. Balance updates immediately after save
6. Success confirmation shown

### Story 4.6: Create Deposit Match Entry Dialog

**As a** user,
**I want** to record deposit matches with bonus credits,
**So that** promotional deposits are tracked with their bonuses.

**Acceptance Criteria:**
1. Dialog accessible from Ledger dashboard ("Add Deposit Match" button)
2. Fields: Bookie (dropdown), Deposit Amount, Bonus Amount, Date
3. Validates: Amounts positive, Bookie selected
4. Creates proper journal entries for both deposit and bonus
5. Updates both Cash and Bonus balances
6. Success shows summary of created entries

### Story 4.7: Enhance Account Filter Chips

**As a** user,
**I want** filter chips to show count of accounts needing attention,
**So that** I can quickly see if reconciliation is needed.

**Acceptance Criteria:**
1. Existing filter chips (All, Bookies, Exchange) maintained
2. Add "Needs Attention" filter showing variance accounts
3. Count badge shows number in each category
4. Variance threshold configurable (default $10)
5. Filter persists across navigation

### Story 4.8: Create Bank Accounts Tab

**As a** user,
**I want** to see my bank account balances in the accounts dashboard,
**So that** I have complete visibility of all funds.

**Acceptance Criteria:**
1. Bank tab shows configured bank accounts
2. Each account shows: Name, Calculated Balance
3. Can add new bank account (provisions Account record)
4. Integrates with Basiq-linked accounts if available
5. Tap opens transaction history (AccountDetailSheet)

### Story 4.9: Add Betfair Section to Ledger

**As a** user,
**I want** to see Betfair balance (available + liability) in the ledger,
**So that** my exchange funds are visible alongside bookies.

**Acceptance Criteria:**
1. Betfair section shows: Available Balance, Current Liability, Net Position
2. Net Position = Available - Liability (can be negative if heavy exposure)
3. Tap opens Betfair detail sheet with lay history
4. Can record Betfair deposits/withdrawals
5. Visual warning if liability exceeds threshold

### Story 4.10: Pending Bets Summary

**As a** user,
**I want** to see total pending bets separately,
**So that** I know how much is tied up in unsettled bets.

**Acceptance Criteria:**
1. Summary card shows total Pending Back Bets + Pending Lay Bets
2. Tap expands to show list of pending entries
3. Links to source tracker entries
4. Updates in real-time as bets settle
5. Distinguish between back pending and lay pending

### Story 4.11: System Accounts Hidden by Default

**As a** user,
**I want** system accounts (Income, Expense, Equity) hidden from main view,
**So that** I focus on operational accounts.

**Acceptance Criteria:**
1. System accounts (isSystemAccount = true) not shown in main ledger view
2. Toggle "Show All Accounts" reveals system accounts
3. System accounts shown in reports and P&L views
4. Drill-down from P&L shows system account details

### Story 4.12: Account Search and Filter

**As a** user,
**I want** to search for specific bookie accounts,
**So that** I can quickly find accounts in a large list.

**Acceptance Criteria:**
1. Search input filters account list by name
2. Real-time filtering as user types
3. No results state shows helpful message
4. Clear search button
5. Works with existing filter chips

### Story 4.13: Mobile-Optimized Scrolling

**As a** user,
**I want** smooth scrolling through 110+ accounts on mobile,
**So that** the app remains responsive.

**Acceptance Criteria:**
1. Virtual scrolling implemented for account list
2. Only visible accounts rendered in DOM
3. Scroll position maintained when returning from detail view
4. Pull-to-refresh triggers data reload
5. Loading indicators during data fetch

---

## Epic 5: Reconciliation & Reporting

**Goal:** Build variance tracking, P&L reports, and reconciliation workflows that enable users to maintain accurate books and understand their profitability.

### Story 5.1: Variance Dashboard View

**As a** user,
**I want** a dedicated view showing accounts with variances,
**So that** I can focus on accounts needing reconciliation.

**Acceptance Criteria:**
1. Shows accounts where |calculated - actual| > threshold
2. Sortable by variance amount (largest first)
3. Shows: Account Name, Calculated, Actual, Variance, Last Verified Date
4. Quick action to adjust balance inline
5. Quick action to mark as verified (updates actual = calculated)
6. Empty state when no variances

### Story 5.2: P&L Report - Period Selection

**As a** user,
**I want** to view P&L for different time periods,
**So that** I can track profitability over time.

**Acceptance Criteria:**
1. Period options: Today, This Week, This Month, This Year, All Time, Custom Range
2. Custom range allows date picker for start/end
3. Selection persists during session
4. URL reflects selected period (shareable)

### Story 5.3: P&L Report - Income Section

**As a** user,
**I want** to see all income sources in the P&L report,
**So that** I understand where profits come from.

**Acceptance Criteria:**
1. Income section shows all Income category accounts
2. Line items: Back Bet Wins, Lay Bet Wins, Bonus Income
3. Shows sum of credits for each account in period
4. Subtotal for Total Income
5. Drill-down to journal entries on tap

### Story 5.4: P&L Report - Expense Section

**As a** user,
**I want** to see all expenses in the P&L report,
**So that** I understand costs of my operation.

**Acceptance Criteria:**
1. Expense section shows all Expense category accounts
2. Line items: Back Bet Losses, Lay Bet Payouts, Qualifying Loss, Betfair Commission, Bonus Expired
3. Shows sum of debits for each account in period
4. Subtotal for Total Expenses
5. Drill-down to journal entries on tap

### Story 5.5: P&L Report - Net Profit Calculation

**As a** user,
**I want** to see my net profit clearly,
**So that** I know my actual profitability.

**Acceptance Criteria:**
1. Net Profit = Total Income - Total Expenses
2. Prominently displayed at top and bottom of report
3. Color coded: Green for profit, Red for loss
4. Shows as both amount and percentage of turnover
5. Comparison to previous period (if applicable)

### Story 5.6: P&L Report - Bonus Tracking Separation

**As a** user,
**I want** bonus income separated from betting profits,
**So that** I can see true betting performance.

**Acceptance Criteria:**
1. Bonus Income shown as separate line item
2. "Profit from Betting" subtotal excludes Bonus Income
3. "Total Profit (incl. Bonuses)" shows full picture
4. Clear labels explaining the distinction
5. Tooltip explaining that bonuses are promotional credits, not betting wins

### Story 5.7: Account Activity Summary

**As a** user,
**I want** to see activity summary per account for a period,
**So that** I can identify most active or profitable bookies.

**Acceptance Criteria:**
1. Report shows: Account, Opening Balance, Deposits, Withdrawals, Net P&L, Closing Balance
2. Opening Balance = balance at start of period
3. Closing Balance = balance at end of period
4. Net P&L = Wins - Losses for that account
5. Sortable by any column
6. Export to CSV option

### Story 5.8: Reconciliation Workflow

**As a** user,
**I want** a guided workflow to reconcile an account,
**So that** I systematically resolve discrepancies.

**Acceptance Criteria:**
1. "Reconcile Account" action from Variance Dashboard
2. Step 1: Show calculated balance and recent journal entries
3. Step 2: Prompt to enter actual balance from bookie
4. Step 3: Show variance and suggest review of recent entries
5. Step 4: Option to adjust or mark as reconciled
6. Records reconciliation timestamp and user

### Story 5.9: Reconciliation History

**As a** user,
**I want** to see history of reconciliations for an account,
**So that** I can track when discrepancies were addressed.

**Acceptance Criteria:**
1. Reconciliation log shows: Date, Calculated, Actual, Adjustment, Notes
2. Accessible from Account Detail Sheet
3. Shows who performed reconciliation (if multi-user future)
4. Links to adjustment journal entry if created

### Story 5.10: Export Journal Entries

**As a** user,
**I want** to export journal entries to CSV,
**So that** I can use data in external tools or for tax purposes.

**Acceptance Criteria:**
1. Export button on journal entry list views
2. CSV includes: Date, Account, Debit, Credit, Description, Source
3. Respects current filters (date range, account)
4. Downloads immediately (no email)
5. Filename includes date range

### Story 5.11: Tax Year Summary Report

**As a** user,
**I want** a summary report for Australian tax year (July-June),
**So that** I can easily report gambling income.

**Acceptance Criteria:**
1. Preset period: "FY 2024-25" (July 1 2024 - June 30 2025)
2. Shows: Total Turnover, Net Profit/Loss, Total Bonus Income
3. Note explaining tax treatment may vary (seek advice)
4. Printable/PDF format
5. Previous financial years selectable

---

## Epic 6: Opening Balances & Onboarding

**Goal:** Enable users to establish accurate starting balances for their bookie and exchange accounts, migrate existing ledger data to the double-entry format, and provide clear workflows for resolving balance discrepancies during initial setup.

### Story 6.1: Opening Balance Entry Form

**As a** user setting up the accounts system,
**I want** to enter opening balances for my bookie accounts,
**So that** my ledger starts with accurate baseline figures reflecting my actual account states.

**Acceptance Criteria:**
1. Form displays list of available bookies (from Bookie reference table)
2. User can enter opening Cash balance and optional Bonus balance per bookie
3. Form validates balances are non-negative numbers with max 2 decimal places
4. Only accounts with non-zero balances are provisioned (on-demand provisioning)
5. Submitting creates OPENING_BALANCE journal entries with appropriate debit/credit
6. Journal entries use today's date as effectiveDate
7. Form shows running total of all entered balances
8. Cancel discards all entries without creating any records

### Story 6.2: Opening Balance Journal Entry Generation

**As a** user entering opening balances,
**I want** the system to create proper double-entry journal records automatically,
**So that** the accounting equation remains balanced from day one.

**Acceptance Criteria:**
1. Each opening balance creates paired debit/credit entries with shared journalGroupId
2. Cash opening balance: Debit [Bookie]:Cash, Credit Opening Balance Equity
3. Bonus opening balance: Debit [Bookie]:Bonus, Credit Opening Balance Equity
4. All opening balance entries use sourceType = 'OPENING_BALANCE'
5. Opening Balance Equity account auto-created if not exists (Equity category)
6. Journal entries are atomic - all succeed or all rollback
7. Entry description includes "Opening balance - [Bookie Name]"

### Story 6.3: Betfair Exchange Opening Balance

**As a** user with existing Betfair balance,
**I want** to enter my Betfair exchange opening balance including any outstanding liability,
**So that** my exchange account reflects both available funds and pending exposure.

**Acceptance Criteria:**
1. Betfair opening balance form has separate fields for Available Balance and Exposure
2. Available balance creates: Debit Betfair:Cash, Credit Opening Balance Equity
3. Exposure (if any) creates: Debit Opening Balance Equity, Credit Betfair:Lay Liability
4. User can enter $0 for exposure if no open lay bets
5. Form explains that Exposure represents unmatched or unsettled lay bets
6. Both entries share same journalGroupId per Betfair setup

### Story 6.4: Bank Account Opening Balance

**As a** user with dedicated betting bank accounts,
**I want** to enter opening balances for my bank accounts,
**So that** my bank integration starts with correct baseline values.

**Acceptance Criteria:**
1. Bank account section shows accounts already linked via Basiq (read-only names)
2. User can enter manual opening balance for each linked bank account
3. Opening balance creates: Debit Bank:[Account Name], Credit Opening Balance Equity
4. If Basiq has balance data, show it as reference alongside manual entry field
5. User confirms or overrides Basiq-provided balance
6. Form validates at least one bank account is configured

### Story 6.5: Opening Balance Review & Confirm

**As a** user completing opening balance setup,
**I want** to review all entered balances before finalizing,
**So that** I can catch and correct any errors before they affect my ledger.

**Acceptance Criteria:**
1. Review screen shows all accounts with entered balances in organized sections
2. Sections: Bookie Accounts (Cash/Bonus), Betfair Exchange, Bank Accounts
3. Each section shows subtotals
4. Grand total shows sum of all opening balances
5. Edit button returns to specific section for corrections
6. Confirm button commits all journal entries atomically
7. Success message confirms number of accounts initialized
8. After confirmation, redirects to Ledger dashboard

### Story 6.6: Existing Data Migration Detection

**As a** returning user with existing AccountLedger entries,
**I want** the system to detect my existing data,
**So that** I'm guided through migration rather than starting fresh.

**Acceptance Criteria:**
1. On first access to enhanced Accounts module, check for existing AccountLedger entries
2. If entries exist, show migration prompt instead of opening balance wizard
3. Migration prompt explains: "We found existing transaction data. Would you like to migrate it to the new accounting system?"
4. Options: "Migrate Existing Data" or "Start Fresh" (with warning about data loss)
5. Start Fresh option requires confirmation dialog
6. Migration choice is recorded to prevent repeated prompts

### Story 6.7: AccountLedger Migration Processor

**As a** user with existing transaction data,
**I want** my old AccountLedger records converted to double-entry format,
**So that** I retain my historical data in the new accounting structure.

**Acceptance Criteria:**
1. Migration processes all existing AccountLedger entries for the user's profile
2. Each entry converted to paired debit/credit with shared journalGroupId
3. Preserve original createdAt as effectiveDate
4. Map existing 'direction' field: CREDIT to debit bookie/credit revenue, DEBIT to credit bookie/debit expense
5. Create necessary Account records on-demand during migration
6. Migration runs in batches to handle large datasets (100 entries per batch)
7. Progress indicator shows migration status
8. Migration is idempotent - can be safely re-run

### Story 6.8: Migration Validation Report

**As a** user who completed migration,
**I want** to see a validation report showing what was migrated,
**So that** I can verify my historical data transferred correctly.

**Acceptance Criteria:**
1. Report shows count of entries migrated per account
2. Report shows calculated balance per account after migration
3. Report flags any entries that couldn't be migrated (with reasons)
4. If existing AccountBalance records exist, compare to calculated balances
5. Variance column shows difference between stored and calculated balances
6. Option to export report as CSV
7. "Looks Good" button marks migration complete
8. "Review Issues" button opens variance resolution workflow

### Story 6.9: Post-Migration Balance Adjustment

**As a** user whose migrated balances don't match actual bookie balances,
**I want** to adjust balances to match reality,
**So that** my ledger accurately reflects my actual account states going forward.

**Acceptance Criteria:**
1. Variance resolution shows accounts with calculated vs actual balance input
2. User enters "Actual Balance" from bookie website for each account
3. System calculates adjustment needed
4. Adjustment creates ADJUSTMENT journal entry: Debit/Credit account, Credit/Debit Adjustment expense/income
5. Adjustment entry includes reason: "Post-migration balance correction"
6. Bulk "Apply All Adjustments" button for convenience
7. Individual "Adjust" buttons for one-at-a-time approach
8. After adjustments, AccountBalanceView reflects corrected figures

### Story 6.10: Skip Onboarding for Advanced Users

**As an** experienced user who understands double-entry accounting,
**I want** to skip the guided wizard and directly access the ledger,
**So that** I can manually configure my accounts as needed.

**Acceptance Criteria:**
1. Wizard includes "Skip Setup" link (less prominent than primary flow)
2. Skip confirmation warns: "You'll need to manually add accounts and opening balances"
3. Skipping marks onboarding complete but creates no opening balance entries
4. User can still access individual features (Add Account, Manual Transaction)
5. First-time help tooltips still appear on relevant UI elements
6. Skip choice can be "undone" via Settings > Re-run Setup Wizard

### Story 6.11: Onboarding Progress Indicator

**As a** user going through the setup wizard,
**I want** to see my progress through the onboarding steps,
**So that** I know how much setup remains.

**Acceptance Criteria:**
1. Stepper component shows all onboarding phases
2. Steps: Welcome > Bookie Accounts > Betfair > Bank Accounts > Review > Complete
3. Current step highlighted, completed steps show checkmark
4. Step labels visible on desktop, icons-only on mobile
5. Can navigate back to completed steps
6. Cannot skip ahead to incomplete steps
7. Progress persisted - closing and reopening resumes at current step

---

## Checklist Results Report

### PRD Completeness Checklist

| Item | Status | Notes |
|------|--------|-------|
| Goals clearly defined | Pass | 6 clear goals listed |
| Background context provided | Pass | Problem statement and current state documented |
| Requirements traceable to goals | Pass | FR1-FR19 map to stated goals |
| Non-functional requirements defined | Pass | NFR1-NFR7 cover performance, atomicity, data types |
| UI/UX goals documented | Pass | Wireframes, interactions, accessibility defined |
| Technical assumptions stated | Pass | Stack, schema, architecture documented |
| Epics logically sequenced | Pass | Foundation > Engine > Integration > UI > Reports > Onboarding |
| Stories sized for AI agent execution | Pass | Each story 2-4 hour scope |
| Acceptance criteria testable | Pass | Specific, measurable criteria |
| Dependencies identified | Pass | Noted in epic/story descriptions |
| Existing code preserved | Pass | Enhancement approach, not replacement |
| Multi-tenant support | Pass | profileId scoping throughout |
| Scalability addressed | Pass | 110+ accounts, database views, indexing |

### Risk Assessment

| Risk | Mitigation in PRD |
|------|-------------------|
| Balance drift | Variance dashboard, easy adjustments (Epic 5) |
| Migration complexity | Batch processing, validation report (Epic 6) |
| Performance | Database views, indexing (Story 1.3) |
| User adoption | Guided onboarding, skip option (Epic 6) |

---

## Next Steps

### UX Expert Prompt

Review this PRD with focus on the User Interface Design Goals and Epic 4 (Account Views & Dashboard). Validate the proposed interaction patterns, identify any UX gaps, and create wireframes for the key screens: Ledger Dashboard, Account Detail Sheet, Opening Balance Wizard, and P&L Report.

### Architect Prompt

Review this PRD with focus on the Technical Assumptions and Epic 1 (Foundation & Schema). Validate the proposed schema changes (Account table, enhanced AccountLedger, AccountBalanceView), ensure the double-entry model is sound, and create the technical architecture document including database diagrams, API contracts, and migration strategy.

---

*Generated with assistance from PM Agent (John)*
