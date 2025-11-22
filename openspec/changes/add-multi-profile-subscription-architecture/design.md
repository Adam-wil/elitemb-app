# Design Document: Multi-Profile Subscription Architecture

## Context

This change builds upon the `add-frontend-foundation` implementation to create a production-ready multi-tenant betting management platform. The application serves users who manage multiple betting profiles (each representing a separate betting operation), with subscription-based access to specialized modules.

**Key Business Requirements:**
- Users can create multiple betting profiles (3-20 profiles based on subscription tier)
- Each profile has completely isolated data (bets, balances, bookmakers, P&L)
- Subscription tiers control access to specialized modules (Furlong racing module, future Sports module)
- Main dashboard shows aggregated performance across ALL profiles
- Module dashboards show data for the CURRENT active profile only
- Profile switching is a primary navigation action (as important as page navigation)

**Technical Foundation:**
- React 18+ with TypeScript 5+
- Vite for build tooling
- React Router v6 for routing
- Tailwind CSS for styling
- Zustand for client state
- React Query for server state (mock data for now)

## Goals / Non-Goals

### Goals
- Create intuitive multi-profile management with seamless switching
- Implement subscription-based module access control
- Design professional collapsible sidebar layout with clear module organization
- Build aggregated dashboard showing combined performance across all profiles
- Provide profile-specific views in module dashboards
- Create globally accessible betting calculator tool
- Use mock data to enable frontend development without backend dependencies
- Maintain clear visual distinction between aggregated and single-profile data views

### Non-Goals
- Backend subscription service integration (will be separate change)
- Real-time data synchronization across profiles
- Profile collaboration or sharing features
- Complex access control (roles, permissions) - just subscription-based module access
- Profile templates or cloning functionality (can be added later)
- Data export/import for profiles (separate feature)
- Multi-currency support (separate feature)
- Actual calculator business logic complexity (simple placeholder for now)

## Decisions

### Decision 1: Collapsible Sidebar Layout over Top Navigation
**Rationale:** Collapsible sidebar provides better space efficiency, clearer module organization, and scales better as features grow. Mobile-friendly with overlay behavior.

**Alternatives considered:**
- Top navigation bar: Limited space for menu items, harder to show module hierarchy
- Tabs interface: Not suitable for deep navigation structures
- Drawer navigation: Similar to collapsible sidebar but less discoverable

**Design:**
```
┌─────────────────────────────────────────────┐
│ Header: Logo | Profile Switcher | Module    │
├──────┬──────────────────────────────────────┤
│ Side │                                      │
│ bar  │     Main Content Area                │
│      │                                      │
│ Core │                                      │
│ Furl │                                      │
│ ong  │                                      │
│ Sprt │                                      │
│      │                                      │
└──────┴──────────────────────────────────────┘
```

**Responsive Behavior:**
- Desktop (>1024px): Sidebar always visible, collapsible to icons only
- Tablet (768px-1024px): Sidebar collapsible, pushes content
- Mobile (<768px): Sidebar as overlay, closes on navigation

**Winner:** Collapsible sidebar - best UX, scalability, and mobile support

### Decision 2: React Context for Profile State over Zustand
**Rationale:** Profile state is foundational and needs to be accessible throughout the entire app. React Context provides simpler, more direct access without store boilerplate. Profile switching triggers re-renders intentionally.

**Alternatives considered:**
- Zustand store: Possible, but Context is more appropriate for foundational app state
- URL parameter for activeProfileId: Too fragile, doesn't persist across navigations
- LocalStorage only: No reactivity, requires manual state management

**ProfileContext API:**
```typescript
interface ProfileContextValue {
  // State
  profiles: Profile[];
  activeProfileId: string;
  maxProfiles: number;

  // Computed
  activeProfile: Profile | null;

  // Actions
  createProfile: (name: string) => Promise<Profile>;
  updateProfile: (id: string, updates: Partial<Profile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  switchProfile: (id: string) => void;
  getProfileById: (id: string) => Profile | null;
}
```

**Winner:** React Context - simpler, more idiomatic, appropriate for this use case

### Decision 3: ModuleContext for Subscription State
**Rationale:** Subscription/module access is also foundational app state that affects routing and UI throughout the app. Context pattern matches ProfileContext for consistency.

**ModuleContext API:**
```typescript
interface ModuleContextValue {
  moduleAccess: {
    furlong: boolean;
    sports: boolean;
  };
  hasModuleAccess: (module: Module) => boolean;
  getModuleMetadata: (module: Module) => ModuleMetadata;
}

type Module = 'furlong' | 'sports';

interface ModuleMetadata {
  name: string;
  description: string;
  features: string[];
  pricing?: string;
}
```

