# Project Context

## Purpose

The Edge is a centralized match betting platform designed to help users better manage their money and scale their betting operations. The application provides comprehensive cash flow tracking, bet management, and planning tools to organize and grow a profitable betting business.

### Core Value Proposition
- **Centralized Money Management**: Track all betting-related cash flow in one place, including bookmaker balances, bank account balances, and profit/loss across all activities
- **Comprehensive Bet Tracking**: Monitor every bet placed, automatically populated via Telegram tips and race results APIs
- **Daily Planning & Organization**: Plan daily bets in advance, ensuring organized and strategic betting decisions
- **Operational Scaling**: Tools to manage multiple profiles, bookmakers, and betting strategies simultaneously, enabling users to scale their betting operations efficiently

### Modular Architecture & Subscriptions

The application is built with a modular subscription model where users can purchase access to individual modules based on their betting activities:

**Core Platform** (Free - Available to all users):
- Main Dashboard (overarching multi-profile cumulative view)
- Profile Management (create, switch, manage multiple profiles)
- Banking Section:
  - Accounts (Basiq Open Banking integration)
  - Bookie Balance tracking
  - Bookie Health monitoring

**Furlong Module** (Paid Subscription - Horse Racing):
- Racing P&L Dashboard - Track profitability across all racing bets
- Planner - Plan daily racing bets in advance
- Tracker - Auto-populated bet tracking via Telegram User Client API
- Promo Tracker - Monitor promotional offers and their profitability
- Non-Promo Turnover - Track non-promotional betting activity
- Under the Radar - Track low-visibility betting opportunities
- Racing Bookie List - Manage bookmaker accounts and credentials

**Sports System Module** (Future Paid Subscription - Not Yet Designed):
- TBD - Will be developed and added in future phases
- Separate subscription from Furlong
- Will follow similar modular architecture pattern

### Module Access Control
- Users can purchase modules individually (à la carte model)
- Each module is a separate subscription with independent billing
- Core platform functionality (Dashboard, Banking, Profiles) is always accessible
- Module-based permissions enforced at both frontend (UI/routing) and backend (API) levels
- Database schema designed to support flexible module subscriptions per user

### User Benefits
1. **Financial Clarity**: See all betting-related money in one place - bank balances, bookie balances, pending bets, and profit/loss
2. **Automation**: Reduce manual data entry with automated race results (Punters Form API) and tip delivery (Telegram User Client API)
3. **Organization**: Plan daily bets in advance, track everything systematically, never miss an opportunity
4. **Scalability**: Manage multiple profiles, bookmakers, and strategies without losing track of cash flow or performance
5. **Cash Flow Management**: Monitor money movement between banks and bookmakers, ensuring sufficient funds for planned bets
6. **Flexible Pricing**: Pay only for the modules you need based on your betting activities

## Tech Stack

### Frontend (0.1-frontend)
- React 18+ with TypeScript
- Vite (build tool)
- React Query (server state management)
- Zustand (client state management)
- React Router v6 (with protected routes for module access)
- Tailwind CSS (recommended)
- Playwright (E2E testing, visual regression)
- Vitest (unit testing)
- ESLint + Prettier

### Backend (0.2-backend)
- Node.js 18+ LTS
- Express (API framework)
- TypeScript
- Supabase (PostgreSQL, Auth, Real-time subscriptions, Row Level Security)
- Semgrep (security scanning)
- Jest/Vitest (unit testing)
- Supertest (integration testing)
- ESLint + Prettier

### External APIs
- **Punters Form API** - Automated race results retrieval (Furlong module)
- **Telegram User Client API** - Listen to tipping channel for horse tips (Furlong module)
- **Basiq API** - Australian CDR-compliant Open Banking (Core platform)

### Development Tools & MCPs
- **Semgrep MCP** - Periodic security audits on both repos
- **Playwright MCP** - E2E testing, visual regression, design validation
- **GitHub Issues MCP** - Issue tracking and project management

## Project Conventions

### Code Style

#### Frontend (0.1)
**File Naming**:
- Components: PascalCase (`RacingTracker.tsx`)
- Hooks: camelCase with `use` prefix (`useRaceResults.ts`)
- Services: camelCase with `.service.ts` suffix (`api.service.ts`)
- Types: PascalCase with `.types.ts` suffix (`Bet.types.ts`)

**Component Structure**:
- Functional components with hooks only
- No class components

