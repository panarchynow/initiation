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
    console.log('Fetching account data for:', publicKey);
    // Используем loadAccount для получения полной информации об аккаунте
    const account = await server.loadAccount(publicKey);
    console.log('Account loaded:', account);
    
    // Stellar может хранить data entries в разных форматах в зависимости от SDK версии
    // Проверим возможные варианты хранения и выберем правильный
    let accountData: Record<string, string | Buffer | unknown> = {};
    
    if (account.data && typeof account.data === 'object') {
      console.log('Using account.data');
      accountData = account.data;
    } else if ((account as Account & {data_attr?: Record<string, unknown>}).data_attr && 
              typeof (account as Account & {data_attr?: Record<string, unknown>}).data_attr === 'object') {
      console.log('Using account.data_attr');
      accountData = (account as Account & {data_attr?: Record<string, unknown>}).data_attr || {};
    } else {
      // Получим data entries через data_entries если они есть
      try {
        // @ts-ignore
        if (account.data_entries && Array.isArray(account.data_entries)) {
          console.log('Using account.data_entries');
          // @ts-ignore
          for (const entry of account.data_entries) {
            if (entry.name && entry.value) {
              accountData[entry.name] = entry.value;
            }
          }
        }
      } catch (e) {
        console.error('Error accessing data_entries:', e);
      }
    }
    
    console.log('Raw account data:', accountData);
    
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
        console.error(`Error processing data entry ${key}:`, e);
      }
    }
    
    console.log('Processed data attributes:', Object.keys(dataAttributes));
    
    // Проверка наличия MyPart ключей в данных
    findExistingMyPartKeys(dataAttributes);
    
    return dataAttributes;
  } catch (error) {
    console.error('Error in fetchAccountDataAttributes:', error);
    // В случае ошибки возвращаем пустой объект
    return {};
  }
} 