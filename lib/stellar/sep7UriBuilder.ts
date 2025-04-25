"use client";

import type { Transaction } from "@stellar/stellar-sdk";
import { STELLAR_CONFIG } from "./config";

/**
 * Options for SEP-0007 URI generation
 */
export interface Sep7UriOptions {
  /** URL to send the signed transaction to */
  callback?: string;
  /** Message to display to the user */
  msg?: string;
  /** Network passphrase (defaults to config) */
  network_passphrase?: string;
  /** Domain originating the request */
  origin_domain?: string;
  /** Return URL for the client to navigate back to after handling the URI */
  return_url?: string;
  /** Replace fields in the transaction (SEP-0011 format) */
  replace?: string;
  /** Public key that should sign the transaction */
  pubkey?: string;
}

/**
 * Builds a SEP-0007 URI for the transaction operation (tx)
 * 
 * @param transaction - The Stellar transaction object or XDR string
 * @param options - Options for the URI
 * @returns A properly formatted SEP-0007 URI
 */
export function buildSep7TransactionUri(
  transaction: Transaction | string,
  options: Sep7UriOptions = {}
): string {
  // Convert transaction to XDR if it's a Transaction object
  const xdr = typeof transaction === "string" 
    ? transaction 
    : transaction.toEnvelope().toXDR("base64");
  
  // Start building the URI with the required parameter
  const params = new URLSearchParams();
  params.append("xdr", xdr);
  
  // Add optional parameters
  if (options.callback) params.append("callback", options.callback);
  if (options.msg) params.append("msg", options.msg);
  if (options.network_passphrase || STELLAR_CONFIG.NETWORK) {
    params.append("network_passphrase", options.network_passphrase || STELLAR_CONFIG.NETWORK);
  }
  if (options.origin_domain) params.append("origin_domain", options.origin_domain);
  if (options.return_url) params.append("return_url", options.return_url);
  if (options.replace) params.append("replace", options.replace);
  if (options.pubkey) params.append("pubkey", options.pubkey);

  // Build the final URI
  return `web+stellar:tx?${params.toString()}`;
}

/**
 * Signs a SEP-0007 URI with the provided private key
 * Not used in most client-side applications, as URI signing is typically done server-side
 * 
 * @param uri - The URI to sign without the signature parameter
 * @param privateKey - The private key to sign with (typically belonging to the origin_domain)
 * @returns The signed URI with the signature parameter appended
 */
export function signSep7Uri(uri: string, privateKey: string): string {
  // To implement URI signing, we would need:
  // 1. Use the Stellar SDK to create a KeyPair from the privateKey
  // 2. Sign the URI string (with &signature= at the end but without the actual signature)
  // 3. Base64 encode and URL encode the signature
  // 4. Return the URI with the signature parameter appended
  
  // This is a placeholder - actual implementation would depend on client needs
  // and would require access to a private key
  throw new Error("URI signing not implemented - requires server-side implementation with private key access");
}

/**
 * Creates a simplified payment request URI according to SEP-0007
 * 
 * @param destination - Recipient's public key
 * @param amount - Amount to send
 * @param options - Additional options (asset_code, asset_issuer, memo, etc.)
 * @returns A properly formatted SEP-0007 pay URI
 */
export interface Sep7PayOptions extends Sep7UriOptions {
  asset_code?: string;
  asset_issuer?: string;
  memo?: string;
  memo_type?: "text" | "id" | "hash" | "return";
}

export function buildSep7PaymentUri(
  destination: string,
  amount?: string,
  options: Sep7PayOptions = {}
): string {
  // Start building the URI with the required parameter
  const params = new URLSearchParams();
  params.append("destination", destination);
  
  // Add optional parameters
  if (amount) params.append("amount", amount);
  if (options.asset_code) params.append("asset_code", options.asset_code);
  if (options.asset_issuer) params.append("asset_issuer", options.asset_issuer);
  if (options.memo) params.append("memo", options.memo);
  if (options.memo_type) params.append("memo_type", options.memo_type);
  if (options.callback) params.append("callback", options.callback);
  if (options.msg) params.append("msg", options.msg);
  if (options.network_passphrase || STELLAR_CONFIG.NETWORK) {
    params.append("network_passphrase", options.network_passphrase || STELLAR_CONFIG.NETWORK);
  }
  if (options.origin_domain) params.append("origin_domain", options.origin_domain);
  if (options.return_url) params.append("return_url", options.return_url);

  // Build the final URI
  return `web+stellar:pay?${params.toString()}`;
} 