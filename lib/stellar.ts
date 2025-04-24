"use client";

import type { FormSchema } from "./validation";
import * as StellarSdk from '@stellar/stellar-sdk';
import { Horizon } from '@stellar/stellar-sdk';

// Управление тегами - единый источник истины для всего приложения
export interface TagDefinition {
  // Ключ для Stellar ManageData operation
  key: string;
  // ID для внутреннего использования в формах
  id: string;
  // Человекочитаемое имя для отображения
  label: string;
}

// Базовые ключевые слова для тегов
export const TAG_NAMES = ["Belgrade", "Montenegro", "Programmer", "Blogger"];

// Функции форматирования тегов
export const formatTagKey = (name: string): string => `Tag${name}`;
export const formatTagId = (name: string): string => name.toLowerCase();
export const formatTagLabel = (name: string): string => 
  name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

// Получить полное определение тега по имени
export const getTagDefinition = (name: string): TagDefinition => {
  return {
    key: formatTagKey(name),
    id: formatTagId(name),
    label: formatTagLabel(name)
  };
};

// Динамическое создание объекта TAGS на основе имен
export const TAGS: Record<string, TagDefinition> = (() => {
  const result: Record<string, TagDefinition> = {};
  for (const name of TAG_NAMES) {
    result[name.toUpperCase()] = getTagDefinition(name);
  }
  return result;
})();

// Вспомогательные функции для работы с тегами
export const getTagIds = () => Object.values(TAGS).map(tag => tag.id);
export const getTagKeys = () => Object.values(TAGS).map(tag => tag.key);
export const getTagByKey = (key: string) => Object.values(TAGS).find(tag => tag.key === key);
export const getTagById = (id: string) => Object.values(TAGS).find(tag => tag.id === id);

// ManageData operation keys
export const MANAGE_DATA_KEYS = {
  NAME: "Name",
  ABOUT: "About",
  WEBSITE: "Website",
  TELEGRAM_PART_CHAT_ID: "TelegramPartChatID",
  CONTRACT_IPFS: "ContractIPFS"
};

// Function to format MyPart ID with leading zeros
export function formatMyPartKey(id: string): string {
  // Pad with leading zeros to make it 3 digits
  const paddedId = id.padStart(3, '0');
  return `MyPart${paddedId}`;
}

// Stellar configuration
const STELLAR_CONFIG = {
  SERVER_URL: "https://horizon-testnet.stellar.org",
  NETWORK: StellarSdk.Networks.TESTNET,
  TIMEOUT_MINUTES: 30,
  BASE_FEE: StellarSdk.BASE_FEE
};

// Create Stellar server instance
export function createStellarServer(serverUrl = STELLAR_CONFIG.SERVER_URL) {
  return new Horizon.Server(serverUrl);
}

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
  account: StellarSdk.Account,
  formData: FormSchema,
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
  for (const part of formData.myParts) {
    addManageDataOperation(transaction, formatMyPartKey(part.id), part.accountId);
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

// Generate a Stellar transaction with ManageData operations for form data
export async function generateStellarTransaction(
  formData: FormSchema
): Promise<string> {
  try {
    const server = createStellarServer();

    // Use provided account ID or create a placeholder account
    const sourcePublicKey = formData.accountId || StellarSdk.Keypair.random().publicKey();

    // Load the account to get the current sequence number
    const account = await server.loadAccount(sourcePublicKey);
    
    // Build and return the transaction XDR
    const builtTransaction = await buildTransaction(account, formData);
    return builtTransaction.toXDR();
  } catch (error) {
    console.error("Error generating Stellar transaction:", error);
    throw new Error(
      "Failed to generate Stellar transaction. Please try again."
    );
  }
}

// Function to verify a transaction XDR
export function verifyTransactionXDR(xdr: string, network = STELLAR_CONFIG.NETWORK): boolean {
  try {
    // Parse the XDR to verify it's valid
    new StellarSdk.Transaction(xdr, network);
    return true;
  } catch (error) {
    return false;
  }
}