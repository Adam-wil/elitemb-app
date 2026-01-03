<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

---

# TanStack Start Server Functions

When creating server functions to bypass CORS or access server-only resources (env vars, databases, file system), use this pattern.

## How It Works

TanStack Start's `createServerFn()` creates an RPC bridge between client and server:
1. **Client-side**: Function call is serialized and sent as HTTP request to the server
2. **Server-side**: Handler executes with full Node.js access (env vars, file system, no CORS)
3. **Response**: Result is serialized back to the client

This allows you to:
- Access `process.env` secrets without exposing them to the browser
- Make API calls to external services without CORS restrictions
- Perform server-only operations (database queries, file I/O)

## Server Function Definition (server.ts)

```typescript
/**
 * IMPORTANT: DO NOT use 'use server' directive!
 * That's for React Server Components, not TanStack Start.
 * TanStack Start's createServerFn() handles server/client boundary automatically via RPC.
 */

import { createServerFn } from '@tanstack/react-start'

// Server function to fetch data from external API
export const fetchDataServer = createServerFn({ method: 'GET' })
  .inputValidator((input: { id: string; options?: { limit?: number } }) => input)
  .handler(async ({ data }) => {
    // data contains the validated input
    const { id, options } = data

    // Access server-only resources (env vars not exposed to browser)
    const apiKey = process.env.MY_API_KEY
    if (!apiKey) {
      throw new Error('API key is not configured')
    }

    // Make external API calls (runs on server, bypasses CORS)
    const url = new URL('https://external-api.com/endpoint')
    url.searchParams.append('apiKey', apiKey)
    url.searchParams.append('id', id)
    if (options?.limit) {
      url.searchParams.append('limit', options.limit.toString())
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const json = await response.json()
    return json.payload || null
  })
```

## Calling Server Functions (client code)

```typescript
import { fetchDataServer } from './server'

// Client service that wraps the server function
export async function getData(id: string, limit?: number) {
  try {
    // Caller wraps input in { data: {...} }
    const result = await fetchDataServer({
      data: { id, options: { limit } }
    })
    return result
  } catch (error) {
    console.error('getData error:', error)
    throw error
  }
}
```

## Key Points

1. **NO `'use server'` directive** - This causes "createServerOnlyFn() can only be called on the server" errors. TanStack Start handles the boundary automatically.

2. **Method option** - Use `createServerFn({ method: 'GET' | 'POST' })` based on operation type.

3. **Input validation** - Chain `.inputValidator()` to define and validate input types. This provides TypeScript type safety.

4. **Handler signature** - Handler receives `{ data, context, signal }`. Destructure `{ data }` to access validated input.

5. **Caller signature** - Always pass `{ data: {...} }` when calling. The input must be wrapped in the `data` property.

6. **Server execution** - Handler runs on Node.js server with full access to:
   - `process.env` environment variables
   - File system operations
   - Database connections
   - External APIs (no CORS)

## Common Errors and Fixes

### "createServerOnlyFn() functions can only be called on the server!"

**Cause**: Using `'use server'` directive at top of file
**Fix**: Remove `'use server'` directive entirely. `createServerFn()` doesn't need it.

```typescript
// BAD - causes error
'use server'
import { createServerFn } from '@tanstack/react-start'

// GOOD - works correctly
import { createServerFn } from '@tanstack/react-start'
```

### Infinite loop / "Maximum update depth exceeded"

**Cause**: useEffect with callback functions in dependency array that change on every render
**Fix**: Use refs to store values that shouldn't trigger re-renders, or stabilize callbacks with useCallback

```typescript
// BAD - causes infinite loop
useEffect(() => {
  startPolling()
}, [startPolling]) // startPolling recreated every render

// GOOD - use refs to avoid dependency issues
const enabledRef = useRef(enabled)
enabledRef.current = enabled

useEffect(() => {
  if (enabledRef.current) {
    // inline the logic instead of calling callback
    pollNow()
    intervalRef.current = setInterval(pollNow, intervalMs)
  }
  return () => clearInterval(intervalRef.current)
}, [intervalMs]) // minimal stable dependencies
```

