---
name: git-guidelines
description: Enforce professional Git practices including commit messages and branching strategy. Use this skill for all Git operations - commits, branches, and pull requests. Ensures conventional commit format, clear descriptions, smart branching for features, and clean repository management. Prevents emojis, removes co-author tags, and maintains professional standards.
---

# Git Guidelines - Commits & Branching Strategy

Apply these guidelines to all Git operations including commits, branches, pull requests, and version control to maintain a clean, professional, and organized repository.

## Overview

This skill covers:
- ✅ **Commit Messages** - Conventional format, clear descriptions, no emojis
- ✅ **Branching Strategy** - When to branch vs. direct commit
- ✅ **Workflow** - Feature development, hotfixes, releases
- ✅ **Best Practices** - Clean history, organized repository

## Critical Rules

### ❌ NEVER Include

1. **NO Emojis** - Ever. In any part of commit messages.
   ```
   ❌ BAD: ✨ feat: Add user authentication
   ❌ BAD: 🐛 fix: Resolve login issue
   ❌ BAD: 📝 docs: Update README
   ```

2. **NO Co-author Tags** - Remove all `Co-authored-by` lines
   ```
   ❌ BAD:
   feat: Add user authentication
   
   Co-authored-by: Claude <noreply@anthropic.com>
   Co-authored-by: GitHub Copilot <noreply@github.com>
   ```

3. **NO Vague Messages**
   ```
   ❌ BAD: "Update files"
   ❌ BAD: "Fix stuff"
   ❌ BAD: "WIP"
   ❌ BAD: "Changes"
   ❌ BAD: "misc updates"
   ```

4. **NO Implementation Details in Title**
   ```
   ❌ BAD: "Update UserController.tsx line 45 to fix null check"
   ✅ GOOD: "Fix null pointer exception in user profile loading"
   ```

### ✅ ALWAYS Include

1. **Clear Feature/Change Description** - What actually changed from user perspective
2. **Conventional Commit Format** - Type, scope, and description
3. **Professional Language** - Imperative mood, present tense
4. **Specific Details** - What, why, and impact

---

## Conventional Commit Format

Follow the Conventional Commits specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Commit Types

| Type | When to Use | Example |
|------|-------------|---------|
| `feat` | New feature for the user | `feat(auth): Add password reset functionality` |
| `fix` | Bug fix | `fix(dashboard): Resolve chart rendering on mobile` |
| `docs` | Documentation only | `docs(api): Add authentication endpoint examples` |
| `style` | Code style changes (formatting, semicolons, etc.) | `style(components): Apply consistent spacing in Button component` |
| `refactor` | Code change that neither fixes a bug nor adds a feature | `refactor(api): Simplify user data fetching logic` |
| `perf` | Performance improvement | `perf(dashboard): Optimize chart rendering with virtualization` |
| `test` | Adding or updating tests | `test(auth): Add unit tests for login validation` |
| `build` | Changes to build system or dependencies | `build(deps): Upgrade React to 18.3.0` |
| `ci` | CI/CD configuration changes | `ci(github): Add automated deployment workflow` |
| `chore` | Other changes (tooling, configs) | `chore(eslint): Update linting rules for TypeScript` |
| `revert` | Revert a previous commit | `revert: "feat(auth): Add OAuth integration"` |

### Scope (Optional but Recommended)

The scope should be the area of the codebase affected:

**Good scopes:**
- `auth` - Authentication/authorization
- `dashboard` - Dashboard features
- `api` - API endpoints
- `ui` - UI components
- `database` - Database changes
- `config` - Configuration files
- `deps` - Dependencies

**Examples:**
```
feat(auth): Add two-factor authentication
fix(dashboard): Correct KPI calculation for monthly stats
docs(api): Document pagination parameters
refactor(ui): Consolidate button variants into single component
```

---

## Writing Good Commit Messages

### Title/Subject Line (First Line)

**Format:**
```
<type>(<scope>): <description>
```

**Rules:**
1. **50 characters or less** (hard limit: 72)
2. **Imperative mood** - "Add" not "Added" or "Adds"
3. **No period at the end**
4. **Capitalize first letter**
5. **Describe WHAT changed, not HOW**

**Examples:**

