# Project Brief: Accounts Module Enhancement

## Executive Summary

**Product Concept:** Transform the Elite MB Application's Accounts module from disconnected tracking components into a unified, double-entry accounting system that treats matched betting as a legitimate investment operation.

**Primary Problem:** The platform has functional tracking components - bank transaction history, racing trackers, and account balances - but these elements are not connected through a unified accounting framework. Users can follow bets and see balances, but cannot:
- Reconcile bank statements against betting activity
- Trace discrepancies back to source transactions
- Rely on a journal that captures complete transaction detail with proper debits/credits
- Use a general ledger derived from journal postings (currently functions as manual balance adjustment)
- Get accurate P&L reporting (current module conflates deposit match tracking with profit reporting)

**Target Users:** Matched bettors who want to manage their bankroll with the financial confidence of running a proper business - complete traceability, bank reconciliation, and clear profit reporting.

**Key Value Proposition:** A fintech-grade accounting experience where every dollar is traceable, bank transactions reconcile against betting activity, and the system delivers the financial clarity expected of a legitimate investment operation.

---

## Problem Statement

### Current State & Pain Points

The Elite MB Application has grown organically with functional but siloed components:

1. **Disconnected Data Sources** - Bank transactions (via Basiq), racing tracker outcomes, bonus records, and account balances exist independently. There's no single source of truth that connects a bank deposit to its destination bookie, through to bets placed, and back to withdrawals.

2. **Incomplete Journal Entries** - The current journal doesn't capture full transaction detail with proper debits and credits. Transactions are logged but not in a format that supports true double-entry accounting principles.

3. **Ledger as Manual Override** - The general ledger functions as a balance adjustment tool rather than an authoritative book of final entry. Balances are manually set rather than derived from the sum of all journal postings.

4. **Misleading P&L Module** - The current "P&L" conflates deposit match tracking with actual profit reporting. Users cannot get a clear answer to "How much profit have I actually made?" without mental gymnastics.

5. **No Bank Reconciliation Path** - When bank statements don't match expected balances, users have no systematic way to trace discrepancies back to specific transactions.

### Impact
- Users operate without financial confidence
- Time wasted manually reconciling across disconnected systems
- Difficult to assess true profitability of the matched betting operation
- Cannot scale the operation professionally without proper financial controls

### Why Existing Solutions Fall Short
- Generic accounting software doesn't understand matched betting flows (stakes, lay bets, qualifying losses, bonus turnover)
- Current implementation was built for tracking, not accounting

### Urgency
- As the operation scales, financial complexity compounds
- Unreconciled discrepancies accumulate over time
- Building proper foundations now prevents technical debt

---

## Proposed Solution

### Core Concept

Implement double-entry accounting where every betting event and money movement generates balanced journal entries, providing real-time visibility across 110+ bookie accounts without manual checking.

### Architecture Overview

```
TRANSACTION SOURCES
├── Racing Tracker (back-only bets)
├── Lay Manager (matched bets)
├── Bank Transactions (deposits/withdrawals)
└── Deposit Matches / Promotions (bonus credits)
           │
           ▼
    JOURNAL ENGINE
    (Automatic debit/credit generation)
           │
           ▼
    GENERAL LEDGER
    (Account balances derived from journal)
           │
           ▼
    OUTPUTS
    ├── Account Balances (per bookie)
    ├── P&L Reports (true profit)
    ├── Bank Reconciliation
    └── Variance Analysis
```

### Transaction Sources & Journal Entry Logic

#### Source 1: Racing Tracker (Back-Only Bets)

Back-only bets from Planner - used for bonus rollover or promotional conditions.

| Event | Captured Data | Journal Entry |
|-------|---------------|---------------|
| **Bet Placed** | Bookie account, stake, odds, race/event details, bet type (bonus/cash) | **DR** Pending Back Bets, **CR** Bookie Cash (or Bonus) |
| **Bet Wins** | Outcome, returns | **DR** Bookie Cash, **CR** Pending Back Bets + Back Bet Wins |
| **Bet Loses** | Outcome | **DR** Back Bet Losses, **CR** Pending Back Bets |
| **Dead Heat** | Partial return | Partial win/loss entries |

