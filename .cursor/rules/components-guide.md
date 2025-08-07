---
alwaysApply: true
---

# Component Usage and Development Guide

## Component Architecture Overview

The project follows a **configuration-driven architecture** with three component layers:

### 1. UI Components (`components/ui/`)
- **Purpose**: Base reusable UI primitives based on shadcn/ui
- **Examples**: Button, Input, Card, Dialog, Form
- **Usage**: Building blocks for higher-level components
- **Styling**: Pre-styled with Tailwind CSS and design tokens

### 2. Form Components (`components/form/`)
#### Atomic Components (`components/form/fields/`)
- **ByteLimitedInput**: Text input with byte limit validation
- **StellarAccountInput**: Specialized input for Stellar account IDs
- **DynamicFieldArray**: Array of repeatable form fields
- **TagSelectorField**: Tag selection with validation
- **FormFieldWrapper**: Generic wrapper for custom form controls

#### Composite Components (`components/form/composite/`)
- **BaseForm**: Complete form wrapper with submission logic
- **FieldGroup**: Grouped form sections with icons and collapsing
- **AccountDataLoader**: Stellar account data loading interface
- **TransactionResult**: Transaction display and interaction component

#### Master Component
- **ConfigurableForm**: Renders complete forms from configuration objects

### 3. Application Components (`components/`)
- **Legacy Components**: `*FormLegacy.tsx` (1000+ lines, being phased out)
- **Test Components**: `*Test.tsx` (for development and testing)
- **Production Components**: Slim wrappers using ConfigurableForm

## Current Usage Patterns in App

### Main Routes
- `/participant` → Uses `ParticipantForm` → `ParticipantFormSlim` → `ConfigurableForm`
- `/corporate` → Uses `CorporateForm` → `CorporateFormSlim` → `ConfigurableForm`
- Both routes include navigation tabs between participant/corporate forms

### Test Routes
- `/test-atomic` → `AtomicFieldsTest` (demonstrates atomic components)
- `/test-composite` → `CompositeFormTest` (demonstrates composite components)
- `/test-corporate` → `CorporateFormTest` (full feature testing)
- `/test-slim` → `CorporateFormSlim` (production architecture demo)
- `/test-participant-slim` → `ParticipantFormSlim` (production architecture demo)

### Global Components
- **ThemeProvider**: Used in root layout for theme management
- **UI Components**: Used throughout forms and layouts

## Rules for Component Usage

### ✅ DO

#### Using Existing Components
```typescript
// 1. Import from appropriate layer
import { Button } from "@/components/ui/button";
import { StellarAccountInput } from "@/components/form/fields";
import { ConfigurableForm } from "@/components/form/ConfigurableForm";

// 2. Use configuration-driven approach for forms
import { myFormConfig } from "@/lib/config/forms/myForm.config";

export function MyForm() {
  return <ConfigurableForm config={myFormConfig} />;
}

// 3. Compose UI components for layouts
export function MyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <Card>
          <CardContent>
            <MyForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
```

#### Creating New Components

**For UI Components:**
```typescript
// Only create if not available in components/ui/
// Follow shadcn/ui patterns
import * as React from "react";
import { cn } from "@/lib/utils";

interface MyComponentProps {
  className?: string;
  // ... other props
}

export function MyComponent({ className, ...props }: MyComponentProps) {
  return (
    <div className={cn("base-styles", className)} {...props}>
      {/* component content */}
    </div>
  );
}
```

**For Form Fields:**
```typescript
// Create in components/form/fields/
// Use FormFieldWrapper for form integration
import { FormFieldWrapper } from "./FormFieldWrapper";

export function MyCustomField({ name, label, ...props }) {
  return (
    <FormFieldWrapper name={name} label={label}>
      {(field) => (
        <div>
          {/* Your custom field implementation */}
        </div>
      )}
    </FormFieldWrapper>
  );
}

// Export from index.ts
export { MyCustomField } from "./MyCustomField";
```

**For Application Components:**
```typescript
// Create configuration-driven components
import { ConfigurableForm } from "@/components/form/ConfigurableForm";
import { myFormConfig } from "@/lib/config/forms/myForm.config";

export function MyApplicationForm() {
  return (
    <ConfigurableForm 
      config={myFormConfig}
      className="my-form"
    />
  );
}
```

### ❌ DON'T

```typescript
// ❌ Don't create monolithic components (like legacy forms)
export function MyHugeForm() {
  // 1000+ lines of code
  const [state1, setState1] = useState();
  const [state2, setState2] = useState();
  // ... dozens of state variables
  // ... hundreds of lines of JSX
}

// ❌ Don't bypass the configuration system for forms
export function MyForm() {
  // Reimplementing form logic instead of using ConfigurableForm
}

// ❌ Don't mix UI logic with business logic
export function MyComponent() {
  // Database calls, API requests, complex business logic
  const data = await fetch('/api/...'); // This belongs in hooks
}

// ❌ Don't create UI components that duplicate existing ones
export function MyButton() {
  // Reinventing Button from components/ui/button
}
```

## Development Workflow

### 1. For New Forms
1. Create configuration in `lib/config/forms/`
2. Use `ConfigurableForm` component
3. Test with dedicated test page if needed

### 2. For New UI Elements
1. Check if component exists in `components/ui/`
2. If not, check shadcn/ui documentation
3. Add via: `npx shadcn-ui@latest add component-name`
4. Customize if needed following existing patterns

### 3. For New Form Fields
1. Create in `components/form/fields/`
2. Use `FormFieldWrapper` for form integration
3. Export from `index.ts`
4. Add to field type mapping in `ConfigurableForm`

### 4. For Complex Components
1. Break into smaller atomic components
2. Use composition over inheritance
3. Follow KISS and DRY principles
4. Keep single responsibility

## File Naming Conventions

- **UI Components**: `kebab-case.tsx` (following shadcn/ui)
- **Form Components**: `PascalCase.tsx`
- **Application Components**: `PascalCase.tsx`
- **Test Components**: `*Test.tsx`
- **Legacy Components**: `*Legacy.tsx` (being phased out)
- **Slim Components**: `*Slim.tsx` (target architecture)

## Import Patterns

```typescript
// UI Components
import { Button, Card, Input } from "@/components/ui/button";

// Form Components - Atomic
import { StellarAccountInput, ByteLimitedInput } from "@/components/form/fields";

// Form Components - Composite  
import { BaseForm, FieldGroup } from "@/components/form/composite";

// Master Form Component
import { ConfigurableForm } from "@/components/form/ConfigurableForm";

// Application Components
import MyForm from "@/components/MyForm";
```

## Testing Strategy

- **Atomic Components**: Test in `/test-atomic`
- **Composite Components**: Test in `/test-composite`  
- **Full Forms**: Test in `/test-corporate` or `/test-participant-slim`
- **Production**: Use main `/participant` and `/corporate` routes

## Migration Strategy

The project is transitioning from legacy monolithic forms to configuration-driven architecture:

- **Legacy**: `*FormLegacy.tsx` (1000+ lines) → Being phased out
- **Target**: `*FormSlim.tsx` (10-20 lines) → Production architecture
- **Process**: Use `ConfigurableForm` + configuration objects

Follow the slim component pattern for all new forms and gradually migrate legacy components.