**Import Order**:
```typescript
// 1. React imports
import React, { useState, useEffect } from 'react';

// 2. External libraries
import { useQuery } from '@tanstack/react-query';

// 3. Internal components
import { Button } from '@/components/ui/Button';

// 4. Hooks
import { useAuth } from '@/hooks/useAuth';

// 5. Utils
import { formatCurrency } from '@/utils/format';

// 6. Types
import type { Bet } from '@/types/bet.types';
```

#### Backend (0.2)
**File Naming**:
- Routes: kebab-case with `.routes.ts` suffix (`auth.routes.ts`)
- Controllers: PascalCase with `.controller.ts` suffix (`AuthController.ts`)
- Services: camelCase with `.service.ts` suffix (`auth.service.ts`)
- Types: PascalCase with `.types.ts` suffix (`ApiResponse.types.ts`)

**Module Pattern for Integrations** (`services/integrations/[api-name]/`):
- `client.ts` - API client initialization
- `auth.ts` - Authentication logic (if needed)
- `[feature].ts` - Feature-specific endpoints
- `transformer.ts` - Data transformation/mapping
- `types.ts` - TypeScript interfaces
- `index.ts` - Public exports

**Import Order**:
```typescript
// 1. Node built-ins
import { createHash } from 'crypto';

// 2. External libraries
import express from 'express';

// 3. Internal modules
import { supabaseClient } from '@/config/supabase.config';

// 4. Services
import { ProfileService } from '@/services/supabase/profiles.service';

// 5. Types
import type { ApiResponse } from '@/types/api.types';
```

**Error Handling**: Centralized error handling middleware
**Logging**: Structured logging for all API calls

### Architecture Patterns

#### Repository Structure
```
the-edge/
├── 0.1-frontend/          (React + TypeScript + Vite)
│   ├── src/
│   │   ├── features/      (Feature-based organization)
│   │   │   ├── core/      (Always available - no subscription required)
│   │   │   │   ├── dashboard/
│   │   │   │   ├── banking/   (accounts, bookie-balance, bookie-health)
│   │   │   │   └── profiles/
│   │   │   ├── modules/   (Subscription-gated modules)
│   │   │   │   ├── furlong/   (Racing module - paid)
│   │   │   │   │   ├── tracker/
│   │   │   │   │   ├── planner/
│   │   │   │   │   ├── promo-tracker/
│   │   │   │   │   ├── non-promo-turnover/
│   │   │   │   │   ├── under-radar/
│   │   │   │   │   ├── bookie-list/
│   │   │   │   │   └── racing-dashboard/
│   │   │   │   └── sports/    (Future sports module - paid)
│   │   │   └── auth/
│   │   ├── components/    (ui, layout)
│   │   ├── hooks/
│   │   │   └── useModuleAccess.ts  (Check module subscription)
│   │   ├── services/      (API client wrappers)
│   │   ├── guards/        (Route guards for module access)
│   │   ├── types/
│   │   ├── utils/
│   │   └── config/
│   ├── tests/
│   │   ├── e2e/          (Playwright)
│   │   ├── unit/         (Vitest)
│   │   └── fixtures/
│   ├── .semgrep/
│   └── playwright.config.ts
│
└── 0.2-backend/           (Node.js + Express + TypeScript)
    ├── src/
    │   ├── api/
    │   │   ├── routes/
    │   │   │   ├── auth.routes.ts
    │   │   │   ├── profiles.routes.ts
    │   │   │   ├── subscriptions.routes.ts
    │   │   │   ├── banking.routes.ts
    │   │   │   ├── furlong/           (Module-specific routes)
    │   │   │   │   ├── bets.routes.ts
    │   │   │   │   ├── tracker.routes.ts
    │   │   │   │   └── planner.routes.ts
    │   │   │   └── sports/            (Future module routes)
    │   │   ├── controllers/
    │   │   ├── middleware/
    │   │   │   └── moduleAccess.middleware.ts  (Module permission checks)
    │   │   └── validators/
    │   ├── services/
    │   │   ├── supabase/
    │   │   │   ├── auth.service.ts
    │   │   │   ├── profiles.service.ts
    │   │   │   ├── subscriptions.service.ts
    │   │   │   └── database.service.ts
    │   │   └── integrations/
    │   │       ├── punters-form/      (Furlong module only)
    │   │       ├── telegram/          (Furlong module only)
    │   │       └── basiq/             (Core platform)
    │   ├── models/
    │   │   ├── User.ts
    │   │   ├── Profile.ts
    │   │   ├── Subscription.ts
    │   │   └── Module.ts
    │   ├── utils/
    │   ├── config/
    │   └── types/
    │       └── modules.types.ts       (Module permissions and enums)
    ├── tests/
    └── .semgrep/
```