```bash
# ✅ GOOD - Clear, specific, describes the feature
feat(auth): Add password reset via email
fix(dashboard): Resolve chart rendering issue on Safari
refactor(api): Simplify user data validation logic
perf(table): Implement virtualization for large datasets
docs(readme): Add installation instructions for Windows

# ❌ BAD - Too vague
feat: Update auth
fix: Bug fix
docs: Update

# ❌ BAD - Implementation details (save for body)
feat(auth): Add sendPasswordResetEmail function to AuthService
fix(dashboard): Change useEffect dependency array in ChartComponent

# ❌ BAD - Past tense
feat(auth): Added password reset
fix(dashboard): Fixed chart rendering

# ❌ BAD - Too long
feat(auth): Add the ability for users to reset their password through email verification with a time-limited token
```

### Body (Optional)

Use the body to explain **WHAT and WHY**, not HOW.

**When to include a body:**
- Complex changes that need context
- Breaking changes
- Migration instructions needed
- Multiple related changes in one commit

**Format:**
- Wrap at 72 characters
- Separate from subject with blank line
- Use bullet points for multiple items (when appropriate)
- Use **bold** for emphasis on critical points
- Use _italics_ for examples or references
- Use `code` formatting for technical terms
- Explain motivation and impact

**Example with formatting:**

```
feat(auth): Add two-factor authentication

Implements TOTP-based 2FA for enhanced account security.

**Changes:**
- Add QR code generation for authenticator apps
- Create 2FA setup flow in user settings
- Enforce 2FA for admin accounts
- Add backup codes for account recovery

**Important:** Users can now enable 2FA in account settings.
Admin accounts will be _required_ to set up 2FA on next login.

The implementation uses `speakeasy` for TOTP generation and
stores encrypted secrets using `crypto.subtle.encrypt`.
```

**Example with lists:**

```
refactor(api): Consolidate error handling

Simplifies error handling across all API routes by creating
a centralized error handling middleware.

**Benefits:**
- Consistent error response format
- Reduced code duplication (removed ~200 lines)
- Better error logging and monitoring
- Easier to maintain and extend

**Migration note:** Update custom error handlers to use the
new `ApiError` class instead of throwing raw errors.
```

### Footer (Optional)

Use footer for:
- **Breaking changes** - Start with `BREAKING CHANGE:`
- **Issue references** - `Fixes #123`, `Closes #456`, `Refs #789`
- **Reviewed by** - Only for significant changes

**Examples:**

```
feat(api): Change user endpoint response structure

BREAKING CHANGE: User endpoint now returns nested profile object
instead of flat structure. Update client code to access user.profile.name
instead of user.name.

Fixes #234
```

```
fix(dashboard): Resolve memory leak in chart component

Closes #567
Refs #568
```

---

## TypeScript/React Specific Guidelines

### Component Changes

```bash
# ✅ GOOD - Describes what changed for users/developers
feat(ui): Add loading state to Button component
fix(form): Resolve validation error display timing
refactor(card): Extract Card variants into separate components

# ❌ BAD - Too implementation-focused
feat(ui): Add isLoading prop to Button.tsx
fix(form): Change useState to useEffect in FormInput.tsx
```

### Type/Interface Changes

```bash
# ✅ GOOD
refactor(types): Simplify user type definitions
feat(api): Add pagination types for list endpoints

# ❌ BAD
refactor(types): Change UserProfile interface in types/user.ts
```

### Hook Changes

```bash
# ✅ GOOD
feat(hooks): Add useDebounce hook for search inputs
fix(hooks): Resolve infinite loop in useAuth

# ❌ BAD
feat(hooks): Create new custom hook in hooks/useDebounce.ts
```

---

## Common Scenarios

### Adding a New Feature

```bash
# Complete feature
git commit -m "feat(dashboard): Add monthly revenue chart

Displays revenue trends for the last 12 months with
interactive tooltips and export functionality.

Closes #145"

# Small feature addition
git commit -m "feat(ui): Add icon support to Button component"
```

### Fixing a Bug

```bash
# Bug fix with context
git commit -m "fix(auth): Resolve token expiration check

Fixes issue where users were logged out prematurely due to
incorrect timezone handling in token validation.

Fixes #234"

# Simple bug fix
git commit -m "fix(form): Correct email validation regex"
```

### Refactoring

