import { expect, test, describe } from "bun:test";
import { verifyTransactionXDR } from "./transactionVerifier";

describe("Transaction Verifier", () => {
  describe("verifyTransactionXDR", () => {
    test("should return false for invalid XDR", () => {
      // Arrange
      const invalidXdr = "invalid-xdr-format";
      
      // Act
      const result = verifyTransactionXDR(invalidXdr);
      
      // Assert
      expect(result).toBe(false);
    });
    
    test("should return false for empty XDR", () => {
      // Act
      const result = verifyTransactionXDR("");
      
      // Assert
      expect(result).toBe(false);
    });
  });
}); 