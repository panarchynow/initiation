"use client";

import * as StellarSdk from '@stellar/stellar-sdk';

// Helper function to determine which network to use based on environment variables
const getNetworkConfig = () => {
  // Check environment variables to determine network
  // Default to PUBLIC (MAINNET) if not specified
  const networkType = process.env.NEXT_PUBLIC_STELLAR_NETWORK_TYPE?.toUpperCase();
  
  // Set network configuration based on environment variable
  if (networkType === 'TESTNET') {
    return {
      SERVER_URL: "https://horizon-testnet.stellar.org",
      NETWORK: StellarSdk.Networks.TESTNET
    };
  }
  
  // Default to PUBLIC (MAINNET)
  return {
    SERVER_URL: "https://horizon.stellar.org",
    NETWORK: StellarSdk.Networks.PUBLIC
  };
};

const networkConfig = getNetworkConfig();

// Stellar configuration
export const STELLAR_CONFIG = {
  SERVER_URL: networkConfig.SERVER_URL,
  NETWORK: networkConfig.NETWORK,
  TIMEOUT_MINUTES: 0, // Setting to 0 for infinite timeout
  BASE_FEE: StellarSdk.BASE_FEE,
  // Add TimeoutInfinite constant for use in the transaction builder
  TIMEOUT_INFINITE: true
}; 