#### Source 2: Lay Manager (Matched Bets)

Matched bets from Planner - back bet on bookie with corresponding lay on Betfair.

| Event | Captured Data | Journal Entry |
|-------|---------------|---------------|
| **Bets Placed** | Bookie account, back stake/odds, lay stake/odds, liability, bonus type | **DR** Pending Back Bets + Pending Lay Bets, **CR** Bookie Cash + Betfair Available |
| **Back Wins** | Back returns, lay loses | Complex settlement with liability payout |
| **Lay Wins** | Back loses, lay returns | Settlement with Betfair commission |

#### Source 3: Bank Transactions (Money Movement)

Deposits and withdrawals between bank and betting accounts (from Planner or Basiq import).

| Event | Journal Entry |
|-------|---------------|
| **Deposit to Bookie** | **DR** Bookie Cash, **CR** Bank Account |
| **Deposit to Betfair** | **DR** Betfair Available, **CR** Bank Account |
| **Withdrawal from Bookie** | **DR** Bank Account, **CR** Bookie Cash |
| **Withdrawal from Betfair** | **DR** Bank Account, **CR** Betfair Available |

#### Source 4: Deposit Matches / Promotions

Promotional deposits with bonus credit received.

| Event | Journal Entry |
|-------|---------------|
| **Deposit Match Executed** | **DR** Bookie Cash, **CR** Bank Account |
| **Bonus Credit Received** | **DR** Bookie Bonus, **CR** Bonus Income |
| **Bonus Expired** | **DR** Bonus Expired (Expense), **CR** Bookie Bonus |

---

## Target Users

### Primary User Segment: Matched Betting Operators

**Profile:**
- Individuals running matched betting as a semi-professional or professional side income
- Managing 50-130+ bookie accounts simultaneously
- Monthly turnover in the thousands to tens of thousands of dollars
- Tech-comfortable but not accountants

**Current Behaviors & Workflows:**
- Daily routine: check promotions, plan bets, execute across multiple bookies, track outcomes
- Use spreadsheets or mental math to estimate balances
- Periodically log into each bookie to verify balances (time-consuming at scale)
- Manually reconcile bank statements against memory

**Specific Needs & Pain Points:**
- Need to know cash-on-hand across all bookies at a glance
- Need to distinguish bonus balance from withdrawable cash
- Need to trace discrepancies when a bookie balance doesn't match expectations
- Need clear profit reporting that separates actual gains from bonus credits

**Goals:**
- Run matched betting like a legitimate business with proper financial controls
- Scale from 50 bets/week to 200+ without drowning in admin
- Know exactly where every dollar is at any moment
- Confidently report profitability

### Secondary User Segment: Casual Matched Bettors

**Profile:**
- Part-time matched bettors with 10-30 active accounts
- Matched betting as occasional side income

**Needs:**
- Quick overview of profit without complex setup
- Simple balance tracking across key bookies
- Low friction

---

## Goals & Success Metrics

### Key Constraint: No Direct Bookie Statement Access

We cannot pull transaction history directly from bookie accounts. Therefore:

- **Bookie balances are calculated**, not imported
- Balance = Starting Balance + Deposits - Withdrawals + Wins - Losses + Bonuses
- Sources of truth: **Tracker entries** (bet outcomes) + **Bank transactions** (money movement)
- Manual adjustments bridge any gaps between calculated and actual balances

### Business Objectives

- **Calculated Balance Accuracy**: Derived balances from tracker + bank transactions should match actual bookie balances within acceptable tolerance
- **Discrepancy Visibility**: When calculated balance doesn't match actual, the gap is clearly visible and adjustable
- **Source Coverage**: Maximize % of bookie activity captured through tracker entries and bank transactions
- **Adjustment Audit Trail**: All manual adjustments recorded with reason, maintaining full traceability
- **Operational Efficiency**: Reduce time spent on manual balance checking by 90%
- **User Confidence**: Users trust the calculated balance enough to operate without constant bookie logins

