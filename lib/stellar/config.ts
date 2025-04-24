"use client";

import * as StellarSdk from '@stellar/stellar-sdk';

// Stellar configuration
export const STELLAR_CONFIG = {
  SERVER_URL: "https://horizon-testnet.stellar.org",
  NETWORK: StellarSdk.Networks.TESTNET,
  TIMEOUT_MINUTES: 30,
  BASE_FEE: StellarSdk.BASE_FEE
}; 