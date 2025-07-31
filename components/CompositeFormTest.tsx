"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { StrKey } from '@stellar/stellar-sdk';
import { User, Tags, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";

// Import composite components
import {
  BaseForm,
  TransactionResult,
  FieldGroup,
  AccountDataLoader,
} from "@/components/form/composite";

// Import atomic components
import {
  ByteLimitedInput,
  DynamicFieldArray,
  TagSelectorField,
  FormFieldWrapper,
} from "@/components/form/fields";

// Import hooks
import { useClipboard } from "@/hooks/useClipboard";
import { useTelegramIntegration } from "@/hooks/useTelegramIntegration";
import { useAccountData } from "@/hooks/useAccountData";

import { useTransactionGeneration } from "@/hooks/useTransactionGeneration";

// Import configuration
import { corporateFormAccountDataConfig } from "@/lib/config/corporateFormConfig";

// Test schema - similar to CorporateForm schema
const compositeTestSchema = z.object({
  accountId: z
    .string()
    .min(1, "Account ID is required")
    .refine((value) => StrKey.isValidEd25519PublicKey(value), {
      message: "Invalid Stellar account ID",
    }),
  name: z.string().min(1, "Name is required"),
  about: z.string().min(1, "About is required"),
  website: z.string().optional(),
  contractIPFSHash: z.string().optional(),
  telegramPartChatID: z.string().optional(),
  mtlaPiiStandard: z.boolean().optional(),
  myParts: z.array(
    z.object({
      id: z.string(),
      accountId: z.string(),
    })
  ),
  tags: z.array(z.string()),
});

type CompositeTestFormData = z.infer<typeof compositeTestSchema>;

export default function CompositeFormTest() {
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const transactionCardRef = React.useRef<HTMLDivElement>(null);

  // Form setup
  const form = useForm<CompositeTestFormData>({
    resolver: zodResolver(compositeTestSchema),
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
    mode: "onChange",
  });

  // Hooks - setup in correct order
  const { isCopied, copyToClipboard } = useClipboard();
  const { getTelegramUrl, telegramBotUrl, isTelegramUrlLoading } = useTelegramIntegration();
  
  // Account data loading hook
  const {
    isFetchingAccountData,
    fetchError,
    accountDataAttributes,
    originalFormData,
    fetchAccountData,
  } = useAccountData(form, corporateFormAccountDataConfig as any);
  
  // Process MyParts after account data is loaded
  React.useEffect(() => {
    if (accountDataAttributes && corporateFormAccountDataConfig.processDynamicFields) {
      const processedData = corporateFormAccountDataConfig.processDynamicFields(accountDataAttributes);
      console.log("Processing MyParts for composite test:", processedData);
      if (processedData && processedData.length > 0) {
        console.log("Setting myParts with data:", processedData);
        form.setValue("myParts", processedData);
        console.log("Current form myParts value:", form.getValues("myParts"));
      }
    }
  }, [accountDataAttributes, form]);

  // Transaction generation with config
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

  // Process changed data for transaction
  const processChangedData = React.useCallback((currentData: CompositeTestFormData) => {
    if (!originalFormData) return currentData;

    console.log("Processing changed data...");
    console.log("Current data:", currentData);
    console.log("Original data:", originalFormData);

    const changedData: Partial<CompositeTestFormData> = {};

    // Check each field for changes
    Object.keys(currentData).forEach(key => {
      const currentValue = (currentData as any)[key];
      const originalValue = (originalFormData as any)[key];

      if (key === 'myParts') {
        // Special handling for myParts array
        const originalMyParts = originalValue || [];
        const currentMyParts = currentValue || [];
        
        if (JSON.stringify(originalMyParts) !== JSON.stringify(currentMyParts)) {
          console.log("MyParts changed:", { original: originalMyParts, current: currentMyParts });
          (changedData as any).myParts = currentMyParts;
          (changedData as any).originalMyParts = originalMyParts;
        }
      } else if (key === 'tags') {
        // Special handling for tags array
        const originalTags = originalValue || [];
        const currentTags = currentValue || [];
        
        if (JSON.stringify(originalTags.sort()) !== JSON.stringify(currentTags.sort())) {
          console.log("Tags changed:", { original: originalTags, current: currentTags });
          (changedData as any).tags = currentTags;
        }
      } else if (currentValue !== originalValue) {
        console.log(`${key} changed: ${originalValue} -> ${currentValue}`);
        (changedData as any)[key] = currentValue;
      }
    });

    console.log("Final changed data:", changedData);

    // Always include accountId as it's needed for transaction building
    const finalData = {
      ...changedData,
      accountId: currentData.accountId,
    };

    console.log("Final data with accountId:", finalData);
    return finalData;
  }, [originalFormData]);

  // Handlers
  const handleSubmit = async (data: CompositeTestFormData) => {
    setSubmitError(null);

    try {
      console.log("Generating transaction with data:", processChangedData(data));
      console.log("AccountId being used:", data.accountId);
      console.log("MyParts data:", data.myParts);

      await generateTransaction(processChangedData(data), originalFormData);

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
      // Если URL уже есть, просто открываем его
      window.open(telegramBotUrl, '_blank');
    } else if (transactionXDR) {
      // Если URL еще нет, генерируем его при клике (хук автоматически откроет его)
      await getTelegramUrl(transactionXDR, {
        msg: `Transaction for ${form.getValues("name")}`,
        return_url: window.location.href,
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Composite Components Test</h1>
        <p className="text-muted-foreground mt-2">
          Демонстрация композитных компонентов для создания сложных форм
        </p>
      </div>

      <BaseForm
        form={form}
        title="Example Registration Form"
        description="This form demonstrates how composite components work together"
        submitButtonText="Generate Transaction"
        isSubmitting={isSubmitting}
        submitError={submitError}
        onSubmit={handleSubmit}
        onReset={handleReset}
        showResetButton={true}
        className="max-w-4xl mx-auto"
      >
        {/* Account Data Loading Section */}
        <AccountDataLoader
          form={form}
          isLoading={isFetchingAccountData}
          error={fetchError}
          onLoadData={fetchAccountData}
          variant="card"
          autoLoadOnAccountIdChange={true}
          showLoadButton={false}
        />

        {/* Basic Information Section */}
        <FieldGroup
          title="Basic Information"
          description="Enter your basic profile information"
          variant="section"
          icon={<User className="h-5 w-5" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ByteLimitedInput
              name="name"
              label="Display Name"
              placeholder="Enter your name"
              required
              maxBytes={64}
            />
            
            <ByteLimitedInput
              name="website"
              label="Website"
              placeholder="https://example.com"
              type="url"
              maxBytes={64}
            />
          </div>
          
          <ByteLimitedInput
            name="about"
            label="About"
            placeholder="Tell us about yourself"
            description="A brief description of yourself or your organization"
            required
            maxBytes={64}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ByteLimitedInput
              name="contractIPFSHash"
              label="Contract IPFS Hash"
              placeholder="bafkreigno4fzpyt7oj74qaa4artt4jmqlcjqdbbhr..."
              maxBytes={64}
            />
            
            <ByteLimitedInput
              name="telegramPartChatID"
              label="Telegram Chat ID"
              placeholder="1234567890"
              maxBytes={64}
            />
          </div>

          <FormFieldWrapper
            name="mtlaPiiStandard"
            label="MTLA PII Standard"
            description="Compliant with MTLA Personal Information Standard"
          >
            {(field) => (
              <Switch
                checked={field.value || false}
                onCheckedChange={field.onChange}
              />
            )}
          </FormFieldWrapper>
        </FieldGroup>

        {/* Participants Section */}
        <FieldGroup
          title="Participants"
          description="Manage your participant accounts"
          variant="section"
          icon={<Users className="h-5 w-5" />}
        >
          <DynamicFieldArray
            name="myParts"
            label="My Participants"
            description="Add Stellar account IDs of your participants"
            addButtonText="Add Participant"
            itemLabel="Participant"
            maxItems={5}
            validateUniqueness
            uniquenessErrorMessage="All participant accounts must be unique!"
            form={form}
          />
        </FieldGroup>

        {/* Tags and Preferences */}
        <FieldGroup
          title="Tags & Preferences"
          description="Select tags and configure your preferences"
          variant="section"
          icon={<Tags className="h-5 w-5" />}
        >
          <TagSelectorField
            name="tags"
            label="Profile Tags"
            description="Select relevant tags for your profile"
          />
        </FieldGroup>


      </BaseForm>

      {/* Transaction Result */}
      {transactionXDR && (
        <TransactionResult
          ref={transactionCardRef}
          transactionXDR={transactionXDR}
          isCopied={isCopied}
          onCopy={copyToClipboard}
          telegramBotUrl={telegramBotUrl}
          isTelegramUrlLoading={isTelegramUrlLoading}
          onTelegramOpen={handleTelegramOpen}
          className="max-w-4xl mx-auto"
        />
      )}
    </div>
  );
}