### Key Performance Indicators (KPIs)

| KPI | Definition | Target |
|-----|------------|--------|
| **Tracker Coverage** | % of actual bets captured in Racing Tracker / Lay Manager | > 95% |
| **Bank Transaction Matching** | % of deposits/withdrawals linked to journal entries | > 95% |
| **Balance Variance** | Average difference between calculated and actual balance | < $10 per account |
| **Adjustment Frequency** | How often manual adjustments needed per account | < 1 per month |
| **Time to Reconcile** | Time to review and adjust a single account discrepancy | < 2 minutes |

### The Reconciliation Model

```
CALCULATED BALANCE
= Last Confirmed Balance
+ Deposits (from Bank Transactions)
- Withdrawals (from Bank Transactions)
+ Wins (from Tracker Entries)
- Losses (from Tracker Entries)
+ Bonus Credits (from Deposit Match / Promo Module)
- Bonus Used (from Tracker - bonus bet stakes)
+/- Manual Adjustments (documented)

        ↓ Compare to ↓

ACTUAL BALANCE
(User periodically inputs actual balance from bookie login)

        ↓ If variance ↓

VARIANCE ANALYSIS
- Review recent tracker entries (missed bet?)
- Review bank transactions (missed deposit/withdrawal?)
- Check for pending bets not yet settled
- Apply adjustment with documented reason
```

---

## MVP Scope

### Core Features (Must Have)

| Feature | Description | Rationale |
|---------|-------------|-----------|
| **Journal Engine** | Every transaction generates balanced debit/credit entries automatically | Foundation of double-entry system |
| **Chart of Accounts** | Account structure: Bookie Cash, Bookie Bonus, Betfair Balance, Bank, Pending Bets, Income, Expenses | Required structure for journal entries |
| **General Ledger** | Account balances derived from sum of journal postings | Ensures balances reconcile to transactions |
| **Racing Tracker Integration** | Bet placed/settled events create journal entries | Source 1 integration |
| **Lay Manager Integration** | Matched bet events create journal entries | Source 2 integration |
| **Bank Transaction Integration** | Deposits/withdrawals create journal entries | Source 3 integration |
| **Deposit Match Integration** | Promotional deposits create linked entries | Source 4 integration |
| **Bookie Balance Dashboard** | View all bookie balances (cash + bonus) on single screen | Primary user need |
| **Manual Adjustment Entry** | Create adjustment journal entries with documented reason | Bridge calculated vs actual gaps |
| **Actual Balance Input** | User can record actual balance for comparison | Enables variance detection |
| **Variance View** | Show calculated vs actual balance with difference highlighted | Identify accounts needing attention |
| **True P&L Report** | Profit/Loss clearly separated from bonus tracking | Answers "What's my actual profit?" |
| **Transaction Drilldown** | Click any balance to see constituent journal entries | Full traceability requirement |

### Out of Scope for MVP

| Feature | Reason for Exclusion |
|---------|----------------------|
| Automated Drift Alerts | Nice-to-have; manual review sufficient for MVP |
| Bank Reconciliation Workflow | Complex UX; defer to post-MVP |
| Historical Data Migration | Focus on new transactions; backfill via adjustments |
| Multi-Currency Support | All AUD for now |
| Betfair API Integration | Manual entry for MVP |
| Advanced Analytics / Trends | P&L report is sufficient |

### MVP Success Criteria

1. Every new bet automatically generates correct journal entries
2. Every deposit/withdrawal creates journal entries that update bookie balances
3. Every bonus credit is recorded separately from cash balance
4. Bookie balances on dashboard match sum of journal postings
5. User can input actual balance and see variance from calculated
6. Manual adjustments are recorded with reason and reflected in ledger
7. P&L report shows true profit without deposit match confusion
8. Any balance can be drilled down to its source transactions

