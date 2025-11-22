# Implementation Tasks

## Prerequisites
- [ ] 0.1 Verify add-frontend-foundation is fully implemented and working
- [ ] 0.2 Verify React Router v6, Zustand, Tailwind CSS are installed
- [ ] 0.3 Verify path aliases (@/) are configured

## 1. Profile Management System (ProfileProvider)

### Context Provider Setup
- [ ] 1.1 Create src/data/profile-context.tsx file
- [ ] 1.2 Define Profile TypeScript interface (id, name, createdAt, settings)
- [ ] 1.3 Define ProfileContextValue interface (profiles, activeProfileId, actions)
- [ ] 1.4 Create ProfileProvider component with React Context
- [ ] 1.5 Create useProfile custom hook for consuming context

### Mock Data Setup
- [ ] 1.6 Create mock profiles array: [{ id: '1', name: 'Pro User' }, { id: '2', name: 'Jenny' }, { id: '3', name: 'George' }]
- [ ] 1.7 Initialize activeProfileId state (default: '1')
- [ ] 1.8 Initialize maxProfiles limit (hardcoded: 20)

### Profile CRUD Operations
- [ ] 1.9 Implement createProfile function (with tier limit check)
- [ ] 1.10 Implement updateProfile function (name, settings)
- [ ] 1.11 Implement deleteProfile function (prevent deleting last profile)
- [ ] 1.12 Implement switchProfile function (set activeProfileId)
- [ ] 1.13 Implement getProfileById function
- [ ] 1.14 Implement getActiveProfile function
- [ ] 1.15 Add validation: prevent duplicate profile names
- [ ] 1.16 Add validation: enforce maxProfiles limit

### Integration
- [ ] 1.17 Wrap App component with ProfileProvider in main.tsx or App.tsx
- [ ] 1.18 Verify context is accessible throughout component tree

## 2. Module Subscription System (ModuleContext)

### Context Provider Setup
- [ ] 2.1 Create src/data/module-context.tsx file
- [ ] 2.2 Define Module type ('furlong' | 'sports')
- [ ] 2.3 Define ModuleAccess interface { furlong: boolean, sports: boolean }
- [ ] 2.4 Create ModuleContext with React Context
- [ ] 2.5 Create useModuleAccess custom hook

### Mock Subscription Data
- [ ] 2.6 Create mock module access: { furlong: true, sports: false }
- [ ] 2.7 Implement hasModuleAccess function (module: Module) => boolean
- [ ] 2.8 Create module metadata (name, description, features, pricing)

### Integration
- [ ] 2.9 Create ModuleProvider component
- [ ] 2.10 Wrap App with ModuleProvider
- [ ] 2.11 Verify useModuleAccess hook works in components

## 3. Route Guards and Protection

### ModuleGuard Component
- [ ] 3.1 Create src/components/guards/ModuleGuard.tsx
- [ ] 3.2 Accept props: module, children, fallback (optional)
- [ ] 3.3 Use useModuleAccess to check access
- [ ] 3.4 Render children if hasAccess, else render UpgradePrompt
- [ ] 3.5 Add TypeScript prop types

### UpgradePrompt Component
- [ ] 3.6 Create src/components/guards/UpgradePrompt.tsx
- [ ] 3.7 Accept module prop to display correct module info
- [ ] 3.8 Design UI: module name, description, features list, pricing
- [ ] 3.9 Add "Upgrade Now" button (placeholder action for now)
- [ ] 3.10 Add "Go Back" or "Return to Dashboard" button
- [ ] 3.11 Style with Tailwind CSS (card layout, lock icon, professional)
- [ ] 3.12 Make responsive (mobile/tablet/desktop)

## 4. EdgeLayout Component (Collapsible Sidebar)

### Base Layout Structure
- [ ] 4.1 Create src/components/layout/EdgeLayout.tsx
- [ ] 4.2 Create base layout grid: header + sidebar + main content area
- [ ] 4.3 Add children prop to render page content in main area
- [ ] 4.4 Set up responsive grid/flexbox structure

