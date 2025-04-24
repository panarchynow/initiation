"use client";

import type { FormSchema } from "./validation";
import * as StellarSdk from '@stellar/stellar-sdk';
import { Horizon } from '@stellar/stellar-sdk';

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
  addManageDataOperation(transaction, "Name", formData.name);
  addManageDataOperation(transaction, "About", formData.about);
  
  // Optional fields
  addManageDataOperation(transaction, "Website", formData.website);
  
  // Handle multiple MyPart entries
  for (const part of formData.myParts) {
    addManageDataOperation(transaction, `MyPart_${part.id}`, part.accountId);
  }

  addManageDataOperation(transaction, "TelegramPartChatID", formData.telegramPartChatID);
  
  if (formData.tags && formData.tags.length > 0) {
    addManageDataOperation(transaction, "Tags", JSON.stringify(formData.tags));
  }
  
  addManageDataOperation(transaction, "ContractIPFS", formData.contractIPFSHash);

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