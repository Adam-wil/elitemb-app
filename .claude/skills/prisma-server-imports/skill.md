---
name: prisma-server-imports
description: Enforce dynamic imports for Prisma in TanStack Start server functions. Use this skill when creating or modifying .server.ts files that use Prisma. Prevents client-side bundling errors by requiring dynamic imports inside handlers instead of top-level imports.
---

# Prisma Dynamic Imports for Server Functions

This skill ensures Prisma is imported correctly in TanStack Start server functions to prevent client-side bundling errors.

## The Problem

When using TanStack Start with Prisma and the `pg` PostgreSQL driver, you'll get this error if Prisma is imported at the top level of a `.server.ts` file:

```
SyntaxError: The requested module '/node_modules/pg/lib/index.js'
does not provide an export named 'default'
```

### Why This Happens

1. **Vite analyzes ALL imports at build time** - Even in `.server.ts` files, Vite follows the entire import chain for both client and server bundles
2. **Top-level imports are analyzed immediately** - When a React component imports from a `.server.ts` file, Vite sees all top-level imports
3. **The `pg` package is Node.js-only** - It's a CommonJS module that doesn't work in browsers
4. **`createServerFn()` doesn't prevent bundling** - The RPC execution stays on server, but import analysis happens at build time

### Import Chain That Breaks

```
Component.tsx
  → imports getDataServer from ./server.ts
    → server.ts has: import prisma from '@/lib/prisma.server'
      → prisma.server.ts imports: @prisma/adapter-pg
        → @prisma/adapter-pg imports: pg
          → pg is CommonJS-only = ERROR in browser bundle
```

---

## The Solution: Dynamic Imports

Move Prisma imports INSIDE handler functions using dynamic `await import()`. This defers the import to runtime on the server, preventing client-side bundling.

### Required Pattern

Every `.server.ts` file that uses Prisma MUST follow this pattern:

```typescript
import { createServerFn } from '@tanstack/react-start'
// NO top-level prisma import!

// Dynamic import helper - prevents prisma from being bundled for client
async function getPrisma() {
  const { default: prisma } = await import('@/lib/prisma.server')
  return prisma
}

// In each handler, call getPrisma() first
export const getDataServer = createServerFn({ method: 'GET' })
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    return prisma.user.findMany()
  })

export const createDataServer = createServerFn({ method: 'POST' })
  .inputValidator((d: { name: string }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    return prisma.user.create({ data: { name: data.name } })
  })
```

---

## Code Examples

### WRONG - Top-level Import

```typescript
// BAD - This will cause bundling errors
import { createServerFn } from '@tanstack/react-start'
import prisma from '@/lib/prisma.server'  // WRONG: top-level import

export const getUsersServer = createServerFn({ method: 'GET' })
  .handler(async () => {
    return prisma.user.findMany()
  })
```

### CORRECT - Dynamic Import

```typescript
// GOOD - Dynamic import inside handler
import { createServerFn } from '@tanstack/react-start'

async function getPrisma() {
  const { default: prisma } = await import('@/lib/prisma.server')
  return prisma
}

export const getUsersServer = createServerFn({ method: 'GET' })
  .handler(async () => {
    const prisma = await getPrisma()
    return prisma.user.findMany()
  })
```

### Multiple Handlers in One File

```typescript
import { createServerFn } from '@tanstack/react-start'

// Single helper used by all handlers
async function getPrisma() {
  const { default: prisma } = await import('@/lib/prisma.server')
  return prisma
}

export const listUsersServer = createServerFn({ method: 'GET' })
  .handler(async () => {
    const prisma = await getPrisma()
    return prisma.user.findMany()
  })

export const getUserServer = createServerFn({ method: 'GET' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    return prisma.user.findUnique({ where: { id: data.id } })
  })

export const createUserServer = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; name: string }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    return prisma.user.create({ data })
  })

export const deleteUserServer = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    await prisma.user.delete({ where: { id: data.id } })
    return { success: true }
  })
```

---

## Checklist for New Server Files

When creating a new `.server.ts` file that uses Prisma:

1. **DO NOT** add `import prisma from '@/lib/prisma.server'` at top of file
2. **DO** add the `getPrisma()` helper function
3. **DO** call `const prisma = await getPrisma()` as first line in each handler
4. **DO** use the returned `prisma` instance for all database operations

---

## Common Mistakes

### Mistake 1: Importing Prisma Types at Top Level

```typescript
// This is FINE - types are stripped at compile time
import type { User, Post } from '@prisma/client'

// This is WRONG - actual module import
import { PrismaClient } from '@prisma/client'
```

### Mistake 2: Destructuring in Import

```typescript
// WRONG - still a top-level import
import { prisma } from '@/lib/prisma.server'

// CORRECT - dynamic import
async function getPrisma() {
  const { default: prisma } = await import('@/lib/prisma.server')
  return prisma
}
```

### Mistake 3: Forgetting to Await

```typescript
// WRONG - getPrisma returns a Promise
export const getDataServer = createServerFn({ method: 'GET' })
  .handler(async () => {
    const prisma = getPrisma()  // Missing await!
    return prisma.user.findMany()  // Error: prisma.user is undefined
  })

// CORRECT
export const getDataServer = createServerFn({ method: 'GET' })
  .handler(async () => {
    const prisma = await getPrisma()  // Await the import
    return prisma.user.findMany()
  })
```

---

## Why Vite Config Doesn't Fix This

You might try these Vite config workarounds - none solve the root cause:

| Attempted Fix | Why It Doesn't Work |
|---------------|---------------------|
| `ssr.external: ['pg']` | Only affects SSR bundling, not client bundling |
| `ssr.noExternal` | Same issue, wrong scope |
| `optimizeDeps.exclude: ['pg']` | Prevents pre-bundling but not import analysis |
| Custom Vite plugin to stub | Causes "missing export" errors downstream |
| `server-only` package | Not compatible with TanStack Start/Vite |

**The only reliable fix is dynamic imports inside handlers.**

---

## Quick Reference

### Template for New Server File

```typescript
/**
 * [Description of what this server file does]
 */

import { createServerFn } from '@tanstack/react-start'
// Import types only - these are stripped at compile time
import type { User } from '@prisma/client'

// Dynamic import helper - prevents prisma from being bundled for client
async function getPrisma() {
  const { default: prisma } = await import('@/lib/prisma.server')
  return prisma
}

// ============================================================================
// Server Functions
// ============================================================================

export const exampleServer = createServerFn({ method: 'GET' })
  .handler(async () => {
    const prisma = await getPrisma()
    // Your database logic here
  })
```

### Files in This Project Using This Pattern

All `.server.ts` files that use Prisma follow this pattern:
- `src/modules/accounts/api/db/*.server.ts`
- `src/modules/lay-manager/api/db/*.server.ts`
- `src/modules/the-furlong/api/db/*.server.ts`
- `src/modules/accounts/utils/*.server.ts`
- `src/modules/the-furlong/utils/*.server.ts`

---

## Summary

| Rule | Description |
|------|-------------|
| **Never** | Top-level `import prisma from '@/lib/prisma.server'` |
| **Always** | Use `getPrisma()` helper with dynamic import |
| **Always** | Call `await getPrisma()` first in every handler |
| **OK** | Top-level `import type { ... } from '@prisma/client'` |