### Header Component
- [ ] 4.5 Create src/components/layout/Header.tsx
- [ ] 4.6 Add logo/app name on left
- [ ] 4.7 Add Profile Switcher component in center/right
- [ ] 4.8 Add active module indicator (breadcrumb or label)
- [ ] 4.9 Add hamburger menu button for mobile
- [ ] 4.10 Add subscription status badge (e.g., "Pro" tier)
- [ ] 4.11 Style header with Tailwind (sticky top, shadow, theme colors)

### Sidebar Component
- [ ] 4.12 Create src/components/layout/Sidebar.tsx
- [ ] 4.13 Add sidebar state (open/closed) with Zustand or local state
- [ ] 4.14 Implement hamburger toggle functionality
- [ ] 4.15 Create navigation sections: "Core", "Furlong Module", "Sports Module"
- [ ] 4.16 Make sections collapsible/expandable (accordion style)
- [ ] 4.17 Add lock icons for modules without access
- [ ] 4.18 Add "Upgrade" badge for locked modules
- [ ] 4.19 Highlight active route/section
- [ ] 4.20 Implement NavLink components with React Router
- [ ] 4.21 Style sidebar (width, padding, colors, transitions)
- [ ] 4.22 Add smooth collapse/expand animation

### Responsive Behavior
- [ ] 4.23 Mobile (<768px): Overlay sidebar, close on navigation
- [ ] 4.24 Tablet (768px-1024px): Collapsible sidebar, push content
- [ ] 4.25 Desktop (>1024px): Sidebar always visible, collapsible optional
- [ ] 4.26 Test all breakpoints and transitions

## 5. Profile Switcher Component

### UI Component
- [ ] 5.1 Create src/components/profile/ProfileSwitcher.tsx
- [ ] 5.2 Use useProfile hook to get profiles and activeProfileId
- [ ] 5.3 Design dropdown/modal UI showing all profiles
- [ ] 5.4 Display active profile name prominently
- [ ] 5.5 Add profile list with names and select buttons
- [ ] 5.6 Implement switchProfile on selection
- [ ] 5.7 Add "+ New Profile" option (opens create modal)
- [ ] 5.8 Show profile count / limit (e.g., "3 / 20 profiles")
- [ ] 5.9 Style with Tailwind (dropdown, hover states, active state)
- [ ] 5.10 Add keyboard navigation support (accessibility)
- [ ] 5.11 Make mobile-friendly (full-width on small screens)

## 6. Profile Management Page

### Profile List View
- [ ] 6.1 Create src/features/core/profiles/ProfilesPage.tsx
- [ ] 6.2 Display all profiles in a list/grid
- [ ] 6.3 Show profile name, created date, active indicator
- [ ] 6.4 Add "Edit" button for each profile
- [ ] 6.5 Add "Delete" button for each profile (disabled for last profile)
- [ ] 6.6 Add "Set as Active" button for inactive profiles
- [ ] 6.7 Add "+ Create New Profile" button (check tier limit)

### Create Profile Modal/Form
- [ ] 6.8 Create ProfileCreateModal component
- [ ] 6.9 Add form with profile name input
- [ ] 6.10 Validate name (required, unique, max length)
- [ ] 6.11 Check tier limit before allowing creation
- [ ] 6.12 Call createProfile on submit
- [ ] 6.13 Show success/error messages
- [ ] 6.14 Close modal and refresh list on success

### Edit Profile Modal/Form
- [ ] 6.15 Create ProfileEditModal component
- [ ] 6.16 Pre-populate form with existing profile data
- [ ] 6.17 Allow editing profile name and settings
- [ ] 6.18 Validate changes
- [ ] 6.19 Call updateProfile on submit
- [ ] 6.20 Show success/error messages

### Delete Profile Confirmation
- [ ] 6.21 Create ProfileDeleteConfirmation component
- [ ] 6.22 Show warning about data loss
- [ ] 6.23 Prevent deleting the last profile
- [ ] 6.24 Prevent deleting the active profile (require switch first)
- [ ] 6.25 Call deleteProfile on confirm
- [ ] 6.26 Redirect or refresh on successful deletion

## 7. CalculatorSidebar Component

