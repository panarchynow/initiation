import React, { useState, useCallback } from "react";
import { type UseFormReturn } from "react-hook-form";
import { fetchAccountDataAttributesForNetwork } from "@/lib/stellar/account";
import { type StellarNetwork } from "@/lib/stellar/config";
import { toast } from "sonner";
import { StrKey } from '@stellar/stellar-sdk';

export interface UseNetworkAwareAccountDataProps<T extends Record<string, any>> {
  form: UseFormReturn<T>;
  accountIdFieldName?: string;
  networkFieldName?: string;
  autoLoad?: boolean;
  onDataLoaded?: (
    data: Record<string, string | Buffer>, 
    meta?: {
      hasData: boolean;
      network: StellarNetwork;
      accountId: string;
      error?: string;
    }
  ) => void;
}

export interface UseNetworkAwareAccountDataReturn<T extends Record<string, any>> {
  isFetchingAccountData: boolean;
  fetchError: string | null;
  accountDataAttributes: Record<string, string | Buffer>;
  lastFetchedAccountId: string | null;
  lastFetchedNetwork: StellarNetwork | null;
  fetchAccountData: (accountId?: string, network?: StellarNetwork) => Promise<void>;
  resetAccountData: () => void;
}

export function useNetworkAwareAccountData<T extends Record<string, any>>({
  form,
  accountIdFieldName = "accountId",
  networkFieldName = "network",
  autoLoad = false,
  onDataLoaded,
}: UseNetworkAwareAccountDataProps<T>): UseNetworkAwareAccountDataReturn<T> {
  
  const [isFetchingAccountData, setIsFetchingAccountData] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accountDataAttributes, setAccountDataAttributes] = useState<Record<string, string | Buffer>>({});
  const [lastFetchedAccountId, setLastFetchedAccountId] = useState<string | null>(null);
  const [lastFetchedNetwork, setLastFetchedNetwork] = useState<StellarNetwork | null>(null);

  // Watch form values
  const accountId = form.watch(accountIdFieldName as any) as string;
  const network = form.watch(networkFieldName as any) as StellarNetwork || 'mainnet';

  // Function to fetch account data
  const fetchAccountData = useCallback(async (
    targetAccountId?: string, 
    targetNetwork?: StellarNetwork
  ) => {
    const accountToFetch = targetAccountId || accountId;
    const networkToFetch = targetNetwork || network;

    if (!accountToFetch) {
      console.log('No account ID provided for fetching');
      return;
    }

    // Validate account ID format
    if (!StrKey.isValidEd25519PublicKey(accountToFetch)) {
      setFetchError("Invalid Stellar account ID format");
      return;
    }

    setIsFetchingAccountData(true);
    setFetchError(null);

    try {
      console.log(`Fetching account data for ${accountToFetch} on ${networkToFetch} network`);
      
      const data = await fetchAccountDataAttributesForNetwork(accountToFetch, networkToFetch);
      
      setAccountDataAttributes(data);
      setLastFetchedAccountId(accountToFetch);
      setLastFetchedNetwork(networkToFetch);
      
      // Check if account has any data
      const hasData = Object.keys(data).length > 0;
      
      // Call callback if provided - pass both data and network info
      if (onDataLoaded) {
        onDataLoaded(data, { 
          hasData, 
          network: networkToFetch, 
          accountId: accountToFetch 
        });
      }

      if (hasData) {
        console.log(`Successfully loaded data for account ${accountToFetch} on ${networkToFetch}:`, data);
        toast.success(`Account data loaded from ${networkToFetch}`);
      } else {
        console.log(`No data found for account ${accountToFetch} on ${networkToFetch}`);
        toast.info(`No existing data found on ${networkToFetch}`);
      }
      
    } catch (error) {
      console.error("Error fetching account data:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch account data";
      setFetchError(errorMessage);
      
      // Clear data on error and call callback to clear form
      setAccountDataAttributes({});
      setLastFetchedAccountId(accountToFetch);
      setLastFetchedNetwork(networkToFetch);
      
      if (onDataLoaded) {
        onDataLoaded({}, { 
          hasData: false, 
          network: networkToFetch, 
          accountId: accountToFetch,
          error: errorMessage 
        });
      }
      
      toast.error(`Error loading data from ${networkToFetch}: ${errorMessage}`);
    } finally {
      setIsFetchingAccountData(false);
    }
  }, [accountId, network, onDataLoaded]);

  // Reset account data
  const resetAccountData = useCallback(() => {
    setAccountDataAttributes({});
    setLastFetchedAccountId(null);
    setLastFetchedNetwork(null);
    setFetchError(null);
  }, []);

  // Auto-load when accountId or network changes
  React.useEffect(() => {
    if (!autoLoad || !accountId || isFetchingAccountData) {
      return;
    }

    // Check if we need to reload (account or network changed)
    const needsReload = (
      (lastFetchedAccountId !== accountId) ||
      (lastFetchedNetwork !== network)
    );

    if (needsReload && StrKey.isValidEd25519PublicKey(accountId)) {
      // Debounce the loading
      const timeoutId = setTimeout(() => {
        fetchAccountData(accountId, network);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [accountId, network, autoLoad, lastFetchedAccountId, lastFetchedNetwork, isFetchingAccountData, fetchAccountData]);

  return {
    isFetchingAccountData,
    fetchError,
    accountDataAttributes,
    lastFetchedAccountId,
    lastFetchedNetwork,
    fetchAccountData,
    resetAccountData,
  };
}
