"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Check, AlertCircle, Plus, Minus, Copy, CopyCheck, ExternalLink } from "lucide-react";
import { z } from "zod";
import { StrKey } from "stellar-sdk";
import { generateParticipantTransaction } from "@/lib/stellar/participantTransaction";
import type { ParticipantFormSchema } from "@/lib/stellar/participantTransaction";
import { fetchAccountDataAttributes } from "@/lib/stellar/account";
import { MANAGE_DATA_KEYS } from "@/lib/stellar/transactionBuilder";
import { extractPartOfId, formatPartOfKey } from "@/lib/stellar/partof";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import TagSelector from "@/components/form/TagSelector";
import FileUploadField from "@/components/form/FileUploadField";
import { uploadFile } from "@/lib/upload";
import { createStellarServer } from "@/lib/stellar/server";
import * as StellarSdk from "stellar-sdk";
import { STELLAR_CONFIG } from "@/lib/stellar/config";
import { addStellarUri } from "@/lib/stellarUriService";
import { buildSep7TransactionUri } from "@/lib/stellar/sep7UriBuilder";

// Схема валидации для формы участника
const participantFormSchema = z.object({
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
  partOf: z.array(
    z.object({
      id: z.string().regex(/^\d+$/, "ID must contain only numbers"),
      accountId: z.string().refine(
        (val) => val === "" || StrKey.isValidEd25519PublicKey(val), {
          message: "Invalid Stellar account ID",
        }
      ),
    })
  )
  .refine(
    (parts) => {
      const nonEmptyAccountIds = parts
        .map(part => part.accountId)
        .filter(id => id !== "");
      const uniqueAccountIds = new Set(nonEmptyAccountIds);
      return nonEmptyAccountIds.length === uniqueAccountIds.size;
    },
    {
      message: "All Part Of account IDs must be unique"
    }
  ),
  telegramUserID: z
    .string()
    .regex(/^\d*$/, "Must contain only numbers")
    .optional()
    .refine((val) => {
      if (!val) return true;
      const byteLength = new TextEncoder().encode(val).length;
      return byteLength <= 64;
    }, {
      message: "Telegram User ID must not exceed 64 bytes",
    }),
  tags: z
    .array(z.string())
    .optional(),
  timeTokenCode: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const byteLength = new TextEncoder().encode(val).length;
      return byteLength <= 64;
    }, {
      message: "Time Token Code must not exceed 64 bytes",
    }),
  timeTokenIssuer: z
    .string()
    .optional()
    .refine((val) => !val || StrKey.isValidEd25519PublicKey(val), {
      message: "Invalid Stellar account ID",
    }),
  timeTokenDesc: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const byteLength = new TextEncoder().encode(val).length;
      return byteLength <= 64;
    }, {
      message: "Time Token Description must not exceed 64 bytes",
    }),
  timeTokenOfferIPFS: z
    .string()
    .optional(),
}).refine(
  (data) => {
    if (!data.partOf.length) return true;
    return !data.partOf.some(part => 
      part.accountId !== "" && part.accountId === data.accountId
    );
  },
  {
    message: "Part Of account IDs must not match the main Account ID",
    path: ["partOf"],
  }
);

// Функция для расчета byte length текста
const calculateByteLength = (str: string): number => {
  return new TextEncoder().encode(str).length;
};

// Опрдеделяем функцию для получения тега по ID, которая будет использоваться в populateForm
const getTagById = (key: string) => {
  // Реализация аналогична функции в lib/stellar/tags.ts
  const tagMatch = key.match(/^Tag(.+)$/);
  if (!tagMatch) return null;
  
  return {
    id: tagMatch[1].toLowerCase(),
    key: key
  };
};

