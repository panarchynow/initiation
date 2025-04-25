"use client";

import type { TransactionBuilder } from 'stellar-sdk';

// Управление тегами - единый источник истины для всего приложения
export interface TagDefinition {
  // Ключ для Stellar ManageData operation
  key: string;
  // ID для внутреннего использования в формах
  id: string;
  // Человекочитаемое имя для отображения
  label: string;
}

// Базовые ключевые слова для тегов
export const TAG_NAMES = [
  "Belgrade", 
  "Montenegro", 
  "Programmer", 
  "Blogger",
  "Developer",
  "Designer",
  "Investor",
  "Blockchain",
  "Crypto",
  "NFT",
  "DeFi",
  "Startup",
  "Business",
  "Marketing",
  "Sales",
  "Management",
  "Entrepreneur",
  "Ancap",
  "Libertarian",
  "Panarchist",
  "Anarchist",
  "Accelerationist",
];

// Функции форматирования тегов
export const formatTagKey = (name: string): string => `Tag${name}`;
export const formatTagId = (name: string): string => name.toLowerCase();
export const formatTagLabel = (name: string): string => 
  name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

// Получить полное определение тега по имени
export const getTagDefinition = (name: string): TagDefinition => {
  return {
    key: formatTagKey(name),
    id: formatTagId(name),
    label: formatTagLabel(name)
  };
};

// Динамическое создание объекта TAGS на основе имен
export const TAGS: Record<string, TagDefinition> = (() => {
  const result: Record<string, TagDefinition> = {};
  for (const name of TAG_NAMES) {
    result[name.toUpperCase()] = getTagDefinition(name);
  }
  return result;
})();

// Вспомогательные функции для работы с тегами
export const getTagIds = () => Object.values(TAGS).map(tag => tag.id);
export const getTagKeys = () => Object.values(TAGS).map(tag => tag.key);
export const getTagByKey = (key: string) => Object.values(TAGS).find(tag => tag.key === key);
export const getTagById = (id: string) => Object.values(TAGS).find(tag => tag.id === id);

// Тип для транзакций Stellar
export type StellarTransaction = {
  addOperation: (operation: unknown) => unknown;
};

/**
 * Общая функция для добавления и удаления операций с тегами в Stellar транзакцию
 * 
 * @param transaction - Объект транзакции Stellar
 * @param accountId - ID аккаунта пользователя
 * @param tagIds - Массив ID тегов из формы
 * @param accountDataAttributes - Существующие данные аккаунта
 * @param operationFactory - Factory для создания Stellar операций
 * @param tagByIdFn - Функция для получения тега по ID
 */
export function addTagOperationsToTransaction<T extends { addOperation: (...args: any[]) => any }>(
  transaction: T,
  accountId: string,
  tagIds: string[] | undefined,
  accountDataAttributes: Record<string, string | Buffer>,
  operationFactory: { manageData: (params: {name: string, value: string | null}) => unknown },
  tagByIdFn = getTagById
) {
  // Получаем существующие теги из данных аккаунта
  const existingTags = new Set<string>();
  for (const key in accountDataAttributes) {
    if (key.startsWith('Tag')) {
      existingTags.add(key);
    }
  }
  
  // Создаем набор тегов, которые будут установлены в форме
  const formTagsSet = new Set<string>();
  if (tagIds && tagIds.length > 0) {
    for (const tagId of tagIds) {
      const tag = tagByIdFn(tagId);
      if (tag) {
        formTagsSet.add(tag.key);
        // Если тег уже существует в аккаунте, не добавляем операцию
        if (!existingTags.has(tag.key)) {
          transaction.addOperation(
            operationFactory.manageData({
              name: tag.key,
              value: accountId
            })
          );
        }
      }
    }
  }
  
  // Находим теги, которые были удалены (существуют в аккаунте, но отсутствуют в форме)
  for (const existingTag of Array.from(existingTags)) {
    if (!formTagsSet.has(existingTag)) {
      // Добавляем операцию для удаления тега (установка в null)
      transaction.addOperation(
        operationFactory.manageData({
          name: existingTag,
          value: null
        })
      );
    }
  }
} 