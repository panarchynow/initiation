import { expect, test, describe, mock, beforeEach } from "bun:test";
import * as StellarSdk from '@stellar/stellar-sdk';
import { generateStellarTransaction } from "./transactionGenerator";
import type { FormSchema } from "../validation";

// Мок для buildTransaction
const mockBuildTransaction = mock(async () => ({ 
  toXDR: () => "mocked-xdr-string"
}));

// Мок для createStellarServer
const mockLoadAccount = mock(async (publicKey: string) => ({
  accountId: () => publicKey,
  sequenceNumber: () => "123456789",
  data_attr: {}
}));

const mockCreateStellarServer = mock(() => ({
  loadAccount: mockLoadAccount
}));

// Мок для fetchAccountDataAttributes
const mockFetchAccountDataAttributes = mock(async () => ({}));

// Мок для Keypair.random
const mockKeyPairRandom = mock(() => ({
  publicKey: () => "RANDOM_PUBLIC_KEY"
}));

describe("Transaction Generator", () => {
  beforeEach(() => {
    // Сбрасываем счетчики вызовов моков перед каждым тестом
    mockBuildTransaction.mockClear();
    mockLoadAccount.mockClear();
    mockCreateStellarServer.mockClear();
    mockFetchAccountDataAttributes.mockClear();
    mockKeyPairRandom.mockClear();
    
    // Мокируем модули
    mock.module('./server', () => ({
      createStellarServer: mockCreateStellarServer
    }));
    
    mock.module('./account', () => ({
      fetchAccountDataAttributes: mockFetchAccountDataAttributes
    }));
    
    mock.module('./transactionBuilder', () => ({
      buildTransaction: mockBuildTransaction
    }));
    
    // Мокируем Keypair.random
    mock.module('@stellar/stellar-sdk', () => ({
      ...StellarSdk,
      Keypair: {
        ...StellarSdk.Keypair,
        random: mockKeyPairRandom
      }
    }));
  });

  test("should generate transaction XDR with valid form data", async () => {
    // Arrange
    const formData: FormSchema = {
      name: "Test Project",
      about: "This is a test project",
      accountId: "GDNF5ICFVDJTIWLCBSG7UFCPWZON3CX3GLSUUHWFLGZV3NKFGNZSNOMU",
      myParts: []
    };

    // Act
    const result = await generateStellarTransaction(formData);

    // Assert
    expect(mockCreateStellarServer).toHaveBeenCalledTimes(1);
    expect(mockLoadAccount).toHaveBeenCalledTimes(1);
    expect(mockLoadAccount).toHaveBeenCalledWith("GDNF5ICFVDJTIWLCBSG7UFCPWZON3CX3GLSUUHWFLGZV3NKFGNZSNOMU");
    expect(mockFetchAccountDataAttributes).toHaveBeenCalledTimes(1);
    expect(mockBuildTransaction).toHaveBeenCalledTimes(1);
    expect(result).toBe("mocked-xdr-string");
  });

  test("should use random keypair if accountId is not provided", async () => {
    // Arrange
    const formData: FormSchema = {
      name: "Test Project",
      about: "This is a test project",
      myParts: []
    };

    // Act
    const result = await generateStellarTransaction(formData);

    // Assert
    expect(mockKeyPairRandom).toHaveBeenCalledTimes(1);
    expect(mockLoadAccount).toHaveBeenCalledTimes(1);
    expect(mockLoadAccount).toHaveBeenCalledWith("RANDOM_PUBLIC_KEY"); 
    expect(result).toBe("mocked-xdr-string");
  });

  test("should handle NotFoundError and throw informative error", async () => {
    // Arrange
    const formData: FormSchema = {
      name: "Test Project",
      about: "This is a test project",
      accountId: "GDNF5ICFVDJTIWLCBSG7UFCPWZON3CX3GLSUUHWFLGZV3NKFGNZSNOMU",
      myParts: []
    };

    // Мокируем loadAccount для выброса NotFoundError
    mockLoadAccount.mockImplementationOnce(() => {
      const error = new Error("Account not found");
      error.name = "NotFoundError";
      throw error;
    });

    // Act & Assert
    try {
      await generateStellarTransaction(formData);
      // Если мы дошли до этой точки, тест должен провалиться
      expect(false).toBe(true);
    } catch (error) {
      expect(error instanceof Error).toBe(true);
      expect((error as Error).message).toContain("Account not found or not funded");
    }
  });
}); 