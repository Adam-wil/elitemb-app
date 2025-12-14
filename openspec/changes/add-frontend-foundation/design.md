# Design Document: Frontend Foundation with Handsontable

## Context
This is the initial frontend setup for the Elite MB Application, focusing on establishing a solid foundation before backend development. The application requires core business features (dashboard, banking, profiles) and a specialized "furlong" module with tracking, planning, and promotional tracking capabilities. The furlong tracker requires spreadsheet-like functionality with Excel-style editing, indicating a need for sophisticated data grid capabilities.

The project follows a frontend-first development approach to validate UX and requirements before investing in backend infrastructure.

## Goals / Non-Goals

### Goals
- Establish type-safe React development with TypeScript 5+
- Create scalable modular architecture separating core and module-specific features
- Enable fast development iteration with Vite and hot module replacement
- Provide Excel-like data editing capabilities for furlong tracker with Handsontable
- Set up centralized state management with Redux Toolkit
- Enforce code quality through automated linting and formatting
- Support future backend integration through structured state management

### Non-Goals
- Backend API implementation (deferred to future change)
- Authentication/authorization (separate change)
- Data persistence (will come with backend)
- Production deployment configuration (separate change)
- Comprehensive testing setup (can be added incrementally)
- Complete UI component library (will be built incrementally)

## Decisions

### Decision 1: Vite over Create React App or Next.js
**Rationale:** Vite provides instant server start, lightning-fast HMR, and optimized builds. It's the modern standard for React SPAs.

**Alternatives considered:**
- Create React App: Deprecated, slow build times, webpack complexity
- Next.js: Unnecessary SSR/SSG overhead for this application's needs
- Parcel: Less ecosystem support, fewer plugins

**Winner:** Vite - best developer experience, fastest builds, excellent TypeScript support

### Decision 2: Feature-Based Modular Architecture
**Rationale:** Organizing by features rather than file types scales better and keeps related code together. The distinction between features/core and features/modules/furlong reflects business domain separation.

**Structure:**
```
01_Frontend/src/
├── features/
│   ├── core/               # Core business features
│   │   ├── dashboard/      # Dashboard feature
│   │   ├── banking/        # Banking feature
│   │   └── profiles/       # Profiles feature
│   └── modules/
│       └── furlong/        # Furlong-specific module
│           ├── tracker/     # Tracker with Handsontable
│           ├── planner/     # Planning features
│           └── promo-tracker/  # Promotional tracking
├── components/             # Shared UI components
├── hooks/                  # Shared React hooks
├── types/                  # Shared TypeScript types
└── utils/                  # Utility functions
```

**Benefits:**
- Clear domain boundaries between core and furlong
- Each feature is self-contained
- Easy to understand what code belongs where
- Supports potential code-splitting by feature

### Decision 3: Handsontable for Data Grid
**Rationale:** The furlong tracker requires spreadsheet-like functionality with Excel-style editing. Handsontable provides battle-tested Excel-like UX with cell editing, formulas, and data manipulation.

**Alternatives considered:**
- AG Grid: Powerful but expensive enterprise license, overkill for needs
- React Data Grid (@inovua/reactdatagrid): Good but less Excel-like UX
- AG-GRID Stack Table: Low-level, requires building Excel-like features from scratch
- Material UI Data Grid: Limited free tier, not truly Excel-like

**Winner:** Handsontable
- ✅ True spreadsheet experience users expect
- ✅ Excel-like cell editing, navigation, copy/paste
- ✅ Strong TypeScript support
- ✅ Non-commercial license available for internal business apps
- ✅ Mature, well-documented, actively maintained
- ⚠️ Note: Verify license compliance for commercial use

### Decision 4: Redux Toolkit for State Management
**Rationale:** Redux Toolkit provides centralized, predictable state management with excellent TypeScript support and powerful dev tools. Perfect for managing complex application state across core and furlong features.

**Alternatives considered:**
- Zustand: Too minimal for complex state interactions across features
- Jotai/Recoil: Atomic state - learning curve without clear benefits
- Context API only: Works but lacks dev tools, performance optimizations, and middleware

**Winner:** Redux Toolkit
- ✅ Industry-standard state management with proven patterns
- ✅ Excellent TypeScript integration with type-safe actions and reducers
- ✅ Powerful Redux DevTools for debugging state changes
- ✅ Built-in middleware support (thunks for async actions)
- ✅ RTK Query available if needed for future API integration
- ✅ Simplified Redux setup with createSlice and configureStore
- ✅ Immer integration for immutable state updates with mutable-looking code

**State Organization:**
```
src/store/
├── index.ts                 # Store configuration
├── slices/
│   ├── dashboardSlice.ts   # Dashboard state
│   ├── bankingSlice.ts     # Banking state
│   ├── profilesSlice.ts    # Profiles state
│   └── furlong/
│       ├── trackerSlice.ts      # Tracker state
│       ├── plannerSlice.ts      # Planner state
│       └── promoTrackerSlice.ts # Promo tracker state
└── hooks.ts                # Typed useAppDispatch and useAppSelector
```

### Decision 5: Tailwind CSS for Styling
**Rationale:** Utility-first CSS that works perfectly with component-based React. Maintains design consistency and produces small production bundles.

**Alternatives considered:**
- CSS Modules: More boilerplate, harder to maintain consistency
- Styled Components: Runtime overhead, larger bundle
- Material-UI/Chakra: Too opinionated, limits design flexibility

**Winner:** Tailwind - fastest development, smallest bundle, most flexible

