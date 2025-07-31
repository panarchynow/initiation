import React, { useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FormConfig, UseFormBuilderReturn } from "@/lib/config/formConfig.interface";
import { useAccountData, type BaseFormData } from "./useAccountData";
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

  // Account data integration (optional)
  const accountDataHook = config.accountDataConfig 
    ? useAccountData(form as any, config.accountDataConfig as any)
    : {
        isFetchingAccountData: false,
        fetchError: null,
        accountDataAttributes: {},
        originalFormData: {},
        fetchAccountData: async () => {},
      };

  // Transaction generation
  const transactionConfig = {
    generateTransaction: async (data: any) => {
      const { generateStellarTransaction } = await import("@/lib/stellar/transactionGenerator");
      return generateStellarTransaction(data);
    },
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
      await generateTransaction(processedData, accountDataHook.originalFormData);

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
    isFetchingAccountData: accountDataHook.isFetchingAccountData,
    fetchError: accountDataHook.fetchError,
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