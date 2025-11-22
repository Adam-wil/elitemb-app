# Frontend Capability Specification - Profile-Specific Bank Account Integration

## MODIFIED Requirements

### Requirement: Profile Data Model
The Profile interface SHALL be enhanced to include bank account relationships, balances, and financial tracking capabilities.

#### Scenario: Profile with connected bank accounts
- **WHEN** a profile has connected bank accounts
- **THEN** the profile SHALL include connectedBankAccounts array containing BankAccount objects
- **AND** the profile SHALL calculate totalBankBalance as sum of all connected account balances
- **AND** the profile SHALL include totalBookieBalance for manual bookie account balances
- **AND** the profile SHALL calculate totalBettingBank as sum of bank and bookie balances

### Requirement: Profile Provider Context
The ProfileProvider SHALL be enhanced with bank account management functions to support profile-specific account operations.

#### Scenario: Bank account queries by profile
- **WHEN** getBankAccountsForProfile(profileId) is called
- **THEN** it SHALL return array of BankAccount objects belonging to that profile only
- **AND** accounts from other profiles SHALL be excluded

#### Scenario: Bank account connection
- **WHEN** connectBankAccount(account) is called
- **THEN** the account SHALL be added to the specified profile's connectedBankAccounts array
- **AND** the profile's totalBankBalance SHALL be recalculated

#### Scenario: Bank account disconnection
- **WHEN** disconnectBankAccount(accountId) is called
- **THEN** the account SHALL be removed from the profile's connectedBankAccounts array
- **AND** the profile's totalBankBalance SHALL be recalculated

## ADDED Requirements

### Requirement: Bank Account Data Model
The application SHALL define a BankAccount interface representing a profile-specific bank account connection with all necessary metadata.

#### Scenario: Bank account structure
- **WHEN** a bank account is created
- **THEN** it SHALL include: id, profileId, bankName, accountName, accountNumber (masked), balance, currency, lastSynced, basiqConnectionId, and status
- **AND** profileId SHALL link the account to a specific betting profile
- **AND** accountNumber SHALL always be masked showing last 4 digits only

#### Scenario: Account status tracking
- **WHEN** a bank account has a status
- **THEN** status SHALL be one of: 'active', 'disconnected', 'error', or 'needs_reauth'
- **AND** status SHALL determine available actions and UI display

### Requirement: Mock Bank Account Data
The application SHALL provide realistic mock bank account data for development and testing purposes.

#### Scenario: Mock data initialization
- **WHEN** the application initializes in development mode
- **THEN** mock bank accounts SHALL be available for multiple profiles
- **AND** mock data SHALL include at least 3-5 accounts across different profiles
- **AND** data SHALL include realistic Australian banks (CBA, NAB, Westpac, ANZ, ING, ME, Bendigo, Bank of Queensland)

#### Scenario: Mock account creation
- **WHEN** mock account creation is triggered
- **THEN** a new account SHALL be generated with realistic data
- **AND** account SHALL be linked to the specified profileId
- **AND** balance SHALL be a random realistic amount (500-10000 AUD range)

### Requirement: useBankAccounts Custom Hook
The application SHALL provide a useBankAccounts hook for accessing bank accounts for the current active profile.

#### Scenario: Active profile accounts
- **WHEN** useBankAccounts hook is called
- **THEN** it SHALL return bank accounts for the currently active profile only
- **AND** it SHALL use activeProfileId from ProfileProvider context
- **AND** it SHALL filter accounts by matching profileId

#### Scenario: Account totals
- **WHEN** useBankAccounts hook is called
- **THEN** it SHALL calculate and return total balance across all accounts for active profile
- **AND** it SHALL return account count for the profile

### Requirement: useAllProfilesBankAccounts Hook
The application SHALL provide a useAllProfilesBankAccounts hook for aggregating bank accounts across all profiles for the main dashboard.

#### Scenario: All profiles aggregation
- **WHEN** useAllProfilesBankAccounts hook is called
- **THEN** it SHALL return all bank accounts from all user profiles
- **AND** it SHALL calculate total balance across all accounts and all profiles
- **AND** it SHALL group accounts by profile for breakdown display

