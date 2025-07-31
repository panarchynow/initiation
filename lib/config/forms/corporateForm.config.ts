import { z } from "zod";
import type { FormConfig } from "@/lib/config/formConfig.interface";
import { baseFieldSchemas, fieldGroups } from "@/lib/validation/schemas/baseFields";
import { dynamicFieldSchemas } from "@/lib/validation/schemas/dynamicFields";
import type { CorporateFormData } from "./types";
import { corporateFormAccountDataConfigSlim } from "./corporateFormAccountData.config";

// Corporate form schema using modular validation
const corporateFormSchema = z.object({
  accountId: baseFieldSchemas.stellarAccountId,
  ...fieldGroups.basicProfile.shape,
  ...fieldGroups.technicalConfig.shape,
  ...fieldGroups.agreements.shape,
  myParts: dynamicFieldSchemas.myParts,
  tags: baseFieldSchemas.tags,
});

// Verify the Zod schema matches our TypeScript type
export type CorporateFormDataInferred = z.infer<typeof corporateFormSchema>;

// Corporate form configuration
export const corporateFormConfig: FormConfig<CorporateFormData> = {
  title: "Corporate Registration",
  description: "Register your corporate entity on the Stellar network",
  
  schema: corporateFormSchema,
  defaultValues: {
    accountId: "",
    name: "",
    about: "",
    website: "",
    contractIPFSHash: "",
    telegramPartChatID: "",
    mtlaPiiStandard: false,
    myParts: [],
    tags: [],
  },

  // Account data integration
  accountDataConfig: corporateFormAccountDataConfigSlim,
  
  // UI configuration
  showAccountDataLoader: true,
  autoLoadAccountData: true,

  fieldGroups: [
    {
      title: "Basic Information",
      description: "Enter your basic corporate information",
      variant: "minimal",
      icon: "user",
      fields: [
        {
          name: "name",
          type: "text",
          label: "Company Name",
          placeholder: "Enter your company name",
          required: true,
          maxBytes: 64,
        },
        {
          name: "website",
          type: "url",
          label: "Website",
          placeholder: "https://example.com",
          maxBytes: 64,
        },
        {
          name: "about",
          type: "text",
          label: "About",
          placeholder: "Tell us about your company",
          description: "A brief description of your company",
          required: true,
          maxBytes: 64,
        },
      ],
    },
    {
      title: "Technical Configuration",
      description: "Configure technical settings for your corporate account",
      variant: "minimal",
      icon: "settings",
      fields: [
        {
          name: "contractIPFSHash",
          type: "text",
          label: "Contract IPFS Hash",
          placeholder: "bafkreigno4fzpyt7oj74qaa4artt4jmqlcjqdbbhr...",
          maxBytes: 64,
        },
        {
          name: "telegramPartChatID",
          type: "text",
          label: "Telegram Chat ID",
          placeholder: "1234567890",
          maxBytes: 64,
        },
        {
          name: "mtlaPiiStandard",
          type: "boolean",
          label: "MTLA PII Standard",
          description: "Compliant with MTLA Personal Information Standard",
        },
      ],
    },
    {
      title: "Participants",
      description: "Manage your participant accounts",
      variant: "minimal",
      icon: "users",
      fields: [
        {
          name: "myParts",
          type: "dynamic-array",
          label: "My Participants",
          description: "Add Stellar account IDs of your participants",
          arrayConfig: {
            addButtonText: "Add Participant",
            itemLabel: "Participant",
            maxItems: 10,
            validateUniqueness: true,
          },
        },
      ],
    },
    {
      title: "Tags & Preferences",
      description: "Select tags and configure your preferences",
      variant: "minimal",
      icon: "tags",
      fields: [
        {
          name: "tags",
          type: "tags",
          label: "Profile Tags",
          description: "Select relevant tags for your profile",
        },
      ],
    },
  ],

  // Transaction configuration
  transactionConfig: {
    processChangedData: (currentData, originalData) => {
      if (!originalData) return currentData;

      const changedData: Partial<CorporateFormData> = {};

      // Check each field for changes
      Object.keys(currentData).forEach(key => {
        const currentValue = (currentData as any)[key];
        const originalValue = (originalData as any)[key];

        if (key === 'myParts') {
          // Special handling for myParts array
          const originalMyParts = originalValue || [];
          const currentMyParts = currentValue || [];
          
          if (JSON.stringify(originalMyParts) !== JSON.stringify(currentMyParts)) {
            (changedData as any).myParts = currentMyParts;
            (changedData as any).originalMyParts = originalMyParts;
          }
        } else if (key === 'tags') {
          // Special handling for tags array
          const originalTags = originalValue || [];
          const currentTags = currentValue || [];
          
          if (JSON.stringify(originalTags.sort()) !== JSON.stringify(currentTags.sort())) {
            (changedData as any).tags = currentTags;
          }
        } else if (currentValue !== originalValue) {
          (changedData as any)[key] = currentValue;
        }
      });

      // Always include accountId as it's needed for transaction building
      return {
        ...changedData,
        accountId: currentData.accountId,
      };
    },
    
    generateTransactionMessage: (data) => `Corporate transaction for ${data.name}`,
  },
};