"use client";

import React from "react";
import { type FieldPath, type FieldValues } from "react-hook-form";
import { StrKey } from '@stellar/stellar-sdk';
import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface StellarAccountWithNetworkProps<
  TFieldValues extends FieldValues = FieldValues,
  TAccountName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TNetworkName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
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
}

export function StellarAccountWithNetwork<
  TFieldValues extends FieldValues = FieldValues,
  TAccountName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TNetworkName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
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
}: StellarAccountWithNetworkProps<TFieldValues, TAccountName, TNetworkName>) {
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
              value={field.value}
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
              
              <FormMessage />
              
              {!isEmpty && StrKey.isValidEd25519PublicKey(currentValue) && (
                <p className="text-sm text-green-600">
                  ✓ Valid Stellar account ID
                </p>
              )}
            </FormItem>
          );
        }}
      />
    </div>
  );
}

export default StellarAccountWithNetwork;