export default function ParticipantForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionXDR, setTransactionXDR] = useState("");
  const [uploadTab, setUploadTab] = useState("file");
  const [isCopied, setIsCopied] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [telegramBotUrl, setTelegramBotUrl] = useState<string | null>(null);
  const [isTelegramUrlLoading, setIsTelegramUrlLoading] = useState(false);
  
  // Состояния для загрузки данных аккаунта
  const [isFetchingAccountData, setIsFetchingAccountData] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accountDataAttributes, setAccountDataAttributes] = useState<Record<string, string | Buffer>>({});
  const [lastFetchedAccountId, setLastFetchedAccountId] = useState<string | null>(null);
  const [originalFormData, setOriginalFormData] = useState<Partial<ParticipantFormSchema>>({});
  
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
  const form = useForm<ParticipantFormSchema>({
    resolver: zodResolver(participantFormSchema),
    defaultValues: {
      accountId: "",
      name: "",
      about: "",
      website: "",
      partOf: [{ id: "1", accountId: "" }],
      telegramUserID: "",
      tags: [],
      timeTokenCode: "",
      timeTokenIssuer: "",
      timeTokenDesc: "",
      timeTokenOfferIPFS: "",
    },
    mode: "onChange",
  });

  // Проверяем наличие IPFS хеша и устанавливаем соответствующий таб
  useEffect(() => {
    const ipfsHash = form.getValues("timeTokenOfferIPFS");
    if (ipfsHash && ipfsHash.trim() !== "") {
      setUploadTab("hash");
    }
  }, [form]);

  // Initialize field array for PartOf fields
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "partOf",
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
        telegramUserID?: string;
        timeTokenCode?: string;
        timeTokenIssuer?: string;
        timeTokenDesc?: string;
        timeTokenOfferIPFS?: string;
        partOf?: Array<{id: string, accountId: string}>;
        tags?: string[];
      } = {};
      
      // Обрабатываем стандартные поля
      const mappings = {
        [MANAGE_DATA_KEYS.NAME]: "name",
        [MANAGE_DATA_KEYS.ABOUT]: "about",
        [MANAGE_DATA_KEYS.WEBSITE]: "website",
        [MANAGE_DATA_KEYS.TELEGRAM_USER_ID]: "telegramUserID",
        [MANAGE_DATA_KEYS.TIME_TOKEN_CODE]: "timeTokenCode",
        [MANAGE_DATA_KEYS.TIME_TOKEN_ISSUER]: "timeTokenIssuer",
        [MANAGE_DATA_KEYS.TIME_TOKEN_DESC]: "timeTokenDesc",
        [MANAGE_DATA_KEYS.TIME_TOKEN_OFFER_IPFS]: "timeTokenOfferIPFS",
      };
      
      // Сначала устанавливаем известные поля
      for (const [attrKey, formKey] of Object.entries(mappings)) {
        const value = dataAttributes[attrKey];
        if (value) {
          try {
            const stringValue = Buffer.isBuffer(value) ? value.toString('utf8') : value;
            console.log(`Setting form field ${formKey} with value:`, stringValue);
            form.setValue(formKey as keyof ParticipantFormSchema, stringValue, { shouldValidate: true });
            // Сохраняем оригинальное значение
            if (typeof stringValue === 'string') {
              (original as Record<string, unknown>)[formKey] = stringValue;
              
              // Если это IPFS хеш, устанавливаем соответствующий таб
              if (formKey === "timeTokenOfferIPFS" && stringValue.trim() !== "") {
                setUploadTab("hash");
              }
            }
          } catch (error) {
            console.error(`Error setting form field ${formKey}:`, error);
          }
        }
      }
      
      // Обрабатываем PartOf
      try {
        const partOfKeys = Object.keys(dataAttributes).filter(key => key.startsWith('PartOf') && /^PartOf\d+$/.test(key));
        console.log('Found PartOf keys:', partOfKeys);
        
        if (partOfKeys.length > 0) {
          const partOf = partOfKeys.map(key => {
            const id = String(extractPartOfId(key) || "0");
            const value = dataAttributes[key];
            const accountId = Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
            return { id, accountId };
          }).sort((a, b) => Number(a.id) - Number(b.id));
          
          console.log('Mapped PartOf:', partOf);
          
          // Обновляем массив в форме
          replace(partOf.length > 0 ? partOf : [{ id: "1", accountId: "" }]);
          // Сохраняем оригинальное значение
          original.partOf = JSON.parse(JSON.stringify(partOf));
        }
      } catch (error) {
        console.error('Error processing PartOf data:', error);
      }
      
      // Обрабатываем теги
      try {
        const tagKeys = Object.keys(dataAttributes).filter(key => key.startsWith('Tag'));
        console.log('Found Tag keys:', tagKeys);
        
        const tagIds: string[] = [];
        
        for (const key of tagKeys) {
          const tag = getTagById(key);
          if (tag) {
            tagIds.push(tag.id);
          }
        }
        
        console.log('Collected tag IDs:', tagIds);
        
        if (tagIds.length > 0) {
          form.setValue('tags', tagIds, { shouldValidate: true });
          // Сохраняем оригинальное значение
          original.tags = tagIds;
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

  // Add new PartOf field
  const addPartOf = () => {
    const newId = String(fields.length + 1);
    append({ id: newId, accountId: "" });
    // Сбрасываем ошибку при добавлении нового поля
    setDuplicateError(null);
  };

  // Form submission handler
  const onSubmit = async (data: ParticipantFormSchema) => {
    setIsSubmitting(true);
    // Сначала сбрасываем ошибку
    setDuplicateError(null);
    
    try {
      // Проверяем дубликаты вручную и показываем уведомление
      const nonEmptyAccountIds = data.partOf
        .map(part => part.accountId)
        .filter(id => id !== ""); // Игнорируем пустые
      
      const uniqueIds = new Set(nonEmptyAccountIds);
      
      // Если есть дубликаты, показываем ошибку
      if (nonEmptyAccountIds.length !== uniqueIds.size) {
        // Выводим ошибку в UI
        setDuplicateError("Все Account ID для Part Of должны быть уникальными!");
        
        // Принудительно вызываем toast
        setTimeout(() => {
          toast.error("Все Account ID для Part Of должны быть уникальными!");
        }, 0);
        
        setIsSubmitting(false);
        return;
      }
      
      // Создаём объект только с изменёнными данными, если есть оригинальные данные
      const changedData: ParticipantFormSchema = { ...data };
      
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
        
        if (originalFormData.telegramUserID === data.telegramUserID) {
          changedData.telegramUserID = "";
        }
        
        if (originalFormData.timeTokenCode === data.timeTokenCode) {
          changedData.timeTokenCode = "";
        }
        
        if (originalFormData.timeTokenIssuer === data.timeTokenIssuer) {
          changedData.timeTokenIssuer = "";
        }
        
        if (originalFormData.timeTokenDesc === data.timeTokenDesc) {
          changedData.timeTokenDesc = "";
        }
        
        if (originalFormData.timeTokenOfferIPFS === data.timeTokenOfferIPFS) {
          changedData.timeTokenOfferIPFS = "";
        }
        
        // My Parts требуют особой обработки, так как это массив
        let deletedPartOf: Array<{id: string, accountId: string}> = [];
        // Определяем тип для заменённых позиций
        let replacedPartOf: Array<{id: string, accountId: string, replacedWith: string | null}> = [];
        
        if (originalFormData.partOf && originalFormData.partOf.length > 0) {
          // Находим удаленные PartOf с учетом соответствия полей по позиции
          deletedPartOf = originalFormData.partOf.filter(originalPart => {
            // Если у оригинального значения нет accountId, игнорируем его
            if (!originalPart.accountId) return false;
            
            // Ищем в новой форме поле с тем же id
            const matchingField = data.partOf.find(newPart => newPart.id === originalPart.id);
            
            // Если поле с таким id вообще не найдено, то оригинальное значение было удалено
            if (!matchingField) return true;
            
            // Если поле найдено, но значение изменилось - это удаление с заменой
            if (matchingField.accountId !== originalPart.accountId) return true;
            
            // В остальных случаях считаем, что значение не было удалено
            return false;
          });
          
          console.log("Deleted PartOf:", deletedPartOf);
          
          // Для каждого удаленного поля также запомним, было ли оно заменено новым значением
          replacedPartOf = deletedPartOf.map(deletedPart => {
            const matchingField = data.partOf.find(newPart => newPart.id === deletedPart.id);
            return {
              ...deletedPart,
              replacedWith: matchingField?.accountId || null
            };
          });
          
          console.log("Replaced PartOf:", replacedPartOf);
        }
        
        // Теги не нужно обрабатывать здесь особым образом, так как обновленная логика
        // в lib/stellar/participantTransaction.ts сама обрабатывает добавление новых и удаление старых тегов
        // Просто передаем текущий выбранный набор
        changedData.tags = data.tags;
        
        console.log("Original data:", originalFormData);
        console.log("Current data:", data);
        console.log("Changed data:", changedData);
        
        // Обрабатываем удаленные PartOf если есть
        if (deletedPartOf.length > 0) {
          try {
            // Копируем массив replacedPartOf в локальную переменную для использования в блоке
            const replacedParts = [...replacedPartOf];
            
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
            
            // Добавляем новые PartOf
            for (const part of changedData.partOf) {
              if (part.accountId && part.accountId !== "") {
                // Проверяем, новое ли это значение или замена существующего
                const partIsReplacement = replacedParts.some(
                  (replacedPart) => replacedPart.id === part.id && replacedPart.replacedWith === part.accountId
                );
                
                // Если это замена существующего, то не нужно добавлять операцию,
                // так как мы уже добавили операцию на удаление и добавим новую операцию ниже
                if (!partIsReplacement) {
                  const existingPartId = originalFormData.partOf?.find(p => p.accountId === part.accountId)?.id;
                  if (!existingPartId) {
                    // Это новый PartOf, нужно добавить
                    // Здесь нужна логика для генерации новых ID, но мы оставим это на транзакцию из generateParticipantTransaction
                  }
                }
              }
            }
            
            // Добавляем операции для удаления PartOf (set value to null)
            for (const part of deletedPartOf) {
              const key = formatPartOfKey(part.id);
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
                const key = formatPartOfKey(part.id);
                transaction.addOperation(
                  StellarSdk.Operation.manageData({
                    name: key,
                    value: part.replacedWith
                  })
                );
              }
            }
            
            // Добавляем остальные поля
            if (changedData.telegramUserID) {
              transaction.addOperation(
                StellarSdk.Operation.manageData({
                  name: MANAGE_DATA_KEYS.TELEGRAM_USER_ID,
                  value: changedData.telegramUserID
                })
              );
            }
            
            if (changedData.timeTokenCode) {
              transaction.addOperation(
                StellarSdk.Operation.manageData({
                  name: MANAGE_DATA_KEYS.TIME_TOKEN_CODE,
                  value: changedData.timeTokenCode
                })
              );
            }
            
            if (changedData.timeTokenIssuer) {
              transaction.addOperation(
                StellarSdk.Operation.manageData({
                  name: MANAGE_DATA_KEYS.TIME_TOKEN_ISSUER,
                  value: changedData.timeTokenIssuer
                })
              );
            }
            
            if (changedData.timeTokenDesc) {
              transaction.addOperation(
                StellarSdk.Operation.manageData({
                  name: MANAGE_DATA_KEYS.TIME_TOKEN_DESC,
                  value: changedData.timeTokenDesc
                })
              );
            }
            
            if (changedData.timeTokenOfferIPFS) {
              transaction.addOperation(
                StellarSdk.Operation.manageData({
                  name: MANAGE_DATA_KEYS.TIME_TOKEN_OFFER_IPFS,
                  value: changedData.timeTokenOfferIPFS
                })
              );
            }
            
            // Обрабатываем теги
            if (changedData.tags && changedData.tags.length > 0) {
              for (const tagId of changedData.tags) {
                const tag = getTagById(tagId);
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
          }
        }
      }
      
      // Генерируем транзакцию, используя функцию для формы участника
      const xdr = await generateParticipantTransaction(changedData);
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

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    try {
      // Сохраняем информацию о файле
      setUploadedFileInfo({
        name: file.name,
        size: file.size
      });
      
      const ipfsHash = await uploadFile(file);
      form.setValue("timeTokenOfferIPFS", ipfsHash, { shouldValidate: true });
      
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

                {/* PartOf Fields */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel>Part Of</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPartOf}
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
                        name={`partOf.${index}.accountId`}
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
                  
                  {/* Отображаем ошибку для массива partOf из состояния */}
                  {duplicateError && (
                    <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>{duplicateError}</span>
                    </div>
                  )}
                  
                  {/* Отображаем ошибку для массива partOf из валидатора */}
                  {form.formState.errors.partOf?.root?.message && (
                    <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>{form.formState.errors.partOf.root.message}</span>
                    </div>
                  )}
                </div>

                {/* TelegramUserID Field */}
                <FormField
                  control={form.control}
                  name="telegramUserID"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telegram User ID (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Enter Telegram user ID"
                            {...field}
                            className="pr-20 input-glow"
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                            {calculateByteLength(field.value || "")}/64 bytes
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Your Telegram user ID (numbers only)
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
                        Select relevant tags for your profile
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* TimeTokenCode Field */}
                <FormField
                  control={form.control}
                  name="timeTokenCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Token Code (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Enter time token code"
                            {...field}
                            className="pr-20 input-glow"
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                            {calculateByteLength(field.value || "")}/64 bytes
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Code for your time token
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* TimeTokenIssuer Field */}
                <FormField
                  control={form.control}
                  name="timeTokenIssuer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Token Issuer (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter Stellar account ID of the issuer"
                          {...field}
                          className="input-glow"
                        />
                      </FormControl>
                      <FormDescription>
                        Stellar account ID of the time token issuer
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* TimeTokenDesc Field */}
                <FormField
                  control={form.control}
                  name="timeTokenDesc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Token Description (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Enter time token description"
                            {...field}
                            className="pr-20 input-glow"
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                            {calculateByteLength(field.value || "")}/64 bytes
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Description of your time token
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* TimeTokenOfferIPFS Field */}
                <FormItem className="space-y-4">
                  <FormLabel>Time Token Offer IPFS (Optional)</FormLabel>
                  
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
                      {form.formState.errors.timeTokenOfferIPFS && (
                        <p className="text-sm font-medium text-destructive mt-2">
                          {form.formState.errors.timeTokenOfferIPFS.message}
                        </p>
                      )}
                    </TabsContent>
                    <TabsContent value="hash" className="pt-4">
                      <FormField
                        control={form.control}
                        name="timeTokenOfferIPFS"
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
                              Enter an existing IPFS hash for your time token offer
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
                        const stellarUri = buildSep7TransactionUri(transactionXDR, {
                          msg: "Please sign this transaction",
                          return_url: window.location.href
                        });
                        const url = await addStellarUri(stellarUri);
                        setTelegramBotUrl(url);
                        window.open(url, '_blank');
                      } catch (error) {
                        console.error("Error getting Telegram URL:", error);
                        toast.error("Error getting Telegram bot URL");
                      } finally {
                        setIsTelegramUrlLoading(false);
                      }
                    } else {
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