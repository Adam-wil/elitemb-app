# Git Branching Strategy

## Branch Types and When to Create Them

### ✅ CREATE a New Branch For:

**Major Features** (Always branch):
- New user-facing features that take multiple commits
- Features that need review before merging
- Features that might be rolled back
- Features that take more than a day to complete
- Any feature that changes core functionality

Examples:
```bash
git checkout -b feature/oauth-integration
git checkout -b feature/real-time-notifications
git checkout -b feature/advanced-search-filters
git checkout -b feature/user-dashboard-redesign
git checkout -b feature/export-to-pdf
```

**Significant Refactors** (Always branch):
- Large-scale code reorganization
- Architecture changes
- Database schema migrations
- API redesigns
- Performance optimizations affecting multiple files

Examples:
```bash
git checkout -b refactor/api-error-handling
git checkout -b refactor/database-optimization
git checkout -b refactor/component-architecture
git checkout -b refactor/state-management-migration
```

**Bug Fixes (Critical/Complex)** (Branch recommended):
- Production hotfixes
- Security vulnerabilities
- Data corruption issues
- Bugs affecting multiple components
- Fixes requiring significant testing

Examples:
```bash
git checkout -b hotfix/security-patch-auth-bypass
git checkout -b fix/data-loss-on-form-submit
git checkout -b fix/memory-leak-dashboard
git checkout -b fix/payment-processing-error
```

**Experimental Work** (Always branch):
- Proof of concepts
- Testing new libraries
- Performance experiments
- Trying alternative approaches

Examples:
```bash
git checkout -b experiment/vite-migration
git checkout -b experiment/new-chart-library
git checkout -b poc/websocket-implementation
```

---

### ❌ DO NOT Create a Branch For:

**Minor Changes** (Commit directly to main/develop):
- Typo fixes in code or docs
- Comment updates
- Formatting changes (Prettier, ESLint auto-fixes)
- Single-line bug fixes
- Dependency version bumps (non-breaking)
- Documentation updates
- Configuration tweaks

**Allowed direct commits:**
```bash
# These go directly to main/develop
docs(readme): Fix installation command typo
style(button): Apply Prettier formatting
fix(form): Correct input label text
chore(deps): Update React to 18.3.1
docs(api): Fix endpoint URL in example
fix(typo): Correct variable name in comment
```

**Small Enhancements** (Commit directly unless part of larger feature):
- Adding a prop to existing component
- Small UI tweaks (spacing, colors)
- Adding a utility function
- Simple validation rules
- Minor accessibility improvements

---

## Branch Naming Convention

### Format

```
<type>/<short-description>
```

### Types

| Type | When to Use | Examples |
|------|-------------|----------|
| `feature/` | New features | `feature/oauth-login` |
| `fix/` | Non-critical bug fixes | `fix/validation-error` |
| `hotfix/` | Critical production fixes | `hotfix/security-patch` |
| `refactor/` | Code improvements | `refactor/api-consolidation` |
| `experiment/` | Experimental work | `experiment/new-framework` |
| `release/` | Release preparation | `release/v2.0.0` |
| `docs/` | Major documentation | `docs/api-overhaul` |

### Naming Rules

1. **Use kebab-case** (lowercase with hyphens)
2. **Be descriptive but concise** (3-5 words max)
3. **Focus on WHAT, not HOW**
4. **No ticket numbers in branch name** (put in commits)

**Good branch names:**
```bash
feature/two-factor-auth
feature/password-reset
feature/user-dashboard
fix/chart-rendering
fix/memory-leak-table
refactor/error-handling
hotfix/auth-bypass
experiment/graphql-api
```

**Bad branch names:**
```bash
feature/add-2fa-to-auth-service          # Too detailed
fix/bug                                   # Too vague
feature/PROJ-1234                         # No ticket numbers
my-feature                                # No type prefix
Feature/OAuth                             # Wrong case
feature/update_user_controller            # Use kebab-case
```

