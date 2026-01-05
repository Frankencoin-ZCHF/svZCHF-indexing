# svZCHF Indexing

A blockchain indexing service for svZCHF (Frankencoin savings token) built with [Ponder](https://ponder.sh/).

## Overview

This project indexes svZCHF-related events and transactions on the blockchain, providing structured data access for applications and analytics.

## Getting Started

### Prerequisites
- Node.js 18.14 or higher

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Commands
- `npm run dev` - Start development server
- `npm run start` - Start production server
- `npm run db` - Database operations
- `npm run codegen` - Generate code from schema
- `npm run lint` - Lint code
- `npm run typecheck` - Type checking

## Technology Stack
- **Ponder** - Blockchain indexing framework
- **Hono** - Web framework for APIs
- **Viem** - Ethereum client library
- **TypeScript** - Type-safe JavaScript