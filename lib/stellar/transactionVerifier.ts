"use client";

import * as StellarSdk from '@stellar/stellar-sdk';
import { STELLAR_CONFIG } from './config';

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