#### Module Access Control Architecture

**Database Schema (Supabase)**:
```sql
-- Modules table (predefined modules)
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,  -- 'furlong', 'sports'
  display_name TEXT NOT NULL,  -- 'Furlong Racing', 'Sports System'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User subscriptions (which modules each user has access to)
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  status TEXT NOT NULL,  -- 'active', 'cancelled', 'expired'
  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- Row Level Security policies ensure users only see their subscriptions
```

**Frontend Module Access**:
```typescript
// hooks/useModuleAccess.ts
export const useModuleAccess = (moduleName: 'furlong' | 'sports') => {
  const { data: subscriptions } = useQuery(['subscriptions']);
  const hasAccess = subscriptions?.some(
    sub => sub.module_name === moduleName && sub.status === 'active'
  );
  return { hasAccess, isLoading };
};

// guards/ModuleGuard.tsx
export const ModuleGuard = ({ 
  module, 
  children, 
  fallback 
}: ModuleGuardProps) => {
  const { hasAccess, isLoading } = useModuleAccess(module);
  
  if (isLoading) return <LoadingSpinner />;
  if (!hasAccess) return fallback || <UpgradePrompt module={module} />;
  
  return <>{children}</>;
};

// Usage in routes
<Route path="/furlong/*" element={
  <ModuleGuard module="furlong">
    <FurlongModule />
  </ModuleGuard>
} />
```

**Backend Module Middleware**:
```typescript
// middleware/moduleAccess.middleware.ts
export const requireModule = (moduleName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const hasAccess = await SubscriptionService.hasModuleAccess(
      userId, 
      moduleName
    );
    
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Module access denied',
        module: moduleName,
        message: `Subscription to ${moduleName} module required`
      });
    }
    
    next();
  };
};

// Usage in routes
router.get(
  '/furlong/bets',
  authenticate,
  requireModule('furlong'),
  BetsController.getAll
);
```

#### Frontend (0.1) Architecture
- **Component Organization**: Feature-based folders organized by core vs. modules
- **Module Isolation**: Each paid module (furlong, sports) is self-contained
- **State Management**:
  - React Query for server state (caching, synchronization)
  - Zustand for client state (profile switching, UI state, subscription status)
  - Context API sparingly for theme/auth wrapper
- **API Communication**: All backend calls through service layer with Axios/Fetch wrapper and auth interceptors
- **Route Protection**: Module guards check subscription status before rendering module routes

#### Backend (0.2) Architecture
- **Layered Architecture**: Routes → Middleware (Module Access) → Controllers → Services → Database/External APIs
- **Service Layer Pattern**:
  - `services/supabase/` - All Supabase operations including subscription management
  - `services/integrations/` - External API integrations (organized by module)
  - Each service is self-contained with clear interface
- **Module-Specific Routes**: Routes organized by module (core, furlong, sports)
- **Middleware Stack**: CORS, request logging, authentication, module access verification, rate limiting, error handling

#### Communication Between Layers
- **Frontend → Backend**: REST API over HTTPS, JWT tokens from Supabase Auth
- **Backend → Supabase**: Supabase JS Client, service role key for admin ops
- **Backend → External APIs**: Service layer abstraction with retry logic and error handling
- **Module Access**: Checked at both frontend (UI/UX) and backend (security) layers

### Testing Strategy

#### Frontend (0.1)
- **Unit Tests**: Vitest for utilities, hooks, and pure functions
- **Component Tests**: React Testing Library for component logic
- **Module Access Tests**: Test subscription guards and routing logic
- **E2E Tests**: Playwright for critical user flows:
  - Login and authentication flow
  - Profile creation and switching
  - Module subscription verification (locked/unlocked states)
  - Bet entry and tracking (Furlong module)
  - Banking connection flow (Core platform)
- **Visual Regression**: Playwright for UI consistency (component snapshots, page layouts, mobile responsiveness)
- **Accessibility**: Playwright + axe-core integration
- **Coverage Target**: 80% for critical paths

