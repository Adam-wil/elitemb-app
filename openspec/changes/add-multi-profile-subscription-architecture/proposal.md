# Change: Multi-Profile Subscription Architecture

## Why
The Elite MB Application requires a sophisticated multi-profile management system where users can create and manage multiple betting profiles (each representing a separate betting operation), with subscription-based access to specialized modules (Furlong racing module, future Sports module). The current foundation (from add-frontend-foundation) provides the basic React + TypeScript + Vite setup, but lacks:

1. **Multi-Profile Management**: Users need to create multiple profiles (tier-limited: 3 for Pro, 20 for Premium), switch between them seamlessly, and view aggregated or profile-specific data
2. **Module-Based Subscription System**: Features must be organized by subscription modules (Core platform free, Furlong module paid, Sports module future) with clear access control
3. **Contextual Data Views**: The main dashboard must aggregate ALL profiles' data, while module dashboards show CURRENT profile's data only
4. **Professional Layout**: A collapsible sidebar navigation with prominent profile switching, module organization, and subscription status indicators
5. **Calculator Tool**: A globally accessible betting calculator sidebar available to all users

This change transforms the basic frontend into a production-ready multi-tenant, modular subscription platform.

## What Changes

### Profile Management System
- Create ProfileProvider context with full CRUD operations (create, read, update, delete, switch profiles)
- Build Profile Switcher component (dropdown in header showing all profiles)
- Implement Profile Management page (/profiles) with create/edit/delete UI
- Add mock profile data: 3 profiles ("Pro User", "Jenny", "George")
- Mock tier limits: maxProfiles = 20 (will be subscription-tier-based later)

### Module Subscription System
- Create ModuleContext provider with access control logic
- Build ModuleGuard component for protecting module routes
- Build UpgradePrompt component for locked modules
- Mock subscription data: { furlong: true, sports: false }
- Organize routes by module (Core, Furlong, Sports)

### EdgeLayout Component (Collapsible Sidebar)
- Header with profile switcher + active module indicator
- Collapsible left sidebar navigation (hamburger menu)
- Module-aware navigation sections with visual hierarchy
- Lock icons and "Upgrade" badges for inaccessible modules
- Subscription status indicator
- Responsive behavior (mobile/tablet/desktop)

### CalculatorSidebar Component
- Global betting calculator tool
- Accessible from all pages regardless of subscription
- Responsive width adjustment
- Toggle open/close functionality

### Route Reorganization
**Core Platform** (always accessible):
- `/` - Main Dashboard (aggregated view of ALL profiles' P&L)
- `/profiles` - Profile management page
- `/profiles/:profileId` - Individual profile settings
- `/banking/*` - Banking pages (accounts, bookie balance, health)

**Furlong Module** (subscription-gated, shows CURRENT profile data):
- `/furlong/dashboard` - Racing P&L Dashboard
- `/furlong/planner` - Racing planner
- `/furlong/tracker` - Bet tracker with Handsontable
- `/furlong/promo-tracker` - Promo tracking
- `/furlong/non-promo-turnover` - Non-promo turnover
- `/furlong/under-radar` - Under radar tracking
- `/furlong/bookie-list` - Racing bookmaker list

**Sports Module** (locked, future):
- `/sports/*` - Routes that show UpgradePrompt

### Data Flow Architecture
- Main Dashboard (/): Aggregates P&L data from ALL user profiles
- Module Dashboards: Filter data to show CURRENT active profile only
- Clear visual indicators distinguishing aggregated vs single-profile views
- Profile context drives all data queries

## Impact
- Affected specs: `frontend` (modifies existing capability from add-frontend-foundation)
- Affected code:
  - Enhances App.tsx with module-based routing and guards
  - Adds EdgeLayout wrapper component with navigation
  - Creates ProfileProvider and ModuleContext providers
  - Creates Profile Switcher, ModuleGuard, UpgradePrompt components
  - Adds CalculatorSidebar global component
  - Creates /profiles route and profile management UI
- Dependencies:
  - Builds on add-frontend-foundation (React Router, Zustand, Tailwind, React Query)
  - No new external dependencies required
- Breaking changes: None (extends existing foundation)
- Backend: No backend changes (uses mock data for development)
- Future work: Backend integration for subscription tiers, profile limits, real data aggregation
