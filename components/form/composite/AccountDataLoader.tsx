"use client";

import React from "react";
import { type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Download, AlertCircle } from "lucide-react";
import { StellarAccountInput } from "@/components/form/fields";
import FieldGroup from "./FieldGroup";

export interface AccountDataLoaderProps<T extends Record<string, any>> {
  // Form integration
  form: UseFormReturn<T>;
  accountIdFieldName?: string;
  
  // Loading state
  isLoading?: boolean;
  error?: string | null;
  
  // Handlers
  onLoadData?: (accountId: string) => void | Promise<void>;
  
  // Configuration
  title?: string;
  description?: string;
  loadButtonText?: string;
  
  // Styling
  className?: string;
  variant?: "card" | "section" | "minimal";
  
  // Behavior
  autoLoadOnAccountIdChange?: boolean;
  showLoadButton?: boolean;
}

export function AccountDataLoader<T extends Record<string, any>>({
  form,
  accountIdFieldName = "accountId",
  isLoading = false,
  error,
  onLoadData,
  title = "Account Data",
  description = "Enter a Stellar account ID to load existing data",
  loadButtonText = "Load Data",
  className,
  variant = "section",
  autoLoadOnAccountIdChange = false,
  showLoadButton = true,
}: AccountDataLoaderProps<T>) {
  const accountId = form.watch(accountIdFieldName as any) as string;
  const [lastLoadedAccountId, setLastLoadedAccountId] = React.useState<string | null>(null);

  // Auto-load functionality
  React.useEffect(() => {
    if (autoLoadOnAccountIdChange && accountId && accountId !== lastLoadedAccountId && onLoadData) {
      const timeoutId = setTimeout(async () => {
        try {
          await onLoadData(accountId);
          setLastLoadedAccountId(accountId);
        } catch (error) {
          console.error("Error auto-loading account data:", error);
        }
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [accountId, autoLoadOnAccountIdChange, lastLoadedAccountId, onLoadData]);

  const handleLoadData = async () => {
    if (!accountId || !onLoadData) return;
    
    try {
      await onLoadData(accountId);
      setLastLoadedAccountId(accountId);
    } catch (error) {
      console.error("Error loading account data:", error);
    }
  };

  const canLoadData = accountId && !isLoading && onLoadData;
  const hasBeenLoaded = lastLoadedAccountId === accountId;

  return (
    <FieldGroup
      title={title}
      description={description}
      variant={variant}
      className={className}
      icon={<Download className="h-5 w-5" />}
    >
      <div className="space-y-4">
        {/* Account ID Input */}
        <StellarAccountInput
          name={accountIdFieldName as any}
          label="Stellar Account ID"
          placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
          description="Enter the public key of the Stellar account"
          required
        />

        {/* Load Button */}
        {showLoadButton && (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant={hasBeenLoaded ? "outline" : "default"}
              onClick={handleLoadData}
              disabled={!canLoadData}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : hasBeenLoaded ? (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Reload Data
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {loadButtonText}
                </>
              )}
            </Button>
            
            {hasBeenLoaded && !isLoading && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                Data loaded successfully
              </span>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Auto-load indicator */}
        {autoLoadOnAccountIdChange && accountId && accountId !== lastLoadedAccountId && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Auto-loading data for this account...
            </AlertDescription>
          </Alert>
        )}
      </div>
    </FieldGroup>
  );
}

export default AccountDataLoader;