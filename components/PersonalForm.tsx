"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Check, AlertCircle, Copy, CopyCheck } from "lucide-react";
import { z } from "zod";
import { StrKey } from "stellar-sdk";
import { generatePersonalTransaction } from "@/lib/stellar/personalTransaction";
import type { PersonalFormSchema } from "@/lib/stellar/personalTransaction";
import { fetchAccountDataAttributes } from "@/lib/stellar/account";
import { MANAGE_DATA_KEYS } from "@/lib/stellar/transactionBuilder";
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

// Вынесем схему для личной формы, чтобы не дублировать код валидации
// Включаем только нужные поля: accountId, name, about, website
const personalFormSchema = z.object({
  accountId: z.string()
    .min(1, "Account ID is required")
    .refine((value) => StrKey.isValidEd25519PublicKey(value), {
      message: "Invalid Stellar account ID",
    }),
  name: z
    .string()
    .min(1, "Name is required")
    .refine((value) => {
      // Calculate UTF-8 byte length of a string
      const byteLength = new TextEncoder().encode(value).length;
      return byteLength <= 64;
    }, {
      message: "Name must not exceed 64 bytes in UTF-8 encoding",
    }),
  about: z
    .string()
    .min(1, "About is required")
    .refine((value) => {
      const byteLength = new TextEncoder().encode(value).length;
      return byteLength <= 64;
    }, {
      message: "About must not exceed 64 bytes in UTF-8 encoding",
    }),
  website: z
    .string()
    .optional()
    .refine((val) => !val || val.startsWith('http'), {
      message: "Must be a valid URL",
    })
    .refine((val) => {
      if (!val) return true;
      const byteLength = new TextEncoder().encode(val).length;
      return byteLength <= 64;
    }, {
      message: "Website URL must not exceed 64 bytes in UTF-8 encoding",
    }),
});

// Используем тип из personalTransaction.ts
// type PersonalFormSchema = z.infer<typeof personalFormSchema>;

// Функция для расчета byte length текста (повторно используется в компоненте)
const calculateByteLength = (str: string): number => {
  return new TextEncoder().encode(str).length;
};

export default function PersonalForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionXDR, setTransactionXDR] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  
  // Состояния для загрузки данных аккаунта
  const [isFetchingAccountData, setIsFetchingAccountData] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accountDataAttributes, setAccountDataAttributes] = useState<Record<string, string | Buffer>>({});
  const [lastFetchedAccountId, setLastFetchedAccountId] = useState<string | null>(null);
  const [originalFormData, setOriginalFormData] = useState<Partial<PersonalFormSchema>>({});
  
  // Ref для блока с транзакцией
  const transactionCardRef = useRef<HTMLDivElement>(null);

  // Прокрутка к блоку с транзакцией при её генерации
  useEffect(() => {
    if (transactionXDR && transactionCardRef.current) {
      transactionCardRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [transactionXDR]);

  // Initialize form
  const form = useForm<PersonalFormSchema>({
    resolver: zodResolver(personalFormSchema),
    defaultValues: {
      accountId: "",
      name: "",
      about: "",
      website: "",
    },
    mode: "onChange",
  });

  // Функция для заполнения формы данными из блокчейна
  const populateForm = useCallback((dataAttributes: Record<string, string | Buffer>) => {
    try {
      console.log('Starting form population with data:', dataAttributes);
      
      // Создаем объект для хранения оригинальных данных
      const original: {
        name?: string;
        about?: string;
        website?: string;
      } = {};
      
      // Обрабатываем поля
      const mappings = {
        [MANAGE_DATA_KEYS.NAME]: "name",
        [MANAGE_DATA_KEYS.ABOUT]: "about",
        [MANAGE_DATA_KEYS.WEBSITE]: "website",
      };
      
      // Устанавливаем поля
      for (const [attrKey, formKey] of Object.entries(mappings)) {
        const value = dataAttributes[attrKey];
        if (value) {
          try {
            const stringValue = Buffer.isBuffer(value) ? value.toString('utf8') : value;
            console.log(`Setting form field ${formKey} with value:`, stringValue);
            form.setValue(formKey as keyof PersonalFormSchema, stringValue, { shouldValidate: true });
            // Сохраняем оригинальное значение
            original[formKey as keyof typeof original] = stringValue;
          } catch (error) {
            console.error(`Error setting form field ${formKey}:`, error);
          }
        }
      }
      
      // Сохраняем оригинальные данные
      setOriginalFormData(original);
      
      // Данные загружены успешно
      toast.success("Account data loaded successfully");
    } catch (error) {
      console.error("Error populating form:", error);
      toast.error("Error populating form with account data");
    }
  }, [form]);

  // Функция для загрузки данных аккаунта
  const fetchAccountData = useCallback(async (accountId: string) => {
    // Проверяем валидность ID
    if (!accountId || !StrKey.isValidEd25519PublicKey(accountId)) {
      if (accountId && accountId.length > 10) {
        toast.error("Введенный Account ID не является валидным Stellar адресом");
        setFetchError("Invalid Stellar Account ID format");
      }
      console.log('AccountID is empty or invalid:', { accountId, isValid: accountId ? StrKey.isValidEd25519PublicKey(accountId) : false });
      return;
    }
    
    // Не загружаем повторно, если данные для этого аккаунта уже были загружены
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
      
      // Проверяем, есть ли данные
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

  // Form submission handler
  const onSubmit = async (data: PersonalFormSchema) => {
    setIsSubmitting(true);
    
    try {
      // Создаём объект только с изменёнными данными, если есть оригинальные данные
      const changedData: PersonalFormSchema = { ...data };
      
      if (Object.keys(originalFormData).length > 0) {
        // Проверяем и обрабатываем поля
        if (originalFormData.name === data.name) {
          changedData.name = "";
        }
        
        if (originalFormData.about === data.about) {
          changedData.about = "";
        }
        
        if (originalFormData.website === data.website) {
          changedData.website = "";
        }
        
        console.log("Original data:", originalFormData);
        console.log("Current data:", data);
        console.log("Changed data:", changedData);
      }
      
      // Генерируем транзакцию, используя функцию для личной формы
      const xdr = await generatePersonalTransaction(changedData);
      setTransactionXDR(xdr);
      toast.success("Transaction generated successfully!");
    } catch (error) {
      console.error("Error submitting form:", error);
      
      // Отображаем конкретное сообщение об ошибке, если доступно
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Error generating transaction");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Функция копирования XDR в буфер обмена
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transactionXDR);
      setIsCopied(true);
      toast.success("Transaction XDR copied to clipboard");
      
      // Сбросить статус копирования через 2 секунды
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
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
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Enter your name"
                            {...field}
                            className="pr-20 input-glow"
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                            {calculateByteLength(field.value)}/64 bytes
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Your full name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* About Field */}
                <FormField
                  control={form.control}
                  name="about"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>About *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Brief description about yourself"
                            className="pr-20 input-glow"
                            {...field}
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                            {calculateByteLength(field.value)}/64 bytes
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        A short description about yourself
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Website Field */}
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="https://example.com"
                            {...field}
                            className="pr-20 input-glow"
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                            {calculateByteLength(field.value || "")}/64 bytes
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Your personal website or social media URL
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
                  onClick={copyToClipboard}
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
            </div>
          </CardContent>
        </Card>
      )}

      <Toaster position="bottom-right" />
    </div>
  );
} 