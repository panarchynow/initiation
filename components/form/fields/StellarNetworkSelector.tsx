"use client";

import React from "react";
import { type FieldPath, type FieldValues } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface StellarNetworkSelectorProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName;
  label: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function StellarNetworkSelector<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  label,
  description,
  required = false,
  disabled = false,
  className,
}: StellarNetworkSelectorProps<TFieldValues, TName>) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
            {label}
          </FormLabel>
          
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
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
  );
}

export default StellarNetworkSelector;
