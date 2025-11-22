# Git Commit Quick Reference

## Common Commit Patterns

### Features

```bash
# UI Components
feat(ui): Add dark mode toggle to navigation
feat(ui): Add loading skeleton to dashboard cards
feat(ui): Implement infinite scroll for project list

# Authentication
feat(auth): Add Google OAuth integration
feat(auth): Implement password strength validator
feat(auth): Add remember me functionality

# API/Backend
feat(api): Add pagination to user list endpoint
feat(api): Implement request rate limiting
feat(api): Add bulk delete operation for projects

# Forms
feat(form): Add auto-save for draft messages
feat(form): Implement multi-step registration wizard
feat(form): Add file upload with progress indicator
```

### Bug Fixes

```bash
# UI Bugs
fix(ui): Resolve button text overflow on mobile
fix(ui): Correct modal backdrop z-index issue
fix(ui): Fix dropdown menu positioning on scroll

# Data/State
fix(dashboard): Correct KPI calculation for current month
fix(form): Resolve validation error timing issue
fix(table): Fix sort order persistence after refresh

# Browser-specific
fix(safari): Resolve date picker display issue
fix(firefox): Fix flexbox layout in sidebar
fix(ie11): Add polyfill for Promise.allSettled
```

### Refactoring

```bash
# Code Organization
refactor(api): Extract validation logic to middleware
refactor(hooks): Consolidate data fetching into useQuery
refactor(utils): Create shared date formatting functions

# Component Structure
refactor(ui): Split UserProfile into smaller components
refactor(form): Extract validation rules to schema file
refactor(table): Simplify column configuration logic

# Performance
refactor(dashboard): Memoize expensive chart calculations
refactor(list): Replace filter chains with reduce
refactor(api): Optimize database queries with eager loading
```

### Documentation

```bash
# API Documentation
docs(api): Add authentication endpoint examples
docs(api): Document error response formats
docs(api): Add rate limiting information

# Code Documentation
docs(components): Add JSDoc comments to Button component
docs(hooks): Document useAuth hook parameters
docs(utils): Add usage examples to date helpers

# Project Documentation
docs(readme): Add installation instructions
docs(contributing): Add commit message guidelines
docs(architecture): Document state management approach
```

### Testing

```bash
# Unit Tests
test(auth): Add unit tests for login validation
test(utils): Add tests for date formatting functions
test(hooks): Test useDebounce hook edge cases

# Integration Tests
test(api): Add integration tests for user endpoints
test(form): Add E2E tests for registration flow
test(dashboard): Add snapshot tests for chart components

# Test Fixes
test(auth): Fix flaky token validation test
test(form): Update tests after validation changes
test(api): Mock external service calls
```

### Dependencies

```bash
# Major Updates
build(deps): Upgrade React to 18.3.0
build(deps): Update TypeScript to 5.3.0
build(deps): Migrate from Webpack to Vite

# Security Updates
build(deps): Update axios to 1.6.2 for security patch
build(deps): Patch lodash vulnerability CVE-2023-1234
build(deps): Update all dependencies with known vulnerabilities

# Minor Updates
build(deps): Update Tailwind CSS to 3.4.1
build(deps): Bump ESLint to 8.55.0
build(deps): Update dev dependencies
```

### Configuration

```bash
# Build Configuration
chore(webpack): Add source map generation for production
chore(vite): Configure build optimization settings
chore(tsconfig): Enable strict mode for TypeScript

# Linting/Formatting
chore(eslint): Add import ordering rules
chore(prettier): Update line length to 100 characters
chore(eslint): Enforce consistent component naming

# Environment
chore(env): Add staging environment variables
chore(docker): Update Node version to 20 LTS
chore(env): Configure CORS for local development
```

### CI/CD

```bash
# GitHub Actions
ci(github): Add automated testing workflow
ci(github): Configure deployment to production
ci(github): Add PR preview deployments

# Build Pipeline
ci(build): Add TypeScript type checking to pipeline
ci(build): Configure automated dependency updates
ci(build): Add bundle size check to CI

# Quality Checks
ci(quality): Add code coverage threshold
ci(quality): Enforce commit message linting
ci(quality): Add accessibility testing to pipeline
```

---

## Commit Message Templates

### Simple Feature

```
feat(<scope>): <what changed>
```

Example:
```
feat(auth): Add password reset via email
```

### Feature with Details

```
feat(<scope>): <what changed>

<why this change was needed>
<what it enables users to do>

Closes #<issue-number>
```

Example:
```
feat(dashboard): Add real-time notification panel

Users can now receive instant updates for new messages,
mentions, and system alerts without refreshing the page.

Closes #234
```

### Feature with Formatted Details

