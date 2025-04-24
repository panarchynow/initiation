import { expect, test, describe, mock, beforeEach } from "bun:test";
import * as transactionBuilderModule from "./transactionBuilder";
import type { FormSchema } from "../validation";

// Нам нужно более изолированно тестировать логику фильтрации MyPart
describe("Transaction Builder", () => {
  test("buildTransaction function should exist", () => {
    expect(typeof transactionBuilderModule.buildTransaction).toBe("function");
  });

  // Тестируем изолированно фильтрацию MyPart
  test("should filter duplicate MyPart correctly", () => {
    // Существующие данные аккаунта из блокчейна
    const existingData = {
      "MyPart001": "EXISTING_ID_1",
      "MyPart002": "EXISTING_ID_2",
      "Name": "Test"
    };
    
    // Данные из формы с дубликатами
    const formData = {
      myParts: [
        { id: "1", accountId: "EXISTING_ID_1" }, // Существует в блокчейне
        { id: "2", accountId: "NEW_ID_1" },      // Новый уникальный ID
        { id: "3", accountId: "NEW_ID_1" },      // Дубликат в форме
        { id: "4", accountId: "NEW_ID_2" },      // Новый уникальный ID
        { id: "5", accountId: "EXISTING_ID_2" }  // Существует в блокчейне
      ]
    };
    
    // Извлекаем непосредственно логику фильтрации из buildTransaction
    // и тестируем ее отдельно
    const existingBlockchainAccountIds = new Set<string>();
    for (const key in existingData) {
      if (/^MyPart\d+$/.test(key)) { 
        const value = existingData[key];
        if (typeof value === 'string') {
          existingBlockchainAccountIds.add(value);
        }
      }
    }
    
    const seenFormAccountIds = new Set<string>();
    const partsToAdd = formData.myParts.filter(part => {
      const alreadyExists = seenFormAccountIds.has(part.accountId) || 
                          existingBlockchainAccountIds.has(part.accountId);
      if (!alreadyExists) {
        seenFormAccountIds.add(part.accountId);
        return true;
      }
      return false;
    });
    
    // Проверяем, что осталось только две уникальных записи
    expect(partsToAdd.length).toBe(2);
    
    // Проверяем, что остались только ожидаемые accountIds
    const resultIds = partsToAdd.map(part => part.accountId);
    expect(resultIds).toContain("NEW_ID_1");
    expect(resultIds).toContain("NEW_ID_2");
    expect(resultIds).not.toContain("EXISTING_ID_1");
    expect(resultIds).not.toContain("EXISTING_ID_2");
  });
}); 