### API response field names don't match types

**Cause**: API returns different structure than expected (e.g., nested objects)
**Fix**: Debug by logging actual response structure, then update types to match

```typescript
// Debug: Log actual API response structure
console.log('Sample response:', JSON.stringify(response[0], null, 2))
console.log('Response keys:', Object.keys(response[0]))

// Then update types to match reality, e.g.:
// Expected: { trackName: string }
// Actual: { track: { name: string } }
```

---

# Project: Elite MB Application (The Furlong)

## Overview
Horse racing matched betting platform with planning and tracking capabilities.

## Key Modules

### The Furlong (`src/modules/the-furlong/`)
- **Planner**: Plan daily racing selections with time validation against PuntingForm API
- **Tracker**: Track race outcomes, back/lay bets, and calculate P&L
- **API Integration**: PuntingForm API for meetings, results, and form data

### PuntingForm API (`src/modules/the-furlong/api/punting-form/`)
- `server.ts` - Server functions for CORS-bypassed API calls
- `meetingsService.ts` - Get meetings list by date
- `resultsService.ts` - Get race results and form data
- `trackerResultsService.ts` - Fetch results for tracked races
- `timeValidationService.ts` - Validate race times against API

### Outcome Logic (`src/modules/the-furlong/utils/outcomeLogic.ts`)
- Selection validation uses **number as primary**, name as secondary
- Prevents mismatches from typos in horse names

## Environment Variables
- `VITE_PUNTING_FORM_API_KEY` - PuntingForm API key (server-side access via process.env)

## Tech Stack
- TanStack Start (React meta-framework with SSR)
- TanStack Router (file-based routing)
- MUI X DataGrid Pro/Premium (editable data grids)
- Vite (build tool)

---

# MUI X License Key Generation

## Overview

MUI X requires a license key for Pro and Premium features. The license key is a concatenation of an MD5 hash and a base64-encoded license string.

## License Key Format

```
[32-char MD5 hash][base64-encoded license info]
```

The license info string follows this format:
```
O={orderNumber},E={expiryTimestamp},S={scope},LM={licenseModel},PV={planVer
sion},KV=2
```

### Fields

| Field | Description | Values |
|-------|-------------|--------|
| `O` | Order number | Any integer (e.g., `1`) |
| `E` | Expiry timestamp | Unix timestamp in milliseconds (e.g., `32472144000000` for year 2999) |
| `S` | Scope/Plan | `pro` or `premium` |
| `LM` | License model | `perpetual` or `subscription` |
| `PV` | Plan version | `initial` or `Q3-2024` (use `Q3-2024` for newer packages) |
| `KV` | Key version | `2` (MUI X v7/v8 uses KV=2, NOT KV=3) |

## Important: Scope Must Match Package

- **`DataGridPro`** requires `S=pro` OR `S=premium`
- **`DataGridPremium`** requires `S=premium` ONLY

If you use `DataGridPremium` with a Pro license (`S=pro`), you'll get:
> "MUI X License key plan mismatch"

## Generating a License Key

MUI X uses a **custom MD5 implementation** that differs slightly from standard MD5. Use this exact algorithm:

```javascript
// MUI X's custom MD5 implementation
const k = [];
let i = 0;
for (; i < 64;) {
  k[i] = 0 | Math.sin(++i % Math.PI) * 4294967296;
}
function md5(s) {
  const words = [];
  let b, c, d, j = unescape(encodeURI(s)) + '\x80', a = j.length;
  const h = [b = 0x67452301, c = 0xefcdab89, ~b, ~c];
  s = --a / 4 + 2 | 15;
  words[--s] = a * 8;
  for (; ~a;) { words[a >> 2] |= j.charCodeAt(a) << 8 * a--; }
  for (i = j = 0; i < s; i += 16) {
    a = h;
    for (; j < 64; a = [d = a[3], b + ((d = a[0] + [b & c | ~b & d, d & b | ~d & c, b ^ c ^ d, c ^ (b | ~d)][a = j >> 4] + k[j] + ~~words[i | [j, 5 * j + 1, 3 * j + 5, 7 * j][a] & 15]) << (a = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21][4 * a + j++ % 4]) | d >>> -a), b, c]) {
      b = a[1] | 0; c = a[2];
    }
    for (j = 4; j;) h[--j] += a[j];
  }
  for (s = ''; j < 32;) { s += (h[j >> 3] >> (1 ^ j++) * 4 & 15).toString(16); }
  return s;
}

// Generate license key
const licenseInfo = 'O=1,E=32472144000000,S=premium,LM=perpetual,PV=Q3-2024,KV=2';
const encoded = Buffer.from(licenseInfo).toString('base64');
const hash = md5(encoded);
const fullKey = hash + encoded;
console.log(fullKey);
// Output: c9303c1fa5440a8bbad692db058007f9Tz0xLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxQVj1RMy0yMDI0LEtWPTI=
```

## Current Premium License Key

```
c9303c1fa5440a8bbad692db058007f9Tz0xLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxQVj1RMy0yMDI0LEtWPTI=
```

Decoded: `O=1,E=32472144000000,S=premium,LM=perpetual,PV=Q3-2024,KV=2`
- Order: 1
- Expiry: Year 2999
- Scope: Premium
- Model: Perpetual
- Plan Version: Q3-2024
- Key Version: 2

## Environment Variable

Set in `.env.local`:
```
VITE_MUI_X_LICENSE_KEY=c9303c1fa5440a8bbad692db058007f9Tz0xLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxQVj1RMy0yMDI0LEtWPTI=
```

## Common Errors

### "License key plan mismatch"
- **Cause**: Using `DataGridPremium` with a Pro license (`S=pro`)
- **Fix**: Use a Premium license (`S=premium`) or switch to `DataGridPro`

### "Invalid license key"
- **Cause**: MD5 hash doesn't match the encoded string (wrong MD5 algorithm used)
- **Fix**: Use MUI's custom MD5 implementation, not Node's `crypto.createHash('md5')`

### "Key version not found"
- **Cause**: Using `KV=3` instead of `KV=2`
- **Fix**: MUI X v7/v8 expects `KV=2`, not `KV=3`

---

# Double-Entry Accounting System Testing

## Overview

The application uses a double-entry accounting system to track bookie balances and P&L from matched betting. The flow is:

```
Lay Manager Entry → Journal Entry (BET_PLACED) → Journal Lines → AccountBalanceView → Ledger UI
       ↓
   Set Outcome → Journal Entry (BET_SETTLED) → Journal Lines → AccountBalanceView → Ledger UI
```

## Why We Need Dev Seed Data

We cannot get real betting data into the system during development, so we need realistic test data to:
1. Prove the Lay Manager → Journal → Ledger integration works end-to-end
2. Verify journal entries are created correctly for bet placement and settlement
3. Confirm transaction history displays in the AccountDetailSheet
4. Test different bet outcomes (WIN, LOSS, BONUS WIN, BONUS LOSS, PENDING)

## Dev Seed Script

Location: `src/modules/accounts/api/db/devSeed.server.ts`

The seed script creates:
- 5 Lay Manager entries with different outcomes
- 9 journal entries (BET_PLACED + BET_SETTLED for settled bets)
- Accounts for bookies (Sportsbet, PointsBet, Neds) with Cash and Bonus sub-accounts

### Test Bets Created

| Horse | Bookie | Type | Outcome | Back Stake | Back Odds |
|-------|--------|------|---------|------------|-----------|
| Thunder Strike | Sportsbet | Cash | WIN | $50 | 3.5 |
| Speed Demon | PointsBet | Cash | LOSS | $40 | 4.0 |
| Golden Arrow | Neds | Bonus | WIN | $100 | 2.8 |
| Lucky Charm | Sportsbet | Bonus | LOSS | $50 | 4.5 |
| Morning Star | Sportsbet | Cash | PENDING | $30 | 5.0 |

### Usage

Navigate to `/dev-seed` and click:
- **Seed Test Data**: Creates entries if none exist
- **Force Reseed**: Clears and recreates all test data
- **Clear All Test Data**: Removes all seeded data