**Mock Data (for development):**
```typescript
const mockModuleAccess = {
  furlong: true,  // User has Furlong module
  sports: false,  // User doesn't have Sports module
};
```

### Decision 4: ModuleGuard Component over Route-Level Guards
**Rationale:** Component-based guards provide better flexibility and UX. Can show UpgradePrompt in-place rather than redirecting, and can nest guards if needed.

**Implementation Pattern:**
```tsx
<Route path="/furlong/*" element={
  <ModuleGuard module="furlong">
    <FurlongRoutes />
  </ModuleGuard>
} />
```

**ModuleGuard Behavior:**
- Check `hasModuleAccess(module)` from ModuleContext
- If true: render children (module routes)
- If false: render UpgradePrompt component with module info
- No redirects - user stays on attempted URL, sees upgrade prompt

**Winner:** Component-based guards - better UX, more flexible

### Decision 5: Data Aggregation Strategy (All Profiles vs Single Profile)
**Rationale:** The application has two fundamentally different data view types that must be clearly distinguished.

**Architecture:**

**Main Dashboard (/):**
- Purpose: Show overall performance across ALL betting profiles
- Data: Aggregate/combine P&L from all profiles
- Visual Indicator: "All Profiles Combined" badge in page header
- Use Case: User wants to see total profit/loss, overall ROI, combined statistics

**Module Dashboards (e.g., /furlong/dashboard):**
- Purpose: Show detailed data for CURRENT active profile only
- Data: Filter by activeProfileId, fetch profile-specific data
- Visual Indicator: "Profile: [Active Profile Name]" badge in page header
- Use Case: User is working with a specific betting operation, needs focused view

**Data Flow:**
```typescript
// Main Dashboard - Aggregated
function MainDashboard() {
  const { profiles } = useProfile();

  // Fetch P&L for ALL profiles
  const plQueries = profiles.map(profile =>
    useQuery(['pl', profile.id], () => fetchPL(profile.id))
  );

  // Aggregate results
  const aggregatedPL = plQueries.reduce((total, query) => ({
    profit: total.profit + (query.data?.profit || 0),
    bets: total.bets + (query.data?.bets || 0),
    // ... other metrics
  }), { profit: 0, bets: 0 });

  return <div>Aggregated: {aggregatedPL.profit}</div>;
}

// Module Dashboard - Single Profile
function FurlongDashboard() {
  const { activeProfileId, activeProfile } = useProfile();

  // Fetch P&L for CURRENT profile only
  const { data: pl } = useQuery(
    ['furlong-pl', activeProfileId],
    () => fetchFurlongPL(activeProfileId)
  );

  return <div>Profile "{activeProfile?.name}": {pl?.profit}</div>;
}
```

**Visual Distinction:**
- Aggregated views: Blue accent color, "All Profiles" badge
- Single profile views: Profile-specific color (or neutral), "[Profile Name]" badge
- Clear typography hierarchy to indicate view type

### Decision 6: Profile Switcher in Header (Not Sidebar)
**Rationale:** Profile switching is a PRIMARY user action, as important as navigation. It affects data across the entire application and should be prominently accessible.

**Placement:** Center or center-right of header, always visible

**Design:**
- Dropdown/modal showing all profiles
- Active profile name displayed prominently
- Quick-switch to other profiles
- "+ New Profile" option (with tier limit check)
- Profile count indicator (e.g., "3 / 20")

**Alternatives considered:**
- In sidebar: Less prominent, harder to access on mobile
- Floating action button: Takes up screen real estate, less discoverable
- Top-right dropdown only: Could work, but less prominent than desired

**Winner:** Header placement - maximum visibility and accessibility

### Decision 7: CalculatorSidebar as Global Right Sidebar
**Rationale:** Betting calculator is a utility tool that users may want to access while viewing any page. Global sidebar makes it always available without navigating away.

**Implementation:**
- Right sidebar (opposite of navigation sidebar)
- Toggle button in header or floating action button
- Slide in/out animation
- Width: 300px on desktop, full-width overlay on mobile
- Accessible regardless of subscription tier or module

**Calculator State:**
- Zustand store: `useCalculatorStore()` with `isOpen` state
- Persists across route changes
- Independent of profile or module context

### Decision 8: Mock Data Structure for Development
**Rationale:** Enable full frontend development and testing without backend dependencies. Mock data should be realistic and comprehensive.

