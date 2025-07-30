"use client";

import React from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import StellarAccountInput from "./StellarAccountInput";

export interface DynamicFieldItem {
  id: string;
  accountId: string;
}

export interface DynamicFieldArrayProps {
  name: string;
  label: string;
  description?: string;
  addButtonText?: string;
  itemLabel?: string;
  maxItems?: number;
  minItems?: number;
  validateUniqueness?: boolean;
  uniquenessErrorMessage?: string;
  className?: string;
  form: UseFormReturn<any>;
}

export function DynamicFieldArray({
  name,
  label,
  description,
  addButtonText = "Add Item",
  itemLabel = "Account ID",
  maxItems = 10,
  minItems = 1,
  validateUniqueness = true,
  uniquenessErrorMessage = "All account IDs must be unique",
  className,
  form,
}: DynamicFieldArrayProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: name as any,
  });

  // Get current values for uniqueness validation
  const currentValues = form.watch(name) as DynamicFieldItem[];
  
  // Check for duplicates
  const hasDuplicates = React.useMemo(() => {
    if (!validateUniqueness || !currentValues) return false;
    
    const nonEmptyAccountIds = currentValues
      .map(item => item?.accountId || "")
      .filter(id => id !== "");
      
    const uniqueAccountIds = new Set(nonEmptyAccountIds);
    return nonEmptyAccountIds.length !== uniqueAccountIds.size;
  }, [currentValues, validateUniqueness]);

  const addField = () => {
    if (fields.length >= maxItems) return;
    
    const newId = String(fields.length + 1);
    append({ id: newId, accountId: "" } as any);
  };

  const removeField = (index: number) => {
    if (fields.length <= minItems) return;
    remove(index);
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        <div>
          <FormLabel className="text-base font-medium">
            {label}
          </FormLabel>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>

        {hasDuplicates && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">{uniquenessErrorMessage}</p>
          </div>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-2">
              <div className="flex-1">
                <StellarAccountInput
                  name={`${name}.${index}.accountId` as any}
                  label={`${itemLabel} ${index + 1}`}
                  allowEmpty={true}
                  placeholder={`Enter ${itemLabel.toLowerCase()} ${index + 1}`}
                />
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeField(index)}
                disabled={fields.length <= minItems}
                className="mb-2"
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={addField}
            disabled={fields.length >= maxItems}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {addButtonText}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          {fields.length} of {maxItems} items
        </div>
      </div>
    </div>
  );
}

export default DynamicFieldArray;