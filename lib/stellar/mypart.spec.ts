import { expect, test, describe, mock } from "bun:test";
import {
  formatMyPartKey,
  extractMyPartId,
  findExistingMyPartKeys,
  findHighestMyPartId,
  generateMyPartIds
} from "./mypart";

describe("MyPart key handling", () => {
  describe("formatMyPartKey", () => {
    test("should format MyPart key with leading zeros", () => {
      expect(formatMyPartKey("1")).toBe("MyPart001");
      expect(formatMyPartKey("12")).toBe("MyPart012");
      expect(formatMyPartKey("123")).toBe("MyPart123");
    });
  });

  describe("extractMyPartId", () => {
    test("should extract ID from MyPart key", () => {
      expect(extractMyPartId("MyPart001")).toBe(1);
      expect(extractMyPartId("MyPart012")).toBe(12);
      expect(extractMyPartId("MyPart123")).toBe(123);
    });

    test("should return null for invalid formats", () => {
      expect(extractMyPartId("NotMyPart")).toBe(null);
      expect(extractMyPartId("MyPartXYZ")).toBe(null);
      expect(extractMyPartId("")).toBe(null);
    });
  });

  describe("findExistingMyPartKeys", () => {
    test("should find all MyPart keys in account data", () => {
      const accountData = {
        "Name": "Test Project",
        "About": "Test description",
        "MyPart001": "GA2C5RFPE6GCKMY3US5PAB6UZLKIGSPIUKSLRB6Q7Z5QQHBHQC4QLGHM",
        "MyPart005": "GBZR7XMLRBBRRSMXJGRKXGXGZIYDRAXKOMSH3HEPBZWL3RO5KEVPS7CV",
        "MyPart023": "GCCZRXUXR4BJNRC3VTVSO6J3F5QN7WP2RDGJIPGZUVDCGDUCIBAOJC7D",
        "NotMyPart": "Something else"
      };

      const result = findExistingMyPartKeys(accountData);
      expect(result).toContain("MyPart001");
      expect(result).toContain("MyPart005");
      expect(result).toContain("MyPart023");
      expect(result).not.toContain("NotMyPart");
      expect(result).not.toContain("Name");
      expect(result).not.toContain("About");
      expect(result.length).toBe(3);
    });

    test("should return empty array when no MyPart keys found", () => {
      const accountData = {
        "Name": "Test Project",
        "About": "Test description"
      };

      const result = findExistingMyPartKeys(accountData);
      expect(result).toEqual([]);
    });
  });

  describe("findHighestMyPartId", () => {
    test("should find the highest MyPart ID", () => {
      const accountData = {
        "MyPart001": "GA2C5RFPE6GCKMY3US5PAB6UZLKIGSPIUKSLRB6Q7Z5QQHBHQC4QLGHM",
        "MyPart005": "GBZR7XMLRBBRRSMXJGRKXGXGZIYDRAXKOMSH3HEPBZWL3RO5KEVPS7CV",
        "MyPart023": "GCCZRXUXR4BJNRC3VTVSO6J3F5QN7WP2RDGJIPGZUVDCGDUCIBAOJC7D"
      };

      const result = findHighestMyPartId(accountData);
      expect(result).toBe(23);
    });

    test("should return 0 when no MyPart keys found", () => {
      const accountData = {
        "Name": "Test Project",
        "About": "Test description"
      };

      const result = findHighestMyPartId(accountData);
      expect(result).toBe(0);
    });
  });

  describe("generateMyPartIds", () => {
    test("should generate sequential IDs starting after highest existing ID", () => {
      const accountData = {
        "MyPart001": "GA2C5RFPE6GCKMY3US5PAB6UZLKIGSPIUKSLRB6Q7Z5QQHBHQC4QLGHM",
        "MyPart005": "GBZR7XMLRBBRRSMXJGRKXGXGZIYDRAXKOMSH3HEPBZWL3RO5KEVPS7CV",
        "MyPart023": "GCCZRXUXR4BJNRC3VTVSO6J3F5QN7WP2RDGJIPGZUVDCGDUCIBAOJC7D"
      };

      const result = generateMyPartIds(accountData, 3);
      expect(result).toEqual(["24", "25", "26"]);
    });

    test("should start from 1 when no existing MyPart keys", () => {
      const accountData = {};
      const result = generateMyPartIds(accountData, 2);
      expect(result).toEqual(["1", "2"]);
    });
  });
}); 