---

## Decision Tree: Should I Branch?

```
Does this change...

┌─ Take more than 1 day? ────────────────────────────────→ YES → Branch
│
├─ Need review before merging? ──────────────────────────→ YES → Branch
│
├─ Change core functionality? ───────────────────────────→ YES → Branch
│
├─ Add a new user-facing feature? ───────────────────────→ YES → Branch
│
├─ Affect multiple files/components? ────────────────────→ YES → Branch
│
├─ Require multiple commits? ────────────────────────────→ YES → Branch
│
├─ Might need to be rolled back? ────────────────────────→ YES → Branch
│
├─ Is it a hotfix/security issue? ───────────────────────→ YES → Branch
│
├─ Fix a typo or small bug? ─────────────────────────────→ NO → Direct commit
│
├─ Update documentation only? ───────────────────────────→ NO → Direct commit
│
└─ Change formatting/style only? ────────────────────────→ NO → Direct commit
```

**Rule of thumb:** If unsure, branch. It's easier to merge a small branch than to revert a bad direct commit.

---

## Workflow Examples

### Major Feature (BRANCH)

```bash
# 1. Create feature branch
git checkout -b feature/real-time-notifications

# 2. Work on feature with multiple commits
git commit -m "feat(notifications): Add WebSocket connection"
git commit -m "feat(notifications): Create notification UI component"
git commit -m "feat(notifications): Add notification preferences"
git commit -m "test(notifications): Add integration tests"

# 3. Keep branch updated with main
git fetch origin
git rebase origin/main

# 4. Push branch
git push origin feature/real-time-notifications

# 5. Create pull request
# Review → Approve → Merge → Delete branch
```

### Minor Fix (DIRECT COMMIT)

```bash
# 1. Make sure you're on main/develop
git checkout main

# 2. Make small fix and commit directly
git add src/components/Button.tsx
git commit -m "fix(button): Correct hover state color"

# 3. Push directly
git push origin main
```

### Multiple Related Changes (BRANCH)

```bash
# Even if each change is small, if they're part of one feature → branch
git checkout -b feature/search-improvements

git commit -m "feat(search): Add debounce to search input"
git commit -m "feat(search): Add search history"
git commit -m "feat(search): Highlight matching terms"
git commit -m "docs(search): Update search documentation"

# Merge as one cohesive feature
```

### Critical Hotfix (BRANCH from main)

```bash
# 1. Branch from main (production)
git checkout main
git pull origin main
git checkout -b hotfix/auth-token-expiry

# 2. Fix and test
git commit -m "fix(auth): Resolve premature token expiration

Fixes critical bug where users were logged out after 5 minutes
instead of 24 hours due to incorrect time unit in validation.

Fixes #789"

# 3. Merge to main AND develop
git checkout main
git merge hotfix/auth-token-expiry
git push origin main

git checkout develop
git merge hotfix/auth-token-expiry
git push origin develop

# 4. Tag release
git tag -a v1.2.3 -m "Hotfix: Auth token expiration"
git push origin v1.2.3

# 5. Delete hotfix branch
git branch -d hotfix/auth-token-expiry
```

---

## Branch Management

### Keeping Branches Updated

**Option 1: Rebase (Recommended for feature branches)**
```bash
git checkout feature/user-dashboard
git fetch origin
git rebase origin/main
```

**Option 2: Merge (For shared branches)**
```bash
git checkout feature/user-dashboard
git fetch origin
git merge origin/main
```

### Before Merging

1. **Update from main:**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run tests:**
   ```bash
   npm test
   npm run lint
   ```

3. **Review changes:**
   ```bash
   git diff main..HEAD
   ```

4. **Squash if needed** (many small commits):
   ```bash
   git rebase -i main
   ```

### After Merging

**Delete merged branches:**
```bash
# Local
git branch -d feature/user-dashboard

# Remote
git push origin --delete feature/user-dashboard
```