```bash
# Refactoring with explanation
git commit -m "refactor(api): Consolidate user data fetching

Reduces code duplication by creating a single useUserData hook
that replaces three separate API calls throughout the app.

Performance improvement: Reduces initial load time by 200ms."

# Simple refactor
git commit -m "refactor(utils): Extract date formatting to utility function"
```

### Updating Dependencies

```bash
# Major version update
git commit -m "build(deps): Upgrade React to v18.3.0

BREAKING CHANGE: Requires updating render calls to use
createRoot instead of ReactDOM.render. See migration
guide in docs/migration/react-18.md"

# Minor update
git commit -m "build(deps): Update Tailwind CSS to 3.4.1"

# Security update
git commit -m "build(deps): Update axios to 1.6.2 for security patch

Fixes CVE-2023-45857
Refs #456"
```

### Configuration Changes

```bash
# ✅ GOOD
chore(eslint): Enforce consistent import ordering
ci(github): Add automated accessibility testing
chore(env): Add staging environment configuration

# ❌ BAD
chore: Update .eslintrc.json
ci: Update workflow file
```

### Documentation

```bash
# ✅ GOOD
docs(api): Add examples for authentication endpoints
docs(readme): Update installation steps for Windows
docs(contributing): Add commit message guidelines

# ❌ BAD
docs: Update README
docs: Add comments
```

---

## Formatting in Commit Messages

### Allowed Formatting

Markdown formatting is **allowed and encouraged** in commit body and footer when it improves clarity:

**Bold (`**text**`)** - Use for:
- Section headers (Changes, Benefits, Migration, etc.)
- Critical warnings or important notes
- Emphasis on key points

**Italics (`_text_`)** - Use for:
- Examples or references
- Technical terms being introduced
- Subtle emphasis

**Backticks (`` `code` ``)** - Use for:
- Variable names, function names, class names
- File paths
- Commands
- Code snippets
- Technical identifiers

**Bullet Points (`-`)** - Use for:
- Lists of changes
- Multiple related items
- Benefits or features
- Migration steps

**Code Blocks (` ``` `)** - Use for:
- Before/after examples
- Configuration changes
- Multi-line code snippets
- API response examples

### Formatting Examples

**Breaking change with formatting:**

```
feat(api): Redesign user profile endpoint

BREAKING CHANGE: Response structure has changed from flat to nested.

**Before:**
```json
{
  "id": 1,
  "name": "John",
  "email": "john@example.com"
}
```

**After:**
```json
{
  "id": 1,
  "profile": {
    "name": "John",
    "email": "john@example.com"
  }
}
```

**Migration:** Update client code to access `user.profile.name`
instead of `user.name`.

Closes #789
```

**Complex refactor with formatting:**

```
refactor(database): Optimize query performance

Rewrites slow queries using `JOIN` instead of multiple separate
queries. This significantly improves performance for the user
dashboard.

**Performance improvements:**
- Dashboard load time: _3.2s → 0.8s_
- Database queries: _12 → 3_
- Memory usage: _reduced by 40%_

**Technical details:**
- Uses `INNER JOIN` with `users` and `projects` tables
- Adds index on `user_id` and `project_id` columns
- Implements query result caching with `redis`

**Note:** Requires running migration `20240115_add_indexes.sql`
before deploying.
```

**Feature with structured details:**

```
feat(ui): Add advanced search filters

Implements multi-field search with the following filters:

**New filters:**
- Date range picker
- Category multi-select
- Status dropdown
- Tag autocomplete

**User benefits:**
- Find projects faster
- Save frequently used filters
- Export filtered results

Uses `react-select` for multi-select and `react-datepicker`
for date ranges. All filters are _debounced_ at 300ms to
reduce API calls.

Closes #456
```

### When NOT to Use Formatting

**Don't use formatting in the subject line (first line):**

```bash
# ❌ BAD - No formatting in subject
feat(auth): Add **two-factor** authentication
feat(api): Update `getUserProfile` endpoint

# ✅ GOOD - Plain text subject
feat(auth): Add two-factor authentication
feat(api): Update user profile endpoint
```

**Don't overuse formatting:**

```bash
# ❌ BAD - Too much formatting, hard to read
**This** commit _adds_ `support` for **multiple** _file_ `uploads`
with **drag** and _drop_ `functionality` using `react-dropzone`.

# ✅ GOOD - Formatting only where it adds clarity
This commit adds support for multiple file uploads with drag
and drop functionality using `react-dropzone`.
```

---

## Multi-File Commits

When committing changes across multiple files, focus on the **feature/change**, not the files:

```bash
# ✅ GOOD - Describes the feature
git commit -m "feat(auth): Implement OAuth2 login with Google

Adds Google OAuth integration with the following:
- OAuth client configuration
- Login button in UI
- Token validation and user creation
- Redirect handling after authentication"

# ❌ BAD - Lists files
git commit -m "feat(auth): Update AuthService.ts, LoginPage.tsx, and config.ts"
```

---

## Breaking Changes

Always clearly mark breaking changes:

```bash
git commit -m "feat(api): Redesign user profile endpoint

BREAKING CHANGE: Response structure has changed from flat to nested.

Before:
{
  \"id\": 1,
  \"name\": \"John\",
  \"email\": \"john@example.com\"
}

After:
{
  \"id\": 1,
  \"profile\": {
    \"name\": \"John\",
    \"email\": \"john@example.com\"
  }
}

