"use client";

import type { FormSchema } from "../validation";
import type { Account } from '@stellar/stellar-sdk';
import * as StellarSdk from '@stellar/stellar-sdk';
import { STELLAR_CONFIG } from './config';
import { getTagById, addTagOperationsToTransaction } from './tags';
import { formatMyPartKey, generateMyPartIds } from './mypart';
import { formatPartOfKey, generatePartOfIds } from './partof';

// Значения для стандартов
export const STANDARD_VALUES = {
  MTLA_PII: "e7bb8bb6e84bf2182294490c5b588fc175bbc0b0898d10d5caabb7c006a42672"
};

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
  TIME_TOKEN_OFFER_IPFS: "TimeTokenOfferIPFS",
  // Ключ для PII стандарта
  MTLA_PII_STANDARD: "MTLA: PII Standard"
};

// Types for dependencies to make DI easier
export type OperationFactory = {
  manageData: (params: {name: string, value: string | null}) => unknown;
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
  value: string | null | undefined,
  operationFactory: OperationFactory
) {
  // Skip only if value is undefined (field not changed)
  if (value === undefined) return;
  
  // For null values (deletion) or empty strings, create deletion operation
  if (value === null || value === "") {
    console.log(`Adding deletion operation for field: ${name}`);
    transaction.addOperation(
      operationFactory.manageData({
        name,
        value: null // Explicit null for deletion
      })
    );
    return;
  }
  
  // For non-empty values, create update operation
  console.log(`Adding update operation for field: ${name} = "${value}"`);
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
  console.log('buildTransaction called with formData:', formData);
  console.log('buildTransaction formData.accountId:', formData.accountId);
  // Setup a transaction builder
  const transaction = new deps.transactionBuilderFactory(account, {
    fee: config.BASE_FEE,
    networkPassphrase: config.NETWORK,
  });

  // Add a timebound
  if (config.TIMEOUT_INFINITE) {
    // Use TimeoutInfinite constant for infinite timeout
    transaction.setTimeout(StellarSdk.TimeoutInfinite);
  } else {
    transaction.setTimeout(config.TIMEOUT_MINUTES * 60);
  }

  // Only process fields that are present in formData (changed fields)
  if (formData.name !== undefined) {
    addManageDataOperation(transaction, MANAGE_DATA_KEYS.NAME, formData.name, deps.operationFactory);
  }
  
  if (formData.about !== undefined) {
    addManageDataOperation(transaction, MANAGE_DATA_KEYS.ABOUT, formData.about, deps.operationFactory);
  }
  
  // Optional fields
  if (formData.website !== undefined) {
    addManageDataOperation(transaction, MANAGE_DATA_KEYS.WEBSITE, formData.website, deps.operationFactory);
  }
  
  // MTLA PII Standard - only process if field is present (changed)
  if (formData.mtlaPiiStandard !== undefined) {
    if (formData.mtlaPiiStandard) {
      transaction.addOperation(
        deps.operationFactory.manageData({
          name: MANAGE_DATA_KEYS.MTLA_PII_STANDARD,
          value: STANDARD_VALUES.MTLA_PII
        })
      );
    } else if (accountDataAttributes[MANAGE_DATA_KEYS.MTLA_PII_STANDARD]) {
      // Если ключ существует на аккаунте, но отключен в форме - удаляем его
      transaction.addOperation(
        deps.operationFactory.manageData({
          name: MANAGE_DATA_KEYS.MTLA_PII_STANDARD,
          value: null // null означает удаление
        })
      );
    }
  }
  
  // Handle multiple MyPart entries
  if (formData.myParts !== undefined) {
    console.log('Processing myParts:', formData.myParts);
    console.log('Original myParts:', (formData as any).originalMyParts);
    console.log('Main accountId still:', formData.accountId);

    const currentMyParts = formData.myParts || [];
    const originalMyParts = (formData as any).originalMyParts || [];

    // 1. Get existing MyPart entries from blockchain data with their keys
    const existingMyPartEntries = new Map<string, string>(); // accountId -> key
    for (const key in accountDataAttributes) {
      if (/^MyPart\d+$/.test(key)) {
        const value = accountDataAttributes[key];
        const accountId = value instanceof Buffer ? value.toString('utf8') : value;
        if (typeof accountId === 'string') {
          existingMyPartEntries.set(accountId, key);
        }
      }
    }

    // 2. Find entries to delete (in original but not in current)
    const originalAccountIds = new Set<string>(originalMyParts.map((part: any) => part.accountId));
    const currentAccountIds = new Set<string>(currentMyParts.map(part => part.accountId));
    
    console.log('Original account IDs:', Array.from(originalAccountIds));
    console.log('Current account IDs:', Array.from(currentAccountIds));

    // Delete entries that were removed
    originalAccountIds.forEach(accountId => {
      if (!currentAccountIds.has(accountId) && existingMyPartEntries.has(accountId)) {
        const keyToDelete = existingMyPartEntries.get(accountId)!;
        console.log(`Deleting MyPart entry: ${keyToDelete} (${accountId})`);
        transaction.addOperation(
          deps.operationFactory.manageData({
            name: keyToDelete,
            value: null // null означает удаление
          })
        );
      }
    });

    // 3. Add new entries (in current but not in original)
    const newEntries = currentMyParts.filter(part => 
      !originalAccountIds.has(part.accountId) && !existingMyPartEntries.has(part.accountId)
    );

    if (newEntries.length > 0) {
      console.log('Adding new MyPart entries:', newEntries);
      
      // Generate IDs only for the new parts
      const newIds = deps.generateMyPartIds(accountDataAttributes, newEntries.length);
      
      // Add operations for the new parts
      newEntries.forEach((part, index) => {
        const myPartId = newIds[index];
        const myPartKey = deps.formatMyPartKey(myPartId);
        console.log(`Adding MyPart entry: ${myPartKey} (${part.accountId})`);
        
        addManageDataOperation(transaction, myPartKey, part.accountId, deps.operationFactory);
      });
    }
  }

  // Handle multiple PartOf entries (for participant forms)
  if (formData.partOf !== undefined) {
    console.log('Processing partOf:', formData.partOf);
    console.log('Original partOf:', (formData as any).originalPartOf);

    const currentPartOf = formData.partOf || [];
    const originalPartOf = (formData as any).originalPartOf || [];

    // 1. Get existing PartOf entries from blockchain data with their keys
    const existingPartOfEntries = new Map<string, string>(); // accountId -> key
    for (const key in accountDataAttributes) {
      if (/^PartOf\d+$/.test(key)) {
        const value = accountDataAttributes[key];
        const accountId = value instanceof Buffer ? value.toString('utf8') : value;
        if (typeof accountId === 'string') {
          existingPartOfEntries.set(accountId, key);
        }
      }
    }

    // 2. Find entries to delete (in original but not in current)
    const originalAccountIds = new Set<string>(originalPartOf.map((part: any) => part.accountId));
    const currentAccountIds = new Set<string>(currentPartOf.map(part => part.accountId));
    
    console.log('PartOf - Original account IDs:', Array.from(originalAccountIds));
    console.log('PartOf - Current account IDs:', Array.from(currentAccountIds));

    // Delete entries that were removed
    originalAccountIds.forEach(accountId => {
      if (!currentAccountIds.has(accountId) && existingPartOfEntries.has(accountId)) {
        const keyToDelete = existingPartOfEntries.get(accountId)!;
        console.log(`Deleting PartOf entry: ${keyToDelete} (${accountId})`);
        transaction.addOperation(
          deps.operationFactory.manageData({
            name: keyToDelete,
            value: null // null означает удаление
          })
        );
      }
    });

    // 3. Add new entries (in current but not in original)
    const newEntries = currentPartOf.filter(part => 
      !originalAccountIds.has(part.accountId) && !existingPartOfEntries.has(part.accountId)
    );

    if (newEntries.length > 0) {
      console.log('Adding new PartOf entries:', newEntries);
      
      // Generate IDs only for the new parts
      const newIds = generatePartOfIds(accountDataAttributes, newEntries.length);
      
      // Add operations for the new parts
      newEntries.forEach((part, index) => {
        const partOfId = newIds[index];
        const partOfKey = formatPartOfKey(partOfId);
        console.log(`Adding PartOf entry: ${partOfKey} (${part.accountId})`);
        
        addManageDataOperation(transaction, partOfKey, part.accountId, deps.operationFactory);
      });
    }
  }

  // Process telegramPartChatID only if present (changed)
  if (formData.telegramPartChatID !== undefined) {
    addManageDataOperation(transaction, MANAGE_DATA_KEYS.TELEGRAM_PART_CHAT_ID, formData.telegramPartChatID, deps.operationFactory);
  }
  
  // Handle tags - add individual tag operations if the tag is selected and tags field is present (changed)
  if (formData.accountId && formData.tags !== undefined) {
    deps.addTagOperationsToTransaction(
      transaction,
      formData.accountId,
      formData.tags,
      accountDataAttributes,
      deps.operationFactory,
      deps.getTagById
    );
  }
  
  // Process contractIPFSHash only if present (changed)
  if (formData.contractIPFSHash !== undefined) {
    addManageDataOperation(transaction, MANAGE_DATA_KEYS.CONTRACT_IPFS, formData.contractIPFSHash, deps.operationFactory);
  }

  // Process participant-specific fields (for participant forms)
  if (formData.telegramUserID !== undefined) {
    addManageDataOperation(transaction, MANAGE_DATA_KEYS.TELEGRAM_USER_ID, formData.telegramUserID, deps.operationFactory);
  }
  
  if (formData.timeTokenCode !== undefined) {
    addManageDataOperation(transaction, MANAGE_DATA_KEYS.TIME_TOKEN_CODE, formData.timeTokenCode, deps.operationFactory);
  }
  
  if (formData.timeTokenIssuer !== undefined) {
    addManageDataOperation(transaction, MANAGE_DATA_KEYS.TIME_TOKEN_ISSUER, formData.timeTokenIssuer, deps.operationFactory);
  }
  
  if (formData.timeTokenDesc !== undefined) {
    addManageDataOperation(transaction, MANAGE_DATA_KEYS.TIME_TOKEN_DESC, formData.timeTokenDesc, deps.operationFactory);
  }
  
  if (formData.timeTokenOfferIPFS !== undefined) {
    addManageDataOperation(transaction, MANAGE_DATA_KEYS.TIME_TOKEN_OFFER_IPFS, formData.timeTokenOfferIPFS, deps.operationFactory);
  }

  // Build the transaction
  return transaction.build();
}