### Requirement: Banking Accounts Page Enhancement
The /banking/accounts page SHALL display all bank accounts connected to the current active profile with connection and management capabilities.

#### Scenario: Account list display
- **WHEN** /banking/accounts page is accessed
- **THEN** it SHALL display all accounts for the currently active profile
- **AND** it SHALL show profile indicator "Profile: [Active Profile Name]"
- **AND** each account SHALL be displayed using BankAccountCard component
- **AND** total balance across all accounts SHALL be prominently displayed

#### Scenario: Connect new account action
- **WHEN** "Connect New Account" button is clicked
- **THEN** it SHALL initiate mock Basiq OAuth flow
- **AND** new account SHALL be linked to current active profile
- **AND** account list SHALL refresh to show the new account

#### Scenario: Refresh balances action
- **WHEN** "Refresh Balances" button is clicked
- **THEN** all accounts SHALL be refreshed via React Query refetch
- **AND** last synced timestamp SHALL update for each account
- **AND** loading indicator SHALL display during refresh

#### Scenario: Empty state
- **WHEN** current profile has no connected bank accounts
- **THEN** empty state component SHALL display
- **AND** SHALL show onboarding message explaining benefits
- **AND** SHALL display prominent "Connect with Basiq" button
- **AND** SHALL include security badges and CDR compliance messaging

### Requirement: Banking Balance Page Enhancement
The /banking/balance page SHALL display both automated bank account balances and manual bookie balances with clear visual distinction.

#### Scenario: Automated bank accounts section
- **WHEN** /banking/balance page is accessed
- **THEN** it SHALL display section titled "Bank Accounts (Automated)"
- **AND** SHALL show total bank balance for current profile
- **AND** SHALL list individual account balances from connected bank accounts

#### Scenario: Manual bookie balances section
- **WHEN** /banking/balance page is accessed
- **THEN** it SHALL display section titled "Bookie Accounts (Manual Entry)"
- **AND** SHALL show total manually entered bookie balances
- **AND** SHALL provide interface for manual balance entry

#### Scenario: Combined total
- **WHEN** both bank and bookie balances exist
- **THEN** page SHALL display "Total Betting Bank" combining both
- **AND** SHALL show breakdown: "X from bank accounts + Y from bookie accounts"
- **AND** visual distinction SHALL make automated vs manual clear (icons, colors, labels)

### Requirement: Banking Health Page Enhancement
The /banking/health page SHALL monitor and display connection health for all connected bank accounts of the current profile.

#### Scenario: Connection status monitoring
- **WHEN** /banking/health page is accessed
- **THEN** it SHALL display health status for each connected account
- **AND** SHALL show connection status: active, needs re-auth, disconnected, or error
- **AND** SHALL display days since last sync for each account

#### Scenario: Alerts for issues
- **WHEN** any account has connection issues
- **THEN** alert banner SHALL be displayed prominently
- **AND** accounts needing attention SHALL be highlighted
- **AND** SHALL indicate accounts not synced in >7 days

#### Scenario: Re-authentication action
- **WHEN** an account needs re-authentication
- **THEN** "Re-authenticate" button SHALL be displayed for that account
- **AND** clicking SHALL initiate OAuth re-authentication flow
- **AND** successful re-auth SHALL restore account to active status

### Requirement: BankAccountCard Component
The application SHALL provide a BankAccountCard component to display individual bank account details and status.

#### Scenario: Account display
- **WHEN** BankAccountCard is rendered
- **THEN** it SHALL display bank name and logo/icon
- **AND** it SHALL display account name
- **AND** it SHALL display masked account number (last 4 digits only)
- **AND** it SHALL display current balance with currency formatting
- **AND** it SHALL display last synced timestamp in relative time format
- **AND** it SHALL display connection status badge

#### Scenario: Account actions
- **WHEN** BankAccountCard is rendered
- **THEN** it SHALL provide "Refresh" action to manually sync balance
- **AND** it SHALL provide "Disconnect" action to remove account
- **AND** loading state SHALL display during refresh operation

