# Network Switching Bug Fix

## Problem Description

When switching networks after loading account data, there were two critical bugs:

1. **Phantom Deletion Operations**: Form fields would be incorrectly included in transactions as "deleted" fields
2. **Wrong Sequence Number**: Transactions generated for testnet would use sequence numbers from mainnet accounts

### Bug Scenario 1: Phantom Deletion Operations
1. Load account data from mainnet (includes tags: `['tag1', 'tag2']`)
2. Switch to testnet (no data available)
3. Form gets cleared but `originalFormData` still contains mainnet data
4. Fill out some new fields on testnet form
5. Generate transaction
6. **BUG**: Transaction incorrectly includes operations to delete tags that user never touched

### Bug Scenario 2: Wrong Sequence Number
1. Load account data from mainnet (sequence: 12345)
2. Switch to testnet
3. Fill out form and generate transaction
4. **BUG**: Transaction uses mainnet sequence number but targets testnet network

### Root Causes
1. **Phantom Deletions**: The `originalFormData` was not being reset when the form was cleared after network switch, causing the change detection logic to think that cleared fields were intentionally removed by the user.

2. **Wrong Sequence Number**: The transaction generator was not receiving the network parameter correctly, so it used the default network configuration instead of the user-selected network.

## Fix Implementation

### 1. Updated `clearFormToDefaults` in useFormBuilder

**Before**: Only cleared form values, left `originalFormData` unchanged
```typescript
// Clear original data for change detection
accountDataHook.originalFormData = {};
```

**After**: Reset `originalFormData` to match cleared form state
```typescript
// CRITICAL: Clear original data AND set it to current defaults for change detection
// This prevents the system from thinking that default values were "removed"
const cleanOriginalData: Partial<T> = {
  ...config.defaultValues,
  accountId: currentAccountId,
  network: currentNetwork,
};

accountDataHook.originalFormData = cleanOriginalData;
```

### 2. Updated Error Handling in useNetworkAwareAccountData

Ensured that when data loading fails, the fetch state is properly updated to reflect the attempt.

### 3. Fixed Network Parameter Passing

**Problem**: Transaction generation functions were not receiving the network parameter

**Before**: 
```typescript
generateStellarTransaction(data)  // Missing network info
```

**After**:
```typescript
const dataWithNetwork = {
  ...data,
  network: data.network || 'mainnet'
};
generateStellarTransaction(dataWithNetwork)
```

**Changes Made**:
- Updated `generateTransaction` functions in both form configs
- Updated default transaction generator in `useFormBuilder`
- Modified `processChangedData` to always include network field
- Fixed TypeScript types to handle optional network field

## Testing Scenarios

### ✅ Test Case 1: Network Switch with No Data
1. Load data from mainnet
2. Switch to testnet (no data)
3. Fill some fields  
4. Generate transaction
5. **Expected**: Only new fields appear in transaction, no deletion operations, correct testnet sequence number

### ✅ Test Case 2: Network Switch with Error
1. Load data from mainnet
2. Switch to invalid network or cause error
3. Form should clear and reset original data
4. Generate transaction
5. **Expected**: Only new fields appear in transaction, correct network configuration

### ✅ Test Case 3: Round-trip Network Switch
1. Load data from mainnet
2. Switch to testnet (clears form)
3. Switch back to mainnet
4. Data should reload properly
5. **Expected**: Form refills with mainnet data correctly

### ✅ Test Case 4: Sequence Number Verification
1. Switch to testnet
2. Enter account ID that exists on testnet
3. Generate transaction
4. **Expected**: Transaction uses testnet sequence number, not mainnet

## Impact on Forms

This fix affects both:
- **Corporate Form** (`myParts`, `tags` fields)
- **Participant Form** (`partOf`, `tags` fields)

Both forms use the same change detection logic and were susceptible to this bug.

## Prevention

The fix ensures that:
1. When form is cleared due to network switch, `originalFormData` reflects the cleared state
2. Change detection only captures intentional user modifications
3. No phantom "deletion" operations are created in transactions
4. **Transactions use correct sequence numbers from the target network**
5. **Network parameter is properly passed through the entire transaction generation pipeline**
6. Network switching works cleanly without side effects
