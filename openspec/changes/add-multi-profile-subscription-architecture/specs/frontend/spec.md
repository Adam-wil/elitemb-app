# Frontend Capability Specification - Multi-Profile Subscription Architecture

## MODIFIED Requirements

### Requirement: Application Routing Structure
The frontend SHALL organize routes by subscription module (Core, Furlong, Sports) with clear separation and module-based access control, building upon the basic routing from add-frontend-foundation.

#### Scenario: Core platform routes accessible
- **WHEN** the application loads
- **THEN** core routes SHALL be accessible without subscription checks
- **AND** routes SHALL include: / (main dashboard), /profiles, /profiles/:profileId, /banking/*

#### Scenario: Furlong module routes protected
- **WHEN** Furlong module routes are accessed
- **THEN** they SHALL be wrapped with ModuleGuard component
- **AND** routes SHALL include: /furlong/dashboard, /furlong/planner, /furlong/tracker, /furlong/promo-tracker, /furlong/non-promo-turnover, /furlong/under-radar, /furlong/bookie-list

#### Scenario: Sports module routes locked
- **WHEN** Sports module routes are accessed
- **THEN** they SHALL display UpgradePrompt component
- **AND** user SHALL not access actual sports features without subscription

## ADDED Requirements

### Requirement: Multi-Profile Management System
The application SHALL support multiple betting profiles per user with complete data isolation, profile switching, and tier-based limits.

#### Scenario: Multiple profiles exist
- **WHEN** a user has multiple profiles
- **THEN** each profile SHALL have isolated data (bets, balances, bookmakers, P&L)
- **AND** switching profiles SHALL update all data views to the selected profile

#### Scenario: Profile tier limits enforced
- **WHEN** a user attempts to create a new profile
- **THEN** the system SHALL check against maxProfiles limit (mocked at 20)
- **AND** SHALL prevent creation if limit is reached
- **AND** SHALL show clear error message about tier limits

### Requirement: Profile Context Provider
The application SHALL provide ProfileProvider context with full CRUD operations, active profile tracking, and profile switching functionality.

#### Scenario: Profile context initialization
- **WHEN** the application starts
- **THEN** ProfileProvider SHALL initialize with mock profiles: Pro User, Jenny, George
- **AND** SHALL set activeProfileId to first profile by default
- **AND** SHALL make context available to all child components

#### Scenario: Profile switching
- **WHEN** switchProfile(profileId) is called
- **THEN** activeProfileId SHALL update to the new profile
- **AND** all components using useProfile SHALL re-render
- **AND** queries dependent on activeProfileId SHALL refetch

#### Scenario: Profile creation
- **WHEN** createProfile(name) is called
- **THEN** a new profile SHALL be created with unique ID
- **AND** profile name SHALL be validated for uniqueness
- **AND** SHALL respect maxProfiles tier limit
- **AND** new profile SHALL be added to profiles array

#### Scenario: Profile deletion
- **WHEN** deleteProfile(id) is called
- **THEN** the profile SHALL be removed from profiles array
- **AND** SHALL prevent deletion if it's the last profile
- **AND** SHALL prevent deletion if it's the active profile (require switch first)

### Requirement: Profile Switcher Component
The application SHALL provide a Profile Switcher component prominently displayed in the header for quick profile switching.

#### Scenario: Profile switcher display
- **WHEN** the header renders
- **THEN** Profile Switcher SHALL display the active profile name
- **AND** SHALL show a dropdown icon or clickable area
- **AND** SHALL be prominently visible at all times

#### Scenario: Profile list display
- **WHEN** the Profile Switcher is clicked
- **THEN** it SHALL show a dropdown or modal with all profiles
- **AND** SHALL highlight the currently active profile
- **AND** SHALL show profile names and selection buttons

#### Scenario: Quick profile switch
- **WHEN** a user selects a different profile from the list
- **THEN** switchProfile SHALL be called with the selected profile ID
- **AND** the dropdown/modal SHALL close
- **AND** the UI SHALL update to show the new active profile

#### Scenario: New profile creation from switcher
- **WHEN** user clicks "+ New Profile" in the switcher
- **THEN** a profile creation modal or form SHALL open
- **AND** tier limit SHALL be checked before allowing creation
- **AND** profile count indicator SHALL show current count / max (e.g., "3 / 20")

### Requirement: Profile Management Page
The application SHALL provide a dedicated /profiles page for managing all user profiles with create, edit, and delete operations.

#### Scenario: Profile list view
- **WHEN** /profiles page is accessed
- **THEN** all profiles SHALL be displayed in a list or grid
- **AND** each profile SHALL show: name, created date, active indicator
- **AND** edit and delete buttons SHALL be available for each profile

#### Scenario: Profile creation via page
- **WHEN** "+ Create New Profile" button is clicked
- **THEN** a creation form or modal SHALL appear
- **AND** SHALL validate profile name (required, unique, max length)
- **AND** SHALL check tier limit before creation
- **AND** SHALL call createProfile on submit

#### Scenario: Profile editing
- **WHEN** "Edit" button is clicked for a profile
- **THEN** an edit form or modal SHALL open with current profile data
- **AND** user SHALL be able to update profile name and settings
- **AND** changes SHALL be saved via updateProfile

#### Scenario: Profile deletion confirmation
- **WHEN** "Delete" button is clicked for a profile
- **THEN** a confirmation dialog SHALL appear warning about data loss
- **AND** delete SHALL be prevented for the last profile
- **AND** delete SHALL be prevented for the active profile
- **AND** successful deletion SHALL remove the profile from the list

### Requirement: Module Subscription System
The application SHALL implement a subscription-based module access control system using ModuleContext with mock subscription data.

#### Scenario: Module access initialization
- **WHEN** the application starts
- **THEN** ModuleContext SHALL initialize with mock access: { furlong: true, sports: false }
- **AND** module metadata SHALL be available for all modules

#### Scenario: Module access check
- **WHEN** hasModuleAccess(module) is called
- **THEN** it SHALL return true if user has access to the module
- **AND** it SHALL return false if user does not have access
- **AND** access SHALL be based on mock subscription data

### Requirement: Module Guard Component
The application SHALL provide ModuleGuard component to protect module routes and display upgrade prompts for inaccessible modules.

#### Scenario: Accessible module rendering
- **WHEN** ModuleGuard wraps a route for an accessible module
- **THEN** it SHALL check hasModuleAccess for the specified module
- **AND** SHALL render children if access is granted
- **AND** user SHALL see the module content

#### Scenario: Locked module upgrade prompt
- **WHEN** ModuleGuard wraps a route for an inaccessible module
- **THEN** it SHALL check hasModuleAccess for the specified module
- **AND** SHALL render UpgradePrompt component if access is denied
- **AND** user SHALL NOT see the module content

### Requirement: Upgrade Prompt Component
The application SHALL provide UpgradePrompt component to inform users about locked modules and encourage subscription upgrades.

#### Scenario: Upgrade prompt display
- **WHEN** UpgradePrompt is rendered for a locked module
- **THEN** it SHALL display the module name and description
- **AND** it SHALL list key features of the module
- **AND** it SHALL show pricing information (if available)
- **AND** it SHALL display an "Upgrade Now" call-to-action button
- **AND** it SHALL provide a "Return to Dashboard" or "Go Back" option

### Requirement: EdgeLayout Component
The application SHALL provide EdgeLayout component as the primary layout wrapper with header, collapsible sidebar, main content area, and calculator sidebar.

#### Scenario: Layout structure
- **WHEN** EdgeLayout wraps application routes
- **THEN** it SHALL render: header, collapsible sidebar, main content area, calculator sidebar
- **AND** children SHALL be rendered in the main content area
- **AND** layout SHALL be responsive across all devices

#### Scenario: Layout integration
- **WHEN** routes are defined in App.tsx
- **THEN** all authenticated routes SHALL be wrapped with EdgeLayout
- **AND** EdgeLayout SHALL provide consistent navigation and structure

### Requirement: Collapsible Sidebar Navigation
The application SHALL provide collapsible sidebar navigation organized by modules with visual indicators for access control.

#### Scenario: Sidebar module sections
- **WHEN** the sidebar renders
- **THEN** it SHALL display navigation sections: Core, Furlong Module, Sports Module
- **AND** sections SHALL be clearly labeled and visually separated
- **AND** sections SHALL be collapsible/expandable

#### Scenario: Core navigation
- **WHEN** the Core section is displayed
- **THEN** it SHALL show links: Dashboard, Profiles, Banking (with sub-items)
- **AND** all links SHALL be accessible without subscription checks

#### Scenario: Furlong module navigation
- **WHEN** the Furlong Module section is displayed
- **THEN** it SHALL show links: Dashboard, Planner, Tracker, Promo Tracker, Non-Promo Turnover, Under Radar, Bookie List
- **AND** SHALL display checkmark or unlocked icon (user has access)
- **AND** all links SHALL be clickable and navigate to module routes

#### Scenario: Sports module locked navigation
- **WHEN** the Sports Module section is displayed
- **THEN** it SHALL show lock icon indicating no access
- **AND** it SHALL display "Upgrade" badge or text
- **AND** links SHALL either be disabled or navigate to UpgradePrompt

#### Scenario: Active route highlighting
- **WHEN** a user navigates to any route
- **THEN** the corresponding sidebar link SHALL be highlighted
- **AND** the module section containing the active link SHALL be expanded
- **AND** visual styling SHALL clearly indicate the active route

#### Scenario: Sidebar collapse on desktop
- **WHEN** the hamburger button is clicked on desktop
- **THEN** the sidebar SHALL collapse to icon-only view or fully hide
- **AND** main content SHALL expand to use the available space
- **AND** collapse state SHALL be remembered during session

#### Scenario: Sidebar overlay on mobile
- **WHEN** the hamburger button is clicked on mobile
- **THEN** the sidebar SHALL appear as a full-screen or overlay modal
- **AND** clicking outside the sidebar SHALL close it
- **AND** navigating to a route SHALL close the sidebar

### Requirement: Header Component with Profile Switching
The application SHALL provide a header component with logo, Profile Switcher, module indicator, subscription badge, and hamburger menu.

#### Scenario: Header layout
- **WHEN** the header renders
- **THEN** it SHALL display logo/app name on the left
- **AND** it SHALL display Profile Switcher in the center or center-right
- **AND** it SHALL display active module indicator or breadcrumb
- **AND** it SHALL display subscription tier badge (e.g., "Pro")
- **AND** it SHALL display hamburger menu button for sidebar toggle

#### Scenario: Responsive header
- **WHEN** the viewport changes size
- **THEN** header SHALL adapt layout for mobile, tablet, desktop
- **AND** all critical elements (logo, profile switcher, hamburger) SHALL remain accessible

### Requirement: CalculatorSidebar Component
The application SHALL provide a globally accessible CalculatorSidebar for betting calculations, available to all users regardless of subscription tier.

#### Scenario: Calculator availability
- **WHEN** a user is on any page
- **THEN** a toggle button or icon SHALL be available to open the calculator
- **AND** calculator SHALL be accessible regardless of module or subscription

#### Scenario: Calculator sidebar display
- **WHEN** the calculator is opened
- **THEN** it SHALL slide in from the right side as a sidebar
- **AND** it SHALL have a width of approximately 300px on desktop
- **AND** it SHALL overlay or push main content depending on screen size

#### Scenario: Calculator mobile display
- **WHEN** the calculator is opened on mobile
- **THEN** it SHALL display as a full-width overlay or modal
- **AND** it SHALL provide a close button
- **AND** it SHALL not interfere with primary navigation

#### Scenario: Calculator state persistence
- **WHEN** a user navigates between routes
- **THEN** calculator open/closed state SHALL persist
- **AND** calculation inputs SHALL be maintained during navigation

### Requirement: Data Aggregation for Main Dashboard
The application SHALL aggregate data from ALL user profiles on the main dashboard (/) to provide a combined overview of performance.

#### Scenario: Aggregated P&L display
- **WHEN** the main dashboard (/) is accessed
- **THEN** it SHALL fetch P&L data for ALL profiles
- **AND** it SHALL aggregate profit, total bets, ROI, and other metrics across all profiles
- **AND** it SHALL display the combined totals prominently

#### Scenario: All profiles indicator
- **WHEN** the main dashboard renders
- **THEN** it SHALL display a clear visual indicator "All Profiles Combined" or similar
- **AND** the indicator SHALL distinguish this view from single-profile views
- **AND** users SHALL understand they are viewing aggregated data

#### Scenario: Profile breakdown optional
- **WHEN** aggregated data is displayed
- **THEN** an optional breakdown by profile MAY be shown (e.g., table or cards)
- **AND** each profile's contribution to the total SHALL be visible
- **AND** users SHALL be able to drill down to individual profile performance

### Requirement: Profile-Specific Data Views for Module Dashboards
The application SHALL display data for the CURRENT active profile only on module dashboards (e.g., /furlong/dashboard) with clear indicators.

#### Scenario: Profile-specific data loading
- **WHEN** a module dashboard is accessed (e.g., /furlong/dashboard)
- **THEN** it SHALL use activeProfileId from ProfileContext
- **AND** it SHALL fetch data ONLY for the current active profile
- **AND** it SHALL display profile-specific metrics

#### Scenario: Single profile indicator
- **WHEN** a module dashboard renders
- **THEN** it SHALL display a clear visual indicator showing the active profile name (e.g., "Profile: Jenny")
- **AND** the indicator SHALL distinguish this view from aggregated views
- **AND** users SHALL understand they are viewing single-profile data

#### Scenario: Profile switch data update
- **WHEN** the active profile is switched while on a module dashboard
- **THEN** the dashboard data SHALL refetch for the new active profile
- **AND** all metrics and displays SHALL update to reflect the new profile's data
- **AND** the profile indicator SHALL update to show the new profile name

### Requirement: Visual Indicators for View Types
The application SHALL provide clear visual indicators to distinguish between aggregated (all profiles) and single-profile data views.

#### Scenario: Aggregated view styling
- **WHEN** an aggregated view (main dashboard) is displayed
- **THEN** it SHALL use a distinct badge, color accent, or header indicating "All Profiles Combined"
- **AND** styling SHALL be consistent across all aggregated views

#### Scenario: Single profile view styling
- **WHEN** a single-profile view (module dashboard) is displayed
- **THEN** it SHALL use a distinct badge or header showing "Profile: [Name]"
- **AND** styling SHALL clearly differentiate from aggregated views
- **AND** may use profile-specific color accents (optional)

#### Scenario: Consistent indicator placement
- **WHEN** any dashboard or data view is rendered
- **THEN** view type indicators SHALL be placed in a consistent location (e.g., top of page, near page title)
- **AND** indicators SHALL be prominent and easily noticeable

### Requirement: Responsive Navigation Behavior
The application SHALL provide responsive navigation that adapts to mobile, tablet, and desktop viewports with appropriate behaviors for each.

#### Scenario: Desktop navigation
- **WHEN** the viewport width is greater than 1024px
- **THEN** the sidebar SHALL be visible by default
- **AND** sidebar SHALL be collapsible to icon-only or fully hidden
- **AND** main content SHALL adjust width accordingly
- **AND** Profile Switcher SHALL be fully visible in header

#### Scenario: Tablet navigation
- **WHEN** the viewport width is between 768px and 1024px
- **THEN** the sidebar SHALL be collapsible and may start collapsed
- **AND** sidebar expansion SHALL push or overlay main content
- **AND** Profile Switcher SHALL remain accessible in header
- **AND** hamburger menu SHALL control sidebar visibility

#### Scenario: Mobile navigation
- **WHEN** the viewport width is less than 768px
- **THEN** the sidebar SHALL be hidden by default
- **AND** hamburger menu button SHALL open sidebar as full-screen overlay
- **AND** Profile Switcher SHALL be accessible in header (may be simplified)
- **AND** navigating to a route SHALL close the sidebar overlay
- **AND** CalculatorSidebar SHALL display as full-width modal or bottom sheet

#### Scenario: Touch interactions
- **WHEN** the application is used on a touch device
- **THEN** all navigation elements SHALL be touch-friendly (minimum 44px touch targets)
- **AND** swipe gestures MAY be supported for sidebar open/close (optional)
- **AND** dropdowns and modals SHALL be optimized for touch interaction
