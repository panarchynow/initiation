# Stellar Module Overview

This module handles interactions with the Stellar blockchain, focusing on managing account data via transactions.

## Core Components:

-   **`config.ts`**: Defines constants for the Stellar network. Uses environment variables to determine which network to connect to:
    - `NEXT_PUBLIC_STELLAR_NETWORK_TYPE`: Set to 'TESTNET' for test network or 'PUBLIC' (or any other value) for public network (MAINNET).
    - Defaults to PUBLIC network if no environment variable is set.
    - Sets appropriate Horizon server URL and network passphrase based on the selected network.
    - Also defines base fee and transaction timeout.
    - Includes `TIMEOUT_INFINITE: true` to use Stellar SDK's `TimeoutInfinite` constant, ensuring transactions never expire.
-   **`server.ts`**: Provides `createStellarServer` function to instantiate a Horizon server connection using the URL from `config.ts`.
-   **`account.ts`**: Contains `fetchAccountDataAttributes` to load an account from the Stellar network using `server.ts` and extract its data entries (key-value pairs stored on-chain), handling different potential data structures.
-   **`tags.ts`**: Manages predefined tags. Defines `TagDefinition` interface and provides functions to format tag keys (`TagBelgrade`, `TagProgrammer`, etc.), IDs (`belgrade`, `programmer`), and labels. Dynamically generates `TAGS` object and provides helpers (`getTagById`, `getTagByKey`, etc.).
-   **`mypart.ts`**: Handles `MyPart` data entries. Provides functions to format keys (`MyPart001`, `MyPart002`), extract IDs from keys, find existing `MyPart` keys in account data, find the highest existing ID, and generate a sequence of new IDs for adding more `MyPart` entries.
-   **`transactionBuilder.ts`**: Builds a Stellar transaction. `buildTransaction` takes an account object, form data, and existing account attributes. It creates a `TransactionBuilder`, sets timeouts and fees, and adds `manageData` operations based on the form data:
    -   Maps form fields (`name`, `about`, `website`, etc.) to predefined data entry keys (`MANAGE_DATA_KEYS`).
    -   Handles `MyPart` entries by filtering out duplicates (both from the submitted form and existing blockchain data) and generating new sequential IDs using `mypart.ts` only for the unique new entries, then adding `manageData` operations for each.
    -   Handles tags by looking up tag definitions using `tags.ts` and adding `manageData` operations.
    -   Returns the built (but unsigned) transaction.
-   **`transactionGenerator.ts`**: Orchestrates transaction creation. `generateStellarTransaction` takes form data:
    -   Loads the source account using `server.ts` and `formData.accountId`.
    -   Fetches existing data attributes using `account.ts`.
    -   Calls `buildTransaction` to construct the transaction.
    -   Converts the final transaction to XDR format for signing and submission.
    -   Includes error handling for common issues like account not found.
-   **`transactionVerifier.ts`**: Contains `verifyTransactionXDR` to check if a given XDR string represents a valid Stellar transaction for the configured network.
-   **`sep7UriBuilder.ts`**: Implements SEP-0007 URI creation for transaction signing:
    -   `buildSep7TransactionUri`: Builds a `web+stellar:tx?...` URI for transaction signing requests.
    -   `buildSep7PaymentUri`: Creates a `web+stellar:pay?...` URI for simplified payment requests.
    -   Includes options for callbacks, messages, network specification, and other SEP-0007 parameters.
-   **`index.ts`**: Re-exports all necessary functions and types from the other modules for external use.

## Workflow:

1.  UI collects form data (`FormSchema`).
2.  `generateStellarTransaction` is called with the form data.
3.  It loads the Stellar account specified in the form data.
4.  It fetches the account's current data entries using `fetchAccountDataAttributes`.
5.  It calls `buildTransaction`, passing the account, form data, and fetched data attributes.
6.  `buildTransaction` constructs the transaction, adding `manageData` operations for basic info, `MyPart` entries (filtering duplicates, generating new IDs based on existing ones), and selected `tags`.
7.  `generateStellarTransaction` receives the built transaction and converts it to XDR.
8.  The XDR is typically passed to a wallet (like Freighter) for signing.
9.  (Implicitly) The signed transaction is submitted to the Stellar network.
10. `verifyTransactionXDR` can be used (e.g., before signing or after generation) to ensure the XDR is structurally valid.
11. Alternatively, `buildSep7TransactionUri` can convert a transaction to a SEP-0007 URI for wallet interaction via URL.

## Key Concepts:

-   **Data Entries**: Key-value pairs stored directly on a Stellar account.
-   **ManageData Operation**: Stellar operation type used to add, modify, or delete data entries.
-   **Tags**: Predefined categories represented by specific data entry keys (`Tag<n>`).
-   **MyPart**: Custom data entries, sequentially numbered (`MyPart<NNN>`), likely representing parts or shares associated with the account.
-   **XDR**: External Data Representation format used by Stellar for transactions.
-   **SEP-0007**: Stellar Ecosystem Proposal defining a URI scheme for requesting transaction signatures from wallets. 