#### Scenario: Status visualization
- **WHEN** account status is displayed
- **THEN** active status SHALL show green indicator
- **AND** needs_reauth status SHALL show yellow warning indicator
- **AND** error status SHALL show red error indicator
- **AND** disconnected status SHALL show gray inactive indicator

### Requirement: BankAccountList Component
The application SHALL provide a BankAccountList component to display multiple bank accounts in a responsive layout.

#### Scenario: Account list rendering
- **WHEN** BankAccountList receives accounts array
- **THEN** it SHALL render BankAccountCard for each account
- **AND** cards SHALL be arranged in responsive grid or list layout
- **AND** layout SHALL adapt to viewport size (mobile/tablet/desktop)

#### Scenario: Empty list handling
- **WHEN** accounts array is empty
- **THEN** empty state component SHALL be rendered
- **AND** appropriate message SHALL guide user to connect first account

#### Scenario: Loading state
- **WHEN** accounts are being fetched
- **THEN** loading skeleton SHALL be displayed
- **AND** skeleton SHALL indicate expected number of cards

### Requirement: ConnectAccountButton Component
The application SHALL provide a ConnectAccountButton component to initiate bank account connection via Basiq OAuth flow.

#### Scenario: Connection initiation
- **WHEN** ConnectAccountButton is clicked
- **THEN** it SHALL trigger initBasiqConnection function with current profileId
- **AND** loading state SHALL display during initialization
- **AND** for mock implementation, new account SHALL be added directly to profile

#### Scenario: Mock OAuth flow
- **WHEN** mock OAuth flow executes
- **THEN** it SHALL simulate realistic delay (500ms)
- **AND** it SHALL generate mock bank account data with realistic values
- **AND** account SHALL be linked to current profile
- **AND** success message SHALL be displayed
- **AND** account list SHALL refresh to show new account

### Requirement: DisconnectAccountModal Component
The application SHALL provide a DisconnectAccountModal component for confirming bank account disconnection.

#### Scenario: Disconnect confirmation
- **WHEN** DisconnectAccountModal is opened for an account
- **THEN** it SHALL display warning about disconnecting the account
- **AND** it SHALL explain potential data loss or sync history loss
- **AND** it SHALL show bank name and account details for confirmation

#### Scenario: Disconnect action
- **WHEN** user confirms disconnection
- **THEN** disconnectBankAccount function SHALL be called with accountId
- **AND** loading state SHALL display during disconnection
- **AND** modal SHALL close on success
- **AND** success message SHALL be displayed
- **AND** account SHALL be removed from profile's account list

#### Scenario: Cancel action
- **WHEN** user clicks "Cancel"
- **THEN** modal SHALL close without making changes
- **AND** account SHALL remain connected

### Requirement: AccountHealthStatus Component
The application SHALL provide an AccountHealthStatus component to visually indicate connection health.

#### Scenario: Health status display
- **WHEN** AccountHealthStatus renders with a status
- **THEN** 'active' status SHALL display green checkmark icon and "Active" label
- **AND** 'needs_reauth' status SHALL display yellow warning icon and "Needs Re-authentication" label
- **AND** 'error' status SHALL display red error icon and "Error" label
- **AND** 'disconnected' status SHALL display gray icon and "Disconnected" label

#### Scenario: Additional information
- **WHEN** status is displayed
- **THEN** optional tooltip MAY provide additional details about the status
- **AND** relative time since last sync MAY be included in the display

### Requirement: BankingOverview Component
The application SHALL provide a BankingOverview component for summarizing banking financial status.

#### Scenario: Summary display
- **WHEN** BankingOverview is rendered
- **THEN** it SHALL display total bank accounts balance for current profile
- **AND** it SHALL display total manually entered bookie balances
- **AND** it SHALL display combined total betting bank
- **AND** it SHALL show number of connected accounts
- **AND** it SHALL show last sync time

