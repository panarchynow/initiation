"use client";

import { Keypair } from '@stellar/stellar-sdk';
import { createStellarServer } from './server';
import { fetchAccountDataAttributes } from './account';
import { buildTransaction } from './transactionBuilder';
import type { FormSchema } from '../validation';

// Generate Stellar transaction for form data
export async function generateStellarTransaction(
  formData: FormSchema,
  server = createStellarServer()
) {
  try {
    // Generate random keypair if accountId is not provided
    if (!formData.accountId) {
      const keypair = Keypair.random();
      formData.accountId = keypair.publicKey();
    }
    
    // Load account from Stellar blockchain
    const accountData = await server.loadAccount(formData.accountId);
    
    // Fetch existing account data attributes
    const accountDataAttributes = await fetchAccountDataAttributes(formData.accountId, server);
    
    // Build transaction with account data
    const transaction = await buildTransaction(accountData, formData, accountDataAttributes);
    
    // Convert transaction to XDR
    const xdr = transaction.toXDR();
    
    return xdr;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "NotFoundError") {
        throw new Error("Account not found or not funded. Please make sure your account exists on Stellar.");
      }
      
      // Re-throw the original error
      throw error;
    }
    
    // If it's not a proper Error object, throw a generic error
    throw new Error("Unknown error generating Stellar transaction");
  }
} 