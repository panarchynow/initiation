import { expect, test, describe } from "bun:test";
import { buildTransaction } from "./transactionBuilder";

// Очень простой тест, который просто проверяет существование функции
describe("Transaction Builder", () => {
  test("buildTransaction function should exist", () => {
    expect(typeof buildTransaction).toBe("function");
  });
}); 