#### Scenario: Visual hierarchy
- **WHEN** overview is displayed
- **THEN** combined total SHALL be most prominent
- **AND** breakdown (bank vs bookie) SHALL be clearly visible
- **AND** icons SHALL distinguish automated vs manual balances

### Requirement: Basiq OAuth Callback Handler
The application SHALL handle Basiq OAuth callback at /banking/callback route to complete bank account connection.

#### Scenario: OAuth callback processing
- **WHEN** user is redirected to /banking/callback with code and state parameters
- **THEN** BasiqCallbackHandler SHALL extract code and state from URL query
- **AND** SHALL validate state matches stored value (CSRF protection)
- **AND** SHALL call completeBasiqConnection function with code, state, and profileId

#### Scenario: Mock connection completion
- **WHEN** completeBasiqConnection executes (mock)
- **THEN** it SHALL simulate backend OAuth token exchange
- **AND** it SHALL generate mock bank account data
- **AND** account SHALL be added to current profile via ProfileProvider
- **AND** success message SHALL be displayed
- **AND** user SHALL be redirected to /banking/accounts page

#### Scenario: OAuth error handling
- **WHEN** callback has invalid or missing code parameter
- **THEN** error message SHALL be displayed
- **AND** user SHALL be provided "Try Again" option
- **WHEN** state parameter doesn't match stored value
- **THEN** CSRF error SHALL be displayed
- **AND** connection attempt SHALL be rejected

### Requirement: Main Dashboard Bank Balance Aggregation
The main dashboard (/) SHALL display aggregated bank account balances across all user profiles.

#### Scenario: Aggregated balance display
- **WHEN** main dashboard is accessed
- **THEN** it SHALL display total bank accounts balance across ALL profiles
- **AND** shall use useAllProfilesBankAccounts hook for data
- **AND** total SHALL be prominently displayed in a dashboard card or metric

#### Scenario: Profile breakdown
- **WHEN** aggregated balance is displayed
- **THEN** breakdown by profile SHALL be shown
- **AND** each profile's bank total SHALL be listed
- **AND** visual indicator SHALL show which profiles have accounts connected
- **AND** profile count and account count SHALL be displayed (e.g., "3 profiles, 5 connected accounts")

#### Scenario: Quick actions
- **WHEN** bank balance section is displayed on main dashboard
- **THEN** "Connect More Accounts" button or link SHALL be available
- **AND** clicking SHALL navigate to /banking/accounts page

### Requirement: Profile-Specific Bank Account Filtering
All banking pages SHALL filter bank accounts by the current active profile to ensure data isolation.

#### Scenario: Active profile filtering
- **WHEN** a banking page loads
- **THEN** it SHALL use activeProfileId from ProfileContext
- **AND** only accounts where account.profileId === activeProfileId SHALL be displayed
- **AND** accounts from other profiles SHALL be hidden

#### Scenario: Profile switching
- **WHEN** user switches to a different profile while on a banking page
- **THEN** displayed accounts SHALL immediately update to show new profile's accounts
- **AND** React Query SHALL refetch with new profileId query key
- **AND** balances SHALL recalculate for new profile
- **AND** no data from previous profile SHALL be visible

#### Scenario: Data isolation verification
- **WHEN** accessing any banking feature
- **THEN** there SHALL be no data leakage between profiles
- **AND** bank accounts SHALL be strictly filtered by profileId
- **AND** aggregated views SHALL properly separate data by profile

### Requirement: Security and Privacy Measures
The application SHALL implement security and privacy measures for sensitive bank account data.

#### Scenario: Account number masking
- **WHEN** any account number is displayed
- **THEN** only the last 4 digits SHALL be shown
- **AND** format SHALL be "****1234" (masked prefix)
- **AND** full account number SHALL never be displayed in UI
- **AND** full account number SHALL never be logged

#### Scenario: OAuth CSRF protection
- **WHEN** initiating OAuth flow
- **THEN** unique state parameter SHALL be generated
- **AND** state SHALL be stored in sessionStorage before redirect
- **WHEN** OAuth callback is received
- **THEN** returned state SHALL be validated against stored value
- **AND** mismatched state SHALL reject the connection (CSRF attack prevention)