Update client code to access user.profile.name instead of user.name.

Closes #789"
```

---

## Git Workflow Best Practices

### Before Committing

1. **Review changes**: `git diff`
2. **Stage specific files**: `git add <file>` (avoid `git add .`)
3. **Check staged changes**: `git diff --staged`
4. **Run tests**: Ensure all tests pass
5. **Lint code**: Fix any linting errors

### Commit Command

```bash
# Use -m for simple commits
git commit -m "feat(ui): Add dark mode toggle"

# Use editor for commits with body
git commit
# (Opens editor for detailed message)

# Amend last commit (if not pushed)
git commit --amend

# Sign commits (if using GPG)
git commit -S -m "feat(auth): Add 2FA support"
```

### Commit Frequency

**DO:**
- ✅ Commit logical units of work
- ✅ Commit when a feature/fix is complete
- ✅ Commit before switching context
- ✅ Commit when tests pass

**DON'T:**
- ❌ Commit broken code
- ❌ Commit half-finished features (use feature branches)
- ❌ Make "save point" commits to main/master
- ❌ Combine unrelated changes in one commit

---

## Examples: Before & After

### Example 1: Feature Addition

```bash
# ❌ BAD
git commit -m "✨ Added some cool new stuff to the dashboard! 🎉

Co-authored-by: Claude <noreply@anthropic.com>"

# ✅ GOOD
git commit -m "feat(dashboard): Add real-time notifications panel

Displays live updates for new messages, mentions, and system
alerts. Includes read/unread status and click to navigate.

Closes #234"
```

### Example 2: Bug Fix

```bash
# ❌ BAD
git commit -m "fix bug"

# ✅ GOOD
git commit -m "fix(form): Resolve validation error on empty email field

Fixes issue where form showed validation error immediately
on page load before user interaction.

Fixes #456"
```

### Example 3: Refactoring

```bash
# ❌ BAD
git commit -m "🔨 refactor: updated some components

Changed Button.tsx, Card.tsx and Input.tsx files
to make them better

Co-authored-by: Claude <noreply@anthropic.com>"

# ✅ GOOD
git commit -m "refactor(ui): Standardize component prop interfaces

Creates consistent prop patterns across Button, Card, and Input
components using shared base interfaces. Improves type safety
and reduces code duplication."
```

### Example 4: Dependencies

```bash
# ❌ BAD
git commit -m "📦 updated packages"

# ✅ GOOD
git commit -m "build(deps): Update development dependencies

Updates:
- TypeScript 5.2 -> 5.3
- ESLint 8.50 -> 8.55
- Prettier 3.0 -> 3.1

No breaking changes or required code modifications."
```

---

## Pull Request Titles

Use the same format as commit messages:

```bash
# ✅ GOOD PR titles
feat(auth): Implement two-factor authentication
fix(dashboard): Resolve chart rendering on mobile devices
refactor(api): Simplify error handling middleware

# ❌ BAD PR titles
✨ New feature
Fix bugs
Updates
WIP: Testing stuff
```

---

## Tools & Automation

### Commit Message Template

Create `.gitmessage` in your repo:

```
# <type>(<scope>): <subject>
# |<----  Using a Maximum Of 50 Characters  ---->|