**Mock Profile Data:**
```typescript
const mockProfiles: Profile[] = [
  {
    id: '1',
    name: 'Pro User',
    createdAt: '2024-01-15T10:00:00Z',
    settings: {
      currency: 'GBP',
      timezone: 'Europe/London',
    },
  },
  {
    id: '2',
    name: 'Jenny',
    createdAt: '2024-02-20T14:30:00Z',
    settings: {
      currency: 'GBP',
      timezone: 'Europe/London',
    },
  },
  {
    id: '3',
    name: 'George',
    createdAt: '2024-03-10T09:15:00Z',
    settings: {
      currency: 'GBP',
      timezone: 'Europe/London',
    },
  },
];
```

**Mock P&L Data (per profile):**
```typescript
const mockPL: Record<string, PLData> = {
  '1': { profit: 2500, bets: 150, roi: 12.5, winRate: 58 },
  '2': { profit: 1200, bets: 95, roi: 8.3, winRate: 52 },
  '3': { profit: -450, bets: 60, roi: -5.2, winRate: 45 },
};
```

**Mock Module Access:**
```typescript
const mockSubscription = {
  tier: 'Pro',
  moduleAccess: {
    furlong: true,
    sports: false,
  },
  maxProfiles: 20,
};
```

### Decision 9: Navigation Structure by Module
**Rationale:** Clear separation of features by subscription module makes it obvious which features require upgrades and provides better mental model for users.

**Sidebar Structure:**
```
┌─────────────────────┐
│ CORE                │
│ ○ Dashboard         │ ← Main dashboard (aggregated)
│ ○ Profiles          │ ← Profile management
│ ○ Banking           │
│   • Accounts        │
│   • Bookie Balance  │
│   • Bookie Health   │
│                     │
│ FURLONG MODULE ✓    │ ← Has access (checkmark)
│ ○ Dashboard         │ ← Furlong dashboard (single profile)
│ ○ Planner           │
│ ○ Tracker           │
│ ○ Promo Tracker     │
│ ○ Non-Promo T.      │
│ ○ Under Radar       │
│ ○ Bookie List       │
│                     │
│ SPORTS MODULE 🔒    │ ← Locked (lock icon + upgrade badge)
│ Upgrade to Access   │
└─────────────────────┘
```

**Benefits:**
- Visual hierarchy clearly shows module structure
- Lock icons and badges make access control obvious
- Collapsible sections reduce clutter
- Scales well as more modules are added

## Component Hierarchy

```
App.tsx
├── ProfileProvider
│   └── ModuleProvider
│       └── QueryClientProvider
│           └── BrowserRouter
│               └── Routes
│                   └── EdgeLayout
│                       ├── Header
│                       │   ├── Logo
│                       │   ├── ProfileSwitcher
│                       │   │   └── ProfileDropdown
│                       │   ├── ModuleIndicator
│                       │   ├── HamburgerButton
│                       │   └── SubscriptionBadge
│                       ├── Sidebar
│                       │   ├── NavSection (Core)
│                       │   │   └── NavLink[]
│                       │   ├── NavSection (Furlong)
│                       │   │   └── NavLink[]
│                       │   └── NavSection (Sports - locked)
│                       │       └── UpgradeLink
│                       ├── MainContent
│                       │   └── <Routes>
│                       │       ├── MainDashboard (/)
│                       │       ├── ProfilesPage (/profiles)
│                       │       ├── ModuleGuard (/furlong/*)
│                       │       │   └── FurlongRoutes
│                       │       │       └── FurlongDashboard
│                       │       └── ModuleGuard (/sports/*)
│                       │           └── UpgradePrompt
│                       └── CalculatorSidebar
│                           └── Calculator
└── [Outside EdgeLayout, if needed]
    └── AuthPages (login/register - no EdgeLayout)
```

## State Management Architecture

### State Boundaries

**ProfileContext (React Context):**
- Purpose: Multi-profile management
- Scope: Global (entire app)
- Data: profiles array, activeProfileId
- Actions: CRUD operations, switching
- Persistence: LocalStorage (for development)

**ModuleContext (React Context):**
- Purpose: Subscription/module access control
- Scope: Global (entire app)
- Data: moduleAccess object, metadata
- Actions: hasModuleAccess, getModuleMetadata
- Persistence: Mock data (will be from backend later)

**CalculatorStore (Zustand):**
- Purpose: Calculator sidebar state
- Scope: Global
- Data: isOpen, calculation inputs/results
- Actions: toggle, updateInputs, calculate
- Persistence: None (ephemeral)

**React Query:**
- Purpose: Server data (P&L, bets, bookmakers)
- Scope: Per component/hook
- Data: Cached API responses (mocked for now)
- Keys: Include profileId for profile-specific queries