#### Backend (0.2)
- **Unit Tests**: Jest/Vitest for service layer (test in isolation, mock external APIs)
- **Module Access Tests**: Test middleware correctly enforces subscription permissions
- **Integration Tests**: Supertest for API endpoints (full request/response cycle, auth verification, module access)
- **API Integration Tests**: Mock external APIs in test environment:
  - Punters Form API mock responses
  - Telegram User Client API message simulation
  - Basiq API mock with test accounts
- **Database Tests**: Supabase local development (RLS policy testing, migration testing, subscription logic)
- **Security Tests**: Semgrep automated scanning
- **Coverage Target**: 75% overall

#### CI/CD Pipeline

**Frontend (0.1)** - Triggered on PR to develop/main:
- Lint (ESLint)
- Type check (TypeScript)
- Unit tests (Vitest)
- E2E tests (Playwright) - including module access scenarios
- Security scan (Semgrep)
- Build verification
- Visual regression (on PR)

**Backend (0.2)** - Triggered on PR to develop/main:
- Lint (ESLint)
- Type check (TypeScript)
- Unit tests (Jest) - including subscription service tests
- Integration tests (Supertest) - including module access middleware
- Security scan (Semgrep)
- Secrets detection
- Build verification

### Git Workflow

#### Branching Strategy
- **Main Branches**:
  - `main` - Production-ready code only
  - `develop` - Integration branch for features
- **Feature Branches**: `feature/[0.1|0.2]-<module>-<issue-number>-<short-description>`
  - Example: `feature/0.1-furlong-45-racing-tracker-ui`
  - Example: `feature/0.2-core-12-subscription-service`
  - Always branch from `develop`
- **Fix Branches**: `fix/[0.1|0.2]-<module>-<issue-number>-<bug-description>`
  - Example: `fix/0.2-furlong-67-telegram-parser`
  - Example: `fix/0.1-core-23-banking-sync`
  - Hotfixes can branch from `main`, others from `develop`
- **Chore Branches**: `chore/[0.1|0.2]-<description>`
  - Example: `chore/0.1-update-dependencies`

#### Commit Message Convention

**Format**: `<type>(<scope>): <subject>`

**Types**: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `perf`, `chore`, `security`

**Scope**: `0.1` or `0.2` (which repo), optionally with module prefix `0.1-furlong`, `0.2-core`, `0.2-sports`

**Subject**:
- Use imperative mood ("add feature" not "added feature")
- Don't capitalize first letter
- No period at the end
- Keep under 72 characters
- Reference issue number if applicable

**Examples**:
```
feat(0.1-core): add profile switching component (#45)
feat(0.1-furlong): add racing tracker with auto-population (#67)
feat(0.2-core): add subscription service and module access middleware (#12)
fix(0.2-furlong): resolve telegram message parser issue (#89)
refactor(0.1-furlong): extract betting calculation logic to hook
test(0.2-core): add integration tests for module access
docs(0.1): update module architecture documentation
security(0.2-core): sanitize user input in subscription endpoints
chore(0.1): update react-query to v5
```

**Multi-line Commits**:
```
feat(0.1-furlong): add racing tracker with auto-population

- Implement tracker table component
- Add real-time updates via websocket
- Integrate with telegram user client for auto-population
- Add filtering and sorting functionality
- Add module access guard

Closes #45
```

#### Commit Standards - CRITICAL RULES

**❌ PROHIBITED**:
- **NO Co-Authored-By tags** - Never include `Co-Authored-By: Claude <assistant@anthropic.com>` or similar
- **NO AI Attribution** - Do not mention AI assistance in commit messages
- **NO Generic Messages** - Avoid "Update files", "Fix stuff", "WIP"

**✅ REQUIRED**:
- All commits must be human-authored
- Clear, descriptive messages explaining **what** and **why**
- Reference issue numbers when applicable
- Include module context in scope when relevant
- Follow conventional commit format above

#### Pull Request Standards

**PR Title Format**: Same as commit message format (`feat(0.1-furlong): add racing tracker component (#45)`)

**PR Description Template**:
```markdown
## Description
Brief description of changes

## Module
- [ ] Core Platform
- [ ] Furlong Module
- [ ] Sports Module (Future)
- [ ] Cross-Module

## Type of Change
- [ ] Bug fix (fix)
- [ ] New feature (feat)
- [ ] Refactoring (refactor)
- [ ] Documentation (docs)
- [ ] Security fix (security)

## Related Issues
Closes #<issue-number>

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Module access tests pass (if applicable)
- [ ] Playwright tests pass (if 0.1)
- [ ] Semgrep scan passes
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No console.log or debugging code
- [ ] Environment variables documented
- [ ] Module access properly implemented (if applicable)
```