```
feat(<scope>): <what changed>

<description>

**Changes:**
- First change
- Second change
- Third change

**Benefits:**
- First benefit
- Second benefit

Closes #<issue-number>
```

Example:
```
feat(search): Add advanced filtering options

Implements multi-field search with various filter types.

**New filters:**
- Date range picker
- Category multi-select
- Status dropdown
- Tag autocomplete

**Benefits:**
- Faster project discovery
- Saved filter preferences
- Exportable results

Uses `react-select` for dropdowns and `react-datepicker`
for date selection. All filters _debounced_ at 300ms.

Closes #456
```

### Bug Fix with Context

```
fix(<scope>): <what was fixed>

<what was causing the bug>
<how it's now fixed>

Fixes #<issue-number>
```

Example:
```
fix(form): Resolve validation error on empty fields

Form was showing validation errors immediately on page load
before user interaction. Now validates only after first blur
or submit attempt.

Fixes #456
```

### Breaking Change

```
feat(<scope>): <what changed>

BREAKING CHANGE: <what breaks and why>
<migration instructions>

Closes #<issue-number>
```

Example:
```
feat(api): Redesign user profile endpoint response

BREAKING CHANGE: Response structure changed from flat to nested.
Update client code to access user.profile.name instead of user.name.

Migration guide: docs/migrations/v2-user-endpoint.md

Closes #789
```

---

## Anti-Patterns to Avoid

### ❌ Too Vague

```bash
# BAD
git commit -m "fix bug"
git commit -m "update code"
git commit -m "changes"
git commit -m "WIP"

# GOOD
git commit -m "fix(auth): Resolve token expiration check"
git commit -m "refactor(api): Simplify error handling"
git commit -m "feat(ui): Add loading states to buttons"
```

### ❌ Too Detailed (Implementation)

```bash
# BAD
git commit -m "fix(auth): Change line 45 in AuthService.ts to add null check"
git commit -m "feat(ui): Add isLoading boolean prop to Button.tsx component"

# GOOD
git commit -m "fix(auth): Resolve null pointer in token validation"
git commit -m "feat(ui): Add loading state to Button component"
```

### ❌ Multiple Unrelated Changes

```bash
# BAD
git commit -m "feat: Add dark mode and fix login bug and update README"

# GOOD (separate commits)
git commit -m "feat(ui): Add dark mode theme support"
git commit -m "fix(auth): Resolve token persistence issue"
git commit -m "docs(readme): Update installation instructions"
```

### ❌ Past Tense

```bash
# BAD
git commit -m "feat(auth): Added password reset"
git commit -m "fixed login bug"
git commit -m "updated dependencies"

# GOOD
git commit -m "feat(auth): Add password reset"
git commit -m "fix(auth): Resolve login issue"
git commit -m "build(deps): Update dependencies"
```

---

## Scope Reference for Your Project

### Frontend Scopes

```bash
ui          # UI components (Button, Card, Modal, etc.)
form        # Form components and validation
auth        # Authentication pages and flows
dashboard   # Dashboard pages and features
table       # Data table components
chart       # Chart and visualization components
layout      # Layout components (Header, Sidebar, etc.)
hooks       # Custom React hooks
utils       # Utility functions
types       # TypeScript types and interfaces
```

### Backend Scopes (if applicable)

```bash
api         # API routes and controllers
auth        # Authentication/authorization logic
database    # Database schemas and migrations
middleware  # Express middleware
services    # Business logic services
validation  # Input validation
```

### Project-Wide Scopes

```bash
deps        # Dependencies
config      # Configuration files
env         # Environment variables
build       # Build configuration
ci          # CI/CD pipelines
docs        # Documentation
test        # Testing setup and utilities
```

---

## Quick Decision Tree

**What changed?**

1. **New user-facing feature** → `feat(<scope>):`
2. **Bug that affects users** → `fix(<scope>):`
3. **Code improvement (no behavior change)** → `refactor(<scope>):`
4. **Performance improvement** → `perf(<scope>):`
5. **Documentation** → `docs(<scope>):`
6. **Tests** → `test(<scope>):`
7. **Dependencies** → `build(deps):`
8. **CI/CD** → `ci(<scope>):`
9. **Code style/formatting** → `style(<scope>):`
10. **Other maintenance** → `chore(<scope>):`

**Need a body?**

- Complex change? **Yes**
- Breaking change? **Yes (required)**
- Need to explain why? **Yes**
- Simple, obvious change? **No**

**Need a footer?**

- Closes an issue? **Yes** (`Closes #123`)
- Breaking change? **Yes** (`BREAKING CHANGE:`)
- References issue? **Optional** (`Refs #123`)