---

## Post-MVP Vision

*Scoped to Accounts Module enhancements only*

### Phase 2 Features

| Feature | Description |
|---------|-------------|
| **Bank Reconciliation Workflow** | Dedicated UI to match Basiq transactions against journal entries |
| **Automated Variance Alerts** | Notify when calculated vs actual balance exceeds threshold |
| **Balance Snapshot History** | Track actual balance inputs over time |
| **Bulk Adjustment Import** | Import multiple adjustments from CSV |
| **Account Health Dashboard** | Summary view: accounts in good standing vs needing reconciliation |
| **Period Close** | Lock journal entries for a period; carry forward balances |

### Long-term Vision

| Feature | Description |
|---------|-------------|
| **Betfair API Integration** | Pull actual Betfair balance and transaction history directly |
| **Multi-Profile Consolidation** | Aggregate P&L across multiple betting profiles |
| **Tax Reporting** | Generate tax-ready profit reports for financial year |
| **Cashflow Forecasting** | Project future balances based on planned bets |
| **Advanced P&L Analytics** | Profit by bookie, by bet type, by promotion type, over time |

---

## Technical Considerations

### Existing Stack (No Changes)

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TanStack Start, TypeScript |
| UI Components | MUI X DataGrid Premium, Tailwind CSS |
| Routing | TanStack Router (file-based) |
| Backend | TanStack Server Functions |
| Database | PostgreSQL + Prisma ORM |
| Banking API | Basiq (Open Banking) |

### Chart of Accounts Structure

```
ASSETS (Debit increases, Credit decreases)
├── BOOKIE_CASH (one per bookie - 110+)
│   ├── Sportsbet Cash
│   ├── Ladbrokes Cash
│   └── ...
├── BOOKIE_BONUS (one per bookie)
│   ├── Sportsbet Bonus
│   ├── Ladbrokes Bonus
│   └── ...
├── BETFAIR_AVAILABLE
├── BANK (two accounts)
│   ├── Bookie Bank Account
│   └── Betfair Bank Account
└── PENDING_BETS
    ├── Pending Back Bets
    └── Pending Lay Bets

LIABILITIES (Credit increases, Debit decreases)
└── BETFAIR_LIABILITY (lay bet exposure)

INCOME (Credit increases, Debit decreases)
├── BACK_BET_WINS
├── LAY_BET_WINS
└── BONUS_INCOME

EXPENSES (Debit increases, Credit decreases)
├── BACK_BET_LOSSES
├── LAY_BET_PAYOUTS
├── QUALIFYING_LOSS
├── BETFAIR_COMMISSION
└── BONUS_EXPIRED

EQUITY (Credit increases, Debit decreases)
└── MANUAL_ADJUSTMENTS
```

### Account Code Convention

| Prefix | Type | Example |
|--------|------|---------|
| 1xxx | Asset - Bookie Cash | 1001 Sportsbet Cash |
| 12xx | Asset - Bookie Bonus | 1201 Sportsbet Bonus |
| 1300 | Asset - Betfair | 1300 Betfair Available |
| 1400 | Asset - Bank | 1401 Bookie Bank, 1402 Betfair Bank |
| 1500 | Asset - Pending | 1501 Pending Back, 1502 Pending Lay |
| 2xxx | Liability | 2001 Betfair Lay Liability |
| 4xxx | Income | 4001 Back Wins, 4002 Lay Wins, 4003 Bonus Income |
| 5xxx | Expense | 5001-5005 Various expenses |
| 3xxx | Equity | 3001 Manual Adjustments |

### Database Schema: New Account Table

