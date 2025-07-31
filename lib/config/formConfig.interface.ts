import { z } from "zod";
import type { UseFormReturn } from "react-hook-form";
import type { AccountDataConfig, BaseFormData } from "@/hooks/useAccountData";

// Field configuration for form builder
export interface FieldConfig {
  // Field identification
  name: string;
  type: 'text' | 'url' | 'number' | 'checkbox' | 'boolean' | 'dynamic-array' | 'tags';
  
  // Display properties
  label: string;
  placeholder?: string;
  description?: string;
  
  // Validation
  required?: boolean;
  maxBytes?: number;
  
  // Dynamic array specific
  arrayConfig?: {
    addButtonText?: string;
    itemLabel?: string;
    maxItems?: number;
    validateUniqueness?: boolean;
  };
}

// Field group configuration
export interface FieldGroupConfig {
  title: string;
  description?: string;
  variant?: 'card' | 'section' | 'minimal';
  icon?: string; // Icon key instead of ReactNode
  fields: FieldConfig[];
}

// Complete form configuration
export interface FormConfig<T extends BaseFormData> {
  // Form metadata
  title: string;
  description?: string;
  
  // Validation schema
  schema: z.ZodSchema<T>;
  defaultValues: T;
  
  // Account data integration
  accountDataConfig?: AccountDataConfig<T>;
  
  // UI structure
  fieldGroups: FieldGroupConfig[];
  
  // Behavior configuration
  showAccountDataLoader?: boolean;
  autoLoadAccountData?: boolean;
  
  // Transaction configuration
  transactionConfig?: {
    generateTransaction?: (data: Partial<T>) => Promise<string>;
    processChangedData?: (currentData: T, originalData: Partial<T>) => Partial<T>;
    generateTransactionMessage?: (data: T) => string;
  };
}

// Form builder hook return type
export interface UseFormBuilderReturn<T extends BaseFormData> {
  // Form instance
  form: UseFormReturn<T>;
  
  // State
  isSubmitting: boolean;
  submitError: string | null;
  transactionXDR: string;
  isCopied: boolean;
  originalFormData: Partial<T>;
  
  // Account data
  isFetchingAccountData: boolean;
  fetchError: string | null;
  
  // Telegram integration
  telegramBotUrl: string | null;
  isTelegramUrlLoading: boolean;
  
  // Handlers
  handleSubmit: (data: T) => Promise<void>;
  handleReset: () => void;
  handleTelegramOpen: () => Promise<void>;
  fetchAccountData: (accountId: string) => Promise<void>;
  copyToClipboard: (text: string) => void;
  
  // Refs
  transactionCardRef: React.RefObject<HTMLDivElement>;
}

// Types are already exported above as interfaces