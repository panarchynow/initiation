"use client";

import React from "react";
import { useController, type FieldPath, type FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

export interface ByteLimitedInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  maxBytes?: number;
  disabled?: boolean;
  className?: string;
  type?: "text" | "url" | "email";
}

// Calculate UTF-8 byte length of a string
export function calculateByteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

export function ByteLimitedInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  label,
  placeholder,
  description,
  required = false,
  maxBytes = 64,
  disabled = false,
  className,
  type = "text",
}: ByteLimitedInputProps<TFieldValues, TName>) {
  return (
    <FormField
      name={name}
      render={({ field, fieldState }) => {
        const currentValue = field.value || "";
        const currentBytes = calculateByteLength(currentValue);
        const isOverLimit = currentBytes > maxBytes;
        
        return (
          <FormItem className={className}>
            <div className="flex items-center justify-between">
              <FormLabel className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
                {label}
              </FormLabel>
              <span className={cn(
                "text-sm",
                isOverLimit ? "text-red-500" : "text-muted-foreground"
              )}>
                {currentBytes}/{maxBytes} bytes
              </span>
            </div>
            
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            
            <FormControl>
              <Input
                {...field}
                type={type}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                  isOverLimit && "border-red-500 focus-visible:ring-red-500"
                )}
              />
            </FormControl>
            
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

export default ByteLimitedInput;