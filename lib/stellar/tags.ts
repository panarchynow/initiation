"use client";

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
export const TAG_NAMES = ["Belgrade", "Montenegro", "Programmer", "Blogger"];

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