# Explain why this change is being made
# |<----   Try To Limit Each Line to a Maximum Of 72 Characters   ---->|

# Provide links or keys to any relevant tickets, articles or other resources

# --- COMMIT END ---
# Type can be
#    feat     (new feature)
#    fix      (bug fix)
#    refactor (refactoring code)
#    style    (formatting, missing semi colons, etc)
#    docs     (changes to documentation)
#    test     (adding or refactoring tests)
#    chore    (maintain)
#    perf     (performance improvement)
#    build    (build system or dependencies)
#    ci       (CI/CD changes)
# --------------------
# Remember:
#   * NO emojis
#   * NO co-author tags
#   * Use imperative mood in subject line
#   * Do not end the subject line with a period
#   * Separate subject from body with a blank line
#   * Use the body to explain what and why vs. how
# --------------------
```

Configure Git to use it:
```bash
git config --local commit.template .gitmessage
```

### Commitlint Configuration

Install commitlint to enforce standards:

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

`.commitlintrc.json`:
```json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "type-enum": [2, "always", [
      "feat", "fix", "docs", "style", "refactor",
      "perf", "test", "build", "ci", "chore", "revert"
    ]],
    "subject-case": [2, "always", "sentence-case"],
    "subject-max-length": [2, "always", 50],
    "body-max-line-length": [2, "always", 72]
  }
}
```

### Pre-commit Hook

Create `.git/hooks/pre-commit` to check for emojis and co-authors:

```bash
#!/bin/bash
# Check commit message for emojis and co-authors

COMMIT_MSG_FILE=".git/COMMIT_EDITMSG"

if [ -f "$COMMIT_MSG_FILE" ]; then
  # Check for emojis
  if grep -qP '\p{Emoji}' "$COMMIT_MSG_FILE"; then
    echo "❌ Commit message contains emojis. Please remove them."
    exit 1
  fi
  
  # Check for co-author tags
  if grep -q "Co-authored-by:" "$COMMIT_MSG_FILE"; then
    echo "❌ Commit message contains Co-authored-by tags. Please remove them."
    exit 1
  fi
fi
```

---

## Quick Reference

### Good Commit Examples

```bash
feat(auth): Add password reset via email
fix(dashboard): Resolve chart rendering on Safari
docs(api): Add pagination documentation
refactor(hooks): Consolidate data fetching logic
perf(table): Implement virtual scrolling
test(auth): Add integration tests for login flow
build(deps): Update React to 18.3.0
ci(github): Add automated testing workflow
style(components): Format code with Prettier
chore(eslint): Update TypeScript rules
```

### Command Checklist

```bash
# 1. Check what changed
git status
git diff

# 2. Stage specific files
git add src/components/Button.tsx
git add src/components/Button.test.tsx

# 3. Review staged changes
git diff --staged

# 4. Commit with clear message
git commit -m "feat(ui): Add loading state to Button component"

# 5. Push to remote
git push origin feature/button-loading-state
```

---

## Git Branching Strategy

### When to Create a Branch

**ALWAYS create a branch for:**

1. **Major Features**
   - New user-facing features requiring multiple commits
   - Features that take more than a day
   - Features that need review before merging
   - Examples: OAuth integration, real-time notifications, dashboard redesign

2. **Significant Refactors**
   - Large-scale code reorganization
   - Architecture changes
   - Database migrations
   - API redesigns

3. **Critical/Complex Bug Fixes**
   - Production hotfixes
   - Security vulnerabilities
   - Bugs affecting multiple components

4. **Experimental Work**
   - Proof of concepts
   - Testing new libraries
   - Performance experiments

**NEVER create a branch for:**

1. **Minor Changes**
   - Typo fixes
   - Comment updates
   - Formatting changes (Prettier, ESLint)
   - Single-line bug fixes
   - Documentation updates
   - Minor dependency bumps

2. **Small Enhancements**
   - Adding a single prop to a component
   - Small UI tweaks
   - Simple validation rules

### Branch Naming Convention

Format: `<type>/<short-description>`

**Types:**
- `feature/` - New features (e.g., `feature/oauth-login`)
- `fix/` - Bug fixes (e.g., `fix/chart-rendering`)
- `hotfix/` - Critical production fixes (e.g., `hotfix/security-patch`)
- `refactor/` - Code improvements (e.g., `refactor/api-consolidation`)
- `experiment/` - Experimental work (e.g., `experiment/new-framework`)

**Rules:**
- Use kebab-case (lowercase with hyphens)
- Be descriptive but concise (3-5 words)
- Focus on WHAT, not HOW
- No ticket numbers in branch name

**Examples:**

```bash
# ✅ GOOD branch names
git checkout -b feature/two-factor-auth
git checkout -b feature/password-reset
git checkout -b fix/memory-leak-dashboard
git checkout -b hotfix/auth-token-expiry
git checkout -b refactor/error-handling

