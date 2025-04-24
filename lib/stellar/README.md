# Stellar Module Overview

This module handles interactions with the Stellar blockchain, focusing on managing account data via transactions.

## Core Components:

-   **`config.ts`**: Defines constants for the Stellar network (Testnet URL, network passphrase, base fee, transaction timeout).
-   **`server.ts`**: Provides `createStellarServer` function to instantiate a Horizon server connection using the URL from `config.ts`.
-   **`account.ts`**: Contains `fetchAccountDataAttributes` to load an account from the Stellar network using `server.ts` and extract its data entries (key-value pairs stored on-chain), handling different potential data structures.
-   **`tags.ts`**: Manages predefined tags. Defines `TagDefinition` interface and provides functions to format tag keys (`TagBelgrade`, `TagProgrammer`, etc.), IDs (`belgrade`, `programmer`), and labels. Dynamically generates `TAGS` object and provides helpers (`getTagById`, `getTagByKey`, etc.).
-   **`mypart.ts`**: Handles `MyPart` data entries. Provides functions to format keys (`MyPart001`, `MyPart002`), extract IDs from keys, find existing `MyPart` keys in account data, find the highest existing ID, and generate a sequence of new IDs for adding more `MyPart` entries.
-   **`transactionBuilder.ts`**: Builds a Stellar transaction. `buildTransaction` takes an account object, form data, and existing account attributes. It creates a `TransactionBuilder`, sets timeouts and fees, and adds `manageData` operations based on the form data:
    -   Maps form fields (`name`, `about`, `website`, etc.) to predefined data entry keys (`MANAGE_DATA_KEYS`).
    -   Handles `MyPart` entries by generating new sequential IDs using `mypart.ts` and adding `manageData` operations for each.
    -   Handles tags by looking up tag definitions using `tags.ts` and adding `manageData` operations.
    -   Returns the built (but unsigned) transaction.
-   **`transactionGenerator.ts`**: Orchestrates transaction creation. `generateStellarTransaction` takes form data:
    -   Loads the source account using `server.ts` and `formData.accountId`.
    -   Fetches existing data attributes using `account.ts`.
    -   Calls `buildTransaction` to construct the transaction.
    -   Converts the final transaction to XDR format for signing and submission.
    -   Includes error handling for common issues like account not found.
-   **`transactionVerifier.ts`**: Contains `verifyTransactionXDR` to check if a given XDR string represents a valid Stellar transaction for the configured network.
-   **`index.ts`**: Re-exports all necessary functions and types from the other modules for external use.

## Workflow:

1.  UI collects form data (`FormSchema`).
2.  `generateStellarTransaction` is called with the form data.
3.  It loads the Stellar account specified in the form data.
4.  It fetches the account's current data entries using `fetchAccountDataAttributes`.
5.  It calls `buildTransaction`, passing the account, form data, and fetched data attributes.
6.  `buildTransaction` constructs the transaction, adding `manageData` operations for basic info, `MyPart` entries (generating new IDs based on existing ones), and selected `tags`.
7.  `generateStellarTransaction` receives the built transaction and converts it to XDR.
8.  The XDR is typically passed to a wallet (like Freighter) for signing.
9.  (Implicitly) The signed transaction is submitted to the Stellar network.
10. `verifyTransactionXDR` can be used (e.g., before signing or after generation) to ensure the XDR is structurally valid.

## Key Concepts:

-   **Data Entries**: Key-value pairs stored directly on a Stellar account.
-   **ManageData Operation**: Stellar operation type used to add, modify, or delete data entries.
-   **Tags**: Predefined categories represented by specific data entry keys (`Tag<Name>`).
-   **MyPart**: Custom data entries, sequentially numbered (`MyPart<NNN>`), likely representing parts or shares associated with the account.
-   **XDR**: External Data Representation format used by Stellar for transactions. 