```prisma
enum AccountCategory {
  ASSET
  LIABILITY
  INCOME
  EXPENSE
  EQUITY
}

enum AccountSubType {
  // Assets
  BOOKIE_CASH
  BOOKIE_BONUS
  BETFAIR_AVAILABLE
  BANK
  PENDING_BACK
  PENDING_LAY
  // Liabilities
  BETFAIR_LIABILITY
  // Income
  BACK_BET_WINS
  LAY_BET_WINS
  BONUS_INCOME
  // Expenses
  BACK_BET_LOSSES
  LAY_BET_PAYOUTS
  QUALIFYING_LOSS
  BETFAIR_COMMISSION
  BONUS_EXPIRED
  // Equity
  ADJUSTMENT
}

model Account {
  id              String          @id @default(uuid())
  profileId       String
  code            String          // e.g., "1001", "1201"
  name            String          // e.g., "Sportsbet Cash"
  category        AccountCategory
  subType         AccountSubType
  bookieId        Int?
  bookieName      String?
  bankName        String?
  isActive        Boolean         @default(true)
  isSystemAccount Boolean         @default(false)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  profile         Profile         @relation(...)
  bookie          Bookie?         @relation(...)
  ledgerEntries   AccountLedger[]

  @@unique([profileId, code])
  @@unique([profileId, subType, bookieId])
}
```

### Database Schema: Enhanced AccountLedger

```prisma
enum LedgerStatus {
  PENDING
  POSTED
  REVERSED
}

enum LedgerSourceType {
  RACING_TRACKER
  LAY_MANAGER
  BANK_DEPOSIT
  BANK_WITHDRAWAL
  DEPOSIT_MATCH
  BONUS_CREDIT
  BONUS_EXPIRY
  MANUAL_ADJUSTMENT
}

model AccountLedger {
  id                String           @id @default(uuid())
  profileId         String
  accountId         String

  // Double-entry fields
  debit             Decimal          @default(0) @db.Decimal(10, 2)
  credit            Decimal          @default(0) @db.Decimal(10, 2)

  // Entry details
  entryDate         DateTime         @db.Date
  description       String
  reference         String?
  journalGroupId    String           // Groups related debit/credit entries

  // Source tracking
  sourceType        LedgerSourceType
  sourceId          String?
  status            LedgerStatus     @default(POSTED)

  // Existing source links (keep)
  bankTransactionId String?
  trackerEntryId    String?
  layManagerEntryId String?
  bonusCreditId     String?

  // Reconciliation
  isReconciled      Boolean          @default(false)
  reconciledAt      DateTime?

  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  account           Account          @relation(...)
  profile           Profile          @relation(...)
}
```

### Balance Calculation: Database View

```sql
CREATE VIEW AccountBalanceView AS
SELECT
  a.id as accountId,
  a.profileId,
  a.code,
  a.name,
  a.category,
  a.subType,
  a.bookieId,
  a.bookieName,
  COALESCE(SUM(l.debit), 0) - COALESCE(SUM(l.credit), 0) as balance
FROM Account a
LEFT JOIN AccountLedger l ON l.accountId = a.id AND l.status = 'POSTED'
GROUP BY a.id;
```

Balance is always derived from journal entries - no manual override of balance values.

### Betfair Commission: Dynamic Rate

Commission rates vary by state/track. Existing `StateCommissionRate` table provides lookup:

```prisma
model StateCommissionRate {
  code        String   @id    // "NSW", "VIC", "QLD"
  name        String
  defaultRate Decimal          // 5.00, 7.00, 10.00
  tracks      Track[]
}
```

Commission calculated at settlement: `Lay Profit x (rate / 100)`

### Multi-Leg Bet Support

For SRM, Multi, SGM, Quaddie support:

```prisma
enum BetType {
  WIN           // Single win bet
  PLACE         // Single place bet
  EACH_WAY      // Win + Place combined
  SRM           // Same Race Multi
  MULTI         // Multi-leg accumulator
  SGM           // Same Game Multi (sports)
  QUADDIE       // 4-race combined
  EXOTIC        // Trifecta, Quinella, First4, etc.
}

model RacingTrackerEntry {
  // ... existing fields ...

  betType           BetType       @default(WIN)
  isMultiLeg        Boolean       @default(false)
  parentBetId       String?
  legNumber         Int?
  legCount          Int?
  combinedOdds      Decimal?      @db.Decimal(10, 3)

  parentBet         RacingTrackerEntry?  @relation("MultiLegs", ...)
  legs              RacingTrackerEntry[] @relation("MultiLegs")
}
```

