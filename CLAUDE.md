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