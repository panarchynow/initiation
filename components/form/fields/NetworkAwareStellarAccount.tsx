"use client";

import React from "react";
import { type FieldPath, type FieldValues, type UseFormReturn } from "react-hook-form";
import { StrKey } from '@stellar/stellar-sdk';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNetworkAwareAccountData } from "@/hooks/useNetworkAwareAccountData";
import type { StellarNetwork } from "@/lib/stellar/config";

export interface NetworkAwareStellarAccountProps<
  TFieldValues extends FieldValues = FieldValues,
  TAccountName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TNetworkName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  form: UseFormReturn<TFieldValues>;
  accountName: TAccountName;
  networkName: TNetworkName;
  accountLabel: string;
  networkLabel: string;
  accountPlaceholder?: string;
  accountDescription?: string;
  networkDescription?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  allowEmpty?: boolean;
  autoLoadData?: boolean;
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

export function NetworkAwareStellarAccount<
  TFieldValues extends FieldValues = FieldValues,
  TAccountName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TNetworkName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  form,
  accountName,
  networkName,
  accountLabel,
  networkLabel,
  accountPlaceholder = "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  accountDescription,
  networkDescription,
  required = false,
  disabled = false,
  className,
  allowEmpty = false,
  autoLoadData = true,
  onDataLoaded,
}: NetworkAwareStellarAccountProps<TFieldValues, TAccountName, TNetworkName>) {
  
  const {
    isFetchingAccountData,
    fetchError,
    accountDataAttributes,
    lastFetchedAccountId,
    lastFetchedNetwork,
    fetchAccountData,
  } = useNetworkAwareAccountData({
    form: form as any,
    accountIdFieldName: accountName as string,
    networkFieldName: networkName as string,
    autoLoad: autoLoadData,
    onDataLoaded,
  });

  const accountId = form.watch(accountName) as string;
  const network = form.watch(networkName) as StellarNetwork;

  const handleManualLoad = () => {
    if (accountId && network) {
      fetchAccountData(accountId, network);
    }
  };

  const canLoadData = accountId && StrKey.isValidEd25519PublicKey(accountId) && !isFetchingAccountData;
  const hasBeenLoaded = lastFetchedAccountId === accountId && lastFetchedNetwork === network;
  const hasValidAccount = accountId && StrKey.isValidEd25519PublicKey(accountId);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Network Selection */}
      <FormField
        name={networkName}
        render={({ field }) => (
          <FormItem>
            <FormLabel className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
              {networkLabel}
            </FormLabel>
            
            {networkDescription && (
              <p className="text-sm text-muted-foreground">{networkDescription}</p>
            )}
            
            <Select
              onValueChange={field.onChange}
              value={field.value || 'mainnet'}
              disabled={disabled}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select Stellar network" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="mainnet">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Mainnet</span>
                    <span className="text-xs text-muted-foreground">(Production)</span>
                  </div>
                </SelectItem>
                <SelectItem value="testnet">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>Testnet</span>
                    <span className="text-xs text-muted-foreground">(Development)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Account ID Input */}
      <FormField
        name={accountName}
        render={({ field, fieldState }) => {
          const currentValue = field.value || "";
          const isEmpty = currentValue === "";
          
          // Validation state
          let hasError = false;
          let errorMessage = "";
          
          if (!isEmpty && !StrKey.isValidEd25519PublicKey(currentValue)) {
            hasError = true;
            errorMessage = "Invalid Stellar account ID format";
          } else if (!allowEmpty && isEmpty && required) {
            hasError = true;
            errorMessage = "Stellar account ID is required";
          }
          
          return (
            <FormItem>
              <FormLabel className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
                {accountLabel}
              </FormLabel>
              
              {accountDescription && (
                <p className="text-sm text-muted-foreground">{accountDescription}</p>
              )}
              
              <div className="space-y-2">
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    placeholder={accountPlaceholder}
                    disabled={disabled}
                    className={cn(
                      hasError && "border-red-500 focus-visible:ring-red-500",
                      "font-mono text-sm"
                    )}
                    spellCheck={false}
                    autoComplete="off"
                  />
                </FormControl>

                {/* Manual Load Button and Status */}
                {hasValidAccount && (
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant={hasBeenLoaded ? "outline" : "default"}
                      size="sm"
                      onClick={handleManualLoad}
                      disabled={!canLoadData}
                      className="min-w-[120px]"
                    >
                      {isFetchingAccountData ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : hasBeenLoaded ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Reload Data
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Load Data
                        </>
                      )}
                    </Button>
                    
                    {hasBeenLoaded && !isFetchingAccountData && (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <div className="h-2 w-2 bg-green-500 rounded-full" />
                        Data loaded from {lastFetchedNetwork}
                      </span>
                    )}

                    {fetchError && (
                      <span className="text-sm text-red-600 flex items-center gap-1">
                        <div className="h-2 w-2 bg-red-500 rounded-full" />
                        Failed to load from {network}
                      </span>
                    )}

                    {autoLoadData && hasValidAccount && !hasBeenLoaded && !isFetchingAccountData && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                        Auto-loading in 1s...
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <FormMessage />
              
              {!isEmpty && StrKey.isValidEd25519PublicKey(currentValue) && !hasBeenLoaded && (
                <p className="text-sm text-green-600">
                  ✓ Valid Stellar account ID
                </p>
              )}
            </FormItem>
          );
        }}
      />

      {/* Error Display */}
      {fetchError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load account data: {fetchError}
          </AlertDescription>
        </Alert>
      )}

      {/* Auto-load indicator for network changes */}
      {autoLoadData && hasValidAccount && lastFetchedAccountId === accountId && lastFetchedNetwork !== network && !isFetchingAccountData && (
        <Alert>
          <Download className="h-4 w-4" />
          <AlertDescription>
            Network changed to {network}. Data will be reloaded automatically.
          </AlertDescription>
        </Alert>
      )}

      {/* No data indicator */}
      {hasValidAccount && hasBeenLoaded && !isFetchingAccountData && !fetchError && Object.keys(accountDataAttributes || {}).length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No existing data found for this account on {lastFetchedNetwork}. Form has been cleared.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default NetworkAwareStellarAccount;