**Or use GitHub/GitLab auto-delete after merge**

---

## Common Scenarios

### Scenario 1: Starting a New Feature

```bash
# Check current branch
git branch

# Update main
git checkout main
git pull origin main

# Create and switch to feature branch
git checkout -b feature/password-reset

# Start working...
```

### Scenario 2: Quick Typo Fix

```bash
# Already on main, just fix and commit
git checkout main
git pull origin main

# Make fix
git add README.md
git commit -m "docs(readme): Fix installation command typo"
git push origin main

# Done! No branch needed
```

### Scenario 3: Found Bug While Working on Feature

**If bug is related to your feature:**
```bash
# Just commit the fix in your feature branch
git commit -m "fix(auth): Resolve validation error in new flow"
```

**If bug is unrelated and urgent:**
```bash
# Stash your work
git stash

# Switch to main and fix
git checkout main
git pull origin main
git add src/components/Button.tsx
git commit -m "fix(button): Correct disabled state styling"
git push origin main

# Return to your feature
git checkout feature/password-reset
git stash pop
```

### Scenario 4: Feature Needs Multiple Developers

```bash
# Create shared feature branch
git checkout -b feature/api-redesign

# First developer pushes initial work
git push origin feature/api-redesign

# Other developers pull and contribute
git fetch origin
git checkout feature/api-redesign
git pull origin feature/api-redesign

# All commit to same branch
git commit -m "feat(api): Add pagination support"
git push origin feature/api-redesign
```

---

## Branch Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│ 1. CREATE BRANCH                                        │
│    git checkout -b feature/new-feature                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. DEVELOP                                              │
│    - Make commits                                       │
│    - Push regularly: git push origin feature/new-feature│
│    - Keep updated: git rebase origin/main               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. PREPARE FOR MERGE                                    │
│    - Update from main                                   │
│    - Run tests                                          │
│    - Review changes                                     │
│    - Squash commits if needed                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. CREATE PULL REQUEST                                  │
│    - Write clear PR description                         │
│    - Request reviews                                    │
│    - Address feedback                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 5. MERGE                                                │
│    - Squash and merge (for clean history)              │
│    - OR Merge commit (to preserve history)             │
│    - OR Rebase and merge (for linear history)          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 6. CLEANUP                                              │
│    - Delete remote: git push origin --delete branch-name│
│    - Delete local: git branch -d branch-name            │
│    - Pull updated main: git pull origin main            │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Reference

### Create Branch
```bash
git checkout -b feature/branch-name
```

### Switch Branch
```bash
git checkout branch-name
```

### Update Branch from Main
```bash
git fetch origin
git rebase origin/main
```

### Push Branch
```bash
git push origin feature/branch-name
```

### Delete Branch
```bash
# Local
git branch -d feature/branch-name

# Remote
git push origin --delete feature/branch-name
```

### List Branches
```bash
# Local
git branch

# Remote
git branch -r

# All
git branch -a
```

---

## Best Practices

### DO:
✅ Create branches for all major features
✅ Keep branch names short and descriptive
✅ Update branches regularly from main
✅ Delete branches after merging
✅ Write good PR descriptions
✅ Commit directly for trivial changes

### DON'T:
❌ Create branches for typo fixes
❌ Keep stale branches for weeks
❌ Use vague branch names
❌ Push directly to main for features
❌ Create branches for every tiny change
❌ Leave merged branches undeleted

---

## Summary

**When to Branch:**
- 🌟 **Major features** (always)
- 🔧 **Significant refactors** (always)
- 🐛 **Complex/critical bugs** (recommended)
- 🧪 **Experimental work** (always)

**When to Commit Directly:**
- 📝 **Documentation updates**
- 🎨 **Formatting/style fixes**
- 🔤 **Typo corrections**
- 🐛 **One-line bug fixes**
- 📦 **Minor dependency updates**

**Balance achieved:** Clean, organized repository without hundreds of unnecessary branches!
