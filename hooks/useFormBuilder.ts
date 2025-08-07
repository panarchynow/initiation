import React, { useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FormConfig, UseFormBuilderReturn } from "@/lib/config/formConfig.interface";
import { useAccountData, type BaseFormData } from "./useAccountData";
import { useNetworkAwareAccountData } from "./useNetworkAwareAccountData";
import { useTransactionGeneration } from "./useTransactionGeneration";
import { useClipboard } from "./useClipboard";
import { useTelegramIntegration } from "./useTelegramIntegration";

export function useFormBuilder<T extends BaseFormData>(
  config: FormConfig<T>
): UseFormBuilderReturn<T> {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const transactionCardRef = useRef<HTMLDivElement>(null);

  // Form setup
  const form = useForm<T>({
    resolver: zodResolver(config.schema),
    defaultValues: config.defaultValues as any,
    mode: "onChange",
  });

  // Network-aware account data integration
  const networkAwareAccountDataHook = useNetworkAwareAccountData({
    form: form as any,
    accountIdFieldName: "accountId",
    networkFieldName: "network",
    autoLoad: true,
    onDataLoaded: (data, meta) => {
      // Auto-populate form when data is loaded
      if (config.accountDataConfig) {
        if (meta?.hasData) {
          populateFormWithAccountData(data);
        } else {
          // Clear form when no data or error
          clearFormToDefaults();
        }
      }
    },
  });

  // Account data integration (optional, legacy support)
  const accountDataHook = config.accountDataConfig 
    ? useAccountData(form as any, config.accountDataConfig as any)
    : {
        isFetchingAccountData: false,
        fetchError: null,
        accountDataAttributes: {},
        originalFormData: {},
        fetchAccountData: async () => {},
      };

  // Function to clear form to default values (preserving accountId and network)
  const clearFormToDefaults = useCallback(() => {
    try {
      console.log('Clearing form to default values');
      
      if (!config.accountDataConfig) return;
      
      const currentAccountId = form.getValues("accountId" as any);
      const currentNetwork = form.getValues("network" as any);
      
      // Reset to default values
      form.reset(config.defaultValues as any);
      
      // Restore accountId and network
      form.setValue("accountId" as any, currentAccountId, { shouldValidate: true });
      form.setValue("network" as any, currentNetwork, { shouldValidate: true });
      
      // CRITICAL: Clear original data AND set it to current defaults for change detection
      // This prevents the system from thinking that default values were "removed"
      const cleanOriginalData: Partial<T> = {
        ...config.defaultValues,
        accountId: currentAccountId,
        network: currentNetwork,
      };
      
      accountDataHook.originalFormData = cleanOriginalData;
      
      console.log('Form cleared to defaults, preserving accountId and network. Original data reset to:', cleanOriginalData);
      
    } catch (error) {
      console.error("Error clearing form:", error);
    }
  }, [config.defaultValues, config.accountDataConfig, form, accountDataHook]);

  // Function to populate form with account data
  const populateFormWithAccountData = useCallback((dataAttributes: Record<string, string | Buffer>) => {
    if (!config.accountDataConfig) return;

    try {
      console.log('Populating form with account data:', dataAttributes);
      
      // Create object for storing original data
      const original: Partial<T> = {};
      
      // Process standard fields
      for (const [attrKey, formKey] of Object.entries(config.accountDataConfig.fieldMappings)) {
        const value = dataAttributes[attrKey];
        if (value) {
          try {
            const stringValue = Buffer.isBuffer(value) ? value.toString('utf8') : value;
            console.log(`Setting form field ${String(formKey)} with value:`, stringValue);
            (form.setValue as any)(formKey, stringValue, { shouldValidate: true });
            // Save original value
            (original as any)[formKey] = stringValue;
          } catch (error) {
            console.error(`Error setting form field ${String(formKey)}:`, error);
          }
        }
      }
      
      // Process dynamic fields (myParts/partOf)
      if (config.accountDataConfig.processDynamicFields) {
        try {
          const dynamicFields = config.accountDataConfig.processDynamicFields(dataAttributes);
          if (dynamicFields.length > 0) {
            const dynamicFieldName = config.accountDataConfig.dynamicFieldName || 'dynamicFields';
            (form.setValue as any)(dynamicFieldName, dynamicFields, { shouldValidate: true });
            (original as any)[dynamicFieldName] = JSON.parse(JSON.stringify(dynamicFields));
            console.log(`Setting ${dynamicFieldName}:`, dynamicFields);
          }
        } catch (error) {
          console.error('Error processing dynamic fields:', error);
        }
      }
      
      // Process tags
      if (config.accountDataConfig.processTags) {
        try {
          const tagIds = config.accountDataConfig.processTags(dataAttributes);
          if (tagIds.length > 0) {
            (form.setValue as any)('tags', tagIds, { shouldValidate: true });
            (original as any).tags = [...tagIds];
          }
        } catch (error) {
          console.error('Error processing tags:', error);
        }
      }
      
      // Process special fields
      if (config.accountDataConfig.processSpecialFields) {
        try {
          const specialFields = config.accountDataConfig.processSpecialFields(dataAttributes, form);
          Object.assign(original, specialFields);
        } catch (error) {
          console.error('Error processing special fields:', error);
        }
      }
      
      // Update original form data for change detection
      accountDataHook.originalFormData = original;
      
    } catch (error) {
      console.error("Error populating form:", error);
    }
  }, [config.accountDataConfig, form, accountDataHook]);

  // Transaction generation
  const transactionConfig = {
    generateTransaction: config.transactionConfig?.generateTransaction || (async (data: any) => {
      const { generateStellarTransaction } = await import("@/lib/stellar/transactionGenerator");
      // Ensure network field is properly passed to transaction generator
      const dataWithNetwork = {
        ...data,
        network: data.network || 'mainnet'
      };
      return generateStellarTransaction(dataWithNetwork);
    }),
  };

  const {
    transactionXDR,
    isSubmitting,
    resetTransaction,
    generateTransaction,
  } = useTransactionGeneration(transactionConfig);

  // Integrations
  const { isCopied, copyToClipboard } = useClipboard();
  const { getTelegramUrl, telegramBotUrl, isTelegramUrlLoading } = useTelegramIntegration();

  // Process dynamic fields when account data loads
  React.useEffect(() => {
    if (config.accountDataConfig?.processDynamicFields && accountDataHook.accountDataAttributes) {
      const processedData = config.accountDataConfig.processDynamicFields(accountDataHook.accountDataAttributes);
      if (processedData && processedData.length > 0) {
        // Find dynamic field name from config
        const dynamicFieldName = config.accountDataConfig.dynamicFieldName;
        if (dynamicFieldName) {
          form.setValue(dynamicFieldName as any, processedData as any);
        }
      }
    }
  }, [accountDataHook.accountDataAttributes, form, config.accountDataConfig]);

  // Process changed data for transaction
  const processChangedData = useCallback((currentData: T): Partial<T> => {
    if (!accountDataHook.originalFormData || !config.transactionConfig?.processChangedData) {
      return currentData;
    }

    return config.transactionConfig.processChangedData(currentData, accountDataHook.originalFormData as any);
  }, [accountDataHook.originalFormData, config.transactionConfig]);

  // Handlers
  const handleSubmit = async (data: T) => {
    setSubmitError(null);

    try {
      const processedData = processChangedData(data);
      await generateTransaction(processedData, accountDataHook.originalFormData as any);

      // Scroll to transaction result
      setTimeout(() => {
        if (transactionCardRef.current) {
          transactionCardRef.current.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 100);
      
    } catch (error) {
      console.error("Submission error:", error);
      setSubmitError(error instanceof Error ? error.message : "Unknown error occurred");
    }
  };

  const handleReset = () => {
    resetTransaction();
    setSubmitError(null);
  };

  const handleTelegramOpen = async () => {
    if (telegramBotUrl) {
      window.open(telegramBotUrl, '_blank');
    } else if (transactionXDR) {
      const message = config.transactionConfig?.generateTransactionMessage?.(form.getValues()) 
        || `Transaction for ${form.getValues("name" as any) || "account"}`;
        
      await getTelegramUrl(transactionXDR, {
        msg: message,
        return_url: window.location.href,
      });
    }
  };

  return {
    form,
    isSubmitting,
    submitError,
    transactionXDR,
    isFetchingAccountData: networkAwareAccountDataHook.isFetchingAccountData || accountDataHook.isFetchingAccountData,
    fetchError: networkAwareAccountDataHook.fetchError || accountDataHook.fetchError,
    telegramBotUrl,
    isTelegramUrlLoading,
    originalFormData: accountDataHook.originalFormData as Partial<T>,
    isCopied,
    handleSubmit,
    handleReset,
    handleTelegramOpen,
    fetchAccountData: accountDataHook.fetchAccountData,
    copyToClipboard,
    transactionCardRef,
  };
}