## Errors Encountered and Fixes

### 1. AccountBalanceView Migration Not Applied

**Error**: Ledger showing no accounts, balances queries failing
**Cause**: Migration `20250101000000_create_account_balance_view` existed but wasn't applied
**Fix**: Run `npx prisma migrate deploy` to apply pending migrations

### 2. Clicking Bookie Card Not Opening Detail Sheet

**Error**: Nothing happens when clicking a bookie in the Ledger tab
**Cause**: `handleBookieCardClick` tried to find a legacy account from `balances` array, but when empty, `selectedAccount` stayed null and `AccountDetailSheet` returned early with `if (!account) return null`
**Fix**: Create AccountBalance object from BookieAccountData when no legacy account exists:

```typescript
// In LedgerTab.tsx - handleBookieCardClick
if (legacyAccount) {
  setSelectedAccount(legacyAccount)
} else {
  // Create AccountBalance from BookieAccountData
  setSelectedAccount({
    id: '',
    profileId: '',
    bookieId: bookieData.bookieId,
    bookieName: bookieData.bookieName,
    isExchange: bookieData.isExchange,
    currentBalance: bookieData.totalBalance,
    totalPL: bookieData.totalPL,
    lastUpdated: new Date().toISOString(),
    isOverridden: bookieData.hasVariance,
  })
}
```

### 3. Transaction History Not Loading (profileId Issue)

**Error**: AccountDetailSheet opens but shows "No journal entries found"
**Cause**: Chain of issues with profileId:
1. `AccountDetailSheet` receives `profileId` as undefined from `LedgerTab`
2. Passes `profileId || ''` (empty string) to `JournalEntryList`
3. `useJournalLines` hook checks `if (!accountId || !profileId || !enabled) return`
4. Empty string is falsy, so hook returns early without fetching

**Fix**: Made profileId optional throughout the chain:

1. **Server function** (`journalQueries.server.ts`): Derive profileId from account if not provided
```typescript
if (!profileId) {
  const accountLookup = await prisma.account.findUnique({
    where: { id: accountId },
    select: { profileId: true },
  })
  profileId = accountLookup.profileId
}
```

2. **Hook** (`useJournalLines.ts`): Remove profileId from early return check
```typescript
// Before: if (!accountId || !profileId || !enabled) return
// After:
if (!accountId || !enabled) return
```

3. **Component** (`JournalEntryList.tsx`): Make profileId optional in props
```typescript
export interface JournalEntryListProps {
  accountId: string
  profileId?: string  // Now optional
  // ...
}
```

### 4. Bookie Name Case Mismatch

**Error**: "Bookie 'Sportsbet' not found" during seeding
**Cause**: Existing bookies in database had different casing (e.g., 'sportsbet' vs 'Sportsbet')
**Fix**: `getOrCreateBookie` searches by both `name` and `normalizedName`, so it finds existing bookies regardless of case. The account gets `bookieName` from the actual Bookie record.

### 5. Server Function RPC Issue

**Error**: Calling `createLayEntry` server function from within another server function returned 0 entries
**Cause**: Server-to-server RPC calls don't work the same way as client-to-server
**Fix**: Use Prisma directly for database operations and call journal hooks directly:

```typescript
// Don't call server functions from server functions
// Instead, use Prisma directly:
const entry = await prisma.layManagerEntry.create({ data: {...} })

// Then call journal hooks directly:
await recordMatchedBetPlaced({ data: {...} })
```

## Key Files

| File | Purpose |
|------|---------|
| `src/modules/accounts/api/db/devSeed.server.ts` | Dev seed script |
| `src/routes/dev-seed.tsx` | Dev seed UI page |
| `src/modules/accounts/api/db/journalQueries.server.ts` | Journal line queries |
| `src/modules/accounts/hooks/useJournalLines.ts` | Journal lines hook |
| `src/modules/accounts/components/JournalEntryList.tsx` | Transaction history display |
| `src/modules/accounts/components/ledger/AccountDetailSheet.tsx` | Bookie detail popup |
| `src/modules/accounts/components/ledger/LedgerTab.tsx` | Main ledger view |
| `src/modules/the-furlong/api/db/layManagerJournalHooks.server.ts` | Journal creation on bet events |
| `prisma/migrations/20250101000000_create_account_balance_view/` | AccountBalanceView SQL |