**PR Review Requirements**:
- At least 1 approval required
- All CI checks must pass (ESLint, TypeScript, Tests, Semgrep)
- No unresolved conversations
- Squash and merge to `develop`, rebase for `main`

#### GitHub Issues Standards

**Issue Labeling System**:
- **Type**: `bug`, `enhancement`, `security`, `documentation`
- **Scope**: `0.1-frontend`, `0.2-backend`, `both`
- **Module**: `core`, `furlong`, `sports`, `cross-module`
- **Priority**: `critical`, `high`, `medium`, `low`
- **Status**: `needs-triage`, `in-progress`, `blocked`, `ready-for-review`

**Issue Title Format**: `[Scope/Module] Brief description of issue`

**Examples**:
```
[0.1/Furlong] Racing tracker not updating with new bets
[0.2/Core] Subscription service failing to verify module access
[Both/Furlong] Telegram integration causing data loss
[0.2/Core] Add sports module subscription support
```

**Issue Templates**:

1. **Bug Report**:
```markdown
**Scope**: 0.1-frontend / 0.2-backend / Both
**Module**: Core / Furlong / Sports / Cross-Module

**Description**: A clear description of the bug

**Steps to Reproduce**:
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**: What should happen
**Actual Behavior**: What actually happens
**Screenshots/Logs**: If applicable
**Environment**: Browser/Node version, OS
```

2. **Feature Request**:
```markdown
**Scope**: 0.1-frontend / 0.2-backend / Both
**Module**: Core / Furlong / Sports / Cross-Module

**Feature Description**: Clear description of the feature
**Use Case**: Why is this feature needed?
**Proposed Solution**: How might this work?
**Alternatives Considered**: Other approaches you've thought about
**Subscription Impact**: Does this affect module access/pricing?
```

3. **Security Vulnerability**:
```markdown
**Scope**: 0.1-frontend / 0.2-backend / Both
**Module**: Core / Furlong / Sports / Cross-Module
**Severity**: Critical / High / Medium / Low

**Vulnerability Description**: [Describe the security issue]
**Potential Impact**: [What could happen if exploited]
**Steps to Reproduce**: [If applicable]
**Suggested Fix**: [If you have ideas]
**Semgrep Detection**:
- [ ] Detected by Semgrep scan
- [ ] Manually discovered
```

#### Code Review Guidelines

**What to Look For**:
1. **Security**: No hardcoded secrets, proper input validation, secure dependencies
2. **Module Access**: Proper subscription checks on protected routes and endpoints
3. **Performance**: Efficient queries, proper caching, no unnecessary re-renders
4. **Readability**: Clear variable names, appropriate comments, logical structure
5. **Testing**: Adequate test coverage, edge cases handled, module access scenarios tested
6. **Type Safety**: Proper TypeScript usage, no `any` types without justification
7. **Error Handling**: Appropriate try-catch blocks, user-friendly error messages
8. **Module Isolation**: Features properly scoped to their module, no cross-contamination

**Review Comments Format**:
- `❗ [Critical]` - Must be fixed before merge
- `💡 [Suggestion]` - Nice to have, not blocking
- `❓ [Question]` - Need clarification
- `✨ [Nice]` - Good implementation

## Domain Context

### Match Betting Concepts
- **Match Betting**: Betting strategy covering all outcomes using bookmaker promotions to guarantee profit
- **Qualifying Bets**: Bets placed to unlock promotional offers from bookmakers
- **Free Bets**: Promotional bets provided by bookmakers (typically after qualifying bets)
- **Lay Betting**: Betting against an outcome on a betting exchange (opposite of backing)
- **Rating**: Percentage of theoretical profit achievable from a promotion (e.g., 80% rating = $80 profit from $100 free bet)
- **Profit & Loss (P&L)**: Net profit or loss calculated across all bets, considering stake, odds, commission

### Racing Specifics (Furlong Module)
- **Automated Race Results**: Punters Form API automatically populates race outcomes, eliminating manual data entry
- **Telegram Tip Integration**: Telegram User Client API listens to tipping channel, auto-populates tips into tracker
- **Bookmaker Account Management**: Users manage multiple bookmaker accounts per profile
- **Multi-Profile Tracking**: Track bets across different profiles (e.g., user's own account, family members' accounts)
- **Cumulative Dashboard**: Aggregated P&L and statistics across all profiles