# ❌ BAD branch names
git checkout -b feature/add-2fa-to-auth-service    # Too detailed
git checkout -b fix/bug                            # Too vague
git checkout -b feature/PROJ-1234                  # No ticket numbers
git checkout -b my-feature                         # No type prefix
```

### Decision Tree: Should I Branch?

Ask yourself:

1. **Does this take more than 1 day?** → YES = Branch
2. **Does it need review?** → YES = Branch
3. **Does it change core functionality?** → YES = Branch
4. **Does it add a new feature?** → YES = Branch
5. **Does it affect multiple files?** → YES = Branch
6. **Might it need rollback?** → YES = Branch
7. **Is it just a typo/style fix?** → NO = Direct commit
8. **Is it only documentation?** → NO = Direct commit

**Rule of thumb:** If unsure, branch. Better safe than sorry.

### Workflow Examples

**Major Feature (CREATE BRANCH):**

```bash
# Create feature branch
git checkout -b feature/real-time-notifications

# Work on feature
git commit -m "feat(notifications): Add WebSocket connection"
git commit -m "feat(notifications): Create notification UI component"
git commit -m "feat(notifications): Add user preferences"
git commit -m "test(notifications): Add integration tests"

# Keep updated
git fetch origin
git rebase origin/main

# Push and create PR
git push origin feature/real-time-notifications
```

**Minor Fix (DIRECT COMMIT):**

```bash
# On main branch
git checkout main
git pull origin main

# Make fix and commit directly
git add src/components/Button.tsx
git commit -m "fix(button): Correct hover state color"
git push origin main
```

**Critical Hotfix (CREATE BRANCH from main):**

```bash
# Branch from main
git checkout main
git pull origin main
git checkout -b hotfix/auth-token-expiry

# Fix and commit
git commit -m "fix(auth): Resolve premature token expiration

Fixes critical bug where users logged out after 5 minutes
instead of 24 hours due to incorrect time unit.

Fixes #789"

# Merge to main
git checkout main
git merge hotfix/auth-token-expiry
git push origin main

# Tag release
git tag -a v1.2.3 -m "Hotfix: Auth token expiration"
git push origin v1.2.3

# Delete branch
git branch -d hotfix/auth-token-expiry
```

### Branch Management Best Practices

**Keep branches updated:**
```bash
git fetch origin
git rebase origin/main
```

**Before merging:**
```bash
# Update from main
git rebase origin/main

# Run tests
npm test

# Review changes
git diff main..HEAD
```

**After merging:**
```bash
# Delete local branch
git branch -d feature/branch-name

# Delete remote branch
git push origin --delete feature/branch-name
```

### Quick Commands

```bash
# Create branch
git checkout -b feature/new-feature

# Switch branch
git checkout branch-name

# Update from main
git fetch origin && git rebase origin/main

# Push branch
git push origin feature/new-feature

# Delete branch locally
git branch -d feature/branch-name

# Delete branch remotely
git push origin --delete feature/branch-name

# List branches
git branch -a
```

For detailed branching strategy, examples, and decision trees, see `references/branching-strategy.md`.

---

## Summary

✅ **DO:**
- Use conventional commit format
- Write clear, specific descriptions
- Use imperative mood
- Keep subject line under 50 characters
- Explain WHAT and WHY in body
- Reference issue numbers

❌ **DON'T:**
- Use emojis anywhere
- Include co-author tags
- Write vague messages
- Include implementation details in title
- Use past tense
- Commit broken code

**Remember:** Commit messages are documentation for future developers (including future you). Write them clearly and professionally.
