"use client";

import React from "react";
import { type FieldPath, type FieldValues } from "react-hook-form";
import { StrKey } from '@stellar/stellar-sdk';
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

export interface StellarAccountInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  allowEmpty?: boolean;
}

export function StellarAccountInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  label,
  placeholder = "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  description,
  required = false,
  disabled = false,
  className,
  allowEmpty = false,
}: StellarAccountInputProps<TFieldValues, TName>) {
  return (
    <FormField
      name={name}
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
          <FormItem className={className}>
            <FormLabel className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
              {label}
            </FormLabel>
            
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            
            <FormControl>
              <Input
                {...field}
                type="text"
                placeholder={placeholder}
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
  );
}

export default StellarAccountInput;