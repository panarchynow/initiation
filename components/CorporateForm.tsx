"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Check, AlertCircle, Plus, Minus, Copy, CopyCheck, ExternalLink } from "lucide-react";
import type { FormSchema } from "@/lib/validation";
import { formSchema, calculateByteLength } from "@/lib/validation";
import { generateStellarTransaction } from "@/lib/stellar/index";
import { fetchAccountDataAttributes } from "@/lib/stellar/account";
import { MANAGE_DATA_KEYS } from "@/lib/stellar/transactionBuilder";
import { getTagByKey } from "@/lib/stellar/tags";
import { extractMyPartId, formatMyPartKey } from "@/lib/stellar/mypart";
import { StrKey } from "stellar-sdk";
import { uploadFile } from "@/lib/upload";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import TagSelector from "@/components/form/TagSelector";
import FileUploadField from "@/components/form/FileUploadField";
import { createStellarServer } from "@/lib/stellar/server";
import * as StellarSdk from "stellar-sdk";
import { STELLAR_CONFIG } from "@/lib/stellar/config";
import { addStellarUri } from "@/lib/stellarUriService";
import { buildSep7TransactionUri } from "@/lib/stellar/sep7UriBuilder";

export default function CorporateForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionXDR, setTransactionXDR] = useState("");
  const [uploadTab, setUploadTab] = useState("file");
  const [isCopied, setIsCopied] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  
  // Новые состояния для загрузки данных аккаунта
  const [isFetchingAccountData, setIsFetchingAccountData] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accountDataAttributes, setAccountDataAttributes] = useState<Record<string, string | Buffer>>({});
  const [lastFetchedAccountId, setLastFetchedAccountId] = useState<string | null>(null);
  const [originalFormData, setOriginalFormData] = useState<Partial<FormSchema>>({});
  const [telegramBotUrl, setTelegramBotUrl] = useState<string | null>(null);
  const [isTelegramUrlLoading, setIsTelegramUrlLoading] = useState(false);
  
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
    },
    mode: "onChange",
  });

  // Проверяем наличие IPFS хеша и устанавливаем соответствующий таб
  useEffect(() => {
    const ipfsHash = form.getValues("contractIPFSHash");
    if (ipfsHash && ipfsHash.trim() !== "") {
      setUploadTab("hash");
    }
  }, [form]);

  // Initialize field array for MyPart fields
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "myParts",
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
        contractIPFSHash?: string;
        telegramPartChatID?: string;
        myParts?: Array<{id: string, accountId: string}>;
        tags?: string[];
      } = {};
      
      // Обрабатываем стандартные поля
      const mappings = {
        [MANAGE_DATA_KEYS.NAME]: "name",
        [MANAGE_DATA_KEYS.ABOUT]: "about",
        [MANAGE_DATA_KEYS.WEBSITE]: "website",
        [MANAGE_DATA_KEYS.CONTRACT_IPFS]: "contractIPFSHash",
        [MANAGE_DATA_KEYS.TELEGRAM_PART_CHAT_ID]: "telegramPartChatID",
      };
      
      // Сначала устанавливаем известные поля
      for (const [attrKey, formKey] of Object.entries(mappings)) {
        const value = dataAttributes[attrKey];
        if (value) {
          try {
            const stringValue = Buffer.isBuffer(value) ? value.toString('utf8') : value;
            console.log(`Setting form field ${formKey} with value:`, stringValue);
            form.setValue(formKey as keyof FormSchema, stringValue, { shouldValidate: true });
            // Сохраняем оригинальное значение
            if (typeof stringValue === 'string') {
              (original as Record<string, unknown>)[formKey] = stringValue;
              
              // Если это IPFS хеш, устанавливаем соответствующий таб
              if (formKey === "contractIPFSHash" && stringValue.trim() !== "") {
                setUploadTab("hash");
              }
            }
          } catch (error) {
            console.error(`Error setting form field ${formKey}:`, error);
          }
        }
      }
      
      // Обрабатываем MyPart
      try {
        const myPartKeys = Object.keys(dataAttributes).filter(key => key.startsWith('MyPart') && /^MyPart\d+$/.test(key));
        console.log('Found MyPart keys:', myPartKeys);
        
        if (myPartKeys.length > 0) {
          const myParts = myPartKeys.map(key => {
            const id = String(extractMyPartId(key) || "0");
            const value = dataAttributes[key];
            const accountId = Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
            return { id, accountId };
          }).sort((a, b) => Number(a.id) - Number(b.id));
          
          console.log('Mapped MyParts:', myParts);
          
          // Обновляем массив в форме
          replace(myParts.length > 0 ? myParts : [{ id: "1", accountId: "" }]);
          // Сохраняем оригинальное значение
          original.myParts = JSON.parse(JSON.stringify(myParts));
        }
      } catch (error) {
        console.error('Error processing MyPart data:', error);
      }
      
      // Обрабатываем теги
      try {
        const tagKeys = Object.keys(dataAttributes).filter(key => key.startsWith('Tag'));
        console.log('Found Tag keys:', tagKeys);
        
        const tagIds: string[] = [];
        
        for (const key of tagKeys) {
          const tag = getTagByKey(key);
          if (tag) {
            tagIds.push(tag.id);
          }
        }
        
        console.log('Collected tag IDs:', tagIds);
        
        if (tagIds.length > 0) {
          form.setValue('tags', tagIds, { shouldValidate: true });
          // Сохраняем оригинальное значение
          original.tags = [...tagIds];
        }
      } catch (error) {
        console.error('Error processing Tag data:', error);
      }
      
      // Сохраняем оригинальные данные
      setOriginalFormData(original);
      
      // Данные загружены успешно
      toast.success("Account data loaded successfully");
    } catch (error) {
      console.error("Error populating form:", error);
      toast.error("Error populating form with account data");
    }
  }, [form, replace]);

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

  // Add new MyPart field
  const addMyPart = () => {
    const newId = String(fields.length + 1);
    append({ id: newId, accountId: "" });
    // Сбрасываем ошибку при добавлении нового поля
    setDuplicateError(null);
  };

  // Form submission handler
  const onSubmit = async (data: FormSchema) => {
    setIsSubmitting(true);
    // Сначала сбрасываем ошибку
    setDuplicateError(null);
    
    try {
      // Проверяем дубликаты вручную и показываем уведомление
      const nonEmptyAccountIds = data.myParts
        .map(part => part.accountId)
        .filter(id => id !== ""); // Игнорируем пустые
      
      const uniqueIds = new Set(nonEmptyAccountIds);
      
      // Если есть дубликаты, показываем ошибку
      if (nonEmptyAccountIds.length !== uniqueIds.size) {
        // Выводим ошибку в UI
        setDuplicateError("Все Account ID для My Parts должны быть уникальными!");
        
        // Принудительно вызываем toast
        setTimeout(() => {
          toast.error("Все Account ID для My Parts должны быть уникальными!");
        }, 0);
        
        setIsSubmitting(false);
        return;
      }
      
      // Создаём объект только с изменёнными данными, если есть оригинальные данные
      const changedData: FormSchema = { ...data };
      
      if (Object.keys(originalFormData).length > 0) {
        // Проверяем и обрабатываем стандартные поля
        if (originalFormData.name === data.name) {
          changedData.name = "";
        }
        
        if (originalFormData.about === data.about) {
          changedData.about = "";
        }
        
        if (originalFormData.website === data.website) {
          changedData.website = "";
        }
        
        if (originalFormData.contractIPFSHash === data.contractIPFSHash) {
          changedData.contractIPFSHash = "";
        }
        
        if (originalFormData.telegramPartChatID === data.telegramPartChatID) {
          changedData.telegramPartChatID = "";
        }
        
        // My Parts требуют особой обработки, так как это массив
        let deletedMyParts: Array<{id: string, accountId: string}> = [];
        // Определяем тип для заменённых позиций
        let replacedMyParts: Array<{id: string, accountId: string, replacedWith: string | null}> = [];
        
        if (originalFormData.myParts && originalFormData.myParts.length > 0) {
          // Находим удаленные MyParts с учетом соответствия полей по позиции
          deletedMyParts = originalFormData.myParts.filter(originalPart => {
            // Если у оригинального значения нет accountId, игнорируем его
            if (!originalPart.accountId) return false;
            
            // Ищем в новой форме поле с тем же id
            const matchingField = data.myParts.find(newPart => newPart.id === originalPart.id);
            
            // Если поле с таким id вообще не найдено, то оригинальное значение было удалено
            if (!matchingField) return true;
            
            // Если поле найдено, но значение изменилось - это удаление с заменой
            if (matchingField.accountId !== originalPart.accountId) return true;
            
            // В остальных случаях считаем, что значение не было удалено
            return false;
          });
          
          console.log("Deleted MyParts:", deletedMyParts);
          
          // Для каждого удаленного поля также запомним, было ли оно заменено новым значением
          replacedMyParts = deletedMyParts.map(deletedPart => {
            const matchingField = data.myParts.find(newPart => newPart.id === deletedPart.id);
            return {
              ...deletedPart,
              replacedWith: matchingField?.accountId || null
            };
          });
          
          console.log("Replaced MyParts:", replacedMyParts);
        }
        
        // Теги не нужно обрабатывать здесь особым образом, так как обновленная логика
        // в lib/stellar/transactionBuilder.ts сама обрабатывает добавление новых и удаление старых тегов
        // Просто передаем текущий выбранный набор
        changedData.tags = data.tags;
        
        console.log("Original data:", originalFormData);
        console.log("Current data:", data);
        console.log("Changed data:", changedData);
        
        // Обрабатываем удаленные MyParts если есть
        if (deletedMyParts.length > 0) {
          try {
            // Копируем массив replacedMyParts в локальную переменную для использования в блоке
            const replacedParts = [...replacedMyParts];
            
            // Загружаем существующий аккаунт
            const server = createStellarServer();
            const accountData = await server.loadAccount(data.accountId);
            
            // Создаем новую транзакцию для всех изменений
            const transaction = new StellarSdk.TransactionBuilder(accountData, {
              fee: STELLAR_CONFIG.BASE_FEE,
              networkPassphrase: STELLAR_CONFIG.NETWORK,
            })
            .setTimeout(STELLAR_CONFIG.TIMEOUT_MINUTES * 60);
            
            // Добавляем операции для основных полей (только если они изменились)
            if (changedData.name && changedData.name !== "") {
              transaction.addOperation(
                StellarSdk.Operation.manageData({
                  name: MANAGE_DATA_KEYS.NAME,
                  value: changedData.name
                })
              );
            }
            
            if (changedData.about && changedData.about !== "") {
              transaction.addOperation(
                StellarSdk.Operation.manageData({
                  name: MANAGE_DATA_KEYS.ABOUT,
                  value: changedData.about
                })
              );
            }
            
            if (changedData.website) {
              transaction.addOperation(
                StellarSdk.Operation.manageData({
                  name: MANAGE_DATA_KEYS.WEBSITE,
                  value: changedData.website
                })
              );
            }
            
            // Добавляем новые MyParts
            for (const part of changedData.myParts) {
              if (part.accountId && part.accountId !== "") {
                // Проверяем, новое ли это значение или замена существующего
                const partIsReplacement = replacedParts.some(
                  (replacedPart) => replacedPart.id === part.id && replacedPart.replacedWith === part.accountId
                );
                
                // Если это замена существующего, то не нужно добавлять операцию,
                // так как мы уже добавили операцию на удаление и добавим новую операцию ниже
                if (!partIsReplacement) {
                  const existingPartId = originalFormData.myParts?.find(p => p.accountId === part.accountId)?.id;
                  if (!existingPartId) {
                    // Это новый MyPart, нужно добавить
                    // Здесь нужна логика для генерации новых ID, но мы оставим это на транзакцию из generateStellarTransaction
                  }
                }
              }
            }
            
            // Добавляем операции для удаления MyParts (set value to null)
            for (const part of deletedMyParts) {
              const key = formatMyPartKey(part.id);
              transaction.addOperation(
                StellarSdk.Operation.manageData({
                  name: key,
                  value: null // null означает удаление
                })
              );
            }
            
            // Добавляем операции для новых значений, которые заменили старые
            for (const part of replacedParts) {
              if (part.replacedWith) {
                const key = formatMyPartKey(part.id);
                transaction.addOperation(
                  StellarSdk.Operation.manageData({
                    name: key,
                    value: part.replacedWith
                  })
                );
              }
            }
            
            // Добавляем остальные поля
            if (changedData.telegramPartChatID) {
              transaction.addOperation(
                StellarSdk.Operation.manageData({
                  name: MANAGE_DATA_KEYS.TELEGRAM_PART_CHAT_ID,
                  value: changedData.telegramPartChatID
                })
              );
            }
            
            if (changedData.contractIPFSHash) {
              transaction.addOperation(
                StellarSdk.Operation.manageData({
                  name: MANAGE_DATA_KEYS.CONTRACT_IPFS,
                  value: changedData.contractIPFSHash
                })
              );
            }
            
            // Обрабатываем теги
            if (changedData.tags && changedData.tags.length > 0) {
              for (const tagId of changedData.tags) {
                const tag = getTagByKey(tagId);
                if (tag && data.accountId) {
                  transaction.addOperation(
                    StellarSdk.Operation.manageData({
                      name: tag.key,
                      value: data.accountId
                    })
                  );
                }
              }
            }
            
            // Строим транзакцию
            const combinedXdr = transaction.build().toXDR();
            
            // Устанавливаем XDR
            setTransactionXDR(combinedXdr);
            toast.success("Transaction generated successfully!");
            return;
          } catch (error) {
            console.error("Error creating combined transaction:", error);
            // В случае ошибки, продолжаем выполнение с обычной генерацией транзакции ниже
          }
        }
        
        // Обычная генерация транзакции, если нет удаленных MyParts или произошла ошибка
        const xdr = await generateStellarTransaction(changedData);
        setTransactionXDR(xdr);
        toast.success("Transaction generated successfully!");
      } else {
        // Получаем XDR для всех данных, если нет оригинальных
        const xdr = await generateStellarTransaction(data);
        setTransactionXDR(xdr);
        toast.success("Transaction generated successfully!");
      }
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

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    try {
      // Сохраняем информацию о файле
      setUploadedFileInfo({
        name: file.name,
        size: file.size
      });
      
      const ipfsHash = await uploadFile(file);
      form.setValue("contractIPFSHash", ipfsHash, { shouldValidate: true });
      
      // Отмечаем, что файл был успешно загружен
      setIsFileUploaded(true);
      
      toast.success("File uploaded successfully");
      return ipfsHash;
    } catch (error) {
      console.error("File upload error:", error);
      toast.error("Error uploading file");
      return null;
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
                        Your company's official name
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
                            placeholder="Brief description of your company"
                            className="pr-20 input-glow"
                            {...field}
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                            {calculateByteLength(field.value)}/64 bytes
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        A short description of your company
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
                        Your company website URL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* MyPart Fields */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel>My Parts</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMyPart}
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
                                    // Сбрасываем ошибку при изменении поля
                                    setDuplicateError(null);
                                  }}
                                />
                              </FormControl>
                              {index > 0 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    remove(index);
                                    // Сбрасываем ошибку при удалении поля
                                    setDuplicateError(null);
                                  }}
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
                  
                  {/* Отображаем ошибку для массива myParts из состояния */}
                  {duplicateError && (
                    <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>{duplicateError}</span>
                    </div>
                  )}
                  
                  {/* Отображаем ошибку для массива myParts из валидатора */}
                  {form.formState.errors.myParts?.root?.message && (
                    <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>{form.formState.errors.myParts.root.message}</span>
                    </div>
                  )}
                </div>

                {/* TelegramPartChatID Field */}
                <FormField
                  control={form.control}
                  name="telegramPartChatID"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telegram Part Chat ID (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter Telegram chat ID"
                          {...field}
                          className="input-glow"
                        />
                      </FormControl>
                      <FormDescription>
                        Telegram chat ID for communication
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                {/* ContractIPFS Field */}
                <FormItem className="space-y-4">
                  <FormLabel>Contract IPFS (Optional)</FormLabel>
                  
                  <Tabs
                    defaultValue="file"
                    value={uploadTab}
                    onValueChange={setUploadTab}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="file">Upload File</TabsTrigger>
                      <TabsTrigger value="hash">IPFS Hash</TabsTrigger>
                    </TabsList>
                    <TabsContent value="file" className="pt-4">
                      <FileUploadField 
                        onUpload={handleFileUpload} 
                        fileInfo={uploadedFileInfo}
                      />
                      {form.formState.errors.contractIPFSHash && (
                        <p className="text-sm font-medium text-destructive mt-2">
                          {form.formState.errors.contractIPFSHash.message}
                        </p>
                      )}
                    </TabsContent>
                    <TabsContent value="hash" className="pt-4">
                      <FormField
                        control={form.control}
                        name="contractIPFSHash"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="Enter IPFS hash"
                                {...field}
                                className="input-glow"
                              />
                            </FormControl>
                            <FormDescription>
                              Enter an existing IPFS hash for your contract
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                </FormItem>
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
                
                {/* MMWB Button */}
                <Button
                  variant="default"
                  className="relative"
                  disabled={isTelegramUrlLoading && !telegramBotUrl}
                  onClick={async () => {
                    if (!telegramBotUrl) {
                      setIsTelegramUrlLoading(true);
                      try {
                        // Получаем SEP-0007 URI для транзакции
                        const stellarUri = buildSep7TransactionUri(transactionXDR, {
                          msg: "Please sign this transaction",
                          return_url: window.location.href
                        });
                        // Отправляем URI на сервер и получаем URL для Telegram бота
                        const url = await addStellarUri(stellarUri);
                        setTelegramBotUrl(url);
                        // Открываем полученный URL в новой вкладке
                        window.open(url, '_blank');
                      } catch (error) {
                        console.error("Error getting Telegram URL:", error);
                        toast.error("Error getting Telegram bot URL");
                      } finally {
                        setIsTelegramUrlLoading(false);
                      }
                    } else {
                      // Если URL уже получен, просто открываем его
                      window.open(telegramBotUrl, '_blank');
                    }
                  }}
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