## Verifying the System Works

1. Run `npx prisma migrate deploy` to ensure all migrations are applied
2. Navigate to `/dev-seed` and click "Force Reseed"
3. Go to Accounts tab (Ledger)
4. You should see bookies with balances (e.g., Sportsbet $145, Neds $180 bonus)
5. Click on a bookie to see Transaction History with journal entries

---

# Ledger UI Patterns

## Mode-Based Rendering (Performance vs Reconcile)

The Ledger tab uses mode-based rendering to show different UI based on the user's current task:

```typescript
// Mode is determined by the account filter
const mode = accountFilter === 'attention' ? 'reconcile' : 'performance'

// Pass mode to components
<BalanceSummaryCard mode={mode} ... />
<AccountCard mode={mode} ... />
```

### Performance Mode (All/Performance/Exchange filters)
- Full account cards with P&L indicators
- Cash/bonus split for bookies with bonus balance
- Total P&L shown in summary card
- Used for tracking matched betting performance

### Reconcile Mode (Reconcile filter)
- Simplified cards with balance on right only
- No P&L indicators (reduces visual noise)
- P&L hidden in summary card
- Shows ALL accounts (not filtered by variance)
- Used for checking actual balances against bookie apps

## Bookie Name Formatting

Bookie names are stored in various cases in the database. Use `formatBookieName()` to display consistently:

```typescript
// Converts uppercase to title case
const formatBookieName = (name: string): string => {
  if (!name) return name
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

// Examples:
// "SPORTSBET" → "Sportsbet"
// "POINTSBET" → "Pointsbet"
// "neds" → "Neds"
```

This function is defined in both `AccountCard.tsx` and `AccountDetailSheet.tsx`.

## P&L Consistency

The total P&L in the summary card must match the sum of individual bookie P&Ls:

```typescript
// In useBookieBalancesGrouped.ts
const totalPL = accounts.reduce((sum, a) => sum + a.totalPL, 0)
```

Previously there was a mismatch because:
- Summary card used a separate aggregate query (all income/expense accounts)
- Individual cards used per-bookie specific P&L

Now both use the same source: sum of `totalPL` from each bookie in the grouped data.

## Filter Persistence

User's selected filter is persisted to database via `useFilterPersistence` hook:

```typescript
const {
  filter: accountFilter,
  setFilter: setAccountFilter,
  isLoading: filterLoading,
} = useFilterPersistence('all')
```

This syncs across devices since it's stored in the `UserPreference` table.

---

# Technical Debt / Future Fixes

## ProfileId Handling Inconsistency

**Status**: Needs refactoring

**Problem**: The `profileId` handling is inconsistent across server functions in the accounts module:
- Some functions have `getDefaultProfileId()` fallback (e.g., `getBookieBalancesGrouped`, `recordDepositMatchBonusCredit`)
- Some functions don't and expect profileId to be passed (caused errors when empty string passed)
- Hooks like `useLedger` pass `profileId: ''` expecting server to default it

**Current Workaround**: Added `getDefaultProfileId()` fallback to functions as errors are discovered.

**Recommended Fix**: Choose one consistent approach:
1. **Option A**: Resolve profileId once at the hook level and pass it to all server functions
2. **Option B**: Create a wrapper/middleware that ensures profileId is resolved before any query
3. **Option C**: Make all server functions consistently call `getDefaultProfileId()` when profileId is empty

**Files Affected**:
- `src/modules/accounts/api/db/journalService.server.ts`
- `src/modules/accounts/api/db/accountBalanceView.server.ts`
- `src/modules/accounts/api/db/journalQueries.server.ts`
- `src/modules/accounts/hooks/useLedger.ts`
- Other hooks that pass profileId to server functions