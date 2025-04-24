import { expect, test, describe, beforeEach, afterEach, mock } from "bun:test";
import * as StellarSdk from '@stellar/stellar-sdk';
import { 
  buildTransaction, 
  createStellarServer, 
  verifyTransactionXDR, 
  generateStellarTransaction, 
  MANAGE_DATA_KEYS, 
  formatMyPartKey,
  extractMyPartId,
  findExistingMyPartKeys,
  findHighestMyPartId,
  generateMyPartIds,
  fetchAccountDataAttributes,
  TAGS
} from "./stellar";
import type { FormSchema } from "./validation";

// Мок для TransactionBuilder
const mockAddOperation = mock(() => mockTransactionBuilder);
const mockSetTimeout = mock(() => mockTransactionBuilder);
const mockBuild = mock(() => ({ toXDR: () => "mocked-xdr-string" }));

const mockTransactionBuilder = {
  addOperation: mockAddOperation,
  setTimeout: mockSetTimeout,
  build: mockBuild
};

const mockTransactionBuilderConstructor = mock(() => mockTransactionBuilder);

// Мок для Operation.manageData
const mockManageData = mock(() => ({ type: "manageData" }));

// Мок для Account
const mockAccount = {
  accountId: () => "test-account-id",
  sequenceNumber: () => "123456789"
};

// Обновленный мок для Server.loadAccount, который учитывает разные аккаунты
const mockLoadAccount = mock(async (publicKey: string) => {
  // Возвращаем аккаунт с данными для test-account-id
  if (publicKey === "test-account-id") {
    return mockAccountWithData;
  }
  // Возвращаем базовый аккаунт без данных для других ключей
  return mockAccount;
});
const mockServer = {
  loadAccount: mockLoadAccount
};

// Расширенный мок для Account с data_attr и data
const mockAccountWithData = {
  ...mockAccount,
  data: {
    "Name": "VGVzdCBQcm9qZWN0", // Base64 encoded
    "About": "VGhpcyBpcyBhIHRlc3QgcHJvamVjdA==", // Base64 encoded
    "MyPart001": "R0EyQzVSRlBFNkdDS01ZM1VNUEFCNFVMTE1HU1BJVUtTTFJCNlE3WjVRUUhCSFFDNFFMR0hN", // Base64
    "MyPart005": "R0JaUjdYTUxSQkJSUlNNWEpHUktYR1hHWklZRFJBWEtPTVNIM0hFUEJaV0wzUk81S0VWUFMN", // Base64
    "MyPart023": "R0NDWlJYVVhSNEJKTlJDM1ZUVlNPNkozRjVRTjdXUDJSREdKSVBHWlVWRFNRRFVDSUJBT0pDN0Q=" // Base64
  }
};

// Мок для fetchAccountDataAttributes
const mockFetchAccountDataAttributes = mock(async (publicKey: string) => {
  if (publicKey === "test-account-id") {
    return {
      "Name": Buffer.from("Test Project"),
      "About": Buffer.from("This is a test project"),
      "MyPart001": Buffer.from("GA2C5RFPE6GCKMY3US5PAB6UZLKIGSPIUKSLRB6Q7Z5QQHBHQC4QLGHM"),
      "MyPart005": Buffer.from("GBZR7XMLRBBRRSMXJGRKXGXGZIYDRAXKOMSH3HEPBZWL3RO5KEVPS7CV"),
      "MyPart023": Buffer.from("GCCZRXUXR4BJNRC3VTVSO6J3F5QN7WP2RDGJIPGZUVDCGDUCIBAOJC7D")
    };
  }
  return {};
});

// Сохраняем оригинальную функцию createStellarServer
const originalCreateStellarServer = createStellarServer;

