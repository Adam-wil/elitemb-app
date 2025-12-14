# Frontend Capability Specification

## ADDED Requirements

### Requirement: React TypeScript Vite Foundation
The frontend SHALL be built with React 18+ using TypeScript 5+ and Vite as the build tool with fast refresh and optimized builds.

#### Scenario: Project initialization
- **WHEN** the project is set up
- **THEN** it SHALL include React 18+, TypeScript 5+, and Vite with proper configuration files
- **AND** the project SHALL compile without errors
- **AND** the dev server SHALL start with hot module replacement

#### Scenario: Production build
- **WHEN** npm run build is executed
- **THEN** the project SHALL create optimized production bundles
- **AND** the build SHALL complete without TypeScript errors

### Requirement: Development Tooling
The frontend project SHALL include ESLint and Prettier configured for TypeScript and React with consistent code quality standards.

#### Scenario: Code linting
- **WHEN** npm run lint is executed
- **THEN** all TypeScript and React files SHALL be checked for code quality issues
- **AND** ESLint rules SHALL enforce TypeScript best practices

#### Scenario: Code formatting
- **WHEN** npm run format is executed
- **THEN** all code files SHALL be formatted according to Prettier rules
- **AND** formatting SHALL be consistent across the codebase

### Requirement: Modular Folder Structure
The frontend SHALL organize code using a feature-based folder structure with features/core (dashboard, banking, profiles) and features/modules/furlong (tracker, planner, promo-tracker), plus shared directories (components, hooks, types, utils).

#### Scenario: Core feature organization
- **WHEN** core features are implemented
- **THEN** dashboard code SHALL reside in features/core/dashboard
- **AND** banking code SHALL reside in features/core/banking
- **AND** profiles code SHALL reside in features/core/profiles

#### Scenario: Furlong module organization
- **WHEN** furlong features are implemented
- **THEN** tracker code SHALL reside in features/modules/furlong/tracker
- **AND** planner code SHALL reside in features/modules/furlong/planner
- **AND** promo-tracker code SHALL reside in features/modules/furlong/promo-tracker

#### Scenario: Shared code organization
- **WHEN** reusable components are created
- **THEN** they SHALL be placed in the components directory
- **AND** custom hooks SHALL be placed in the hooks directory
- **AND** TypeScript types SHALL be placed in the types directory
- **AND** utility functions SHALL be placed in the utils directory

### Requirement: Path Aliases
The frontend SHALL configure TypeScript and Vite path aliases using @/ prefix to reference the src/ directory for cleaner imports.

#### Scenario: Import resolution
- **WHEN** importing from shared directories
- **THEN** developers SHALL use @/components, @/hooks, @/types, @/utils aliases
- **AND** TypeScript SHALL resolve these paths correctly
- **AND** Vite SHALL bundle with correct path resolution

### Requirement: React Router v6 Integration
The frontend SHALL use React Router v6 for client-side routing with route structure for core features and furlong module.

#### Scenario: Route configuration
- **WHEN** the application loads
- **THEN** React Router SHALL be configured with BrowserRouter
- **AND** routes SHALL be defined for dashboard, banking, and profiles
- **AND** routes SHALL be defined for furlong tracker, planner, and promo-tracker

#### Scenario: Route navigation
- **WHEN** users navigate between pages
- **THEN** React Router SHALL handle navigation without page reloads
- **AND** URL SHALL update to reflect current route

### Requirement: Tailwind CSS Styling
The frontend SHALL use Tailwind CSS for styling with proper configuration and build integration.

#### Scenario: Tailwind configuration
- **WHEN** the project builds
- **THEN** Tailwind CSS SHALL process utility classes
- **AND** PostCSS SHALL handle CSS transformation
- **AND** unused styles SHALL be purged in production builds

#### Scenario: Component styling
- **WHEN** components use Tailwind classes
- **THEN** styles SHALL apply correctly
- **AND** design system SHALL remain consistent

### Requirement: Redux Toolkit State Management
The frontend SHALL use Redux Toolkit for centralized, type-safe state management with Redux DevTools integration.

#### Scenario: Redux store setup
- **WHEN** the application initializes
- **THEN** Redux store SHALL be configured using configureStore from @reduxjs/toolkit
- **AND** the store SHALL be organized in src/store directory
- **AND** Redux Provider SHALL wrap the app in App.tsx
- **AND** Redux DevTools extension SHALL be enabled

#### Scenario: State slices organization
- **WHEN** features need state management
- **THEN** slices SHALL be created using createSlice from Redux Toolkit
- **AND** core feature slices SHALL reside in src/store/slices (dashboardSlice, bankingSlice, profilesSlice)
- **AND** furlong feature slices SHALL reside in src/store/slices/furlong (trackerSlice, plannerSlice, promoTrackerSlice)
- **AND** all slices SHALL use TypeScript for type safety

#### Scenario: Typed Redux hooks
- **WHEN** components need to access Redux state or dispatch actions
- **THEN** they SHALL use typed useAppSelector and useAppDispatch hooks from src/store/hooks.ts
- **AND** TypeScript SHALL provide autocompletion and type checking for state and actions

#### Scenario: State consumption and updates
- **WHEN** components need global state
- **THEN** they SHALL use useAppSelector to read state
- **AND** they SHALL use useAppDispatch to dispatch actions
- **AND** state updates SHALL trigger component re-renders
- **AND** Redux DevTools SHALL allow time-travel debugging

### Requirement: Handsontable Data Grid Integration
The frontend SHALL include Handsontable with @handsontable/react for spreadsheet-like data grid functionality with Excel-like editing capabilities, primarily for the furlong tracker table.

#### Scenario: Handsontable setup
- **WHEN** the project is configured
- **THEN** Handsontable and @handsontable/react SHALL be installed
- **AND** Handsontable CSS SHALL be imported
- **AND** TypeScript types SHALL be configured for Handsontable

#### Scenario: Data grid rendering
- **WHEN** a Handsontable component is used
- **THEN** it SHALL render a functional spreadsheet-like grid
- **AND** cells SHALL support Excel-like editing
- **AND** the grid SHALL support data manipulation

#### Scenario: Tracker table usage
- **WHEN** the furlong tracker feature needs tabular data
- **THEN** Handsontable SHALL provide the grid functionality
- **AND** users SHALL be able to edit cells inline
- **AND** the grid SHALL handle large datasets efficiently

### Requirement: Environment Configuration
The frontend SHALL support environment variables through .env files with a .env.example template for developer onboarding.

#### Scenario: Environment setup
- **WHEN** a new developer clones the repository
- **THEN** they SHALL find a .env.example file with all required variables
- **AND** they SHALL copy it to .env for local development

#### Scenario: Environment variable access
- **WHEN** code needs configuration values
- **THEN** Vite environment variables SHALL be accessible via import.meta.env
- **AND** sensitive values SHALL be kept in .env (gitignored)

### Requirement: NPM Scripts
The frontend package.json SHALL include scripts for dev, build, preview, lint, format, and type-check operations.

#### Scenario: Development workflow
- **WHEN** npm run dev is executed
- **THEN** the Vite development server SHALL start with hot module replacement

#### Scenario: Build workflow
- **WHEN** npm run build is executed
- **THEN** TypeScript SHALL compile and Vite SHALL create production bundles

#### Scenario: Code quality
- **WHEN** npm run lint is executed
- **THEN** ESLint SHALL check all files
- **WHEN** npm run format is executed
- **THEN** Prettier SHALL format all files
- **WHEN** npm run type-check is executed
- **THEN** TypeScript SHALL verify type correctness
