# Integration Tests

This directory contains integration tests for the refactored form architecture.

## Test Structure

### `/integration/`
- `CorporateForm.test.tsx` - Tests for corporate form functionality
- `ParticipantForm.test.tsx` - Tests for participant form functionality  
- `ConfigurableForm.test.tsx` - Tests for the universal configurable form component
- `hooks.test.tsx` - Tests for form hooks (useFormBuilder, etc.)

## Test Coverage

### CorporateForm Tests
- ✅ Form rendering with all sections
- ✅ Field validation
- ✅ MyParts dynamic array handling
- ✅ Transaction generation
- ✅ SEP-0007 integration
- ✅ MMWB Telegram integration
- ✅ Copy to clipboard functionality

### ParticipantForm Tests  
- ✅ Form rendering with participant-specific sections
- ✅ Participant configuration fields
- ✅ PartOf dynamic array handling
- ✅ Time token fields
- ✅ Field deletion (null values)
- ✅ Account data loading

### ConfigurableForm Tests
- ✅ Configuration-driven rendering
- ✅ Dynamic field types (text, boolean, dynamic-array, tags)
- ✅ Form validation
- ✅ Transaction generation
- ✅ Form reset functionality

### Hooks Tests
- ✅ useFormBuilder initialization
- ✅ Form submission handling
- ✅ Account data loading
- ✅ Clipboard operations
- ✅ Telegram integration
- ✅ Error handling

## Running Tests

```bash
# Run all tests
npm run test

# Run integration tests only
npm run test:integration

# Run tests in watch mode
npm run test:watch
```

## Test Environment

- **Testing Framework**: Bun Test
- **DOM Environment**: Happy DOM
- **Testing Utilities**: React Testing Library
- **Mocking**: Bun's built-in mock system

## Key Testing Patterns

### 1. Mock External Dependencies
```typescript
const mockFetchAccountDataAttributes = mock(() => Promise.resolve({}));
mock.module('../../lib/stellar/account', () => ({
  fetchAccountDataAttributes: mockFetchAccountDataAttributes,
}));
```

### 2. User Interaction Testing
```typescript
const user = userEvent.setup();
await user.type(screen.getByLabelText(/Name/i), 'Test Name');
await user.click(screen.getByRole('button', { name: /submit/i }));
```

### 3. Async Behavior Testing
```typescript
await waitFor(() => {
  expect(mockGenerateStellarTransaction).toHaveBeenCalled();
});
```

### 4. Form State Testing
```typescript
expect(screen.getByLabelText(/Name/i)).toHaveValue('Test Name');
```

## What These Tests Verify

1. **UI Consistency** - All forms render correctly with expected sections and fields
2. **Functional Behavior** - Form submission, validation, and data processing work as expected
3. **Integration Points** - Stellar SDK, Telegram bot, clipboard API integrations function properly
4. **Error Handling** - Forms gracefully handle network errors, validation errors, and edge cases
5. **Architecture Integrity** - Configuration-driven approach works correctly across different form types
6. **Data Flow** - Account data loading, form population, and transaction generation flow properly

These tests serve as:
- **Regression Prevention** - Catch breaking changes during future development
- **Documentation** - Demonstrate expected behavior and usage patterns
- **Confidence** - Ensure refactored architecture maintains all original functionality