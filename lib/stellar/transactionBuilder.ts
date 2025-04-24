"use client";

import type { FormSchema } from "../validation";
import * as StellarSdk from '@stellar/stellar-sdk';
import { Account } from '@stellar/stellar-sdk';
import { STELLAR_CONFIG } from './config';
import { getTagById } from './tags';
import { formatMyPartKey, generateMyPartIds } from './mypart';

// ManageData operation keys
export const MANAGE_DATA_KEYS = {
  NAME: "Name",
  ABOUT: "About",
  WEBSITE: "Website",
  TELEGRAM_PART_CHAT_ID: "TelegramPartChatID",
  CONTRACT_IPFS: "ContractIPFS"
};

// Add a ManageData operation to transaction
function addManageDataOperation(
  transaction: StellarSdk.TransactionBuilder,
  name: string, 
  value: string | undefined
) {
  if (!value) return;
  
  transaction.addOperation(
    StellarSdk.Operation.manageData({
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
  config = STELLAR_CONFIG
) {
  // Setup a transaction builder
  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: config.BASE_FEE,
    networkPassphrase: config.NETWORK,
  });

  // Add a timebound
  transaction.setTimeout(config.TIMEOUT_MINUTES * 60);

  // Required fields
  addManageDataOperation(transaction, MANAGE_DATA_KEYS.NAME, formData.name);
  addManageDataOperation(transaction, MANAGE_DATA_KEYS.ABOUT, formData.about);
  
  // Optional fields
  addManageDataOperation(transaction, MANAGE_DATA_KEYS.WEBSITE, formData.website);
  
  // Handle multiple MyPart entries
  if (formData.myParts && formData.myParts.length > 0) {
    // Используем переданные данные аккаунта, а не data_attr
    const newIds = generateMyPartIds(accountDataAttributes, formData.myParts.length);
    
    // Use the generated IDs for the new MyPart entries
    formData.myParts.forEach((part, index) => {
      const myPartId = newIds[index];
      const myPartKey = formatMyPartKey(myPartId);
      
      addManageDataOperation(transaction, myPartKey, part.accountId);
    });
  }

  addManageDataOperation(transaction, MANAGE_DATA_KEYS.TELEGRAM_PART_CHAT_ID, formData.telegramPartChatID);
  
  // Handle tags - add individual tag operations if the tag is selected
  if (formData.tags && formData.tags.length > 0 && formData.accountId) {
    // Для каждого тега в форме, найдем соответствующий тег в TAGS
    for (const tagId of formData.tags) {
      const tag = getTagById(tagId);
      if (tag) {
        addManageDataOperation(transaction, tag.key, formData.accountId);
      }
    }
  }
  
  addManageDataOperation(transaction, MANAGE_DATA_KEYS.CONTRACT_IPFS, formData.contractIPFSHash);

  // Build the transaction
  return transaction.build();
}