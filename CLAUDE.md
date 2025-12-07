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
- MUI X DataGrid Pro (editable data grids)
- Vite (build tool)