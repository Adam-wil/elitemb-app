# Implementation Tasks

## Prerequisites
- [ ] 0.1 Verify add-multi-profile-subscription-architecture is fully implemented
- [ ] 0.2 Verify ProfileProvider exists and is functional
- [ ] 0.3 Verify React Query is configured and working
- [ ] 0.4 Verify banking pages structure exists (/banking/*)

## 1. Data Model and TypeScript Types

### BankAccount Interface
- [ ] 1.1 Create src/types/bank-account.types.ts file
- [ ] 1.2 Define BankAccount interface with all required fields
- [ ] 1.3 Define AccountStatus type ('active' | 'disconnected' | 'error' | 'needs_reauth')
- [ ] 1.4 Define BankAccountConnection interface (for OAuth state)
- [ ] 1.5 Define BasiqOAuthState interface (code, state, profileId)
- [ ] 1.6 Export all types from src/types/index.ts

### Extended Profile Interface
- [ ] 1.7 Update src/types/profile.types.ts
- [ ] 1.8 Add connectedBankAccounts: BankAccount[] to Profile interface
- [ ] 1.9 Add totalBankBalance: number computed property
- [ ] 1.10 Add totalBookieBalance: number property (manual entry)
- [ ] 1.11 Add totalBettingBank: number computed property (bank + bookie)

## 2. Mock Data Creation

### Mock Bank Account Data
- [ ] 2.1 Create src/data/mock-bank-accounts.ts file
- [ ] 2.2 Create mock bank accounts for "Pro User" profile (2 accounts)
- [ ] 2.3 Create mock bank account for "Jenny" profile (1 account)
- [ ] 2.4 Create mock bank account for "George" profile (1 account)
- [ ] 2.5 Include realistic data: bank names, balances, last synced timestamps
- [ ] 2.6 Create mock data generator function for adding new accounts
- [ ] 2.7 Export mockBankAccounts array and generator functions

### Mock Basiq OAuth Data
- [ ] 2.8 Create mock consent URL generator
- [ ] 2.9 Create mock OAuth callback data structure
- [ ] 2.10 Create mock account fetching function (simulates Basiq API response)

## 3. Profile Provider Enhancement

### Add Bank Account Relationships
- [ ] 3.1 Update ProfileProvider context value interface
- [ ] 3.2 Add getBankAccountsForProfile(profileId) function
- [ ] 3.3 Add getTotalBankBalanceForProfile(profileId) function
- [ ] 3.4 Add getAllBankAccountsAllProfiles() function
- [ ] 3.5 Add connectBankAccount(account: BankAccount) function
- [ ] 3.6 Add disconnectBankAccount(accountId: string) function
- [ ] 3.7 Implement profile bank balance calculations
- [ ] 3.8 Update mock profile data to include bank account references

## 4. Custom Hooks for Bank Accounts

### useBankAccounts Hook
- [ ] 4.1 Create src/hooks/useBankAccounts.ts file
- [ ] 4.2 Implement useBankAccounts hook (returns accounts for active profile)
- [ ] 4.3 Use useProfile to get activeProfileId
- [ ] 4.4 Filter bank accounts by profileId
- [ ] 4.5 Return accounts, total balance, account count

### useAllProfilesBankAccounts Hook
- [ ] 4.6 Create useAllProfilesBankAccounts hook (for main dashboard)
- [ ] 4.7 Fetch all bank accounts across all profiles
- [ ] 4.8 Calculate total balance across all accounts
- [ ] 4.9 Group accounts by profile for breakdown view

### React Query Hooks
- [ ] 4.10 Create src/hooks/queries/useBankAccountQuery.ts
- [ ] 4.11 Implement query for fetching bank accounts by profile
- [ ] 4.12 Set up query key: ['bank-accounts', profileId]
- [ ] 4.13 Use mock data for now, prepare for API integration
- [ ] 4.14 Implement refetch functionality for manual sync

## 5. Banking Pages - /banking/accounts (Main Banking Page)

### Page Structure
- [ ] 5.1 Create or update src/features/core/banking/BankingAccountsPage.tsx
- [ ] 5.2 Use useBankAccounts to get current profile's accounts
- [ ] 5.3 Display profile indicator: "Profile: [Active Profile Name]"
- [ ] 5.4 Implement page layout with header and content sections

### Account List Display
- [ ] 5.5 Use BankAccountList component to display accounts
- [ ] 5.6 Show total balance for current profile prominently
- [ ] 5.7 Display account count: "X connected accounts"
- [ ] 5.8 Show last sync time (most recent across all accounts)

### Connect New Account Button
- [ ] 5.9 Add "Connect New Account" button in header
- [ ] 5.10 Button triggers mock Basiq OAuth flow
- [ ] 5.11 Show loading state during connection
- [ ] 5.12 Handle connection success (add account to state)
- [ ] 5.13 Handle connection error (show error message)

### Refresh Balances Button
- [ ] 5.14 Add "Refresh Balances" button
- [ ] 5.15 Trigger refetch of all accounts via React Query
- [ ] 5.16 Show loading spinner during refresh
- [ ] 5.17 Update last synced timestamp on success

### Empty State
- [ ] 5.18 Create empty state component when no accounts connected
- [ ] 5.19 Show onboarding message: "Connect your betting bank account"
- [ ] 5.20 Explain benefits: real-time balances, transaction history
- [ ] 5.21 Show Basiq branding and security badges
- [ ] 5.22 Prominent "Connect with Basiq" button

## 6. Banking Pages - /banking/balance (Balance Overview)

### Page Enhancement
- [ ] 6.1 Update src/features/core/banking/BankingBalancePage.tsx
- [ ] 6.2 Add section: "Connected Bank Accounts" (automated)
- [ ] 6.3 Display total from useBankAccounts hook
- [ ] 6.4 Show individual account balances in cards/list

### Manual Bookie Balance Section
- [ ] 6.5 Keep existing manual bookie balance entry section
- [ ] 6.6 Display total manual bookie balances
- [ ] 6.7 Visual distinction: "Automated (Bank)" vs "Manual (Bookie)"

### Combined Total
- [ ] 6.8 Calculate combined total: bank + bookie balances
- [ ] 6.9 Display prominently as "Total Betting Bank"
- [ ] 6.10 Show breakdown: X from bank accounts, Y from bookie accounts

## 7. Banking Pages - /banking/health (Account Health)

### Page Enhancement
- [ ] 7.1 Create or update src/features/core/banking/BankingHealthPage.tsx
- [ ] 7.2 Display health status for each connected bank account
- [ ] 7.3 Use AccountHealthStatus component per account

### Connection Monitoring
- [ ] 7.4 Show connection status: active, needs re-auth, disconnected, error
- [ ] 7.5 Display days since last sync for each account
- [ ] 7.6 Highlight accounts needing attention (>7 days, disconnected, error)

### Alerts and Actions
- [ ] 7.7 Show alert banner if any account needs re-authentication
- [ ] 7.8 Add "Re-authenticate" button for expired connections
- [ ] 7.9 Show "Disconnect" button for each account
- [ ] 7.10 Display transaction sync health (if available from mock data)

## 8. UI Components - BankAccountCard

### Component Creation
- [ ] 8.1 Create src/components/banking/BankAccountCard.tsx
- [ ] 8.2 Accept BankAccount as prop
- [ ] 8.3 Display bank name and logo/icon (use generic for now)
- [ ] 8.4 Display account name
- [ ] 8.5 Display masked account number (e.g., "****1234")
- [ ] 8.6 Display current balance with currency formatting
- [ ] 8.7 Display last synced timestamp (relative time, e.g., "5 minutes ago")
- [ ] 8.8 Display connection status badge (active, needs re-auth, etc.)

### Actions
- [ ] 8.9 Add "Refresh" icon button for manual sync
- [ ] 8.10 Add "Disconnect" button or menu action
- [ ] 8.11 Show loading state during refresh
- [ ] 8.12 Handle click to view more details (optional)

### Styling
- [ ] 8.13 Card layout with Tailwind CSS
- [ ] 8.14 Responsive design (mobile/tablet/desktop)
- [ ] 8.15 Status color coding (green=active, yellow=needs auth, red=error)
- [ ] 8.16 Hover effects and transitions

## 9. UI Components - BankAccountList

### Component Creation
- [ ] 9.1 Create src/components/banking/BankAccountList.tsx
- [ ] 9.2 Accept accounts: BankAccount[] as prop
- [ ] 9.3 Map over accounts and render BankAccountCard for each
- [ ] 9.4 Handle empty state when accounts.length === 0
- [ ] 9.5 Add loading skeleton when data is loading
- [ ] 9.6 Grid or list layout (responsive)

## 10. UI Components - ConnectAccountButton

### Component Creation
- [ ] 10.1 Create src/components/banking/ConnectAccountButton.tsx
- [ ] 10.2 Button UI with Basiq branding colors
- [ ] 10.3 onClick handler triggers initBasiqConnection function
- [ ] 10.4 Show loading state during OAuth initialization
- [ ] 10.5 Disable if mock data limit reached (optional)

### Mock OAuth Flow
- [ ] 10.6 Create initBasiqConnection function (mock)
- [ ] 10.7 Simulate delay (500ms) for realism
- [ ] 10.8 Generate mock consent URL
- [ ] 10.9 For mock: skip redirect, directly add new account to profile
- [ ] 10.10 Show success message
- [ ] 10.11 Refetch accounts to show new account

### Future API Integration
- [ ] 10.12 Comment code with TODO: Replace with real API call
- [ ] 10.13 Document expected API request/response structure

## 11. UI Components - DisconnectAccountModal

### Component Creation
- [ ] 11.1 Create src/components/banking/DisconnectAccountModal.tsx
- [ ] 11.2 Accept account: BankAccount and isOpen, onClose as props
- [ ] 11.3 Show modal with confirmation message
- [ ] 11.4 Warn about data loss: "This will disconnect [Bank Name] account"
- [ ] 11.5 Explain: "You can reconnect anytime, but sync history may be lost"

### Actions
- [ ] 11.6 "Cancel" button to close modal
- [ ] 11.7 "Disconnect" button (destructive action, red color)
- [ ] 11.8 onClick handler calls disconnectBankAccount(accountId)
- [ ] 11.9 Show loading state during disconnection
- [ ] 11.10 Close modal on success
- [ ] 11.11 Show success message after disconnect

## 12. UI Components - AccountHealthStatus

### Component Creation
- [ ] 12.1 Create src/components/banking/AccountHealthStatus.tsx
- [ ] 12.2 Accept status: AccountStatus as prop
- [ ] 12.3 Display status badge with appropriate color
- [ ] 12.4 Status messages: "Active", "Needs Re-authentication", "Disconnected", "Error"
- [ ] 12.5 Optional: tooltip with more details

### Status Icons
- [ ] 12.6 Green checkmark icon for 'active'
- [ ] 12.7 Yellow warning icon for 'needs_reauth'
- [ ] 12.8 Red error icon for 'error'
- [ ] 12.9 Gray icon for 'disconnected'

## 13. UI Components - BankingOverview

### Component Creation
- [ ] 13.1 Create src/components/banking/BankingOverview.tsx
- [ ] 13.2 Summary card component
- [ ] 13.3 Display total bank accounts balance for current profile
- [ ] 13.4 Display total bookie balances (manual)
- [ ] 13.5 Display combined total betting bank
- [ ] 13.6 Show number of connected accounts
- [ ] 13.7 Show last sync time

### Visual Design
- [ ] 13.8 Card layout with sections
- [ ] 13.9 Large prominent total at top
- [ ] 13.10 Breakdown below (bank, bookie)
- [ ] 13.11 Use icons for visual distinction

## 14. UI Components - BasiqCallbackHandler

### Component Creation
- [ ] 14.1 Create src/components/banking/BasiqCallbackHandler.tsx
- [ ] 14.2 Extract query parameters: code, state from URL
- [ ] 14.3 Validate state matches expected value (CSRF protection)
- [ ] 14.4 Call completeBasiqConnection(code, state) function (mock)

### Mock OAuth Completion
- [ ] 14.5 Create completeBasiqConnection function (mock)
- [ ] 14.6 Simulate backend exchange: code → access token
- [ ] 14.7 Generate mock bank account data
- [ ] 14.8 Add account to current profile via ProfileProvider
- [ ] 14.9 Show success message
- [ ] 14.10 Redirect to /banking/accounts page

### Error Handling
- [ ] 14.11 Handle invalid or missing code parameter
- [ ] 14.12 Handle state mismatch (CSRF)
- [ ] 14.13 Show user-friendly error messages
- [ ] 14.14 Provide "Try Again" button

### Route Integration
- [ ] 14.15 Add /banking/callback route in App.tsx
- [ ] 14.16 Use BasiqCallbackHandler component for the route

## 15. Main Dashboard Integration

### Aggregated Bank Balance Display
- [ ] 15.1 Update src/features/core/dashboard/MainDashboard.tsx
- [ ] 15.2 Use useAllProfilesBankAccounts hook
- [ ] 15.3 Display total bank accounts balance across ALL profiles
- [ ] 15.4 Show in prominent dashboard card or metric

### Profile Breakdown
- [ ] 15.5 Show breakdown by profile with each profile's bank total
- [ ] 15.6 Visual indicator of which profiles have accounts connected
- [ ] 15.7 Show profile count: "3 profiles, 5 connected accounts"

### Quick Actions
- [ ] 15.8 Add "Connect More Accounts" quick action button
- [ ] 15.9 Link to /banking/accounts page

## 16. Security and Privacy UI

### Security Badges
- [ ] 16.1 Create BasiqSecurityBadge component
- [ ] 16.2 Display "Powered by Basiq" branding
- [ ] 16.3 Show "Bank-Grade Security" badge
- [ ] 16.4 Show "CDR Compliant" badge (Australian Consumer Data Right)

### Privacy Messaging
- [ ] 16.5 Add consent explanation before OAuth flow
- [ ] 16.6 Explain what data will be accessed: "Read-only access to account balances and transactions"
- [ ] 16.7 Link to privacy policy and Basiq terms of service
- [ ] 16.8 Show "You can disconnect anytime" reassurance

### Data Masking
- [ ] 16.9 Ensure account numbers are always masked (last 4 digits only)
- [ ] 16.10 Never log or display full account details in development

## 17. Error Handling and Edge Cases

### Connection Errors
- [ ] 17.1 Handle OAuth authorization denied by user
- [ ] 17.2 Handle OAuth timeout or network errors
- [ ] 17.3 Handle invalid or expired OAuth code
- [ ] 17.4 Show clear error messages with next steps

### Account Sync Errors
- [ ] 17.5 Handle failed balance refresh
- [ ] 17.6 Handle expired access tokens (needs re-auth)
- [ ] 17.7 Show appropriate error messages per account
- [ ] 17.8 Provide "Re-authenticate" action

### Profile Switching
- [ ] 17.9 Verify accounts filter correctly when switching profiles
- [ ] 17.10 Verify no data leakage between profiles
- [ ] 17.11 Test edge case: switch profile while on /banking/accounts page

### Empty States
- [ ] 17.12 Handle profile with no connected accounts
- [ ] 17.13 Handle all profiles with no accounts (main dashboard)
- [ ] 17.14 Handle loading states gracefully

## 18. Onboarding and First-Time User Experience

### Onboarding Flow
- [ ] 18.1 Create first-time onboarding component for /banking page
- [ ] 18.2 Explain benefits of connecting bank accounts
- [ ] 18.3 Show trust indicators (Basiq, security, CDR compliance)
- [ ] 18.4 Step-by-step guide: "1. Click Connect, 2. Choose bank, 3. Authenticate"

### Progressive Disclosure
- [ ] 18.5 Start with simple "Connect Account" button
- [ ] 18.6 Show additional features after first account connected
- [ ] 18.7 Tooltip or info icons explaining each feature

## 19. Responsive Design

### Mobile Optimization
- [ ] 19.1 Test all banking pages on mobile viewport (<768px)
- [ ] 19.2 Ensure bank account cards stack vertically on mobile
- [ ] 19.3 Make "Connect Account" button prominent and easy to tap
- [ ] 19.4 Simplify layout for small screens (hide non-essential info)

### Tablet Optimization
- [ ] 19.5 Test on tablet viewport (768px-1024px)
- [ ] 19.6 2-column grid for account cards on tablet
- [ ] 19.7 Optimize modal sizes for tablet

### Desktop Optimization
- [ ] 19.8 Test on desktop viewport (>1024px)
- [ ] 19.9 3-column grid for account cards on large screens
- [ ] 19.10 Use sidebar space efficiently

## 20. Testing and Verification

### Unit Testing (Optional)
- [ ] 20.1 Write tests for useBankAccounts hook
- [ ] 20.2 Write tests for bank account filtering logic
- [ ] 20.3 Write tests for balance calculation functions

### Integration Testing
- [ ] 20.4 Test OAuth flow end-to-end (mocked)
- [ ] 20.5 Test connecting multiple accounts to same profile
- [ ] 20.6 Test connecting accounts to different profiles
- [ ] 20.7 Test disconnecting an account

### Profile Switching Tests
- [ ] 20.8 Test bank account visibility when switching profiles
- [ ] 20.9 Verify no data leakage between profiles
- [ ] 20.10 Test balance totals recalculate correctly

### UI Tests
- [ ] 20.11 Test empty states (no accounts connected)
- [ ] 20.12 Test loading states (fetching accounts, refreshing)
- [ ] 20.13 Test error states (connection failed, sync failed)
- [ ] 20.14 Test success messages (account connected, disconnected)

### Data Aggregation Tests
- [ ] 20.15 Test main dashboard aggregation across all profiles
- [ ] 20.16 Verify breakdown by profile is accurate
- [ ] 20.17 Test with 0, 1, and multiple accounts per profile

### Responsive Tests
- [ ] 20.18 Test all pages on mobile, tablet, desktop
- [ ] 20.19 Verify touch interactions work on mobile
- [ ] 20.20 Test modals and dropdowns on all screen sizes

## 21. Documentation

### Code Documentation
- [ ] 21.1 Add JSDoc comments to BankAccount interface
- [ ] 21.2 Add JSDoc comments to useBankAccounts hook
- [ ] 21.3 Document mock OAuth flow functions
- [ ] 21.4 Document expected Basiq API integration points

### README Updates
- [ ] 21.5 Update banking section in README
- [ ] 21.6 Document mock data structure and customization
- [ ] 21.7 Explain profile-level bank account architecture
- [ ] 21.8 Document OAuth flow (current mock + future real implementation)

### Basiq Integration Guide
- [ ] 21.9 Create docs/basiq-integration.md
- [ ] 21.10 Document Basiq API endpoints to be used
- [ ] 21.11 Document OAuth flow requirements
- [ ] 21.12 Document CDR compliance requirements
- [ ] 21.13 List security considerations for backend implementation

## 22. Final Verification

### Build and Lint
- [ ] 22.1 Run npm run build and verify no errors
- [ ] 22.2 Run npm run lint and fix any issues
- [ ] 22.3 Run npm run type-check and verify TypeScript correctness

### Functionality Checklist
- [ ] 22.4 All banking pages display correctly
- [ ] 22.5 Bank accounts filter by active profile
- [ ] 22.6 Connect account flow works (mocked)
- [ ] 22.7 Disconnect account flow works
- [ ] 22.8 Refresh balances works
- [ ] 22.9 Main dashboard shows aggregated balances
- [ ] 22.10 Profile switcher updates bank account views
- [ ] 22.11 Empty states display correctly
- [ ] 22.12 Error handling works gracefully

### Security Checklist
- [ ] 22.13 Account numbers are always masked
- [ ] 22.14 No sensitive data logged or exposed
- [ ] 22.15 OAuth state validation implemented (CSRF protection)
- [ ] 22.16 Security badges and CDR compliance messaging displayed

### OpenSpec Compliance
- [ ] 22.17 Review against proposal.md requirements
- [ ] 22.18 Verify all scenarios in spec.md are met
- [ ] 22.19 Update design.md with any implementation decisions made
