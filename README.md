# The Edge - Matched Betting Platform

A centralized matched betting platform designed to help users better manage their money and scale their betting operations through comprehensive cash flow tracking, bet management, and planning tools.

## Project Overview

The Edge provides a complete solution for organizing and growing a profitable matched betting business, with a focus on horse racing operations. The platform tracks all betting-related cash flow in one place, including bookmaker balances, bank account balances, and profit/loss across all activities.

## Core Value Proposition

- **Centralized Money Management**: Track all betting-related cash flow in one place across multiple profiles and bookmakers
- **Comprehensive Bet Tracking**: Monitor every bet placed with automated population via Telegram tips and race results APIs
- **Daily Planning & Organization**: Plan daily bets in advance for strategic and organized betting decisions
- **Operational Scaling**: Manage multiple profiles, bookmakers, and betting strategies simultaneously

## Platform Architecture

### Modular Subscription Model

**Core Platform** (Free - Available to all users):
- Main Dashboard with multi-profile cumulative view
- Profile Management for creating and managing multiple betting profiles
- Banking Section:
  - Real-time bank account balances via Basiq Open Banking integration
  - Bookmaker balance tracking
  - Bookmaker health monitoring

**Furlong Module** (Paid Subscription - Horse Racing):
- Racing P&L Dashboard for profitability tracking
- Planner for daily racing bet planning
- Tracker with auto-population via Telegram User Client API
- Promo Tracker for monitoring promotional offers
- Non-Promo Turnover tracking
- Under the Radar betting opportunities
- Racing Bookmaker List management

**Sports System Module** (Future):
- Separate paid subscription
- To be developed in future phases

## Key Features

### Money Management
- Live bank account balance updates via Basiq Open Banking (CDR-compliant)
- Real-time bookmaker balance tracking
- Complete visibility of cash flow between banks and bookmakers
- Multi-account and multi-profile cash flow tracking

### Automation
- Automated race results via Punters Form API
- Automated tip delivery via Telegram User Client API
- Real-time bet tracking updates
- Reduced manual data entry

### Organization
- Daily bet planning in advance
- Systematic tracking of all betting activity
- Multi-profile management for scaling operations
- Comprehensive profit/loss analysis

## Technology Stack

### Frontend
- React 18+ with TypeScript
- Vite build tool
- React Query for server state management
- Redux for client state management
- React Router v6 with protected module routes
- Tailwind CSS for styling
- Playwright for E2E testing
- Vitest for unit testing

### Backend
- Node.js 18+ LTS
- Express API framework
- TypeScript with strict mode
- Supabase (PostgreSQL, Auth, Real-time, Row Level Security)
- Module-based access control middleware
- Jest/Vitest for testing

### External Integrations
- **Basiq API**: Australian CDR-compliant Open Banking for bank account integration
- **Punters Form API**: Automated race results retrieval (Furlong module)
- **Telegram User Client API**: Real-time tip delivery from tipping channels (Furlong module)

## Project Structure

```
the-edge/
├── 01_Frontend/       # React + TypeScript + Vite
│   └── src/
│       ├── features/
│       │   ├── core/      # Dashboard, Banking, Profiles (free)
│       │   └── modules/   # Furlong, Sports (subscription-gated)
│       ├── components/
│       ├── hooks/
│       └── guards/        # Module access guards
│
└── 02_Backend/        # Node.js + Express + TypeScript
    └── src/
        ├── api/
        │   ├── routes/
        │   ├── controllers/
        │   └── middleware/    # Module access control
        └── services/
            ├── supabase/
            └── integrations/  # Basiq, Punters Form, Telegram
```

## Domain Context

### Matched Betting
Matched betting is a betting strategy that covers all outcomes using bookmaker promotions to guarantee profit. The platform helps users:
- Track qualifying bets to unlock promotional offers
- Manage free bet promotions efficiently
- Calculate profit across lay and back bets
- Monitor promotion profitability ratings

### Cash Flow Management
- **Betting Bank**: Dedicated funds allocated for betting operations
- **Bookie Balance Tracking**: Real-time monitoring of funds with each bookmaker
- **Bank Account Integration**: Live balance updates from connected accounts
- **Cash Flow Visibility**: Complete view of money movement and available funds

## Module Access Control

The platform uses a flexible à la carte subscription model:
- Users purchase modules individually based on betting activities
- Core platform features are always accessible
- Module permissions enforced at both frontend (UI/routing) and backend (API) levels
- Each module has independent billing and subscription management

## Development Status

This project is currently in the HorseSystem branch development phase, focusing on the Furlong module foundation and core platform architecture.

## Getting Started

Documentation for setup and development will be added as the project progresses.

## Contributing

Development follows strict git guidelines and conventional commit formats. See project documentation for contribution standards.

## License

License information to be determined.

---

**Note**: This is an active development project built for matched betting operations in horse racing with plans to expand to sports betting.
