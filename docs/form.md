# CorporateForm Component Documentation

This document describes the functionality of the `CorporateForm` component in the Stellar-based application.

## Overview
`CorporateForm` is a React component that allows users to create or update corporate account data on the Stellar blockchain. The form fetches existing data for a given Account ID and generates an XDR transaction that can be submitted to the Stellar network.

## Key Features

### Stellar Account Data Handling
- **Account ID Input**: When a user enters a valid Stellar account ID and triggers a blur event or presses Enter, the form fetches existing data entries from the blockchain.
- **Loading States**: Displays loading indicators while fetching account data.
- **Error Handling**: Shows appropriate error messages if the account doesn't exist or if there are network issues.
- **Data Population**: Automatically populates form fields with data retrieved from the blockchain.

### Form Fields and Validation
- **Basic Fields**:
  - Account ID (required): The Stellar public key.
  - Company Name (required): Limited to 64 bytes.
  - About (required): Limited to 64 bytes.
  - Website (optional): Limited to 64 bytes.
  - Telegram Part Chat ID (optional).
- **Dynamic Fields**:
  - MyParts: A dynamic list of account IDs that can be added or removed.
    - Validates that all MyPart account IDs are unique.
  - Tags: Selection of predefined tags using a custom `TagSelector` component.
- **File Upload and IPFS Integration**:
  - Allows uploading a file which is stored on IPFS, returning a hash.
  - Alternatively, users can manually enter an existing IPFS hash.
  - Switching between upload and manual hash input modes.

### Transaction Generation
- **Differential Updates**: Compares the current form state with the originally fetched data to generate a transaction that only includes changed fields.
- **Deletion Handling**: Specifically processes deleted MyParts by generating appropriate `manageData` operations that set their values to `null`.
- **XDR Generation**: Creates a base64-encoded XDR representation of the Stellar transaction that can be submitted to the network.
- **Transaction Display**: Shows the generated XDR with a copy button.

### User Experience
- **Byte Length Calculation**: For fields with size limits, shows the current byte length and maximum allowed bytes.
- **Loading States**: Displays loading indicators during account data fetching and transaction generation.
- **Error States**: Shows validation errors, duplicate MyPart errors, and fetch errors.
- **Success Notifications**: Displays toast notifications for successful operations (data loaded, transaction generated, XDR copied).
- **Clipboard Integration**: Allows copying the generated XDR to clipboard with visual feedback.
- **Auto-Scrolling**: Automatically scrolls to the transaction card when a transaction is generated.

## Technical Implementation Details

### State Management
- Uses multiple React state hooks for managing different aspects of the form:
  - Form data handling via `react-hook-form`
  - Loading states via `useState` (`isSubmitting`, `isFetchingAccountData`)
  - Error states via `useState` (`fetchError`, `duplicateError`)
  - Upload state via `useState` (`uploadTab`, `isFileUploaded`, `uploadedFileInfo`)
  - Original data storage via `useState` (`originalFormData`, `accountDataAttributes`)
  - UI state via `useState` (`isCopied`, `transactionXDR`)

### Form Handling
- Uses `react-hook-form` with Zod validation schema.
- Implements custom validation logic for MyParts uniqueness.
- Manages dynamic field arrays through `useFieldArray`.

### Stellar Integration
- Fetches account data via `fetchAccountDataAttributes` function.
- Processes data attributes based on predefined keys (e.g., `MANAGE_DATA_KEYS`).
- Handles MyPart and Tag entries extraction from account data.
- Generates Stellar transactions based on form data:
  - For new data: Uses `generateStellarTransaction` helper.
  - For updates (including deletions): Builds a custom transaction using the Stellar SDK.

### File Upload
- Uses a custom `FileUploadField` component.
- Uploads files to IPFS via the `uploadFile` function.
- Manages the upload state and switches between upload and manual hash input modes.

## Dependencies
- `react`, `react-hook-form` for form management
- `zod` and `@hookform/resolvers/zod` for validation
- `stellar-sdk` for blockchain interaction
- `lucide-react` for icons
- `sonner` for toast notifications
- Custom UI components from `@/components/ui`
- Custom form fields from `@/components/form`
- Utility functions from `@/lib/stellar` and `@/lib/validation`

## Usage Considerations
- The component requires access to the Stellar network.
- Proper transaction signing and submission are handled outside this component.
- The form design follows a responsive approach and includes appropriate accessibility attributes.
- Error handling is comprehensive, guiding users through recovery paths. 