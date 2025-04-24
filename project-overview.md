# Project Overview

This is a [Next.js](https://nextjs.org) project using [React](https://react.dev) and [TypeScript](https://www.typescriptlang.org).

## IMPORTANT RULES:

### NEVER MODIFY SERVER STATE!
- DO NOT start development server
- DO NOT stop running server
- DO NOT restart server
- DO NOT run commands that affect server state

## Key Files and Directories

- **Dependencies**: Defined in `package.json`.
- **Next.js Config**: Configuration for Next.js can be found in `next.config.js`.
- **TypeScript Config**: TypeScript settings are in `tsconfig.json`.
- **Styling**: Uses [Tailwind CSS](https://tailwindcss.com). Configuration is in `tailwind.config.ts` and PostCSS config is in `postcss.config.js`. Global styles are in `app/globals.css`.
- **Routing & Pages**: The application structure follows the Next.js App Router pattern, located in the `app/` directory. The main entry point is `app/page.tsx`.
- **UI Components**: Reusable UI components are located in the `components/` directory. The project uses `shadcn/ui` conventions.
- **Utilities**: Helper functions and utilities are in the `lib/` directory.
- **Hooks**: Custom React hooks are defined in the `hooks/` directory.
- **Logging**: Application logging is set up with `pino` in `lib/logger.ts`. 