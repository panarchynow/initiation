import { expect, test, describe } from "bun:test";
import { 
  TagDefinition,
  TAG_NAMES,
  TAGS,
  formatTagKey,
  formatTagId,
  formatTagLabel,
  getTagDefinition,
  getTagIds,
  getTagKeys,
  getTagByKey,
  getTagById
} from "./tags";

describe("Tag Management", () => {
  describe("Tag formatting functions", () => {
    test("formatTagKey should prepend 'Tag' to the name", () => {
      expect(formatTagKey("Test")).toBe("TagTest");
      expect(formatTagKey("Example")).toBe("TagExample");
    });

    test("formatTagId should lowercase the name", () => {
      expect(formatTagId("Test")).toBe("test");
      expect(formatTagId("EXAMPLE")).toBe("example");
    });

    test("formatTagLabel should capitalize first letter", () => {
      expect(formatTagLabel("test")).toBe("Test");
      expect(formatTagLabel("EXAMPLE")).toBe("Example");
    });
  });

  describe("getTagDefinition", () => {
    test("should create a full tag definition", () => {
      const tagDefinition = getTagDefinition("Test");
      
      expect(tagDefinition).toEqual({
        key: "TagTest",
        id: "test",
        label: "Test"
      });
    });
  });

  describe("TAGS constant", () => {
    test("should contain predefined tags", () => {
      // Проверяем, что все TAG_NAMES присутствуют в TAGS
      for (const name of TAG_NAMES) {
        const uppercaseName = name.toUpperCase();
        expect(TAGS).toHaveProperty(uppercaseName);
        
        const tag = TAGS[uppercaseName];
        expect(tag.key).toBe(formatTagKey(name));
        expect(tag.id).toBe(formatTagId(name));
        expect(tag.label).toBe(formatTagLabel(name));
      }
    });
  });

  describe("Tag utility functions", () => {
    test("getTagIds should return array of tag IDs", () => {
      const ids = getTagIds();
      expect(ids).toBeArray();
      expect(ids.length).toBe(TAG_NAMES.length);
      
      // Все ID должны быть уникальными и в нижнем регистре
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
      for (const id of ids) {
        expect(id).toBe(id.toLowerCase());
      }
    });

    test("getTagKeys should return array of tag keys", () => {
      const keys = getTagKeys();
      expect(keys).toBeArray();
      expect(keys.length).toBe(TAG_NAMES.length);
      
      // Все ключи должны начинаться с 'Tag'
      for (const key of keys) {
        expect(key.startsWith("Tag")).toBe(true);
      }
    });

    test("getTagByKey should find tag by key", () => {
      // Проверка для существующего ключа
      const belgradeKey = TAGS.BELGRADE.key;
      const tag = getTagByKey(belgradeKey);
      expect(tag).toBeDefined();
      expect(tag?.key).toBe(belgradeKey);
      
      // Проверка для несуществующего ключа
      expect(getTagByKey("NonExistentKey")).toBeUndefined();
    });

    test("getTagById should find tag by ID", () => {
      // Проверка для существующего ID
      const programmerID = TAGS.PROGRAMMER.id;
      const tag = getTagById(programmerID);
      expect(tag).toBeDefined();
      expect(tag?.id).toBe(programmerID);
      
      // Проверка для несуществующего ID
      expect(getTagById("nonexistentid")).toBeUndefined();
    });
  });
}); 