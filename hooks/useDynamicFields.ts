import { useState, useCallback } from "react";
import { useFieldArray, UseFormReturn, FieldArrayWithId } from "react-hook-form";
import { toast } from "sonner";

export interface DynamicFieldItem {
  id: string;
  accountId: string;
}

export interface UseDynamicFieldsConfig {
  fieldName: string;
  addButtonText?: string;
  duplicateErrorMessage?: string;
  validateDuplicates?: boolean;
}

export interface UseDynamicFieldsReturn {
  fields: FieldArrayWithId<any, string, "id">[];
  duplicateError: string | null;
  addField: () => void;
  removeField: (index: number) => void;
  validateFields: (formData: any) => boolean;
  resetDuplicateError: () => void;
  replace: any;
}

export function useDynamicFields<T extends Record<string, any>>(
  form: UseFormReturn<T>,
  config: UseDynamicFieldsConfig
): UseDynamicFieldsReturn {
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: config.fieldName as any,
  });

  const addField = useCallback(() => {
    const newId = String(fields.length + 1);
    append({ id: newId, accountId: "" } as any);
    // Reset error when adding new field
    setDuplicateError(null);
  }, [fields.length, append]);

  const removeField = useCallback((index: number) => {
    remove(index);
    // Reset error when removing field
    setDuplicateError(null);
  }, [remove]);

  const validateFields = useCallback((formData: any) => {
    if (!config.validateDuplicates) return true;
    
    const fieldData = formData[config.fieldName] || [];
    
    // Check for duplicates manually
    const nonEmptyAccountIds = fieldData
      .map((item: DynamicFieldItem) => item.accountId)
      .filter((id: string) => id !== ""); // Ignore empty fields
    
    const uniqueIds = new Set(nonEmptyAccountIds);
    
    // If there are duplicates, show error
    if (nonEmptyAccountIds.length !== uniqueIds.size) {
      const errorMessage = config.duplicateErrorMessage || "All Account IDs must be unique!";
      setDuplicateError(errorMessage);
      
      // Force toast
      setTimeout(() => {
        toast.error(errorMessage);
      }, 0);
      
      return false;
    }
    
    return true;
  }, [config.validateDuplicates, config.duplicateErrorMessage, config.fieldName]);

  const resetDuplicateError = useCallback(() => {
    setDuplicateError(null);
  }, []);

  return {
    fields,
    duplicateError,
    addField,
    removeField,
    validateFields,
    resetDuplicateError,
    replace,
  };
}