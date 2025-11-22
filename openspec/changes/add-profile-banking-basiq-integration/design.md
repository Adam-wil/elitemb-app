# Design Document: Profile-Specific Bank Account Integration with Basiq API

## Context

The Elite MB Application manages multiple betting profiles per user, where each profile represents an independent betting operation with isolated data. Users need to track their "betting bank" (the actual cash they use for betting) with real-time visibility into bank account balances.

**Business Requirements:**
- Connect real bank accounts to specific profiles (not to the user globally)
- Each profile can have multiple bank accounts (e.g., Main Betting Bank + Reserve Account)
- Automated balance tracking via Open Banking (Australian CDR)
- Profile A's accounts are completely isolated from Profile B's accounts
- Main dashboard aggregates balances across all profiles and all accounts
- Regulatory compliance with Australian Consumer Data Right (CDR)
- Bank-grade security and OAuth 2.0 authentication

**Current State:**
- Multi-profile architecture exists (from add-multi-profile-subscription-architecture)
- ProfileProvider manages multiple profiles with isolated data
- Banking pages exist (/banking/*, /banking/balance, /banking/health) but lack real bank connections
- Users must manually track balances without automation

**Technical Foundation:**
- React 18+ with TypeScript 5+
- React Query for data fetching
- ProfileProvider context for profile management
- Basiq API for Australian Open Banking integration (backend)
- Mock data for frontend development (real API integration in backend future work)

## Goals / Non-Goals

### Goals
- Enable profile-specific bank account connections via Basiq API
- Provide real-time automated balance tracking
- Maintain complete data isolation between profiles
- Aggregate bank balances across all profiles on main dashboard
- Prepare OAuth flow for Basiq integration (mock for frontend)
- Display account health monitoring (connection status, last sync)
- Provide clear onboarding for first-time bank connection
- Ensure CDR compliance messaging and security badges
- Handle multiple accounts per profile gracefully
- Distinguish automated bank balances from manual bookie balances

### Non-Goals
- Backend Basiq API integration (separate change, future work)
- Actual OAuth implementation with Basiq servers (mock only for frontend)
- Transaction history parsing and categorization (future feature)
- Cash flow analysis and forecasting (future feature)
- Bank account recommendations or comparison (out of scope)
- Multi-currency support for international bank accounts (future)
- Bill payment or fund transfers (read-only access only)
- Bank account creation or modification (read-only)

## Decisions

### Decision 1: Profile-Level Bank Accounts (Not User-Level)
**Rationale:** Each betting profile represents a separate betting operation. Users may use different bank accounts for different profiles (e.g., Pro User uses Bank A, Jenny uses Bank B). Connecting accounts at the profile level maintains data isolation and reflects real-world usage.

**Alternatives considered:**
- User-level bank accounts shared across profiles: Violates profile isolation, confusing attribution
- Global bank accounts with manual assignment: Added complexity, error-prone

**Data Model:**
```typescript
interface BankAccount {
  id: string;
  profileId: string;        // ← Profile relationship
  bankName: string;
  accountName: string;
  accountNumber: string;    // Masked: last 4 digits only
  balance: number;
  currency: string;
  lastSynced: Date;
  basiqConnectionId: string; // Basiq API reference
  status: 'active' | 'disconnected' | 'error' | 'needs_reauth';
}
```

**Benefits:**
- Clear ownership: Account belongs to a specific profile
- Data isolation enforced at data model level
- Easy to filter: `accounts.filter(a => a.profileId === activeProfileId)`
- Scales well: Different profiles can have different numbers of accounts
- Reflects real usage: Users may indeed use separate bank accounts per betting operation

**Winner:** Profile-level bank accounts - maintains isolation, clear ownership

### Decision 2: Basiq API for Australian Open Banking
**Rationale:** Basiq is the leading CDR-compliant Open Banking platform in Australia. Provides secure OAuth 2.0 access to bank accounts with read-only permissions.

**Why Basiq:**
- ✅ Australian CDR (Consumer Data Right) compliant
- ✅ Supports all major Australian banks (CBA, NAB, Westpac, ANZ, etc.)
- ✅ OAuth 2.0 authentication (industry standard)
- ✅ Read-only access (cannot initiate transactions)
- ✅ Strong security and encryption
- ✅ Developer-friendly API with good documentation
- ✅ Webhook support for real-time balance updates

**Alternatives considered:**
- Plaid: US-focused, limited Australian bank support
- Yodlee: Enterprise-focused, expensive, complex integration
- Direct bank API integration: Not feasible - each bank has different API
- Manual CSV upload: Not real-time, error-prone

**API Endpoints (Backend):**
```typescript
POST /api/banking/basiq/init-connection
  → Returns consent URL for OAuth flow

POST /api/banking/basiq/complete-connection
  → Exchanges OAuth code for access token
  → Fetches account details
  → Returns BankAccount data

GET /api/banking/basiq/accounts/:profileId
  → Fetches all accounts for a profile

POST /api/banking/basiq/refresh/:accountId
  → Manually triggers balance refresh

DELETE /api/banking/basiq/disconnect/:accountId
  → Revokes Basiq access token
  → Deletes connection
```

**Winner:** Basiq - best fit for Australian market, CDR compliant

### Decision 3: Mock OAuth Flow for Frontend Development
**Rationale:** Frontend development cannot depend on backend Basiq integration being complete. Mock OAuth flow allows full UI/UX development and testing with realistic data.

**Mock Flow:**
```typescript
// 1. User clicks "Connect Bank Account"
// 2. Instead of redirecting to Basiq:
//    - Simulate delay (500ms)
//    - Generate mock bank account data
//    - Add to ProfileProvider state
//    - Show success message

// Mock function:
async function mockConnectBankAccount(profileId: string): Promise<BankAccount> {
  await delay(500); // Simulate OAuth + API call

  return {
    id: generateId(),
    profileId,
    bankName: 'Commonwealth Bank',
    accountName: `Betting Account ${randomNumber()}`,
    accountNumber: `****${randomDigits(4)}`,
    balance: randomBalance(500, 10000),
    currency: 'AUD',
    lastSynced: new Date(),
    basiqConnectionId: `basiq_mock_${randomString()}`,
    status: 'active',
  };
}
```

**Real OAuth Flow (for comparison):**
```typescript
// 1. Frontend: initBasiqConnection(profileId)
// 2. Backend: Generate consent URL with state parameter
// 3. Frontend: Redirect to Basiq consent URL
// 4. User: Authenticates with bank, grants consent
// 5. Basiq: Redirects back to /banking/callback?code=xyz&state=abc
// 6. Frontend: Calls completeBasiqConnection(code, state, profileId)
// 7. Backend: Exchanges code for access token, fetches accounts
// 8. Backend: Returns BankAccount data
// 9. Frontend: Updates UI, shows success
```

**Benefits of Mock:**
- Full UI development without backend dependency
- Realistic user flows and error handling
- Easy to test different scenarios (success, error, timeout)
- Clear TODO comments for future API integration

**Winner:** Mock OAuth flow for development, designed for easy real API swap

### Decision 4: Multiple Accounts Per Profile
**Rationale:** Users may have multiple bank accounts they use for betting (e.g., main account + reserve/savings account). Restricting to one account per profile is artificial.

**Use Cases:**
- Main Betting Bank + Reserve Account
- Different accounts for different bet types (e.g., racing vs sports)
- Multiple banks for diversification
- Primary account + backup account

**UI Implications:**
- /banking/accounts shows list of all connected accounts
- Total balance sums all accounts for the profile
- Each account can be individually refreshed or disconnected
- Clear labeling: "Account 1", "Account 2", or user-provided names

**Data Structure:**
```typescript
// Profile has array of accounts:
interface Profile {
  id: string;
  name: string;
  connectedBankAccounts: BankAccount[]; // ← Multiple accounts
  totalBankBalance: number; // Sum of all account balances
  // ...
}
```

**Winner:** Support multiple accounts per profile - more flexible, realistic

### Decision 5: Main Dashboard Aggregates ALL Bank Accounts
**Rationale:** Main dashboard shows overall performance across all betting profiles. Including total bank balance across all profiles and accounts provides complete financial visibility.

**Aggregation Logic:**
```typescript
function useAllProfilesBankAccounts() {
  const { profiles } = useProfile();

  // Flatten all accounts from all profiles
  const allAccounts = profiles.flatMap(p => p.connectedBankAccounts);

  // Calculate total balance
  const totalBalance = allAccounts.reduce((sum, account) =>
    sum + account.balance, 0
  );

  // Group by profile for breakdown
  const byProfile = profiles.map(profile => ({
    profileName: profile.name,
    accountCount: profile.connectedBankAccounts.length,
    totalBalance: profile.totalBankBalance,
  }));

  return { allAccounts, totalBalance, byProfile };
}
```

**Main Dashboard Display:**
```
┌─────────────────────────────────────┐
│ Total Bank Accounts Balance         │
│ $8,771.25 AUD                       │  ← Sum across all profiles
│                                     │
│ Breakdown:                          │
│ • Pro User: $7,520.50 (2 accounts) │
│ • Jenny: $1,250.75 (1 account)     │
│ • George: $0.00 (0 accounts)       │
└─────────────────────────────────────┘
```

**Winner:** Aggregate all bank accounts on main dashboard - complete visibility

### Decision 6: Distinguish Automated Bank vs Manual Bookie Balances
**Rationale:** Users track two types of balances:
1. **Bank Account Balances** - Automated via Basiq, real bank account data
2. **Bookie Account Balances** - Manual entry, cash held with bookmakers

These are different and should be visually distinguished.

**UI Design:**
```
/banking/balance page:
┌─────────────────────────────────────┐
│ 🏦 Bank Accounts (Automated)        │
│ $7,520.50                           │
│ • CBA Betting Account: $5,420.50   │
│ • NAB Reserve: $2,100.00           │
│ [Refresh Balances]                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📊 Bookie Accounts (Manual Entry)   │
│ $2,450.00                           │
│ • Bet365: $1,200.00                │
│ • TAB: $1,250.00                   │
│ [Update Balances]                   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 💰 Total Betting Bank               │
│ $9,970.50                           │
│ ($7,520.50 bank + $2,450 bookie)   │
└─────────────────────────────────────┘
```

**Visual Distinction:**
- Different icons (🏦 bank, 📊 bookie)
- Different colors (blue for bank, orange for bookie)
- Labels: "Automated" vs "Manual Entry"
- Separate sections/cards

**Winner:** Clear visual distinction between automated and manual balances

### Decision 7: Account Health Monitoring
**Rationale:** Bank connections can expire, fail, or need re-authentication. Users need visibility into connection health and easy remediation.

**Health Indicators:**
- **Active** (green): Connection healthy, recent sync
- **Needs Re-authentication** (yellow): Access token expired, user must re-auth
- **Disconnected** (gray): User disconnected, no longer syncing
- **Error** (red): Sync failed, manual intervention needed

**Health Monitoring Logic:**
```typescript
function getAccountHealth(account: BankAccount): {
  status: AccountStatus;
  message: string;
  action?: string;
} {
  const daysSinceSync = daysSince(account.lastSynced);

  if (account.status === 'disconnected') {
    return {
      status: 'disconnected',
      message: 'Account disconnected',
      action: 'Reconnect',
    };
  }

  if (account.status === 'error') {
    return {
      status: 'error',
      message: 'Sync failed - please re-authenticate',
      action: 'Re-authenticate',
    };
  }

  if (daysSinceSync > 7) {
    return {
      status: 'needs_reauth',
      message: 'Connection expired - please re-authenticate',
      action: 'Re-authenticate',
    };
  }

  return {
    status: 'active',
    message: `Last synced ${formatRelativeTime(account.lastSynced)}`,
  };
}
```

**/banking/health page:**
- List all accounts with health status
- Alert banner if any account needs attention
- Quick action buttons (Re-authenticate, Disconnect)
- Sort by status (errors first, then warnings, then healthy)

**Winner:** Comprehensive health monitoring with clear remediation actions

### Decision 8: Security and Privacy First
**Rationale:** Bank account data is highly sensitive. Security and user trust are paramount.

**Security Measures:**

**1. Never Display Full Account Numbers:**
```typescript
function maskAccountNumber(fullNumber: string): string {
  // Only last 4 digits shown
  return `****${fullNumber.slice(-4)}`;
}
```

**2. OAuth State Parameter (CSRF Protection):**
```typescript
// Generate unique state for each OAuth flow:
const state = crypto.randomUUID();

// Store state in sessionStorage before redirect
sessionStorage.setItem('basiq_oauth_state', state);

// Validate on callback:
const returnedState = params.get('state');
const storedState = sessionStorage.getItem('basiq_oauth_state');
if (returnedState !== storedState) {
  throw new Error('Invalid OAuth state - possible CSRF attack');
}
```

**3. Basiq Tokens Never in Frontend:**
- Access tokens stored securely in backend database
- Tokens encrypted at rest
- Tokens never sent to frontend
- Frontend only receives account data (balance, name, masked number)

**4. CDR Compliance Messaging:**
- Clear consent explanation before OAuth
- "Read-only access to account balances and transactions"
- "You can disconnect anytime"
- Link to privacy policy and Basiq terms
- CDR compliant badge displayed

**5. Basiq Branding and Trust Indicators:**
```
┌───────────────────────────────────────┐
│ 🔒 Connect with Basiq                 │
│ Bank-Grade Security                   │
│ CDR Compliant                         │
│ Read-Only Access                      │
│                                       │
│ Basiq uses Open Banking to securely  │
│ connect your bank account.            │
│                                       │
│ [Powered by Basiq logo]               │
│ [Continue to Bank Selection]          │
└───────────────────────────────────────┘
```

**Winner:** Security first with clear trust indicators

## Component Architecture

```
ProfileProvider (Enhanced)
├── getBankAccountsForProfile(profileId)
├── getTotalBankBalanceForProfile(profileId)
├── getAllBankAccountsAllProfiles()
├── connectBankAccount(account)
└── disconnectBankAccount(accountId)

/banking/accounts (BankingAccountsPage)
├── useBankAccounts() → Filter by activeProfileId
├── BankAccountList
│   └── BankAccountCard (for each account)
│       ├── Bank name, account name, masked number
│       ├── Balance (formatted currency)
│       ├── Last synced (relative time)
│       ├── AccountHealthStatus badge
│       ├── Refresh button
│       └── Disconnect button
├── ConnectAccountButton
│   └── Mock OAuth flow
├── RefreshAllButton
└── EmptyState (if no accounts)

/banking/balance (BankingBalancePage)
├── BankingOverview (summary card)
│   ├── Total bank accounts balance
│   ├── Total bookie balances (manual)
│   └── Combined total betting bank
├── Bank Accounts Section (automated)
│   └── BankAccountCard (simplified, read-only)
├── Bookie Accounts Section (manual entry)
│   └── Existing manual entry components
└── Visual distinction (icons, colors, labels)

/banking/health (BankingHealthPage)
├── Health Alert Banner (if any issues)
├── BankAccountList (health focus)
│   └── BankAccountCard with emphasis on:
│       ├── AccountHealthStatus (prominent)
│       ├── Days since last sync
│       ├── Re-authenticate button (if needed)
│       └── Disconnect button
└── Sorting: errors → warnings → healthy

/banking/callback (BasiqCallbackHandler)
├── Extract code, state from URL
├── Validate state (CSRF protection)
├── completeBasiqConnection(code, state, profileId)
├── Add account to ProfileProvider
├── Show success message
├── Redirect to /banking/accounts
└── Error handling (invalid code, state mismatch)

Main Dashboard (MainDashboard)
├── useAllProfilesBankAccounts()
├── Bank Accounts Total Card
│   ├── Total balance across all profiles
│   ├── Breakdown by profile
│   └── "Connect More Accounts" button
└── Integration with existing P&L aggregation
```

## Data Flow

### Profile-Specific Bank Accounts Query
```typescript
// On /banking/accounts page:
function BankingAccountsPage() {
  const { activeProfileId } = useProfile();

  // React Query hook filters by profileId
  const { data: accounts, refetch } = useQuery(
    ['bank-accounts', activeProfileId],
    () => fetchBankAccountsByProfile(activeProfileId)
  );

  // For mock: Filter from in-memory mock data
  // For real API: Backend filters by profileId in query

  return (
    <div>
      <h1>Bank Accounts for {activeProfile.name}</h1>
      <BankAccountList accounts={accounts} />
      <ConnectAccountButton profileId={activeProfileId} />
    </div>
  );
}
```

### Profile Switching Flow
```
User switches from "Pro User" to "Jenny"
  → ProfileContext updates activeProfileId
  → useBankAccounts hook re-runs with new activeProfileId
  → React Query refetches: ['bank-accounts', 'jenny-id']
  → UI updates to show Jenny's accounts only
  → Balances recalculate for Jenny's accounts
  → No data leakage from Pro User
```

### Main Dashboard Aggregation
```typescript
function MainDashboard() {
  const { profiles } = useProfile();

  // Aggregate bank accounts across all profiles
  const allAccounts = profiles.flatMap(p => p.connectedBankAccounts);
  const totalBankBalance = allAccounts.reduce((sum, a) => sum + a.balance, 0);

  // Also aggregate P&L across all profiles (existing)
  const totalPL = aggregatePL(profiles);

  return (
    <div>
      <h1>All Profiles Combined</h1>
      <MetricCard
        title="Total Bank Accounts"
        value={formatCurrency(totalBankBalance)}
      />
      <MetricCard
        title="Total P&L"
        value={formatCurrency(totalPL.profit)}
      />
      {/* Breakdown by profile */}
      <ProfileBreakdownTable profiles={profiles} />
    </div>
  );
}
```

## Mock Data Structure

### Mock Bank Accounts
```typescript
const mockBankAccounts: BankAccount[] = [
  // Pro User - 2 accounts
  {
    id: 'ba_1',
    profileId: '1', // Pro User
    bankName: 'Commonwealth Bank',
    accountName: 'Betting Account',
    accountNumber: '****1234',
    balance: 5420.50,
    currency: 'AUD',
    lastSynced: new Date('2025-01-09T14:30:00Z'),
    basiqConnectionId: 'basiq_mock_123',
    status: 'active',
  },
  {
    id: 'ba_2',
    profileId: '1', // Pro User
    bankName: 'NAB',
    accountName: 'Reserve Fund',
    accountNumber: '****5678',
    balance: 2100.00,
    currency: 'AUD',
    lastSynced: new Date('2025-01-09T14:25:00Z'),
    basiqConnectionId: 'basiq_mock_456',
    status: 'active',
  },

  // Jenny - 1 account
  {
    id: 'ba_3',
    profileId: '2', // Jenny
    bankName: 'Westpac',
    accountName: 'Jenny Betting',
    accountNumber: '****9012',
    balance: 1250.75,
    currency: 'AUD',
    lastSynced: new Date('2025-01-09T10:00:00Z'),
    basiqConnectionId: 'basiq_mock_789',
    status: 'active',
  },

  // George - 0 accounts (empty state testing)
];
```

### Mock OAuth Functions
```typescript
// Mock: Init connection (would return Basiq consent URL)
async function mockInitBasiqConnection(profileId: string): Promise<{ consentUrl: string }> {
  await delay(300);
  return {
    consentUrl: '/banking/callback?code=mock_code&state=mock_state', // Mock redirect
  };
}

// Mock: Complete connection (would exchange code for token)
async function mockCompleteBasiqConnection(
  code: string,
  state: string,
  profileId: string
): Promise<BankAccount> {
  await delay(500);

  // Generate mock account data
  return {
    id: `ba_${Date.now()}`,
    profileId,
    bankName: randomBank(),
    accountName: `Betting Account ${randomNumber()}`,
    accountNumber: `****${randomDigits(4)}`,
    balance: randomBalance(500, 10000),
    currency: 'AUD',
    lastSynced: new Date(),
    basiqConnectionId: `basiq_mock_${randomString()}`,
    status: 'active',
  };
}

// Mock: Refresh balance
async function mockRefreshAccount(accountId: string): Promise<number> {
  await delay(800);
  return randomBalance(500, 10000); // Return new balance
}
```

## Risks / Trade-offs

### Risk 1: Mock vs Real OAuth Flow Differences
**Trade-off:**
- ✅ Mock allows frontend development without backend
- ❌ Real OAuth has redirects, timing, error cases mock doesn't capture
- ❌ Risk of frontend not working when real API integrated

**Mitigation:**
- Design mock to mirror real flow as closely as possible
- Clear TODO comments marking where real API calls go
- Test OAuth callback handling even with mock
- Document expected API request/response formats
- Integration testing when backend ready

### Risk 2: Profile-Level Accounts Complexity
**Trade-off:**
- ✅ Proper data isolation, reflects real usage
- ❌ More complex than user-level accounts
- ❌ Users might connect same bank account to multiple profiles (confusion)

**Mitigation:**
- Clear UI: Always show which profile you're connecting to
- Confirmation: "Connect to [Profile Name]?" before OAuth
- Allow same bank account on multiple profiles (if user wants)
- Clear labeling in UI to prevent confusion

### Risk 3: Basiq API Costs
**Trade-off:**
- ✅ Excellent API, CDR compliant, secure
- ❌ Basiq charges per connection and per refresh
- ❌ Costs scale with number of users and accounts

**Mitigation:**
- Implement smart caching: Only refresh when user requests or data is stale
- Background refresh max once per day (configurable)
- Consider tiered refreshing: active accounts more frequent than inactive
- Monitor API usage and costs
- Plan for cost increase as user base grows

### Risk 4: Bank Connection Expiry
**Trade-off:**
- ✅ Security best practice: connections expire for safety
- ❌ User friction: Must re-authenticate periodically
- ❌ Broken experience if user doesn't notice expired connection

**Mitigation:**
- Proactive notifications: Email when connection expires soon
- /banking/health page alerts prominently
- Easy re-authentication: One-click flow
- Grace period: Continue showing last-known balance even if connection expired (with warning)

### Risk 5: Multiple Accounts Per Profile Confusion
**Trade-off:**
- ✅ Flexibility: Users can have multiple accounts
- ❌ Could be confusing: "Which account is my betting bank?"
- ❌ Harder to aggregate and display

**Mitigation:**
- Allow user to name/rename accounts: "Main Betting Bank", "Reserve"
- Show total clearly: Sum of all accounts for profile
- Allow setting "primary" account (optional)
- Clear card-based UI: Each account is distinct visual unit

## Migration Plan

### Prerequisites
1. ✅ add-multi-profile-subscription-architecture fully implemented
2. ✅ ProfileProvider exists with multi-profile support
3. ✅ Banking pages exist (/banking/*)
4. ✅ React Query configured

### Phase 1: Data Model and Mock Data (Week 1)
1. Define BankAccount TypeScript interface
2. Create mock bank account data (3-5 accounts)
3. Enhance ProfileProvider with bank account relationships
4. Create useBankAccounts hook

### Phase 2: Banking Pages Enhancement (Week 1-2)
1. Update /banking/accounts page with account list
2. Create BankAccountCard and BankAccountList components
3. Implement empty states
4. Add "Connect Account" button (mock flow)
5. Add "Refresh Balances" functionality

### Phase 3: OAuth Flow Preparation (Week 2)
1. Create /banking/callback route
2. Build BasiqCallbackHandler component
3. Implement mock OAuth flow (simulates real flow)
4. Add state validation (CSRF protection)
5. Handle OAuth success and error cases

### Phase 4: Additional Pages and Features (Week 2-3)
1. Enhance /banking/balance page (automated + manual sections)
2. Enhance /banking/health page (connection monitoring)
3. Build BankingOverview component
4. Create AccountHealthStatus component
5. Implement disconnect account flow

### Phase 5: Main Dashboard Integration (Week 3)
1. Create useAllProfilesBankAccounts hook
2. Add bank balance aggregation to main dashboard
3. Display profile breakdown
4. Test aggregation logic

### Phase 6: Security, Onboarding, Polish (Week 3-4)
1. Add security badges and CDR messaging
2. Create onboarding flow for first-time connection
3. Refine UI/UX based on testing
4. Ensure account number masking everywhere
5. Test OAuth state validation

### Phase 7: Testing and Documentation (Week 4)
1. Test all banking pages with mock data
2. Test profile switching with accounts
3. Test OAuth flow (mocked)
4. Test aggregation on main dashboard
5. Write documentation for backend integration
6. Document Basiq API requirements

### Rollback
If this change needs to be rolled back:
1. Remove bank account enhancements from ProfileProvider
2. Revert banking pages to original state
3. Remove /banking/callback route
4. Delete banking-specific components
5. Remove bank account types and mock data

## Open Questions

### 1. Basiq Account Selection
**Question:** When user authenticates with bank via Basiq, they may have multiple accounts (checking, savings, credit card). Should we:
- Auto-connect all accounts?
- Let user select which accounts to connect?
- Connect first account only?

**Impact:** UX flow, API usage, data volume

**Recommendation:** Let user select which account(s) to connect during OAuth flow - most control

### 2. Background Balance Refresh Frequency
**Question:** How often should balances auto-refresh in background?
- Every hour? Every 6 hours? Once daily? Never (manual only)?

**Impact:** Basiq API costs, data freshness, user experience

**Recommendation:** Manual refresh only for MVP, add optional background sync later

### 3. Transaction History
**Question:** Basiq API provides transaction history. Should we:
- Fetch and display transactions?
- Parse transactions to identify betting-related deposits/withdrawals?
- Skip transaction history entirely (balance only)?

**Impact:** Scope of this change, backend complexity, value to users

**Recommendation:** Balance only for this change, transactions in separate future change

### 4. Disconnect vs Archive
**Question:** When user disconnects a bank account, should we:
- Permanently delete all data?
- Archive connection data for historical reference?
- Keep last-known balance?

**Impact:** Data retention, user trust, historical reporting

**Recommendation:** Soft delete with 30-day retention, keep last-known balance archived

### 5. Multi-Currency Support
**Question:** Users might have accounts in different currencies (AUD, USD, GBP). Should we:
- Convert all to primary currency?
- Display in native currency and total in primary?
- Not support multi-currency initially?

**Impact:** Complexity, exchange rate API, aggregation logic

**Recommendation:** AUD only for MVP (Australian market), multi-currency in future

### 6. Shared Bank Accounts
**Question:** Can the same physical bank account be connected to multiple profiles?
- Allow (user might use same bank for multiple betting operations)?
- Prevent (could be confusing)?

**Impact:** Basiq connection management, user experience

**Recommendation:** Allow - Basiq connections are independent, user may want this flexibility

### 7. Bookie Balance Manual Entry Location
**Question:** Where should manual bookie balance entry live?
- /banking/balance page (current plan)?
- Separate /banking/bookies page?
- Within each bookie's detail page?

**Impact:** Navigation, UX, page organization

**Recommendation:** Keep on /banking/balance page - shows complete financial picture

### 8. Basiq Webhook Integration
**Question:** Basiq can send webhooks when account balance changes. Should we:
- Implement webhook handling (real-time updates)?
- Poll manually only?
- Defer to future enhancement?

**Impact:** Backend complexity, real-time data, user experience

**Recommendation:** Defer webhooks to future enhancement - manual refresh is sufficient for MVP

## Future Enhancements (Out of Scope)

### Immediate Future (Next Changes)
- Backend Basiq API integration (real OAuth flow)
- Secure token storage and encryption
- Automated background balance refresh
- Email notifications for connection expiry

### Medium-Term (3-6 months)
- Transaction history display
- Transaction categorization (deposits, withdrawals, fees)
- Cash flow analysis and charts
- Balance trend graphs
- Predictive balance forecasting
- Multi-currency support

### Long-Term (6+ months)
- Basiq webhook integration for real-time updates
- Bill payment integration (if regulatory compliant)
- Bank recommendations based on user needs
- Integration with bookie account balances (API if available)
- Automated reconciliation (bank vs bookie vs bets)
- Tax reporting features

## Success Metrics

### Functionality
✅ Bank accounts filter correctly by active profile
✅ Multiple accounts per profile supported
✅ Main dashboard aggregates all bank accounts
✅ Profile switching updates bank account views
✅ Mock OAuth flow works end-to-end
✅ Disconnect account removes from profile
✅ Refresh balances updates data
✅ Account health monitoring displays correctly
✅ Empty states guide users to connect accounts

### Security
✅ Account numbers always masked (last 4 only)
✅ OAuth state validation prevents CSRF
✅ No sensitive data logged or exposed
✅ Security badges and CDR messaging displayed
✅ Clear consent explanation before OAuth

### UX
✅ Clear visual distinction: automated (bank) vs manual (bookie) balances
✅ Profile indicator shows which profile's accounts are displayed
✅ Onboarding guides first-time users
✅ Error messages are clear and actionable
✅ Responsive design works on mobile/tablet/desktop

### Code Quality
✅ TypeScript strict mode with proper types
✅ Clean separation: ProfileProvider, hooks, components
✅ Mock data realistic and well-structured
✅ TODO comments marking future API integration points
✅ Passes linting and type-checking

## Basiq API Integration Notes (For Backend Team)

### Required Basiq Endpoints
```
POST https://au-api.basiq.io/token
  → Get API access token (client credentials)

POST https://au-api.basiq.io/users/{userId}/connections
  → Initiate bank connection, get consent URL

GET https://au-api.basiq.io/connections/{connectionId}
  → Check connection status

GET https://au-api.basiq.io/users/{userId}/accounts
  → Fetch all accounts for a user

GET https://au-api.basiq.io/accounts/{accountId}
  → Get account details and balance

POST https://au-api.basiq.io/accounts/{accountId}/refresh
  → Manually trigger balance refresh

DELETE https://au-api.basiq.io/connections/{connectionId}
  → Revoke connection (disconnect)
```

### Security Requirements
- Store Basiq API keys securely (environment variables)
- Encrypt access tokens at rest in database
- Never send tokens to frontend
- Implement rate limiting for API calls
- Log all Basiq API calls for audit trail
- Implement token refresh logic
- Handle token expiry gracefully

### CDR Compliance
- Obtain user consent before OAuth
- Provide clear data usage explanation
- Allow users to disconnect anytime
- Respect data deletion requests (within 30 days)
- Log consent timestamps
- Provide data access report on request