### Calculator UI
- [ ] 7.1 Create src/components/calculator/CalculatorSidebar.tsx
- [ ] 7.2 Design betting calculator UI (odds input, stake, returns)
- [ ] 7.3 Add calculation logic for different bet types
- [ ] 7.4 Add toggle button to open/close calculator
- [ ] 7.5 Implement sidebar state (open/closed)
- [ ] 7.6 Position as right sidebar or overlay
- [ ] 7.7 Make responsive width (300px desktop, full-width mobile)
- [ ] 7.8 Style with Tailwind CSS
- [ ] 7.9 Add smooth slide animation

### Integration
- [ ] 7.10 Add CalculatorSidebar to EdgeLayout
- [ ] 7.11 Make globally accessible (all pages)
- [ ] 7.12 Add calculator toggle button in header or floating action button
- [ ] 7.13 Verify calculator works independently of module access

## 8. Route Reorganization

### Update App.tsx
- [ ] 8.1 Reorganize routes into module sections (Core, Furlong, Sports)
- [ ] 8.2 Wrap all routes with EdgeLayout component
- [ ] 8.3 Add / route for Main Dashboard (aggregated view)
- [ ] 8.4 Add /profiles route for Profile Management page
- [ ] 8.5 Add /profiles/:profileId route for individual profile settings
- [ ] 8.6 Add /banking/* routes (accounts, bookie-balance, bookie-health)

### Furlong Module Routes
- [ ] 8.7 Create /furlong route group
- [ ] 8.8 Wrap /furlong/* routes with ModuleGuard (module="furlong")
- [ ] 8.9 Add /furlong/dashboard route (Racing P&L Dashboard)
- [ ] 8.10 Add /furlong/planner route
- [ ] 8.11 Add /furlong/tracker route
- [ ] 8.12 Add /furlong/promo-tracker route
- [ ] 8.13 Add /furlong/non-promo-turnover route
- [ ] 8.14 Add /furlong/under-radar route
- [ ] 8.15 Add /furlong/bookie-list route

### Sports Module Routes
- [ ] 8.16 Create /sports route group
- [ ] 8.17 Wrap /sports/* routes with ModuleGuard (module="sports")
- [ ] 8.18 Add catch-all /sports/* route that renders UpgradePrompt

### Placeholder Pages
- [ ] 8.19 Create placeholder components for all core routes
- [ ] 8.20 Create placeholder components for all furlong routes
- [ ] 8.21 Add basic content and "Coming Soon" messages where needed

## 9. Data Flow Implementation

### Main Dashboard (Aggregated View)
- [ ] 9.1 Create src/features/core/dashboard/MainDashboard.tsx
- [ ] 9.2 Add visual indicator: "All Profiles Combined" header
- [ ] 9.3 Mock aggregated P&L data structure
- [ ] 9.4 Display aggregated metrics (total profit, total bets, overall ROI)
- [ ] 9.5 Add breakdown by profile (drill-down table/cards)
- [ ] 9.6 Style dashboard with cards, charts placeholders

### Module Dashboard (Single Profile View)
- [ ] 9.7 Create src/features/modules/furlong/FurlongDashboard.tsx
- [ ] 9.8 Use activeProfileId from ProfileContext
- [ ] 9.9 Add visual indicator: "Profile: [Active Profile Name]"
- [ ] 9.10 Mock profile-specific P&L data
- [ ] 9.11 Display profile-specific metrics
- [ ] 9.12 Update data when profile is switched

## 10. Visual Indicators and Styling

### Active State Indicators
- [ ] 10.1 Highlight active profile in Profile Switcher
- [ ] 10.2 Highlight active route in Sidebar navigation
- [ ] 10.3 Highlight active module section in Sidebar
- [ ] 10.4 Add breadcrumb or page title showing current module

### Module Access Indicators
- [ ] 10.5 Add lock icon SVG/component
- [ ] 10.6 Style locked module links (grayed out, cursor not-allowed)
- [ ] 10.7 Add "Upgrade" badge component (small pill/tag)
- [ ] 10.8 Add subscription tier badge in header

### Data View Indicators
- [ ] 10.9 Design "All Profiles" badge/indicator for aggregated views
- [ ] 10.10 Design "Single Profile: [Name]" badge for profile-specific views
- [ ] 10.11 Add subtle background color differences for aggregated vs single views

## 11. TypeScript Types and Interfaces

### Type Definitions
- [ ] 11.1 Create src/types/profile.types.ts
- [ ] 11.2 Define Profile interface
- [ ] 11.3 Define ProfileSettings interface
- [ ] 11.4 Create src/types/module.types.ts
- [ ] 11.5 Define Module type
- [ ] 11.6 Define ModuleAccess interface
- [ ] 11.7 Define ModuleMetadata interface
- [ ] 11.8 Export all types from src/types/index.ts

## 12. Testing and Verification

### Profile System Testing
- [ ] 12.1 Test creating new profile
- [ ] 12.2 Test switching between profiles
- [ ] 12.3 Test editing profile name
- [ ] 12.4 Test deleting profile (verify last profile cannot be deleted)
- [ ] 12.5 Test tier limit enforcement (20 profiles max)
- [ ] 12.6 Verify profile context is accessible throughout app

### Module Access Testing
- [ ] 12.7 Verify Furlong module routes are accessible (hasAccess=true)
- [ ] 12.8 Verify Sports module routes show UpgradePrompt (hasAccess=false)
- [ ] 12.9 Test ModuleGuard component rendering

### Layout and Navigation Testing
- [ ] 12.10 Test sidebar collapse/expand on desktop
- [ ] 12.11 Test sidebar overlay behavior on mobile
- [ ] 12.12 Test hamburger menu toggle
- [ ] 12.13 Test Profile Switcher dropdown/modal
- [ ] 12.14 Test navigation between routes
- [ ] 12.15 Verify active route highlighting

### Calculator Testing
- [ ] 12.16 Test CalculatorSidebar toggle open/close
- [ ] 12.17 Verify calculator is accessible from all pages
- [ ] 12.18 Test calculator calculations
- [ ] 12.19 Test responsive behavior on mobile

### Data Flow Testing
- [ ] 12.20 Verify Main Dashboard shows aggregated data
- [ ] 12.21 Verify Furlong Dashboard shows single profile data
- [ ] 12.22 Verify data updates when profile is switched
- [ ] 12.23 Test visual indicators (All Profiles vs Single Profile badges)

### Responsive Testing
- [ ] 12.24 Test on mobile viewport (<768px)
- [ ] 12.25 Test on tablet viewport (768px-1024px)
- [ ] 12.26 Test on desktop viewport (>1024px)
- [ ] 12.27 Verify all interactive elements work on touch devices

## 13. Documentation

### Code Documentation
- [ ] 13.1 Add JSDoc comments to ProfileProvider
- [ ] 13.2 Add JSDoc comments to ModuleContext
- [ ] 13.3 Document EdgeLayout component usage
- [ ] 13.4 Document ProfileSwitcher props and behavior

### README Updates
- [ ] 13.5 Update 01_Frontend/README.md with multi-profile architecture
- [ ] 13.6 Document module subscription system
- [ ] 13.7 Document mock data setup and customization
- [ ] 13.8 Add screenshots or diagrams of layout structure

## 14. Final Verification

### Build and Lint
- [ ] 14.1 Run npm run build and verify no errors
- [ ] 14.2 Run npm run lint and fix any issues
- [ ] 14.3 Run npm run type-check and verify TypeScript correctness

### Functionality Checklist
- [ ] 14.4 All routes navigate correctly
- [ ] 14.5 Profile switching works across all pages
- [ ] 14.6 Module guards protect routes correctly
- [ ] 14.7 UpgradePrompt shows for locked modules
- [ ] 14.8 Sidebar navigation is functional and responsive
- [ ] 14.9 CalculatorSidebar is accessible globally
- [ ] 14.10 Visual indicators are clear and consistent

### OpenSpec Compliance
- [ ] 14.11 Review against proposal.md requirements
- [ ] 14.12 Verify all scenarios in spec.md are met
- [ ] 14.13 Update design.md with any implementation decisions made
