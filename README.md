# Stellar Integration Project

## About the Project
This project is an integration module for working with the Stellar blockchain. The module allows managing Stellar account data through transactions, including adding and modifying data entries on the blockchain.

Key features:
- Tag management (TagBelgrade, TagProgrammer, and others)
- MyPart records management
- Stellar transaction building and verification
- SEP-0007 URI generation
- Full integration with Stellar wallets

## Technologies
- **Next.js** - React framework for web applications
- **React** - UI library
- **TypeScript** - Typed JavaScript
- **Stellar SDK** - SDK for Stellar blockchain integration
- **shadcn/ui** - Component library based on Radix UI
- **Tailwind CSS** - Utility-first CSS framework
- **Zod** - Schema validation library
- **React Hook Form** - Form management library
- **Bun** - JavaScript runtime & package manager

## Project Structure
- `lib/stellar/` - Stellar integration modules
- `app/` - Next.js application directory
- `components/` - Reusable React components
- `hooks/` - Custom React hooks

## How to Run

### Prerequisites
- Bun (JavaScript runtime & package manager)

### Installing Dependencies
```bash
bun install
```

### Local Development
```bash
bun dev
```

The application will be available at `http://localhost:3000`.

### Production Build
```bash
bun run build
bun start
```

## Environment Variables
- `NEXT_PUBLIC_STELLAR_NETWORK_TYPE` - Stellar network type: 'TESTNET' for test network or 'PUBLIC' for main network (MAINNET). Defaults to PUBLIC.

## License
MIT
