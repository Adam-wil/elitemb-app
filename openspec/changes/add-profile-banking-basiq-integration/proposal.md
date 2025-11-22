# Change: Profile-Specific Bank Account Integration with Basiq API

## Why
Users need to connect their actual bank accounts to specific betting profiles for real-time balance tracking and transaction history. Each profile represents a separate betting operation with its own "betting bank," and users need automated visibility into their actual bank balances rather than manual entry only.

Currently:
- Profiles exist but have no connection to real financial data
- Banking pages (/banking/*) exist but lack actual bank account integration
- Users must manually track balances without real-time sync
- No automated cash flow visibility
- No distinction between bank account balances and bookie account balances

This change enables:
- **Profile-level bank account connections** - Each profile can connect multiple bank accounts independently
- **Real-time balance tracking** - Automated sync via Basiq API (Australian CDR-compliant Open Banking)
- **Isolated betting banks** - Profile A's accounts are completely separate from Profile B's accounts
- **Aggregated overview** - Main dashboard shows combined balances across all profiles and accounts
- **Regulatory compliance** - CDR (Consumer Data Right) compliant via Basiq
- **Security & privacy** - Bank-grade security with OAuth 2.0 authentication

## What Changes

### Data Model & State Management
- Define BankAccount TypeScript interface with profile relationship
- Create mock bank account data for development (3-5 accounts across multiple profiles)
- Enhance ProfileProvider to include bank account relationships
- Create useBankAccounts custom hook for profile-specific account queries
- Implement bank account filtering by activeProfileId

### Banking Pages Enhancement
- **Update /banking or /banking/accounts page:**
  - Display all bank accounts connected to CURRENT profile only
  - "Connect New Account" button initiating Basiq OAuth flow (mocked)
  - "Refresh Balances" button for manual sync
  - Account cards showing: bank name, account name, balance, last synced
  - Total balance across all accounts for current profile
  - Empty state with onboarding for first-time users
  - Disconnect account functionality

- **Enhance /banking/balance page:**
  - Section for connected bank accounts (automated via Basiq)
  - Section for manual bookie balances
  - Combined total: bank + bookie balances
  - Clear visual distinction between automated and manual balances

- **Enhance /banking/health page:**
  - Connection status monitoring per account
  - Last sync timestamp
  - Alerts for expired or failed connections
  - Re-authenticate button for expired connections
  - Transaction sync health (if available)

### UI Components
Create banking-specific components:
- `BankAccountCard.tsx` - Display individual account with balance, status
- `BankAccountList.tsx` - List all accounts for current profile
- `ConnectAccountButton.tsx` - Initiates Basiq OAuth flow
- `DisconnectAccountModal.tsx` - Confirmation before disconnecting
- `AccountHealthStatus.tsx` - Visual connection health indicator
- `BankingOverview.tsx` - Summary card with aggregated totals
- `BasiqCallbackHandler.tsx` - Handle OAuth redirect (route: /banking/callback)

### OAuth Flow Preparation
- Create /banking/callback route for Basiq OAuth redirect
- Implement mock OAuth flow for development (simulates Basiq consent)
- Design for future backend integration:
  - POST /api/banking/basiq/init-connection (get consent URL)
  - POST /api/banking/basiq/complete-connection (exchange code for token)
  - GET /api/banking/basiq/accounts/:profileId (fetch accounts)
  - POST /api/banking/basiq/refresh/:accountId (manual sync)
  - DELETE /api/banking/basiq/disconnect/:accountId (revoke access)

### Profile Context Integration
- Add `connectedBankAccounts` to Profile interface
- Add `totalBankBalance` computed property
- Add `totalBettingBank` (bank + bookie balances combined)
- Functions:
  - `getBankAccountsForProfile(profileId)`
  - `getTotalBankBalanceForProfile(profileId)`
  - `getAllBankAccountsAllProfiles()` for main dashboard

### Main Dashboard Aggregation
- Display total bank account balance across ALL profiles
- Breakdown by profile showing each profile's bank total
- Visual indicators of which profiles have accounts connected
- Quick action to connect more accounts

### Security & Privacy
- Never display full account numbers (last 4 digits only)
- Show Basiq branding and security badges
- CDR compliance messaging
- Clear consent and data usage explanation
- Graceful error handling for connection failures
- Prepare for token encryption and secure storage (backend)

## Impact
- Affected specs: `frontend` (modifies existing capability)
- Affected code:
  - Enhances ProfileProvider with bank account relationships
  - Updates /banking/* pages with account connection features
  - Creates banking-specific UI components
  - Adds /banking/callback OAuth route
  - Modifies main dashboard to aggregate bank balances
- Dependencies:
  - Builds on add-multi-profile-subscription-architecture (ProfileProvider)
  - Prepares for Basiq API integration in backend (future)
  - Uses React Query for bank account data fetching (mock data for now)
- Breaking changes: None (extends existing functionality)
- Backend:
  - No backend changes in this change (uses mock data)
  - Future work: Basiq API integration, secure token storage, account sync
- Data privacy: Bank account data is profile-specific, isolated via activeProfileId filtering
- CDR compliance: Frontend prepared for CDR-compliant OAuth flow via Basiq