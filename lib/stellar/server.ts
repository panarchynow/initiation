"use client";

import { Horizon } from '@stellar/stellar-sdk';
import { STELLAR_CONFIG } from './config';

// Create Stellar server instance
export function createStellarServer(serverUrl = STELLAR_CONFIG.SERVER_URL) {
  return new Horizon.Server(serverUrl);
} 