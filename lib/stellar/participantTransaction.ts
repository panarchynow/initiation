"use client";

import { Keypair } from 'stellar-sdk';
import { createStellarServer } from './server';
import { fetchAccountDataAttributes } from './account';
import * as StellarSdk from 'stellar-sdk';
import { STELLAR_CONFIG } from './config';
import { MANAGE_DATA_KEYS } from './transactionBuilder';
import { getTagById, addTagOperationsToTransaction } from './tags';
import { formatPartOfKey, generatePartOfIds } from './partof';

// Тип схемы для формы участника
export type ParticipantFormSchema = {
  accountId: string;
  name: string;
  about: string;
  website?: string;
  partOf: Array<{id: string, accountId: string}>;
  telegramUserID?: string;
  tags?: string[];
  timeTokenCode?: string;
  timeTokenIssuer?: string;
  timeTokenDesc?: string;
  timeTokenOfferIPFS?: string;
};

// Генерирует транзакцию Stellar для данных из формы участника
export async function generateParticipantTransaction(
  formData: ParticipantFormSchema,
  server = createStellarServer()
) {
  try {
    // Генерируем случайный keypair, если accountId не предоставлен
    if (!formData.accountId) {
      const keypair = Keypair.random();
      formData.accountId = keypair.publicKey();
    }
    
    // Загружаем аккаунт из блокчейна Stellar
    const accountData = await server.loadAccount(formData.accountId);
    
    // Получаем существующие данные аккаунта
    const accountDataAttributes = await fetchAccountDataAttributes(formData.accountId, server);
    
    // Создаем транзакцию
    const transaction = new StellarSdk.TransactionBuilder(accountData, {
      fee: STELLAR_CONFIG.BASE_FEE,
      networkPassphrase: STELLAR_CONFIG.NETWORK,
    })
    .setTimeout(STELLAR_CONFIG.TIMEOUT_MINUTES * 60);
    
    // Добавляем операции для базовых полей формы
    if (formData.name) {
      transaction.addOperation(
        StellarSdk.Operation.manageData({
          name: MANAGE_DATA_KEYS.NAME,
          value: formData.name
        })
      );
    }
    
    if (formData.about) {
      transaction.addOperation(
        StellarSdk.Operation.manageData({
          name: MANAGE_DATA_KEYS.ABOUT,
          value: formData.about
        })
      );
    }
    
    if (formData.website) {
      transaction.addOperation(
        StellarSdk.Operation.manageData({
          name: MANAGE_DATA_KEYS.WEBSITE,
          value: formData.website
        })
      );
    }
    
    // Обработка поля partOf (аналогично myParts в CorporateForm)
    if (formData.partOf && formData.partOf.length > 0) {
      // Получаем существующие идентификаторы PartOf из данных блокчейна
      const existingBlockchainAccountIds = new Set<string>();
      for (const key in accountDataAttributes) {
        if (/^PartOf\d+$/.test(key)) { 
          const value = accountDataAttributes[key];
          const accountId = Buffer.isBuffer(value) ? value.toString('utf8') : value;
          if (typeof accountId === 'string') {
            existingBlockchainAccountIds.add(accountId);
          }
        }
      }

      // Фильтруем partOf: удаляем дубликаты в форме и существующие в блокчейне
      const seenFormAccountIds = new Set<string>();
      const partsToAdd = formData.partOf.filter(part => {
        if (!part.accountId) return false;
        const alreadyExists = seenFormAccountIds.has(part.accountId) || existingBlockchainAccountIds.has(part.accountId);
        if (!alreadyExists) {
          seenFormAccountIds.add(part.accountId);
          return true;
        }
        return false;
      });

      // Генерируем новые ID только для добавляемых частей
      const newIds = generatePartOfIds(accountDataAttributes, partsToAdd.length);
      
      // Добавляем операции для отфильтрованных частей с использованием сгенерированных ID
      partsToAdd.forEach((part, index) => {
        const partOfId = newIds[index];
        const partOfKey = formatPartOfKey(partOfId);
        
        transaction.addOperation(
          StellarSdk.Operation.manageData({
            name: partOfKey,
            value: part.accountId
          })
        );
      });
    }
    
    // Добавляем операцию для TelegramUserID
    if (formData.telegramUserID) {
      transaction.addOperation(
        StellarSdk.Operation.manageData({
          name: MANAGE_DATA_KEYS.TELEGRAM_USER_ID,
          value: formData.telegramUserID
        })
      );
    }
    
    // Обработка тегов
    if (formData.accountId) {
      addTagOperationsToTransaction(
        transaction,
        formData.accountId,
        formData.tags,
        accountDataAttributes,
        StellarSdk.Operation,
        getTagById
      );
    }
    
    // Добавляем операции для TimeToken полей
    if (formData.timeTokenCode) {
      transaction.addOperation(
        StellarSdk.Operation.manageData({
          name: MANAGE_DATA_KEYS.TIME_TOKEN_CODE,
          value: formData.timeTokenCode
        })
      );
    }
    
    if (formData.timeTokenIssuer) {
      transaction.addOperation(
        StellarSdk.Operation.manageData({
          name: MANAGE_DATA_KEYS.TIME_TOKEN_ISSUER,
          value: formData.timeTokenIssuer
        })
      );
    }
    
    if (formData.timeTokenDesc) {
      transaction.addOperation(
        StellarSdk.Operation.manageData({
          name: MANAGE_DATA_KEYS.TIME_TOKEN_DESC,
          value: formData.timeTokenDesc
        })
      );
    }
    
    if (formData.timeTokenOfferIPFS) {
      transaction.addOperation(
        StellarSdk.Operation.manageData({
          name: MANAGE_DATA_KEYS.TIME_TOKEN_OFFER_IPFS,
          value: formData.timeTokenOfferIPFS
        })
      );
    }
    
    // Строим транзакцию
    const xdr = transaction.build().toXDR();
    
    return xdr;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "NotFoundError") {
        throw new Error("Account not found or not funded. Please make sure your account exists on Stellar.");
      }
      
      // Re-throw the original error
      throw error;
    }
    
    // If it's not a proper Error object, throw a generic error
    throw new Error("Unknown error generating Stellar transaction");
  }
} 