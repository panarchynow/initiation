import { expect, test, describe } from "bun:test";
import { fetchAccountDataAttributes } from "./account";

// Очень простой тест, который просто проверяет существование функции
describe("Account Data Fetching", () => {
  test("fetchAccountDataAttributes function should exist", () => {
    expect(typeof fetchAccountDataAttributes).toBe("function");
  });
}); 