import { expect, test, describe } from "bun:test";
import * as stellarModule from "./index";

describe("Stellar Module Index", () => {
  test("should export all required functions and types", () => {
    // Tag management
    expect(typeof stellarModule.formatTagKey).toBe("function");
    expect(typeof stellarModule.formatTagId).toBe("function");
    expect(typeof stellarModule.formatTagLabel).toBe("function");
    expect(typeof stellarModule.getTagDefinition).toBe("function");
    expect(typeof stellarModule.getTagIds).toBe("function");
    expect(typeof stellarModule.getTagKeys).toBe("function");
    expect(typeof stellarModule.getTagByKey).toBe("function");
    expect(typeof stellarModule.getTagById).toBe("function");
    expect(stellarModule.TAG_NAMES).toBeDefined();
    expect(Array.isArray(stellarModule.TAG_NAMES)).toBe(true);
    expect(stellarModule.TAGS).toBeDefined();
    
    // MyPart key management
    expect(typeof stellarModule.formatMyPartKey).toBe("function");
    expect(typeof stellarModule.extractMyPartId).toBe("function");
    expect(typeof stellarModule.findExistingMyPartKeys).toBe("function");
    expect(typeof stellarModule.findHighestMyPartId).toBe("function");
    expect(typeof stellarModule.generateMyPartIds).toBe("function");
    
    // Stellar configuration
    expect(stellarModule.STELLAR_CONFIG).toBeDefined();
    expect(stellarModule.STELLAR_CONFIG.SERVER_URL).toBeDefined();
    expect(stellarModule.STELLAR_CONFIG.NETWORK).toBeDefined();
    
    // Server
    expect(typeof stellarModule.createStellarServer).toBe("function");
    
    // Account
    expect(typeof stellarModule.fetchAccountDataAttributes).toBe("function");
    
    // Transaction Builder
    expect(typeof stellarModule.buildTransaction).toBe("function");
    expect(stellarModule.MANAGE_DATA_KEYS).toBeDefined();
    
    // Transaction Generator
    expect(typeof stellarModule.generateStellarTransaction).toBe("function");
    
    // Transaction Verifier
    expect(typeof stellarModule.verifyTransactionXDR).toBe("function");
  });
}); 