# Change: Main Dashboard with Match Betting KPI Analytics

## Why

Users need a centralized "command center" providing a quick snapshot of their entire matched betting operation across all profiles. The Main Dashboard (/) serves as the landing page and primary value proposition of The Edge - seeing all betting operations in one view with sophisticated Key Performance Indicators (KPIs) that measure success.

**Current gaps:**
- No aggregated view across multiple profiles
- No centralized KPI dashboard showing critical match betting metrics
- Users cannot quickly assess overall profitability and performance
- No educational system explaining what metrics matter and why
- Individual profile dashboards exist but lack overview perspective

**Match betting success requires:**
- **Profit on Turnover (PoT) tracking** - The #1 metric for match betting success
- **NonPromo vs Promo distinction** - Understanding qualifying bets (expenses) vs promotional bets (income)
- **Ratio monitoring** - Balancing qualifying bet expenses against promotional bet income
- **Bonus turnover tracking** - Measuring volume of promotional opportunities
- **System-following discipline** - HAUS metric tracks adherence to The Horse System
- **Aggregated visibility** - Seeing performance across all betting profiles at once

This dashboard transforms raw betting data into actionable insights with educational tooltips explaining each metric's calculation and meaning.

## What Changes

### Dashboard Page Structure
- Enhance existing DashboardPage (/) as primary landing page
- Aggregates data from ALL user profiles
- "Quick snapshot" design philosophy - grasp overall performance in 5 seconds
- Detailed analytics remain in individual profile dashboards (/furlong/dashboard)

### Top Metrics Overview (4 Cards)
1. **Total Profit** - Dollar amount with bet count subtitle
2. **Average Profit/Bet** - Per completed bet metric
3. **Total Bonus Turnover** - Sum of all promo bets staked (key volume metric)
4. **Active Bookmakers** - Count across all bet types and profiles

### Visual Charts (4 Charts using Recharts)
1. **Cumulative Profit Chart** - Line chart with filled area showing profit trend over time (30 days)
2. **Bet Type Distribution** - Donut chart with 10 categories (Racing, Horse System, Sport, Sport System, Deposit Bonus, NP Racing, NP Sport, NP Sport System, Promo Bets, Bonus Bets)
3. **Profit Breakdown Chart** - Bar chart showing profit/loss by bet category with color coding
4. **Bookmaker Performance** - Horizontal bar chart showing profit/loss per bookmaker

### Key Performance Indicators (9 KPIs in 3x3 Grid)

**Row 1 - Bonus & Deposit Metrics:**
- **Bonus Turnover %** - Lifelong bonus turnover percentage
- **Deposit Bonus Accumulated** - Total profit from deposit bonuses
- **NonPromo:Promo Ratio** - Dollars staked on qualifying bets vs promotional bets (higher = more expenses)

**Row 2 - Non-Promo Analysis:**
- **Sport:Horse NonPromo Ratio** - Sport non-promo bets vs horse non-promo bets distribution
- **Horse Non Promo PoT** - Loss per dollar on qualifying horse bets (expected negative - this is expense)
- **Horse Promo Turnover** - Total dollars staked on horse promotional bets

**Row 3 - Promo Performance & System Metrics:**
- **Horse Promo PoT** - Profit per dollar on horse promo bets (expected positive - this is income)
- **Horse System HAUS Metric** - Dollar profit per unit for Horse System following (measures discipline)
- **Total Betting Bank** - Sum of all bank accounts and bookie balances across all profiles

**Each KPI Card includes:**
- Title and calculated value
- Subtitle for context
- Info icon with tooltip showing:
  - "What this is telling us" - Business interpretation
  - "How it's calculated" - Calculation methodology
  - "Data source" - Where the data comes from
- Optional trend indicator (up/down from previous period)
- Color coding (green for good, red for warning, neutral for informational)

### Profile Overview Table
- Shows snapshot of each profile: Name, P&L, Bets This Week, Bonus Turnover This Week
- Sortable columns
- Click row to switch profile and navigate to /furlong/dashboard
- Shows top 5 profiles with "View All" link

### Cash Flow Summary Card
- Total Bank Accounts (from Basiq integration)
- Total Bookie Balances (manual entry)
- Total Betting Bank (combined)
- Pending Bets Value
- Available Funds
- Last Updated timestamp
- "Update Balances" quick action

### Mock Data Infrastructure
- Realistic match betting data generator
- 10 bet type categories with proper distribution
- Both positive and negative PoT values (NonPromo negative, Promo positive)
- Varying ratios depending on the bookmaker (NonPromo:Promo typically 1:1.5 to 1:3)
- Sport vs Horse distribution
- Horse System unit tracking (manual input)
- Deposit bonus accumulation over time
- Multiple profiles with different betting patterns
- 30+ days of cumulative profit data

### Component Architecture
Create `src/components/dashboard/` with:
- `MetricCard.tsx` - Reusable top metric display
- `KPICard.tsx` - Specialized KPI card with tooltip system
- `KPIGrid.tsx` - 3x3 grid layout for KPI cards
- `KPITooltip.tsx` - Educational tooltip explaining calculations
- `CumulativeProfitChart.tsx` - Line chart component
- `BetTypeDistribution.tsx` - Donut chart component
- `ProfitBreakdownChart.tsx` - Bar chart component
- `BookmakerPerformance.tsx` - Horizontal bar chart component
- `ProfileSnapshotsTable.tsx` - Profile overview table
- `CashFlowSummary.tsx` - Cash flow card component

### Educational Tooltip System
- Every KPI has detailed explanation
- Explains "what good looks like" for each metric
- Transparent calculation methodology
- Links to data source tabs/pages
- Helps users understand match betting economics:
  - NonPromo losses are EXPECTED (qualifying expenses)
  - Promo profits are GOAL (where actual profit comes from)
  - Ratios help balance expenses vs income
  - PoT is the ultimate success metric

## Impact

- Affected specs: `frontend` (adds new Main Dashboard capability)
- Affected code:
  - Enhances existing DashboardPage (/) or creates new comprehensive dashboard
  - Creates 11+ dashboard-specific components
  - Adds sophisticated KPI calculation utilities
  - Integrates with ProfileProvider for multi-profile aggregation
  - Integrates with banking data from Basiq integration
  - Creates mock match betting data generator
- Dependencies:
  - Builds on add-multi-profile-subscription-architecture (ProfileProvider, multi-profile support)
  - Builds on add-profile-banking-basiq-integration (Total Betting Bank KPI)
  - Uses Recharts library for all charts (install if not present)
  - Requires Furlong module data structure (bets, results, categories)
- Breaking changes: None (creates new dashboard, doesn't modify existing)
- User value:
  - **Quick snapshot** - Understand entire betting operation in seconds
  - **Sophisticated analytics** - 9 KPIs measure match betting success
  - **Education** - Tooltips explain what metrics mean and how to improve
  - **Aggregation** - See performance across all profiles in one view
  - **Profitability focus** - PoT metrics show true return on investment
  - **System tracking** - HAUS metric measures Horse System following discipline
