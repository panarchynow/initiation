"use client";

import { Account } from '@stellar/stellar-sdk';
import { createStellarServer } from './server';
import { findExistingMyPartKeys } from './mypart';

// Fetch account data attributes from Stellar blockchain
export async function fetchAccountDataAttributes(
  publicKey: string, 
  server = createStellarServer()
): Promise<Record<string, string | Buffer>> {
  try {
    // Используем loadAccount для получения полной информации об аккаунте
    const account = await server.loadAccount(publicKey);
    
    // Stellar может хранить data entries в разных форматах в зависимости от SDK версии
    // Проверим возможные варианты хранения и выберем правильный
    let accountData: Record<string, string | Buffer | unknown> = {};
    
    if (account.data && typeof account.data === 'object') {
      accountData = account.data;
    } else if ((account as Account & {data_attr?: Record<string, unknown>}).data_attr && 
              typeof (account as Account & {data_attr?: Record<string, unknown>}).data_attr === 'object') {
      accountData = (account as Account & {data_attr?: Record<string, unknown>}).data_attr || {};
    } else {
      // Получим data entries через data_entries если они есть
      try {
        // @ts-ignore
        if (account.data_entries && Array.isArray(account.data_entries)) {
          // @ts-ignore
          for (const entry of account.data_entries) {
            if (entry.name && entry.value) {
              accountData[entry.name] = entry.value;
            }
          }
        }
      } catch (e) {
        // Error accessing data_entries
      }
    }
    
    // Данные data entries хранятся в свойстве data аккаунта
    const dataAttributes: Record<string, string | Buffer> = {};
    
    // Перебор данных аккаунта и конвертация в Buffer
    for (const [key, value] of Object.entries(accountData)) {
      try {
        if (typeof value === 'string') {
          dataAttributes[key] = Buffer.from(value, 'base64');
        } else if (Buffer.isBuffer(value)) {
          dataAttributes[key] = value;
        }
      } catch (e) {
        // Error processing data entry
      }
    }
    
    // Проверка наличия MyPart ключей в данных
    findExistingMyPartKeys(dataAttributes);
    
    return dataAttributes;
  } catch (error) {
    // В случае ошибки возвращаем пустой объект
    return {};
  }
} 