"use client";

import { Keypair } from '@stellar/stellar-sdk';
import type { Transaction } from '@stellar/stellar-sdk';
import { createStellarServer, createStellarServerForNetwork } from './server';
import { createStellarConfig, type StellarNetwork } from './config';
import { fetchAccountDataAttributesForNetwork } from './account';
import { buildTransaction } from './transactionBuilder';
import type { FormSchema } from '../validation';

// Generate Stellar transaction for form data
export async function generateStellarTransaction(
  formData: FormSchema & { network?: StellarNetwork }
) {
  try {
    console.log('generateStellarTransaction received formData:', formData);
    console.log('formData.accountId:', formData.accountId);
    console.log('formData.network:', formData.network);
    
    // Use the network from form data, defaulting to mainnet
    const networkType = formData.network || 'mainnet';
    
    // Create server and config for the specified network
    const server = createStellarServerForNetwork(networkType);
    const config = createStellarConfig(networkType);
    
    // Generate random keypair if accountId is not provided
    if (!formData.accountId) {
      const keypair = Keypair.random();
      formData.accountId = keypair.publicKey();
      console.log('Generated new random accountId:', formData.accountId);
    }
    
    console.log('About to load account:', formData.accountId, 'on network:', networkType);
    // Load account from Stellar blockchain
    const accountData = await server.loadAccount(formData.accountId);
    
    // Fetch existing account data attributes for the specified network
    const accountDataAttributes = await fetchAccountDataAttributesForNetwork(formData.accountId, networkType);
    
    // Build transaction with account data using the specific network config
    const transaction = await buildTransaction(accountData, formData, accountDataAttributes, config);
    
    // Convert transaction to XDR
    const xdr = (transaction as Transaction).toXDR();
    
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