### Decision 6: Path Aliases (@/)
**Rationale:** Using @/components instead of ../../../components improves code readability and makes refactoring easier when moving files.

**Configuration:**
- TypeScript: tsconfig.json paths
- Vite: vite.config.ts resolve.alias
- Single @ prefix for src/ directory

### Decision 7: React Router v6 for Routing
**Rationale:** Industry standard for React SPA routing. v6 provides improved TypeScript support and smaller bundle size than v5.

**Route Structure:**
```
/                           # Root/landing
/dashboard                  # Core dashboard
/banking                    # Core banking
/profiles                   # Core profiles
/furlong/tracker            # Furlong tracker (Handsontable)
/furlong/planner            # Furlong planner
/furlong/promo-tracker      # Furlong promo tracker
```

## Risks / Trade-offs

### Risk: Handsontable License Compliance
**Trade-off:**
- ✅ Provides exactly the UX needed for tracker
- ⚠️ Non-commercial license has restrictions
- ❌ Commercial license is expensive

**Mitigation:**
1. Verify current use case qualifies for non-commercial license
2. If commercial license needed, budget accordingly
3. Alternative: Consider TanStack Table + custom Excel-like features if license is blocker

### Risk: Frontend-First Approach
**Trade-off:**
- ✅ Faster initial development, validate UX early
- ❌ May need refactoring when backend patterns emerge
- ❌ Temptation to hardcode data instead of proper API integration

**Mitigation:**
- Set up Redux slices with proper state structure from day one
- Use TypeScript interfaces for data shapes (future API contracts)
- Design Redux actions and reducers to accommodate future async thunks for API calls
- Keep state management separate from UI components for easier backend integration

### Risk: Modular Structure Learning Curve
**Trade-off:**
- ✅ Scales better long-term
- ❌ More complex than flat structure for newcomers
- ❌ Requires discipline to maintain boundaries

**Mitigation:**
- Document structure clearly in README
- Provide examples of each feature type
- Code review to enforce conventions

### Risk: Redux Boilerplate vs Complexity Trade-off
**Trade-off:**
- ✅ Redux Toolkit significantly reduces boilerplate compared to classic Redux
- ✅ Centralized state makes debugging and state flow easier
- ❌ More setup than minimal solutions like Zustand
- ❌ Learning curve for developers unfamiliar with Redux patterns

**Mitigation:**
- Use Redux Toolkit's modern APIs (createSlice, configureStore)
- Create clear examples and templates for common patterns
- Document slice organization and best practices
- Leverage TypeScript for type-safe state access

## Migration Plan

### Phase 1: Foundation (This Change)
1. ✅ Initialize Vite + React + TypeScript
2. ✅ Configure tooling (ESLint, Prettier, Tailwind)
3. ✅ Create folder structure
4. ✅ Set up routing and Redux Toolkit state management
5. ✅ Integrate Handsontable
6. ✅ Create placeholder pages/components
7. ✅ Verify dev environment works end-to-end

### Phase 2: Feature Development (Future Changes)
- Implement dashboard UI with Redux state
- Implement banking UI with Redux state
- Implement profiles UI with Redux state
- Build furlong tracker with Handsontable and Redux integration
- Build furlong planner with Redux state
- Build promo tracker with Redux state

### Phase 3: Backend Integration (Future Changes)
- Develop backend API
- Add async thunks for API calls in Redux slices
- Add authentication with Redux state management
- Connect Handsontable to backend data via Redux
- Add data persistence with Redux middleware

### Rollback
If this foundation needs to be rolled back:
1. Delete 01_Frontend directory
2. Repository returns to clean state
3. No external dependencies affected

## Open Questions

### 1. Handsontable License Type
**Question:** Does this application qualify for non-commercial license, or is commercial license required?

**Action needed:** Review Handsontable licensing terms and verify with stakeholders

### 2. Furlong Tracker Data Model
**Question:** What is the structure of data in the furlong tracker table? How many columns/rows? Data types?

**Impact:** Affects Handsontable configuration and TypeScript types

**Recommendation:** Document data model early to inform component design

### 3. Design System / Component Library
**Question:** Will we build custom components, or should we adopt a component library (e.g., shadcn/ui, Radix UI)?

**Recommendation:** Start custom with Tailwind, adopt shadcn/ui if patterns emerge
- shadcn/ui provides unstyled, accessible components
- Copy/paste approach fits well with our architecture
- Can add incrementally as needed

### 4. Authentication Strategy
**Question:** What authentication system will be used? (Supabase Auth, Auth0, custom?)

**Impact:** Affects routing (protected routes), state management (user state), React Query setup

**Recommendation:** Defer until backend work begins, but design routing with auth in mind

### 5. Package Manager
**Question:** npm, yarn, or pnpm?

**Recommendation:** npm (default, simplest, already installed)

### 6. Node.js Version
**Question:** What Node.js version should we target?

**Recommendation:** Node 18 LTS or higher (document in .nvmrc and package.json engines)

### 7. Responsive Design Requirements
**Question:** Does the app need to work on mobile/tablet, or is it desktop-only?

**Impact:** Affects Tailwind configuration and component design

**Recommendation:** If Handsontable is primary interface, likely desktop-focused

### 8. Data Grid Performance Requirements
**Question:** How many rows will the furlong tracker display? Performance requirements?

**Impact:** May need virtualization, pagination, or performance optimizations

**Recommendation:** Start with standard Handsontable, optimize if needed
