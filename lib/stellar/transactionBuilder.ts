"use client";

import type { FormSchema } from "../validation";
import type { Account } from '@stellar/stellar-sdk';
import * as StellarSdk from '@stellar/stellar-sdk';
import { STELLAR_CONFIG } from './config';
import { getTagById, addTagOperationsToTransaction } from './tags';
import { formatMyPartKey, generateMyPartIds } from './mypart';

// ManageData operation keys
export const MANAGE_DATA_KEYS = {
  NAME: "Name",
  ABOUT: "About",
  WEBSITE: "Website",
  TELEGRAM_PART_CHAT_ID: "TelegramPartChatID",
  CONTRACT_IPFS: "ContractIPFS",
  // Новые ключи для ParticipantForm
  TELEGRAM_USER_ID: "TelegramUserID",
  TIME_TOKEN_CODE: "TimeTokenCode",  
  TIME_TOKEN_ISSUER: "TimeTokenIssuer",
  TIME_TOKEN_DESC: "TimeTokenDesc",
  TIME_TOKEN_OFFER_IPFS: "TimeTokenOfferIPFS"
};

// Types for dependencies to make DI easier
export type OperationFactory = {
  manageData: (params: {name: string, value: string}) => unknown;
};

export type TransactionInstance = {
  setTimeout: (seconds: number) => void;
  addOperation: (operation: unknown) => void;
  build: () => unknown;
};

export type TransactionBuilderFactory = {
  new (account: Account, options: {fee: string, networkPassphrase: string}): TransactionInstance;
};

// Add a ManageData operation to transaction
function addManageDataOperation(
  transaction: TransactionInstance,
  name: string, 
  value: string | undefined,
  operationFactory: OperationFactory
) {
  // Если значение пустое или undefined, считаем, что оно не изменилось и не добавляем операцию
  if (!value || value === "") return;
  
  transaction.addOperation(
    operationFactory.manageData({
      name,
      value
    })
  );
}

// Build transaction with the provided account and form data
export async function buildTransaction(
  account: Account,
  formData: FormSchema,
  accountDataAttributes: Record<string, string | Buffer> = {},
  config = STELLAR_CONFIG,
  // Добавляем DI для зависимостей
  deps = {
    operationFactory: StellarSdk.Operation,
    transactionBuilderFactory: StellarSdk.TransactionBuilder as unknown as TransactionBuilderFactory,
    formatMyPartKey,
    generateMyPartIds,
    getTagById,
    addTagOperationsToTransaction
  }
) {
  // Setup a transaction builder
  const transaction = new deps.transactionBuilderFactory(account, {
    fee: config.BASE_FEE,
    networkPassphrase: config.NETWORK,
  });

  // Add a timebound
  transaction.setTimeout(config.TIMEOUT_MINUTES * 60);

  // Required fields
  addManageDataOperation(transaction, MANAGE_DATA_KEYS.NAME, formData.name, deps.operationFactory);
  addManageDataOperation(transaction, MANAGE_DATA_KEYS.ABOUT, formData.about, deps.operationFactory);
  
  // Optional fields
  addManageDataOperation(transaction, MANAGE_DATA_KEYS.WEBSITE, formData.website, deps.operationFactory);
  
  // Handle multiple MyPart entries
  if (formData.myParts && formData.myParts.length > 0) {
    // 1. Get existing MyPart account IDs from blockchain data
    const existingBlockchainAccountIds = new Set<string>();
    for (const key in accountDataAttributes) {
      // Use a regex to check if the key matches the pattern MyPart<digits>
      if (/^MyPart\d+$/.test(key)) { 
        const value = accountDataAttributes[key];
        // Handle both string and Buffer types correctly
        const accountId = value instanceof Buffer ? value.toString('utf8') : value;
        if (typeof accountId === 'string') {
          existingBlockchainAccountIds.add(accountId);
        }
      }
    }

    // 2. Filter formData.myParts: remove duplicates within the form and existing ones from blockchain
    const seenFormAccountIds = new Set<string>();
    const partsToAdd = formData.myParts.filter(part => {
      // Check if already seen in this form submission or exists on blockchain
      const alreadyExists = seenFormAccountIds.has(part.accountId) || existingBlockchainAccountIds.has(part.accountId);
      if (!alreadyExists) {
        seenFormAccountIds.add(part.accountId);
        return true; // Keep this part
      }
      return false; // Discard this part
    });

    // 3. Generate IDs only for the parts that need to be added
    const newIds = deps.generateMyPartIds(accountDataAttributes, partsToAdd.length);
    
    // 4. Add operations for the filtered parts using the generated IDs
    partsToAdd.forEach((part, index) => {
      const myPartId = newIds[index];
      const myPartKey = deps.formatMyPartKey(myPartId);
      
      addManageDataOperation(transaction, myPartKey, part.accountId, deps.operationFactory);
    });
  }

  addManageDataOperation(transaction, MANAGE_DATA_KEYS.TELEGRAM_PART_CHAT_ID, formData.telegramPartChatID, deps.operationFactory);
  
  // Handle tags - add individual tag operations if the tag is selected
  if (formData.accountId) {
    deps.addTagOperationsToTransaction(
      transaction,
      formData.accountId,
      formData.tags,
      accountDataAttributes,
      deps.operationFactory,
      deps.getTagById
    );
  }
  
  addManageDataOperation(transaction, MANAGE_DATA_KEYS.CONTRACT_IPFS, formData.contractIPFSHash, deps.operationFactory);

  // Build the transaction
  return transaction.build();
}