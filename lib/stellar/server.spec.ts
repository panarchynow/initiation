import { expect, test, describe } from "bun:test";
import { Horizon } from '@stellar/stellar-sdk';
import { createStellarServer } from './server';
import { STELLAR_CONFIG } from './config';

describe("Stellar Server", () => {
  test("createStellarServer should return a Server instance", () => {
    // Act
    const server = createStellarServer();
    
    // Assert - просто проверяем, что объект создался и имеет нужные методы
    expect(server).toBeDefined();
    expect(typeof server.loadAccount).toBe("function");
  });
  
  test("createStellarServer function should exist", () => {
    // Assert
    expect(typeof createStellarServer).toBe("function");
  });
}); 