### Cash Flow & Money Management (Core Platform)
- **Betting Bank**: Dedicated funds allocated for betting operations, tracked separately from personal finances
- **Bookie Balance Tracking**: Real-time monitoring of funds held with each bookmaker
- **Bank Account Integration**: Live balance updates from connected bank accounts via Basiq (Open Banking)
- **Cash Flow Visibility**: See all money movement - deposits to bookies, withdrawals, pending bets, available funds
- **Daily Planning**: Plan bets in advance to ensure sufficient funds are allocated and cash flow is managed
- **Multi-Account Cash Flow**: Track money across multiple bank accounts, bookmakers, and profiles simultaneously

### Banking & Financial Context (Core Platform)
- **Australian Consumer Data Right (CDR)**: Privacy legislation allowing consumers to share their banking data securely
- **Open Banking (Basiq)**: CDR-compliant service enabling secure bank account connection and real-time balance retrieval
- **Transaction Sync**: Automated synchronization of bank transactions to verify deposits, withdrawals, and current balance
- **Multi-Account Support**: Each profile can connect multiple bank accounts

### Subscription & Module System
- **Module-Based Access**: Users purchase subscriptions to individual modules (Furlong, Sports)
- **Core Platform**: Always available to all users - Dashboard, Banking, Profile management
- **Subscription Status**: Active, Cancelled, Expired - controls access to module features
- **Flexible Pricing**: À la carte model - pay only for modules you use
- **Module Isolation**: Each module is self-contained with its own features, routes, and APIs
- **Future Extensibility**: New modules (like Sports) can be added without affecting existing modules

### Application Workflow (Money-Centric View)
1. **Profile & Account Setup**: User creates profiles and connects bank accounts via Basiq (Core)
2. **Module Subscription**: User subscribes to Furlong module to access racing features
3. **Cash Flow Monitoring**: Dashboard displays total betting bank balance across all connected accounts (Core)
4. **Daily Planning**: User plans daily bets in Planner, ensuring sufficient funds available (Furlong)
5. **Tip Delivery**: Telegram User Client API listens to tipping channel → Tip auto-populated in Tracker (Furlong)
6. **Bet Placement**: User places bet with bookmaker (manual) → Records in Tracker (Furlong)
7. **Money Movement**: User deposits/withdraws from bookie → Updates Bookie Balance (Core)
8. **Result & Settlement**: Punters Form API fetches results → P&L calculated → Bank/Bookie balances updated (Furlong)
9. **Cash Flow Analysis**: View profit/loss, available funds, and money distribution across all accounts and bookies (Core + Furlong)

## Important Constraints

### Technical Constraints

#### Frontend (0.1)
- Must be fully responsive (mobile-first design approach)
- Fast page loads (<2s initial load time)
- Offline capability considerations for bet data entry
- Accessibility compliance (WCAG 2.1 AA minimum)
- Real-time updates for race results and tips
- Support for profile switching without full page reload
- Module access checks must be performant (cached subscription status)
- Graceful degradation when module access is revoked

#### Backend (0.2)
- Must support Australian Consumer Data Right (CDR) standards via Basiq
- Real-time processing of messages from Telegram User Client API
- Secure multi-user profile data isolation via Supabase Row Level Security (RLS)
- Module access verification on every protected endpoint
- API rate limiting to protect external service quotas:
  - Punters Form API: TBD requests/minute
  - Telegram User Client API: Subject to Telegram API limits
  - Basiq API: TBD requests/day
- Handle concurrent users and profiles efficiently
- Implement retry logic and fallbacks for external API failures
- Subscription status changes must propagate immediately to enforce access

### Security Constraints

#### Semgrep MCP Requirements
- **HIGH severity vulnerabilities**: Block PRs, must be fixed before merge
- **MEDIUM severity issues**: Warning, must be reviewed and documented
- **LOW severity issues**: Logged for future review
- **Scan Frequency**:
  - On every PR to develop/main
  - Nightly scans on develop and main branches
  - Manual trigger available via GitHub Actions

#### Semgrep Rules Coverage
- OWASP Top 10 vulnerabilities (XSS, SQL injection, CSRF, etc.)
- TypeScript/JavaScript security patterns
- React security best practices (dangerouslySetInnerHTML, etc.)
- Node.js security patterns (path traversal, command injection, etc.)
- Secrets detection (API keys, tokens, passwords)