#### Scenario: Security messaging
- **WHEN** user is about to connect a bank account
- **THEN** security badges SHALL be displayed (Basiq branding, bank-grade security, CDR compliant)
- **AND** consent explanation SHALL describe what data will be accessed
- **AND** "Read-only access to account balances" SHALL be clearly stated
- **AND** "You can disconnect anytime" reassurance SHALL be provided
- **AND** links to privacy policy and Basiq terms SHALL be available

### Requirement: Automated vs Manual Balance Visual Distinction
The application SHALL provide clear visual distinction between automated bank balances and manual bookie balances.

#### Scenario: Visual indicators
- **WHEN** bank balances are displayed
- **THEN** "Automated" label or icon SHALL indicate bank accounts
- **AND** bank section SHALL use distinct color accent (e.g., blue)
- **WHEN** bookie balances are displayed
- **THEN** "Manual Entry" label or icon SHALL indicate bookie accounts
- **AND** bookie section SHALL use different color accent (e.g., orange)

#### Scenario: Section separation
- **WHEN** both balance types are shown on same page
- **THEN** they SHALL be in clearly separated sections or cards
- **AND** icons SHALL distinguish the types (🏦 for bank, 📊 for bookie)
- **AND** users SHALL not confuse automated with manual balances

### Requirement: Empty States and Onboarding
The application SHALL provide helpful empty states and onboarding when no bank accounts are connected.

#### Scenario: First-time user empty state
- **WHEN** user accesses /banking/accounts with no connected accounts
- **THEN** empty state component SHALL display
- **AND** SHALL explain benefits: "Connect your betting bank account to track balances automatically"
- **AND** SHALL list benefits: real-time balance updates, transaction history, cash flow tracking
- **AND** SHALL show "Powered by Basiq" branding
- **AND** SHALL show "Bank-Grade Security" and "CDR Compliant" badges
- **AND** prominent "Connect with Basiq (Secure Australian Open Banking)" button SHALL be displayed

#### Scenario: Onboarding guidance
- **WHEN** empty state is shown
- **THEN** step-by-step guide SHALL be provided
- **AND** steps SHALL be: "1. Click Connect, 2. Choose your bank, 3. Authenticate, 4. Done"
- **AND** trust indicators SHALL reassure user about security

### Requirement: Responsive Banking UI
All banking pages and components SHALL be responsive and work on mobile, tablet, and desktop viewports.

#### Scenario: Mobile viewport
- **WHEN** banking pages are viewed on mobile (<768px)
- **THEN** bank account cards SHALL stack vertically
- **AND** "Connect Account" button SHALL be easily tappable (minimum 44px touch target)
- **AND** modals SHALL be full-width or optimized for small screens
- **AND** unnecessary information SHALL be hidden to simplify layout

#### Scenario: Tablet viewport
- **WHEN** banking pages are viewed on tablet (768px-1024px)
- **THEN** account cards SHALL display in 2-column grid
- **AND** navigation and actions SHALL be accessible
- **AND** modals SHALL be appropriately sized

#### Scenario: Desktop viewport
- **WHEN** banking pages are viewed on desktop (>1024px)
- **THEN** account cards SHALL display in 3-column grid
- **AND** all information and actions SHALL be visible
- **AND** layout SHALL use available space efficiently

### Requirement: Mock Data Preparation for API Integration
Mock implementation SHALL be designed for easy replacement with real Basiq API integration.

#### Scenario: API integration markers
- **WHEN** mock functions are implemented
- **THEN** TODO comments SHALL mark where real API calls will replace mocks
- **AND** expected API request format SHALL be documented in comments
- **AND** expected API response format SHALL be documented in comments

#### Scenario: Mock to real API swap
- **WHEN** backend Basiq integration is ready
- **THEN** mock functions SHALL be easily replaceable with real API calls
- **AND** data structures SHALL match expected API response shapes
- **AND** minimal frontend changes SHALL be required for integration