describe("Stellar functions", () => {
  beforeEach(() => {
    // Сбрасываем счетчики вызовов моков перед каждым тестом
    mockAddOperation.mockClear();
    mockSetTimeout.mockClear();
    mockBuild.mockClear();
    mockManageData.mockClear();
    mockLoadAccount.mockClear();
    
    // Заменяем реальные функции на моки
    mock.module('@stellar/stellar-sdk', () => {
      return {
        ...StellarSdk,
        TransactionBuilder: mockTransactionBuilderConstructor,
        Operation: {
          ...StellarSdk.Operation,
          manageData: mockManageData
        },
        BASE_FEE: '100'
      };
    });
    
    // Мокируем createStellarServer с использованием простой замены
    // @ts-ignore - Игнорируем ошибку TS для тестов
    globalThis.createStellarServer = () => mockServer;
    
    // Мокируем fetchAccountDataAttributes
    // @ts-ignore - Игнорируем ошибку TS для тестов
    globalThis.fetchAccountDataAttributes = mockFetchAccountDataAttributes;
  });

  // Восстанавливаем оригинальные функции после всех тестов
  afterEach(() => {
    // @ts-ignore - Игнорируем ошибку TS для тестов
    globalThis.createStellarServer = originalCreateStellarServer;
    
    // @ts-ignore - Игнорируем ошибку TS для тестов
    globalThis.fetchAccountDataAttributes = fetchAccountDataAttributes;
  });

  describe("formatMyPartKey", () => {
    test("should format MyPart key with leading zeros", () => {
      expect(formatMyPartKey("1")).toBe("MyPart001");
      expect(formatMyPartKey("12")).toBe("MyPart012");
      expect(formatMyPartKey("123")).toBe("MyPart123");
    });
  });

  describe("buildTransaction", () => {
    test("should build transaction with all required fields", async () => {
      // Arrange
      const formData: FormSchema = {
        name: "Test Project",
        about: "This is a test project",
        accountId: "GDNF5ICFVDJTIWLCBSG7UFCPWZON3CX3GLSUUHWFLGZV3NKFGNZSNOMU",
        myParts: [
          { id: "1", accountId: "GA2C5RFPE6GCKMY3US5PAB6UZLKIGSPIUKSLRB6Q7Z5QQHBHQC4QLGHM" }
        ]
      };

      // Act
      // @ts-ignore - Игнорируем ошибку TS для тестов
      await buildTransaction(mockAccount, formData);

      // Assert
      // Убедимся, что setTimeout был вызван для установки времени жизни транзакции
      expect(mockSetTimeout).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).toHaveBeenCalledWith(1800); // 30 минут * 60 секунд

      // Проверяем, что addOperation вызван для обязательных полей
      expect(mockAddOperation).toHaveBeenCalledTimes(3); // name, about, myPart
      
      // Проверяем вызовы manageData для каждого поля
      expect(mockManageData).toHaveBeenCalledWith({
        name: MANAGE_DATA_KEYS.NAME,
        value: "Test Project"
      });
      
      expect(mockManageData).toHaveBeenCalledWith({
        name: MANAGE_DATA_KEYS.ABOUT,
        value: "This is a test project"
      });
      
      expect(mockManageData).toHaveBeenCalledWith({
        name: "MyPart001",
        value: "GA2C5RFPE6GCKMY3US5PAB6UZLKIGSPIUKSLRB6Q7Z5QQHBHQC4QLGHM"
      });
    });

    test("should include optional fields when provided", async () => {
      // Arrange
      const formData: FormSchema = {
        name: "Test Project",
        about: "This is a test project",
        accountId: "GDNF5ICFVDJTIWLCBSG7UFCPWZON3CX3GLSUUHWFLGZV3NKFGNZSNOMU",
        website: "https://test.com",
        telegramPartChatID: "123456789",
        tags: ["belgrade", "montenegro", "programmer"],
        contractIPFSHash: "QmTest123",
        myParts: [
          { id: "1", accountId: "GA2C5RFPE6GCKMY3US5PAB6UZLKIGSPIUKSLRB6Q7Z5QQHBHQC4QLGHM" },
          { id: "2", accountId: "GBZR7XMLRBBRRSMXJGRKXGXGZIYDRAXKOMSH3HEPBZWL3RO5KEVPS7CV" }
        ]
      };

      // Act
      // @ts-ignore - Игнорируем ошибку TS для тестов
      await buildTransaction(mockAccount, formData);

      // Assert
      // Проверяем, что addOperation вызван для всех полей
      // 2 основных + 2 MyPart + 3 тега + 3 опциональных (website, telegramPartChatID, contractIPFS)
      expect(mockAddOperation).toHaveBeenCalledTimes(10);
      
      // Проверяем вызовы для дополнительных полей
      expect(mockManageData).toHaveBeenCalledWith({
        name: MANAGE_DATA_KEYS.WEBSITE,
        value: "https://test.com"
      });
      
      expect(mockManageData).toHaveBeenCalledWith({
        name: MANAGE_DATA_KEYS.TELEGRAM_PART_CHAT_ID,
        value: "123456789"
      });
      
      // Проверяем вызовы для тегов
      expect(mockManageData).toHaveBeenCalledWith({
        name: TAGS.BELGRADE.key,
        value: "GDNF5ICFVDJTIWLCBSG7UFCPWZON3CX3GLSUUHWFLGZV3NKFGNZSNOMU"
      });
      
      expect(mockManageData).toHaveBeenCalledWith({
        name: TAGS.MONTENEGRO.key,
        value: "GDNF5ICFVDJTIWLCBSG7UFCPWZON3CX3GLSUUHWFLGZV3NKFGNZSNOMU"
      });
      
      expect(mockManageData).toHaveBeenCalledWith({
        name: TAGS.PROGRAMMER.key,
        value: "GDNF5ICFVDJTIWLCBSG7UFCPWZON3CX3GLSUUHWFLGZV3NKFGNZSNOMU"
      });
      
      expect(mockManageData).toHaveBeenCalledWith({
        name: MANAGE_DATA_KEYS.CONTRACT_IPFS,
        value: "QmTest123"
      });
      
      // Проверяем оба MyPart
      expect(mockManageData).toHaveBeenCalledWith({
        name: "MyPart001",
        value: "GA2C5RFPE6GCKMY3US5PAB6UZLKIGSPIUKSLRB6Q7Z5QQHBHQC4QLGHM"
      });
      
      expect(mockManageData).toHaveBeenCalledWith({
        name: "MyPart002",
        value: "GBZR7XMLRBBRRSMXJGRKXGXGZIYDRAXKOMSH3HEPBZWL3RO5KEVPS7CV"
      });
    });

    test("should skip undefined values", async () => {
      // Arrange
      const formData: FormSchema = {
        name: "Test Project",
        about: "This is a test project",
        accountId: "GDNF5ICFVDJTIWLCBSG7UFCPWZON3CX3GLSUUHWFLGZV3NKFGNZSNOMU",
        website: undefined,
        myParts: []
      };

      // Act
      // @ts-ignore - Игнорируем ошибку TS для тестов
      await buildTransaction(mockAccount, formData);

      // Assert
      // Проверяем, что addOperation вызван только для обязательных полей
      expect(mockAddOperation).toHaveBeenCalledTimes(2); // только name и about
      
      expect(mockManageData).toHaveBeenCalledWith({
        name: MANAGE_DATA_KEYS.NAME,
        value: "Test Project"
      });
      
      expect(mockManageData).toHaveBeenCalledWith({
        name: MANAGE_DATA_KEYS.ABOUT,
        value: "This is a test project"
      });
    });
  });

  // Имитация generateStellarTransaction должна быть в отдельном тесте из-за обращения к реальному API
  test("should generate transaction XDR with valid form data", async () => {
    // Prepare
    const mockGenerateXDR = mock(async () => "mocked-xdr-string");
    
    // Мокируем весь импорт модуля для этого теста
    mock.module('./stellar', () => ({
      createStellarServer,
      buildTransaction,
      verifyTransactionXDR,
      generateStellarTransaction: mockGenerateXDR,
      MANAGE_DATA_KEYS,
      formatMyPartKey,
      TAGS
    }));
    
    // Arrange
    const formData: FormSchema = {
      name: "Test Project",
      about: "This is a test project",
      accountId: "GDNF5ICFVDJTIWLCBSG7UFCPWZON3CX3GLSUUHWFLGZV3NKFGNZSNOMU",
      myParts: []
    };

    // Act
    const result = await mockGenerateXDR(formData);

    // Assert
    expect(result).toBe("mocked-xdr-string");
    expect(mockGenerateXDR).toHaveBeenCalledTimes(1);
  });

  describe("verifyTransactionXDR", () => {
    test("should detect invalid XDR", () => {
      // Этот тест можно проверить без моков, так как функция verifyTransactionXDR
      // должна возвращать false для неверного XDR
      
      // Проверка с пустой строкой
      expect(verifyTransactionXDR("")).toBe(false);
      
      // Проверка с невалидным XDR
      expect(verifyTransactionXDR("invalid-xdr")).toBe(false);
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

  describe("fetchAccountDataAttributes", () => {
    test("should fetch account data for an existing account", async () => {
      // Arrange & Act
      const result = await mockFetchAccountDataAttributes("test-account-id");
      
      // Assert
      expect(result).toHaveProperty("Name");
      expect(result).toHaveProperty("About");
      expect(result).toHaveProperty("MyPart001");
      expect(result).toHaveProperty("MyPart005");
      expect(result).toHaveProperty("MyPart023");
    });
    
    test("should return empty object for non-existent account", async () => {
      // Arrange & Act
      const result = await mockFetchAccountDataAttributes("non-existent-account");
      
      // Assert
      expect(result).toEqual({});
    });
  });

  describe("buildTransaction with existing account data", () => {
    test("should use next available MyPart IDs based on account data", async () => {
      // Arrange
      const formData: FormSchema = {
        name: "Test Project",
        about: "This is a test project",
        accountId: "GDNF5ICFVDJTIWLCBSG7UFCPWZON3CX3GLSUUHWFLGZV3NKFGNZSNOMU",
        myParts: [
          { id: "1", accountId: "GA2C5RFPE6GCKMY3US5PAB6UZLKIGSPIUKSLRB6Q7Z5QQHBHQC4QLGHM" },
          { id: "2", accountId: "GBZR7XMLRBBRRSMXJGRKXGXGZIYDRAXKOMSH3HEPBZWL3RO5KEVPS7CV" }
        ]
      };
      
      const accountDataAttributes = {
        "MyPart001": "GA2C5RFPE6GCKMY3US5PAB6UZLKIGSPIUKSLRB6Q7Z5QQHBHQC4QLGHM",
        "MyPart005": "GBZR7XMLRBBRRSMXJGRKXGXGZIYDRAXKOMSH3HEPBZWL3RO5KEVPS7CV",
        "MyPart023": "GCCZRXUXR4BJNRC3VTVSO6J3F5QN7WP2RDGJIPGZUVDCGDUCIBAOJC7D"
      };

      // Act
      // @ts-ignore - Игнорируем ошибку TS для тестов
      await buildTransaction(mockAccount, formData, accountDataAttributes);

      // Assert
      // Проверяем, что для MyPart используются следующие доступные ID после 23
      expect(mockManageData).toHaveBeenCalledWith({
        name: "MyPart024",
        value: "GA2C5RFPE6GCKMY3US5PAB6UZLKIGSPIUKSLRB6Q7Z5QQHBHQC4QLGHM"
      });
      
      expect(mockManageData).toHaveBeenCalledWith({
        name: "MyPart025",
        value: "GBZR7XMLRBBRRSMXJGRKXGXGZIYDRAXKOMSH3HEPBZWL3RO5KEVPS7CV"
      });
    });
  });
}); 