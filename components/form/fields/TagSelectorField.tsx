"use client";

import React from "react";
import { type FieldPath, type FieldValues } from "react-hook-form";
import TagSelector from "@/components/form/TagSelector";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

export interface TagSelectorFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName;
  label: string;
  description?: string;
  required?: boolean;
  className?: string;
}

export function TagSelectorField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  label,
  description,
  required = false,
  className,
}: TagSelectorFieldProps<TFieldValues, TName>) {
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
          
          <TagSelector
            value={field.value || []}
            onChange={field.onChange}
          />
          
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default TagSelectorField;