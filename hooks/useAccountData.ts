import { useState, useCallback } from "react";
import { UseFormReturn } from "react-hook-form";
import { StrKey } from "stellar-sdk";
import { toast } from "sonner";
import { fetchAccountDataAttributes } from "@/lib/stellar/account";
import { MANAGE_DATA_KEYS } from "@/lib/stellar/transactionBuilder";

// Generic types for form data
export interface BaseFormData {
  accountId: string;
  name: string;
  about: string;
  website?: string;
  telegramUserID?: string;
  telegramPartChatID?: string;
  tags?: string[];
  [key: string]: any;
}

export interface DynamicFieldItem {
  id: string;
  accountId: string;
}

// Configuration interface for different form types
export interface AccountDataConfig<T extends BaseFormData> {
  // Field mappings from blockchain keys to form fields
  fieldMappings: Record<string, keyof T>;
  // Function to process dynamic fields (myParts/partOf)
  processDynamicFields?: (
    dataAttributes: Record<string, string | Buffer>
  ) => DynamicFieldItem[];
  // Name of the dynamic field in the form (e.g., 'myParts', 'partOf')
  dynamicFieldName?: string;
  // Function to process tags
  processTags?: (dataAttributes: Record<string, string | Buffer>) => string[];
  // Function to process special fields (like mtlaPiiStandard)
  processSpecialFields?: (
    dataAttributes: Record<string, string | Buffer>,
    form: UseFormReturn<T>
  ) => Partial<T>;
}

export interface UseAccountDataReturn<T extends BaseFormData> {
  // State
  isFetchingAccountData: boolean;
  fetchError: string | null;
  accountDataAttributes: Record<string, string | Buffer>;
  lastFetchedAccountId: string | null;
  originalFormData: Partial<T>;
  
  // Functions
  fetchAccountData: (accountId: string) => Promise<void>;
  resetAccountData: () => void;
}

export function useAccountData<T extends BaseFormData>(
  form: UseFormReturn<T>,
  config: AccountDataConfig<T>
): UseAccountDataReturn<T> {
  // States
  const [isFetchingAccountData, setIsFetchingAccountData] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accountDataAttributes, setAccountDataAttributes] = useState<Record<string, string | Buffer>>({});
  const [lastFetchedAccountId, setLastFetchedAccountId] = useState<string | null>(null);
  const [originalFormData, setOriginalFormData] = useState<Partial<T>>({});

  // Function to populate form with blockchain data
  const populateForm = useCallback((dataAttributes: Record<string, string | Buffer>) => {
    try {
      console.log('Starting form population with data:', dataAttributes);
      
      // Create object for storing original data
      const original: Partial<T> = {};
      
      // Process standard fields
      for (const [attrKey, formKey] of Object.entries(config.fieldMappings)) {
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
      if (config.processDynamicFields) {
        try {
          const dynamicFields = config.processDynamicFields(dataAttributes);
          if (dynamicFields.length > 0) {
            // Store dynamic fields in original data with the correct field name
            const dynamicFieldName = config.dynamicFieldName || 'dynamicFields';
            (original as any)[dynamicFieldName] = JSON.parse(JSON.stringify(dynamicFields));
            console.log(`Storing original ${dynamicFieldName}:`, dynamicFields);
          }
        } catch (error) {
          console.error('Error processing dynamic fields:', error);
        }
      }
      
      // Process tags
      if (config.processTags) {
        try {
          const tagIds = config.processTags(dataAttributes);
          if (tagIds.length > 0) {
            (form.setValue as any)('tags', tagIds, { shouldValidate: true });
            (original as any).tags = [...tagIds];
          }
        } catch (error) {
          console.error('Error processing tags:', error);
        }
      }
      
      // Process special fields
      if (config.processSpecialFields) {
        try {
          const specialFields = config.processSpecialFields(dataAttributes, form);
          Object.assign(original, specialFields);
        } catch (error) {
          console.error('Error processing special fields:', error);
        }
      }
      
      // Save original data
      setOriginalFormData(original);
      
      // Data loaded successfully
      toast.success("Account data loaded successfully");
    } catch (error) {
      console.error("Error populating form:", error);
      toast.error("Error populating form with account data");
    }
  }, [form, config]);

  // Function to fetch account data
  const fetchAccountData = useCallback(async (accountId: string) => {
    // Validate ID
    if (!accountId || !StrKey.isValidEd25519PublicKey(accountId)) {
      if (accountId && accountId.length > 10) {
        toast.error("Введенный Account ID не является валидным Stellar адресом");
        setFetchError("Invalid Stellar Account ID format");
      }
      console.log('AccountID is empty or invalid:', { 
        accountId, 
        isValid: accountId ? StrKey.isValidEd25519PublicKey(accountId) : false 
      });
      return;
    }
    
    // Don't fetch again if data for this account was already loaded
    if (accountId === lastFetchedAccountId) {
      console.log('AccountID already fetched:', accountId);
      return;
    }
    
    console.log('Fetching data for AccountID:', accountId);
    setIsFetchingAccountData(true);
    setFetchError(null);
    
    try {
      console.log('Calling fetchAccountDataAttributes...');
      const data = await fetchAccountDataAttributes(accountId);
      console.log('Fetch result:', data);
      setAccountDataAttributes(data);
      
      // Check if there's data
      if (Object.keys(data).length > 0) {
        console.log('Data found, populating form...');
        populateForm(data);
        setLastFetchedAccountId(accountId);
      } else {
        console.log('No data found for this account');
        setFetchError("No data found for this account");
        toast.info("No existing data found for this account");
      }
    } catch (error) {
      console.error("Error fetching account data:", error);
      setFetchError("Error loading account data");
      toast.error("Error fetching account data from blockchain");
    } finally {
      setIsFetchingAccountData(false);
    }
  }, [lastFetchedAccountId, populateForm]);

  // Function to reset account data
  const resetAccountData = useCallback(() => {
    setIsFetchingAccountData(false);
    setFetchError(null);
    setAccountDataAttributes({});
    setLastFetchedAccountId(null);
    setOriginalFormData({});
  }, []);

  return {
    // State
    isFetchingAccountData,
    fetchError,
    accountDataAttributes,
    lastFetchedAccountId,
    originalFormData,
    
    // Functions
    fetchAccountData,
    resetAccountData,
  };
}