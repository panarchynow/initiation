import { z } from "zod";
import type { FormConfig } from "@/lib/config/formConfig.interface";
import { baseFieldSchemas, fieldGroups } from "@/lib/validation/schemas/baseFields";
import { dynamicFieldSchemas } from "@/lib/validation/schemas/dynamicFields";
import type { ParticipantFormData } from "./types";
import { participantFormAccountDataConfig } from "./participantFormAccountData.config";

// Participant form schema using modular validation
const participantFormSchema = z.object({
  accountId: baseFieldSchemas.stellarAccountId,
  ...fieldGroups.basicProfile.shape,
  ...fieldGroups.participantConfig.shape,
  partOf: dynamicFieldSchemas.partOf,
  tags: baseFieldSchemas.tags,
});

// Verify the Zod schema matches our TypeScript type
export type ParticipantFormDataInferred = z.infer<typeof participantFormSchema>;

// Participant form configuration
export const participantFormConfig: FormConfig<ParticipantFormData> = {
  title: "Participant Registration",
  description: "Register as a participant on the Stellar network",

  // Validation schema
  schema: participantFormSchema,
  defaultValues: {
    accountId: "",
    name: "",
    about: "",
    website: "",
    telegramUserID: "",
    timeTokenCode: "",
    timeTokenIssuer: "",
    timeTokenDesc: "",
    timeTokenOfferIPFS: "",
    partOf: [],
    tags: [],
  },

  // Account data integration
  accountDataConfig: participantFormAccountDataConfig,
  
  // UI configuration
  showAccountDataLoader: true,
  autoLoadAccountData: true,

  // Form field structure
  fieldGroups: [
    {
      title: "Basic Information",
      description: "Basic profile information",
      variant: "card",
      icon: "user",
      fields: [
        {
          name: "name",
          type: "text",
          label: "Name",
          description: "Your display name",
          required: true,
          maxBytes: 64,
        },
        {
          name: "about",
          type: "text",
          label: "About",
          description: "Brief description about yourself",
          required: true,
          maxBytes: 64,
        },
        {
          name: "website",
          type: "url",
          label: "Website",
          description: "Your website URL (optional)",
          placeholder: "https://example.com",
          maxBytes: 64,
        },
      ],
    },
    {
      title: "Participant Configuration", 
      description: "Participant-specific settings",
      variant: "card",
      icon: "settings",
      fields: [
        {
          name: "telegramUserID",
          type: "text",
          label: "Telegram User ID",
          description: "Your Telegram user ID (numbers only)",
          placeholder: "123456789",
        },
        {
          name: "timeTokenCode",
          type: "text",
          label: "Time Token Code",
          description: "Time token code (optional)",
        },
        {
          name: "timeTokenIssuer",
          type: "text",
          label: "Time Token Issuer",
          description: "Time token issuer (optional)",
        },
        {
          name: "timeTokenDesc",
          type: "text",
          label: "Time Token Description",
          description: "Time token description (optional)",
        },
        {
          name: "timeTokenOfferIPFS",
          type: "text",
          label: "Time Token Offer IPFS",
          description: "Time token offer IPFS hash (optional)",
        },
      ],
    },
    {
      title: "Part Of Organizations",
      description: "Organizations you are part of",
      variant: "card",
      icon: "users",
      fields: [
        {
          name: "partOf",
          type: "dynamic-array",
          label: "Part Of",
          description: "Organizations you are a participant of",
          arrayConfig: {
            addButtonText: "Add Organization",
            itemLabel: "Organization",
            maxItems: 20,
            validateUniqueness: true,
          },
        },
      ],
    },
    {
      title: "Tags & Preferences",
      description: "Select relevant tags",
      variant: "section",
      icon: "tags",
      fields: [
        {
          name: "tags",
          type: "tags",
          label: "Tags",
          description: "Select tags that describe you or your interests",
        },
      ],
    },
  ],

  // Transaction configuration
  transactionConfig: {
    generateTransaction: async (data: Partial<ParticipantFormData>) => {
      const { generateStellarTransaction } = await import("@/lib/stellar/transactionGenerator");
      return generateStellarTransaction(data as any);
    },
    processChangedData: (currentData: ParticipantFormData, originalData: Partial<ParticipantFormData>) => {
      const changedData: Partial<ParticipantFormData> = {};
      
      // Always include accountId for transaction generation
      changedData.accountId = currentData.accountId;
      
      // Check basic fields - include empty values to handle deletions
      const basicFields: Array<keyof ParticipantFormData> = [
        'name', 'about', 'website', 'telegramUserID', 
        'timeTokenCode', 'timeTokenIssuer', 'timeTokenDesc', 'timeTokenOfferIPFS'
      ];
      
      basicFields.forEach(field => {
        const originalValue = originalData[field];
        const currentValue = currentData[field];
        
        // Normalize values: treat undefined, null, and empty string as equivalent
        const normalizeValue = (val: any) => (val === undefined || val === null || val === '') ? '' : val;
        const normalizedOriginal = normalizeValue(originalValue);
        const normalizedCurrent = normalizeValue(currentValue);
        
        if (normalizedOriginal !== normalizedCurrent) {
          // Include the field with actual current value (empty string should delete the field)
          (changedData as any)[field] = currentValue === '' ? null : currentValue;
          console.log(`Participant field ${field} changed: "${normalizedOriginal}" -> "${normalizedCurrent}" (will be: ${(changedData as any)[field]})`);
        }
      });
      
      // Check partOf changes
      const originalPartOf = originalData.partOf || [];
      const currentPartOf = currentData.partOf || [];
      
      const partOfChanged = JSON.stringify(originalPartOf) !== JSON.stringify(currentPartOf);
      if (partOfChanged) {
        changedData.partOf = currentPartOf;
        // Pass original data for deletion handling in transaction builder
        (changedData as any).originalPartOf = originalPartOf;
        console.log('PartOf changed:', { original: originalPartOf, current: currentPartOf });
      }
      
      // Check tags changes
      const originalTags = originalData.tags || [];
      const currentTags = currentData.tags || [];
      
      const tagsChanged = JSON.stringify(originalTags.sort()) !== JSON.stringify(currentTags.sort());
      if (tagsChanged) {
        changedData.tags = currentTags;
      }
      
      console.log('Participant form changed data:', changedData);
      return changedData;
    },
    generateTransactionMessage: (data: ParticipantFormData) => 
      `Participant registration transaction for ${data.name}`,
  },
};