# Change: Frontend Foundation with Handsontable Integration

## Why
The project needs a solid frontend foundation before backend development. This establishes the React + TypeScript + Vite architecture with all necessary tooling, state management, routing, and data grid capabilities. The modular structure will support core features (dashboard, banking, profiles) and the furlong module (tracker, planner, promo-tracker) with Handsontable providing spreadsheet-like editing for the tracker table and other tables if suitable for the solution.

## What Changes
- Initialize 01_Frontend with React 18+, TypeScript 5+, and Vite
- Configure ESLint and Prettier for code quality and consistency
- Establish modular folder structure:
  - features/core (dashboard, banking, profiles)
  - features/modules/furlong (tracker, planner, promo-tracker)
  - components, hooks, types, utils
- Set up path aliases (@/ for src/)
- Configure React Router v6 with basic routing structure
- Install and configure Tailwind CSS for styling
- Add Zustand for lightweight state management
- Set up React Query (@tanstack/react-query) infrastructure (structure only, no API calls)
- Add Handsontable with React wrapper for Excel-like data grid functionality
- Create environment configuration (.env.example)
- Create minimal 02_Backend folder with README placeholder

## Impact
- Affected specs: `frontend` (new capability)
- Affected code: Creates entire frontend foundation in 01_Frontend directory
- Dependencies: React 18+, Vite, React Router v6, Tailwind CSS, Zustand, TanStack Query, Handsontable
- Breaking changes: None (initial setup)
- Backend: Minimal placeholder only, full implementation deferred to future change