Multi-leg bets: One parent entry holds stake/P&L, child entries hold individual leg details.

---

## Transaction Flows (Detailed)

### Flow 1: Bank Deposit to Bookie

User deposits $100 from Bookie Bank Account to Sportsbet.

| Account | Debit | Credit |
|---------|-------|--------|
| Sportsbet Cash | $100.00 | |
| Bookie Bank Account | | $100.00 |

### Flow 2: Back-Only Bet Placed

$50 back bet on Sportsbet @ 3.00 odds.

| Account | Debit | Credit |
|---------|-------|--------|
| Pending Back Bets | $50.00 | |
| Sportsbet Cash | | $50.00 |

Status: `PENDING`

### Flow 3: Back-Only Bet Wins

$50 bet @ 3.00 wins. Returns $150.

| Account | Debit | Credit |
|---------|-------|--------|
| Sportsbet Cash | $150.00 | |
| Pending Back Bets | | $50.00 |
| Back Bet Wins | | $100.00 |

### Flow 4: Back-Only Bet Loses

$50 bet loses.

| Account | Debit | Credit |
|---------|-------|--------|
| Back Bet Losses | $50.00 | |
| Pending Back Bets | | $50.00 |

### Flow 5: Matched Bet Placed

Back $50 on Ladbrokes @ 4.00, Lay $66.67 on Betfair @ 4.00 (liability $200).

| Account | Debit | Credit |
|---------|-------|--------|
| Pending Back Bets | $50.00 | |
| Ladbrokes Cash | | $50.00 |
| Pending Lay Bets | $200.00 | |
| Betfair Available | | $200.00 |

### Flow 6: Matched Bet - Back Wins (Lay Loses)

Back returns $200, lay pays out $200 liability.

| Account | Debit | Credit |
|---------|-------|--------|
| Ladbrokes Cash | $200.00 | |
| Pending Back Bets | | $50.00 |
| Back Bet Wins | | $150.00 |
| Lay Bet Payouts | $200.00 | |
| Pending Lay Bets | | $200.00 |

Net: +$150 - $200 = **-$50 qualifying loss**

### Flow 7: Matched Bet - Lay Wins (Back Loses)

Back loses, lay wins $63.34 after 5% commission.

| Account | Debit | Credit |
|---------|-------|--------|
| Back Bet Losses | $50.00 | |
| Pending Back Bets | | $50.00 |
| Betfair Available | $263.34 | |
| Pending Lay Bets | | $200.00 |
| Lay Bet Wins | | $66.67 |
| Betfair Commission | $3.33 | |

Net: -$50 + $63.34 = **+$13.34 profit**

### Flow 8: Deposit Match

Deposit $100 to Sportsbet, receive $100 bonus.

| Account | Debit | Credit |
|---------|-------|--------|
| Sportsbet Cash | $100.00 | |
| Bookie Bank Account | | $100.00 |
| Sportsbet Bonus | $100.00 | |
| Bonus Income | | $100.00 |

### Flow 9: Bonus Bet Placed

$100 Sportsbet bonus @ 3.00 odds.

| Account | Debit | Credit |
|---------|-------|--------|
| Pending Back Bets | $100.00 | |
| Sportsbet Bonus | | $100.00 |

### Flow 10: Bonus Bet Wins

$100 bonus @ 3.00 wins. Returns $200 (profit only, stake not returned).

| Account | Debit | Credit |
|---------|-------|--------|
| Sportsbet Cash | $200.00 | |
| Pending Back Bets | | $100.00 |
| Back Bet Wins | | $100.00 |

### Flow 11: Bonus Bet Loses

$100 bonus bet loses.

