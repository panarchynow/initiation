"use client";

import React from "react";
import { type FieldPath, type FieldValues } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

export interface FormFieldWrapperProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName;
  label: string;
  description?: string;
  required?: boolean;
  className?: string;
  children: (field: { value: any; onChange: (value: any) => void; onBlur: () => void }) => React.ReactNode;
}

export function FormFieldWrapper<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  label,
  description,
  required = false,
  className,
  children,
}: FormFieldWrapperProps<TFieldValues, TName>) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
            {label}
          </FormLabel>
          
          {description && (
            <FormDescription>{description}</FormDescription>
          )}
          
          <FormControl>
            {children(field)}
          </FormControl>
          
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default FormFieldWrapper;