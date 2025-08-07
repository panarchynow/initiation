"use client";

import { Horizon } from '@stellar/stellar-sdk';
import { STELLAR_CONFIG, getNetworkConfigByType, type StellarNetwork } from './config';

// Create Stellar server instance
export function createStellarServer(serverUrl = STELLAR_CONFIG.SERVER_URL) {
  return new Horizon.Server(serverUrl);
}

// Create Stellar server instance for specific network
export function createStellarServerForNetwork(networkType: StellarNetwork = 'mainnet') {
  const config = getNetworkConfigByType(networkType);
  return new Horizon.Server(config.SERVER_URL);
} 