| Account | Debit | Credit |
|---------|-------|--------|
| Qualifying Loss | $100.00 | |
| Pending Back Bets | | $100.00 |

### Flow 12: Bonus Expires

$50 Ladbrokes bonus expires unused.

| Account | Debit | Credit |
|---------|-------|--------|
| Bonus Expired | $50.00 | |
| Ladbrokes Bonus | | $50.00 |

### Flow 13: Withdrawal

Withdraw $500 from Sportsbet to Bookie Bank.

| Account | Debit | Credit |
|---------|-------|--------|
| Bookie Bank Account | $500.00 | |
| Sportsbet Cash | | $500.00 |

### Flow 14: Manual Adjustment

Calculated balance $100 short of actual.

| Account | Debit | Credit |
|---------|-------|--------|
| Sportsbet Cash | $100.00 | |
| Manual Adjustments | | $100.00 |

Notes: "Balance correction - missed $100 deposit on 15/12"

---

## Constraints & Assumptions

### Constraints

| Category | Constraint | Impact |
|----------|------------|--------|
| **Data Source** | No direct API access to bookie account statements | Balances calculated from tracker + bank; manual adjustments bridge gaps |
| **Data Source** | Betfair API not integrated (yet) | Betfair balance entered manually or derived from lay manager |
| **Accuracy** | Balance accuracy depends on user recording all bets | System only as accurate as data entered |
| **Migration** | Existing data in old format | New system starts fresh; old data via adjustments |
| **Tech Stack** | Must use existing stack | No new frameworks |
| **Performance** | 110+ bookie accounts per profile | Queries must handle aggregation efficiently |

### Key Assumptions

| Assumption | Rationale |
|------------|-----------|
| Users will record all bets via Planner -> Tracker flow | Primary data entry path |
| Bank transactions imported via Basiq or entered manually | Basiq provides bank feed |
| Users will periodically verify actual balances | Calculated balances need validation |
| Manual adjustments are acceptable and expected | Documented corrections, not failures |
| Single currency (AUD) | All bookies operate in AUD |
| Bonus bets don't return stake | Standard Australian bookie behavior |

---

## Risks & Open Questions

### Key Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Balance drift from missed entries | High | Medium | Clear UI prompts; variance dashboard; easy adjustments |
| Migration complexity | Medium | High | Parallel systems; validate before deprecating |
| Performance with 110+ accounts | Low | Medium | Database view with indexes; materialized view if needed |
| User adoption friction | Medium | Medium | Minimal workflow changes; journal automatic |

### Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Starting balances | User inputs actual balance -> "Opening Balance" journal entry |
| Pending bets at cutover | N/A - starting fresh |
| Old AccountLedger data | Migrate if needed; starting fresh is cleaner |
| Multi-leg / exotic bets | Supported via betType + parent/leg structure |

### Areas Needing Further Research

| Area | Next Step |
|------|-----------|
| Basiq transaction categorization | Review Basiq data; build matching rules |
| Betfair API feasibility | Research API access and costs |
| Report requirements | Define P&L report specs |
| Tax implications | Review ATO guidance |

---

## Next Steps

### Immediate Actions

| # | Action | Owner |
|---|--------|-------|
| 1 | Finalize Project Brief | PM |
| 2 | Create PRD with epics and stories | PM |
| 3 | Review proposed schema changes | Architect |
| 4 | Validate transaction flow logic | Dev |
| 5 | Define migration strategy | Architect |

### PM Handoff

This Project Brief provides complete context for the **Accounts Module Enhancement** feature.

**To create the PRD:**

Use this Project Brief as input. Create a PRD with:
- Functional and non-functional requirements derived from the transaction flows
- Epics covering: Schema changes, Journal engine, Balance views, UI updates, Migration
- Stories sized for AI agent execution (2-4 hour chunks)
- Acceptance criteria based on the debit/credit logic documented here

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2024-12-30 | 1.0 | Initial Project Brief | PM (John) |
