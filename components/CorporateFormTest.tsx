"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Check, AlertCircle, Plus, Minus, Copy, CopyCheck, ExternalLink } from "lucide-react";
import type { FormSchema } from "@/lib/validation";
import { formSchema, calculateByteLength } from "@/lib/validation";
import { generateStellarTransaction } from "@/lib/stellar/index";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import TagSelector from "@/components/form/TagSelector";
import { buildSep7TransactionUri } from "@/lib/stellar/sep7UriBuilder";
import { Switch } from "@/components/ui/switch";

// Import new hooks
import { useAccountData } from "@/hooks/useAccountData";
import { useClipboard } from "@/hooks/useClipboard";
import { useTelegramIntegration } from "@/hooks/useTelegramIntegration";
import { useDynamicFields } from "@/hooks/useDynamicFields";
import { useTransactionGeneration } from "@/hooks/useTransactionGeneration";

// Import configuration
import { corporateFormAccountDataConfig } from "@/lib/config/corporateFormConfig";

export default function CorporateFormTest() {
  // Initialize form
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountId: "",
      name: "",
      about: "",
      website: "",
      myParts: [{ id: "1", accountId: "" }],
      telegramPartChatID: "",
      tags: [],
      contractIPFSHash: "",
      mtlaPiiStandard: false,
    },
    mode: "onChange",
  });

  // Use dynamic fields hook
  const { 
    fields, 
    duplicateError, 
    addField, 
    removeField, 
    validateFields,
    resetDuplicateError,
    replace 
  } = useDynamicFields(form, {
    fieldName: "myParts",
    addButtonText: "Add Part",
    duplicateErrorMessage: "All Account IDs for My participants must be unique!",
    validateDuplicates: true,
  });

  // Use account data hook with custom MyPart handler
  const {
    isFetchingAccountData,
    fetchError,
    originalFormData,
    fetchAccountData,
  } = useAccountData(form, {
    ...corporateFormAccountDataConfig,
    processDynamicFields: (dataAttributes) => {
      // Process MyPart fields and update form manually
      const myPartKeys = Object.keys(dataAttributes).filter(
        key => key.startsWith('MyPart') && /^MyPart\d+$/.test(key)
      );
      console.log('Processing MyPart keys in component:', myPartKeys);
      
      if (myPartKeys.length > 0) {
        const myParts = myPartKeys.map(key => {
          const id = key.replace('MyPart', '').replace(/^0+/, '') || "1";
          const value = dataAttributes[key];
          const accountId = Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
          return { id, accountId };
        }).sort((a, b) => Number(a.id) - Number(b.id));
        
        console.log('Updating form with MyParts:', myParts);
        
        // Update the form with replace function
        replace(myParts);
        
        return myParts;
      }
      
      return [];
    },
  });

  const { isCopied, copyToClipboard } = useClipboard();

  const { getTelegramUrl, telegramBotUrl, isTelegramUrlLoading } = useTelegramIntegration();

  const {
    transactionXDR,
    isSubmitting,
    transactionCardRef,
    generateTransaction,
  } = useTransactionGeneration<FormSchema>({
    generateTransaction: async (data: FormSchema) => {
      console.log('Generating transaction with data:', data);
      console.log('AccountId being used:', data.accountId);
      console.log('MyParts data:', data.myParts);
      return await generateStellarTransaction(data);
    },
    processChangedData: (currentData: FormSchema, originalData: Partial<FormSchema>) => {
      console.log('Processing changed data...');
      console.log('Current data:', currentData);
      console.log('Original data:', originalData);
      
      const changedData: Partial<FormSchema> = {};
      
      // Check basic string fields
      const stringFields: (keyof FormSchema)[] = [
        'name', 'about', 'website', 'contractIPFSHash', 'telegramPartChatID'
      ];
      
      stringFields.forEach(field => {
        const currentValue = currentData[field] || '';
        const originalValue = originalData[field] || '';
        
        if (currentValue !== originalValue) {
          console.log(`Field ${field} changed: "${originalValue}" -> "${currentValue}"`);
          (changedData as any)[field] = currentValue;
        }
      });
      
      // Check boolean fields
      if (currentData.mtlaPiiStandard !== originalData.mtlaPiiStandard) {
        console.log(`mtlaPiiStandard changed: ${originalData.mtlaPiiStandard} -> ${currentData.mtlaPiiStandard}`);
        changedData.mtlaPiiStandard = currentData.mtlaPiiStandard;
      }
      
      // Check myParts array
      const currentMyParts = currentData.myParts || [];
      const originalMyParts = originalData.myParts || [];
      
      console.log('Comparing MyParts arrays:');
      console.log('Current MyParts:', currentMyParts);
      console.log('Original MyParts:', originalMyParts);
      
      // Compare arrays by content, not reference
      const myPartsChanged = JSON.stringify(currentMyParts.sort((a, b) => a.id.localeCompare(b.id))) !== 
                            JSON.stringify(originalMyParts.sort((a, b) => a.id.localeCompare(b.id)));
      
      if (myPartsChanged) {
        console.log('MyParts changed:', { original: originalMyParts, current: currentMyParts });
        changedData.myParts = currentMyParts;
        // Also store original myParts to detect deletions
        (changedData as any).originalMyParts = originalMyParts;
      }
      
      // Check tags array
      const currentTags = currentData.tags || [];
      const originalTags = originalData.tags || [];
      
      const tagsChanged = JSON.stringify(currentTags.sort()) !== JSON.stringify(originalTags.sort());
      
      if (tagsChanged) {
        console.log('Tags changed:', { original: originalTags, current: currentTags });
        changedData.tags = currentTags;
      }
      
      console.log('Final changed data:', changedData);
      
      // Always include accountId - it's required for transaction generation
      const result = {
        ...changedData,
        accountId: currentData.accountId
      } as FormSchema;
      
      console.log('Final data with accountId:', result);
      return result;
    },
  });

  // Form submission handler
  const onSubmit = async (data: FormSchema) => {
    // Reset duplicate error first
    resetDuplicateError();
    
    // Validate fields
    if (!validateFields(data)) {
      return;
    }
    
    // Generate transaction
    await generateTransaction(data, originalFormData);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">Test Version</h2>
        <p className="text-blue-700">This is a test version of CorporateForm using the new hooks architecture.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Account ID Field */}
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account ID *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Enter Stellar account ID"
                            {...field}
                            className={`input-glow ${isFetchingAccountData ? 'pr-10' : ''}`}
                            onBlur={(e) => {
                              const accountId = e.target.value.trim();
                              if (accountId) {
                                fetchAccountData(accountId);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const accountId = e.currentTarget.value.trim();
                                if (accountId) {
                                  fetchAccountData(accountId);
                                }
                              }
                            }}
                          />
                          {isFetchingAccountData && (
                            <div className="absolute inset-y-0 right-3 flex items-center">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Your Stellar public account ID
                        {isFetchingAccountData && (
                          <span className="ml-2 text-primary animate-pulse">Loading account data...</span>
                        )}
                      </FormDescription>
                      {fetchError && (
                        <div className="flex items-center gap-2 text-amber-500 text-sm mt-1">
                          <AlertCircle className="h-4 w-4" />
                          <span>{fetchError}</span>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Name Field */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Enter company name"
                            {...field}
                            className="pr-20 input-glow"
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                            {calculateByteLength(field.value)}/64 bytes
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Your company&apos;s official name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* MyPart Fields using new hook */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel>My participants (MyPart relation)</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addField}
                      className="text-primary border-primary/20"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Part
                    </Button>
                  </div>
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-4">
                      <FormField
                        control={form.control}
                        name={`myParts.${index}.accountId`}
                        render={({ field: accountField }) => (
                          <FormItem className="flex-1">
                            <div className="flex items-center gap-2">
                              <FormControl>
                                <Input
                                  placeholder={`Enter account ID for part ${index + 1}`}
                                  {...accountField}
                                  className="input-glow"
                                  onChange={(e) => {
                                    accountField.onChange(e);
                                    resetDuplicateError();
                                  }}
                                />
                              </FormControl>
                              {index > 0 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => removeField(index)}
                                  className="shrink-0 text-destructive border-destructive/20"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                  
                  {/* Display duplicate error */}
                  {duplicateError && (
                    <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>{duplicateError}</span>
                    </div>
                  )}
                </div>

                {/* Tags Field */}
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (Optional)</FormLabel>
                      <FormControl>
                        <TagSelector
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription>
                        Select relevant tags for your company
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="transition-all duration-200 hover:scale-[1.03]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing
                </>
              ) : (
                "Generate Transaction"
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Display transaction XDR */}
      {transactionXDR && (
        <Card className="mt-6 border-primary/20" ref={transactionCardRef}>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-medium">Transaction Generated</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(transactionXDR, "Transaction XDR copied to clipboard")}
                  className="flex items-center gap-1"
                >
                  {isCopied ? (
                    <>
                      <CopyCheck className="h-4 w-4" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy XDR</span>
                    </>
                  )}
                </Button>
              </div>
              <div className="p-4 bg-secondary/50 rounded-md overflow-auto max-h-56">
                <p className="text-sm font-mono break-all">{transactionXDR}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                This is your unsigned Stellar transaction XDR. Copy this value to submit it to the Stellar network.
              </p>
              
              {/* Transaction Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                {/* SEP-0007 Button */}
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  asChild
                >
                  <a 
                    href={buildSep7TransactionUri(transactionXDR, {
                      msg: "Please sign this transaction",
                      return_url: window.location.href
                    })}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>SEP-0007</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                
                {/* MMWB Button using new hook */}
                <Button
                  variant="default"
                  className="relative"
                  disabled={isTelegramUrlLoading && !telegramBotUrl}
                  onClick={() => getTelegramUrl(transactionXDR)}
                  asChild={!!telegramBotUrl}
                >
                  {telegramBotUrl ? (
                    <a 
                      href={telegramBotUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span>MMWB</span>
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  ) : (
                    <>
                      {isTelegramUrlLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          <span>Loading...</span>
                        </>
                      ) : (
                        <>
                          <span>MMWB</span>
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Toaster position="bottom-right" />
    </div>
  );
}