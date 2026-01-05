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
- `yarn tsx scripts/format-exports.ts` - Format and export data to CSV

## Technology Stack
- **Ponder** - Blockchain indexing framework
- **Hono** - Web framework for APIs
- **Viem** - Ethereum client library
- **TypeScript** - Type-safe JavaScript