**Local Component State:**
- Purpose: UI state (modals, dropdowns, forms)
- Scope: Single component
- Examples: isModalOpen, formData, selectedItem

### Query Key Strategy

```typescript
// Profile-specific queries (use activeProfileId)
['furlong-pl', activeProfileId]           // Furlong P&L for current profile
['bets', activeProfileId]                 // Bets for current profile
['bookmakers', activeProfileId]           // Bookmakers for current profile

// Aggregated queries (no profileId, fetches all)
['all-profiles-pl']                       // P&L for all profiles
['profile-summaries']                     // Summary data for all profiles

// Profile-independent queries
['user']                                  // Current user data
['subscription']                          // User's subscription status
```

### State Update Flow

**Profile Switch:**
```
User clicks profile in switcher
  → switchProfile(profileId) called
  → ProfileContext updates activeProfileId
  → All components re-render with new activeProfileId
  → React Query refetches queries with new key
  → UI updates with new profile's data
```

## Risks / Trade-offs

### Risk 1: Mock Data Complexity
**Trade-off:**
- ✅ Enables frontend development without backend
- ✅ Allows testing of all user flows
- ❌ Mock data may not match real backend structure
- ❌ Risk of building features that don't match backend capabilities

**Mitigation:**
- Define clear TypeScript interfaces for data shapes
- Document assumptions about backend behavior
- Use realistic mock data structures
- Plan for backend integration from the start (React Query, proper hooks)

### Risk 2: Profile Switching Performance
**Trade-off:**
- ✅ Profile switch should feel instant
- ❌ Switching triggers re-renders across many components
- ❌ Multiple queries refetch simultaneously

**Mitigation:**
- Use React Query's caching - if profile was recently active, data is cached
- Implement optimistic UI updates where appropriate
- Profile switch doesn't reload page - just updates context and queries
- Consider query prefetching for faster switches

### Risk 3: Two-Level Data Views (Aggregated vs Single)
**Trade-off:**
- ✅ Powerful feature - users get both overview and detail
- ❌ Could be confusing if not clearly indicated
- ❌ Complexity in implementing aggregation logic

**Mitigation:**
- **Very clear visual indicators** on every page showing view type
- Consistent badge/label design language
- Different color accents for aggregated vs single views
- Tooltips or help text explaining the difference
- User testing to validate clarity

### Risk 4: Module Access Confusion
**Trade-off:**
- ✅ Module-based organization is clear and scalable
- ❌ Users might not understand why some features are locked
- ❌ Frustration if upgrade path is unclear

**Mitigation:**
- Clear lock icons and "Upgrade" badges in navigation
- Informative UpgradePrompt with module benefits and pricing
- Make free core features robust and valuable
- Clear communication about what each tier includes

### Risk 5: Mobile Navigation Complexity
**Trade-off:**
- ✅ Desktop sidebar navigation is excellent
- ❌ Mobile sidebar overlay + profile switcher + calculator = a lot of UI
- ❌ Small screens make profile switching harder

**Mitigation:**
- Prioritize profile switcher visibility on mobile (header, not hidden)
- Sidebar navigation as full-screen overlay on mobile
- Calculator as separate modal/page on mobile instead of sidebar
- Bottom navigation bar for most common actions on mobile (optional)

## Migration Plan

### Prerequisites
1. ✅ `add-frontend-foundation` fully implemented and verified
2. ✅ React Router v6, Zustand, Tailwind CSS installed and working
3. ✅ Basic folder structure (components, hooks, types) in place

### Phase 1: Context Providers (Week 1)
1. Implement ProfileProvider with mock data
2. Implement ModuleContext with mock subscription
3. Wrap App with providers
4. Verify contexts accessible throughout app

### Phase 2: Layout Foundation (Week 1-2)
1. Build EdgeLayout base component
2. Build Header component
3. Build Sidebar component with collapsible behavior
4. Test responsive behavior
5. Implement basic styling

### Phase 3: Profile Management (Week 2)
1. Build ProfileSwitcher component
2. Build Profile Management page
3. Implement profile CRUD operations
4. Test profile creation, editing, deletion, switching

### Phase 4: Module Access Control (Week 2-3)
1. Build ModuleGuard component
2. Build UpgradePrompt component
3. Reorganize routes by module in App.tsx
4. Test module access and locked state

### Phase 5: Calculator Sidebar (Week 3)
1. Build CalculatorSidebar component
2. Implement basic calculator logic
3. Add toggle functionality
4. Integrate into EdgeLayout

