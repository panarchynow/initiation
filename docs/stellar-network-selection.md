# Stellar Network Selection Feature

## Overview

Added support for selecting Stellar network (mainnet/testnet) in all forms. Users can now choose which Stellar network to use when submitting transactions.

## Key Changes

### 1. New Components

- **`StellarNetworkSelector`** - Dropdown component for selecting mainnet/testnet
- **`StellarAccountWithNetwork`** - Combined component with both network selector and account input
- **`NetworkAwareStellarAccount`** - Advanced component with auto-loading account data from selected network

### 2. Updated Configuration

- **Network Configuration** (`lib/stellar/config.ts`)
  - Added `StellarNetwork` type ('mainnet' | 'testnet')
  - Created `getNetworkConfigByType()` function
  - Added `createStellarConfig()` for dynamic network configuration

- **Server Configuration** (`lib/stellar/server.ts`)
  - Added `createStellarServerForNetwork()` function

### 3. Form Schema Updates

- Added `network` field to all form schemas
- Default value is 'mainnet'
- Validation ensures only 'mainnet' or 'testnet' values

### 4. Transaction Generation

Updated all transaction generation functions:
- `generateStellarTransaction()`
- `generatePersonalTransaction()`
- `generateParticipantTransaction()`

Now use the selected network for:
- Creating Stellar server connection
- Setting network passphrase
- Loading account data

### 5. Form Configuration

Updated form configurations to include network selection:
- Added "Account Configuration" section as first group
- Uses new field type: 'network-aware-account'
- Automatically loads and populates form data when account ID is entered
- Reloads data when network is changed

### 6. Auto-Loading Features

- **Automatic Data Loading**: When a valid Stellar account ID is entered, form automatically loads existing data from the selected network
- **Network-Aware Reloading**: When network is changed, data is automatically reloaded from the new network
- **Debounced Loading**: 1-second delay prevents excessive API calls while typing
- **Visual Feedback**: Loading states, success indicators, and error handling
- **Manual Reload**: Button to manually refresh data if needed

## Usage

### In ConfigurableForm

The network selection is automatically included when using the updated form configurations:

```tsx
import { ConfigurableForm } from "@/components/form/ConfigurableForm";
import { corporateFormConfig } from "@/lib/config/forms/corporateForm.config";

function MyForm() {
  return <ConfigurableForm config={corporateFormConfig} />;
}
```

### Direct Component Usage

```tsx
import { StellarNetworkSelector } from "@/components/form/fields";

<StellarNetworkSelector
  name="network"
  label="Stellar Network"
  description="Select the Stellar network"
  required={true}
/>
```

## Testing

A test page is available at `/test-network` to verify the functionality with both corporate and participant forms.

## Default Behavior

- **Default Network**: mainnet
- **UI Indicators**: 
  - Mainnet shows green dot (Production)
  - Testnet shows orange dot (Development)
- **Backward Compatibility**: Existing code continues to work with mainnet as default

## Network Configuration Details

### Mainnet
- Server URL: https://horizon.stellar.org
- Network Passphrase: `Networks.PUBLIC`

### Testnet  
- Server URL: https://horizon-testnet.stellar.org
- Network Passphrase: `Networks.TESTNET`