#### Data Protection
- **Encrypted Credentials**: All bookmaker credentials and API keys stored encrypted in Supabase
- **No Sensitive Data in Logs**: Never log passwords, tokens, or financial data
- **Secure Token Storage**: JWT tokens stored in httpOnly cookies (not localStorage)
- **Token Rotation**: Refresh tokens rotated regularly, expired tokens invalidated
- **Input Validation**: All user inputs sanitized and validated on both frontend and backend
- **SQL Injection Prevention**: Use parameterized queries and ORM, never string concatenation
- **Module Access Security**: Double-check subscription status at API level (don't rely on frontend only)

### Regulatory Constraints
- **Australian Gambling Regulations**: Compliance with national and state-level gambling laws
- **CDR Data Privacy Requirements (Basiq)**:
  - User consent required before accessing banking data
  - Data minimization (only request necessary banking information)
  - Data retention limits (delete data when no longer needed)
  - Secure data transmission (TLS 1.2+ only)
- **Bookmaker Terms of Service**: Ensure app usage doesn't violate bookmaker terms
- **Data Residency**: Consider Australian data sovereignty requirements for user data
- **Telegram API Terms**: Comply with Telegram's terms of service for user client API usage
- **Subscription Compliance**: Clear terms for module subscriptions, cancellation policies, refund policies

### Business Constraints
- **Supabase Limitations**:
  - Free tier: 500MB database, 2GB bandwidth, 50,000 monthly active users
  - Consider upgrade path if approaching limits
  - Database connection pooling required for scale
- **External API Rate Limits**:
  - Punters Form API: TBD requests/minute (implement request queuing)
  - Telegram User Client API: Subject to Telegram API limits (implement throttling)
  - Basiq API: TBD requests/day (cache data, minimize calls)
- **Concurrent User Support**: Design for TBD concurrent users initially
- **Profile Limits**: Consider maximum profiles per user (e.g., 10 profiles)
- **Data Storage**: Implement data archival strategy for old bets/transactions
- **Module Pricing**: Flexible à la carte pricing model, individual module subscriptions
- **Subscription Management**: Support for trial periods, grace periods, and reactivation

### Development Constraints
- **Node.js Version**: 18+ LTS only (for long-term support)
- **TypeScript Strict Mode**: Enabled on both frontend and backend
- **No `any` Types**: Explicit types required, justify any exceptions in code review
- **Test Coverage**: Minimum 80% for frontend critical paths, 75% overall for backend
- **Bundle Size**: Frontend initial bundle <500KB (gzipped)
- **API Response Time**: P95 latency <500ms for all endpoints
- **Module Code Isolation**: Keep module code separate, avoid tight coupling between modules
- **Feature Flags**: Use feature flags for gradual rollout of new modules

## External Dependencies

### 1. Supabase
- **Purpose**: User authentication, PostgreSQL database, real-time subscriptions
- **Integration Location**: `0.2-backend/src/services/supabase/`
- **Features Used**:
  - PostgreSQL database with Row Level Security (RLS)
  - User authentication (email/password, social auth)
  - Real-time subscriptions for live updates
  - Storage for user-uploaded files (if needed)
  - Subscription management tables
- **Environment Variables**:
  - `SUPABASE_URL` - Supabase project URL
  - `SUPABASE_ANON_KEY` - Public anonymous key for client-side
  - `SUPABASE_SERVICE_ROLE_KEY` - Admin key for server-side operations
- **Rate Limits**: Free tier: 500MB database, 2GB bandwidth/month
- **Documentation**: https://supabase.com/docs

### 2. Punters Form API
- **Purpose**: Automated race results retrieval to eliminate manual data entry
- **Module**: Furlong only
- **Integration Location**: `0.2-backend/src/services/integrations/punters-form/`
- **Module Structure**:
  - `client.ts` - HTTP client configuration (Axios/Fetch)
  - `races.ts` - Race result endpoints
  - `transformer.ts` - Map API response to internal data models
  - `types.ts` - API response interfaces
  - `index.ts` - Public exports
- **Environment Variables**:
  - `PUNTERS_FORM_API_KEY` - Authentication key
  - `PUNTERS_FORM_BASE_URL` - API base URL
- **Rate Limits**: TBD requests/minute (implement request queuing if needed)
- **Error Handling**: Retry logic with exponential backoff, fallback to manual entry
- **Data Flow**: Scheduled job fetches results → Backend stores in Supabase → Frontend displays
- **Access Control**: Only available to users with active Furlong subscription

### 3. Telegram User Client API
- **Purpose**: Listen to tipping channel for real-time horse tip delivery and auto-population in tracker
- **Module**: Furlong only
- **Integration Location**: `0.2-backend/src/services/integrations/telegram/`
- **Module Structure**:
  - `client.ts` - Telegram User Client initialization and session management
  - `listener.ts` - Listen to channel messages for tips
  - `parser.ts` - Parse tip messages into structured data
  - `types.ts` - Tip and message interfaces
  - `index.ts` - Public exports
- **Environment Variables**:
  - `TELEGRAM_API_ID` - Telegram API ID (from my.telegram.org)
  - `TELEGRAM_API_HASH` - Telegram API hash
  - `TELEGRAM_SESSION_STRING` - User session for authentication
  - `TELEGRAM_CHANNEL_USERNAME` - Tipping channel username or ID
- **Authentication**: User client requires phone number authentication and session management
- **Rate Limits**: Subject to Telegram API limits (implement message throttling if needed)
- **Security**: Secure session storage, validate message format, filter non-tip messages
- **Data Flow**: Telegram client listens to channel → New tip message received → Backend parses and stores in Supabase → Frontend updates tracker in real-time
- **Documentation**: https://core.telegram.org/api
- **Access Control**: Only available to users with active Furlong subscription

### 4. Basiq API
- **Purpose**: Australian CDR-compliant Open Banking for bank account connection and balance retrieval
- **Module**: Core platform (available to all users)
- **Integration Location**: `0.2-backend/src/services/integrations/basiq/`
- **Module Structure**:
  - `client.ts` - Base API client (HTTP requests)
  - `auth.ts` - OAuth 2.0 flow and token management
  - `accounts.ts` - Account connection and retrieval
  - `transactions.ts` - Transaction history fetching
  - `types.ts` - Basiq API interfaces
  - `index.ts` - Public exports
- **Environment Variables**:
  - `BASIQ_API_KEY` - API authentication key
  - `BASIQ_BASE_URL` - API base URL (production/sandbox)
  - `BASIQ_REDIRECT_URI` - OAuth redirect URI after bank consent
- **OAuth Flow**:
  1. User initiates bank connection (Frontend → Backend)
  2. Backend generates Basiq consent URL
  3. User redirected to bank for authentication
  4. Bank redirects back with auth code
  5. Backend exchanges code for access token
  6. Store tokens securely in Supabase
- **Rate Limits**: TBD requests/day (implement caching, minimize API calls)
- **Token Management**: Access tokens expire after 60 minutes, refresh tokens valid for 30 days
- **Error Handling**: Handle token expiration, re-authentication flow, bank connection failures
- **Compliance**: CDR-compliant data handling, user consent required, data deletion on request
- **Data Flow**: User connects bank → Basiq OAuth → Backend stores tokens → Periodic sync (every 15 mins) → Frontend displays balance
- **Documentation**: https://docs.basiq.io
- **Access Control**: Available to all users (core platform feature)

### Development Tools
- **Node.js**: 18+ LTS (required for both frontend and backend)
- **Package Manager**: pnpm (recommended), npm, or yarn
- **TypeScript**: 5+ (strict mode enabled)
- **ESLint**: Code linting with TypeScript rules
- **Prettier**: Code formatting
- **Nodemon**: Backend development server with hot reload
- **Git**: Version control

### MCP Integrations

#### Semgrep MCP
- **Purpose**: Automated security vulnerability scanning
- **Configuration Location**:
  - `0.1-frontend/.semgrep/` - Frontend rules
  - `0.2-backend/.semgrep/` - Backend rules
- **Execution**: CI/CD pipeline, nightly scans, manual trigger
- **Severity Levels**: HIGH (blocking), MEDIUM (warning), LOW (logged)

#### Playwright MCP
- **Purpose**: E2E testing, visual regression, design validation
- **Configuration Location**: `0.1-frontend/playwright.config.ts`
- **Test Coverage**: Login flows, profile switching, bet entry, banking connection, module access scenarios
- **Browsers**: Chromium, Firefox, WebKit
- **Visual Regression**: Screenshot comparison on PRs

#### GitHub Issues MCP
- **Purpose**: Issue tracking and project management
- **Workflow**: Auto-link commits, auto-close issues on PR merge
- **Labels**: bug, enhancement, security, 0.1-frontend, 0.2-backend, core, furlong, sports, priority levels