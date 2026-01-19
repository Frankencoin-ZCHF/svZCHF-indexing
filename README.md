# svZCHF Indexing

A blockchain indexing service for svZCHF (Frankencoin savings token) built with [Ponder](https://ponder.sh/).

## Overview

This project indexes svZCHF-related events and transactions on the blockchain, providing structured data access for applications and analytics.

## Getting Started

### Prerequisites
- Node.js 18.14 or higher

### Installation
```bash
yarn install
```

### Development
```bash
yarn dev
```

### Commands
- `yarn dev` - Start development server
- `yarn start` - Start production server
- `yarn db` - Database operations
- `yarn codegen` - Generate code from schema
- `yarn lint` - Lint code
- `yarn typecheck` - Type checking

### Scripts

**Data Export:**
- `yarn tsx scripts/format-exports.ts` - Format and export data to CSV

**Charts Generation:**
- `yarn tsx scripts/create-charts.ts` - Generate visualization charts (PNG) from exported data

  Generates 8 charts in `/exports`:
  1. Price Over Time
  2. Accumulative vs Native Yield Comparison
  3. Daily Net Flow
  4. Total Assets Growth
  5. Transaction Volume
  6. Accumulated Volume Over Time
  7. Activity Heatmap
  8. Cumulative Growth Dashboard

- `yarn tsx scripts/rolling-yield.ts` - Generate rolling 30-day annualized yield charts

  Generates 2 charts:
  1. **Rolling 30-Day vs Native Yield** - Comparison chart
  2. **Rolling 30-Day Yield with Net Volume** - Combined dual-axis chart showing yield and net flow bars

  Calculates rolling 30-day yield based on actual price changes and timestamps:
  - Uses a sliding 30-day window
  - Filters to include only days with actual data
  - Annualizes based on actual time elapsed (not assumed 30 days)
  - Shows correlation between yield performance and capital flows

## Technology Stack
- **Ponder** - Blockchain indexing framework
- **Hono** - Web framework for APIs
- **Viem** - Ethereum client library
- **TypeScript** - Type-safe JavaScript