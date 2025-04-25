# Testing React Components with Bun, Happy DOM, and Testing Library

This guide outlines the setup for testing React components using `bun test` integrated with Happy DOM and React Testing Library.

## 1. Install Dependencies

Install the necessary development dependencies:

```bash
bun add -D @happy-dom/global-registrator @testing-library/react @testing-library/dom @testing-library/jest-dom
```

- `@happy-dom/global-registrator`: Provides a mock browser environment (DOM).
- `@testing-library/react`: Utilities for testing React components.
- `@testing-library/dom`: Core DOM testing utilities.
- `@testing-library/jest-dom`: Custom Jest matchers for DOM testing (`.toBeInTheDocument()`, etc.).

## 2. Create Preload Scripts

Preload scripts run before your tests execute.

### `happydom.ts`

This script registers the Happy DOM environment globally.

```typescript
// happydom.ts
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();
```

### `testing-library.ts`

This script extends Bun's `expect` with `@testing-library/jest-dom` matchers and optionally sets up automatic DOM cleanup after each test.

```typescript
// testing-library.ts
import { afterEach, expect } from 'bun:test';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Bun's expect with Testing Library matchers
expect.extend(matchers);

// Optional: Clean up JSDOM after each test
afterEach(() => {
  cleanup();
});
```

## 3. Configure `bunfig.toml`

Tell Bun to use the preload scripts. Create or update `bunfig.toml` in your project root:

```toml
# bunfig.toml
[test]
preload = ["./happydom.ts", "./testing-library.ts"] # Adjust paths if necessary
```

## 4. Configure TypeScript (Optional)

If using TypeScript, create a type definition file (`.d.ts`) to make TypeScript aware of the new Jest DOM matchers added to `expect`.

```typescript
// matchers.d.ts (or any .d.ts file included in your tsconfig)
import { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import { Matchers, AsymmetricMatchers } from 'bun:test';

declare module 'bun:test' {
  // Extend Bun's built-in Matchers interface
  interface Matchers<T>
    extends TestingLibraryMatchers<typeof expect.stringContaining, T> {}

  // Extend Bun's AsymmetricMatchers interface if needed
  interface AsymmetricMatchers extends TestingLibraryMatchers<any, any> {} // Use 'any' or more specific types if known
}

// Ensure this file is included in your tsconfig.json "include" array
```

*Note:* The specific types for `AsymmetricMatchers` might need adjustment based on exact usage. Using `any` provides broad compatibility.


## 5. Write Tests

You can now write tests using React Testing Library functions (`render`, `screen`, `fireEvent`, etc.) and Jest DOM matchers.

```typescript
// components/MyComponent.spec.tsx
import { describe, test, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'; // Import is technically not needed due to preload, but good practice for clarity
import { MyComponent } from './MyComponent'; // Adjust import path

describe('MyComponent', () => {
  test('renders correctly', () => {
    render(<MyComponent />);
    const element = screen.getByText(/Hello World/i); // Example query
    expect(element).toBeInTheDocument();
  });

  // Add more tests...
});
```

## 6. Run Tests

Execute your tests using the Bun command:

```bash
bun test
``` 