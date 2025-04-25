"use client";

import { Keypair } from 'stellar-sdk';
import { createStellarServer } from './server';
import { fetchAccountDataAttributes } from './account';
import * as StellarSdk from 'stellar-sdk';
import { STELLAR_CONFIG } from './config';
import { MANAGE_DATA_KEYS } from './transactionBuilder';

// Тип схемы для личной формы
export type PersonalFormSchema = {
  accountId: string;
  name: string;
  about: string;
  website?: string;
};

// Генерирует транзакцию Stellar для данных из личной формы
export async function generatePersonalTransaction(
  formData: PersonalFormSchema,
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
    
    // Создаем транзакцию
    const transaction = new StellarSdk.TransactionBuilder(accountData, {
      fee: STELLAR_CONFIG.BASE_FEE,
      networkPassphrase: STELLAR_CONFIG.NETWORK,
    })
    .setTimeout(STELLAR_CONFIG.TIMEOUT_MINUTES * 60);
    
    // Добавляем операции для полей формы
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