### Phase 6: Data Views (Week 3-4)
1. Build Main Dashboard with aggregated view
2. Build Furlong Dashboard with single-profile view
3. Implement mock data aggregation
4. Add visual indicators for view types

### Phase 7: Polish and Testing (Week 4)
1. Refine styling and animations
2. Add all visual indicators and badges
3. Test all user flows
4. Test responsive behavior on all devices
5. Fix bugs and refinements

### Rollback
If this change needs to be rolled back:
1. Remove EdgeLayout wrapper from routes
2. Remove ProfileProvider and ModuleProvider wrappers
3. Revert App.tsx to basic routing (from add-frontend-foundation)
4. Delete new components (ProfileSwitcher, ModuleGuard, etc.)
5. Remove profile and module types

## Open Questions

### 1. Profile Deletion Behavior
**Question:** When a profile is deleted, what happens to its data? Should there be a "trash" or "archive" period before permanent deletion?

**Impact:** Affects user trust and error recovery

**Recommendation:** Soft delete with 30-day retention period before permanent deletion (implement in backend later)

### 2. Profile Switching During Form Edits
**Question:** If a user is editing data for Profile A and switches to Profile B, what happens to unsaved changes?

**Impact:** Could lose user work, or confuse data ownership

**Recommendation:**
- Show warning modal: "You have unsaved changes. Save before switching profiles?"
- Options: Save and Switch, Discard and Switch, Cancel
- Implement in form components with useBeforeUnload

### 3. CalculatorSidebar Content and Features
**Question:** What specific betting calculator features are needed? Odds conversion? Stake calculation? Multi-bet accumulators?

**Impact:** Affects complexity of CalculatorSidebar implementation

**Recommendation:** Start with simple stake/odds calculator, expand based on user feedback

### 4. Aggregated Dashboard Complexity
**Question:** How complex should the aggregation logic be? Just sum totals, or more sophisticated analytics (averages, trends, comparisons)?

**Impact:** Development time and performance

**Recommendation:** Start with simple sums (total profit, total bets, overall ROI), add sophistication in future iterations

### 5. Profile Settings Scope
**Question:** What settings should be configurable per profile? Currency, timezone, default bet sizes, bookmaker preferences?

**Impact:** ProfileSettings interface design and UI complexity

**Recommendation:** Start minimal (just profile name), add settings incrementally based on real needs

### 6. Maximum Profiles per Tier
**Question:** Actual limits: 3 for Free, 5 for Pro, 20 for Premium? Or different limits?

**Impact:** Mock data values and UI messaging

**Recommendation:** Use 20 as mock limit for development, configure from backend subscription service later

### 7. Sports Module Content
**Question:** What will the Sports module actually contain? Different dashboards, trackers, or similar to Furlong but for different sports?

**Impact:** Route structure and UpgradePrompt messaging

**Recommendation:** Generic "Sports Module" messaging for now, define specifics when Sports module is designed

### 8. Mobile Bottom Navigation
**Question:** Should mobile have a bottom navigation bar for quick access to core features (Dashboard, Profiles, Calculator)?

**Impact:** Mobile UX and additional components

**Recommendation:** Start without bottom nav, add if user testing shows navigation difficulty on mobile

## Success Metrics

### Functionality
✅ Users can create, edit, delete, and switch profiles
✅ Profile switcher is prominent and easy to use
✅ Main dashboard shows aggregated data from all profiles
✅ Module dashboards show single-profile data correctly
✅ Data updates when profile is switched
✅ Furlong module routes are accessible
✅ Sports module routes show upgrade prompt
✅ Calculator sidebar is globally accessible
✅ Sidebar navigation is functional and responsive

### Code Quality
✅ TypeScript strict mode with no `any` types
✅ All components have proper prop types
✅ Clean separation of concerns (context, components, types)
✅ Mock data is well-structured and realistic
✅ Code passes linting and type-checking

### UX
✅ Clear visual distinction between aggregated and single-profile views
✅ Active states clearly indicate current profile and route
✅ Lock icons and upgrade badges are obvious
✅ Responsive design works on mobile, tablet, desktop
✅ Animations are smooth and don't cause jank

## Future Enhancements (Out of Scope)

- Backend integration for real subscription service
- Real-time profile data synchronization
- Profile collaboration or sharing
- Profile templates and cloning
- Advanced aggregation analytics (trends, forecasting)
- Profile export/import functionality
- Multi-currency support per profile
- Comprehensive betting calculator (accumulators, each-way, etc.)
- Bottom navigation bar for mobile
- Progressive Web App (PWA) features
