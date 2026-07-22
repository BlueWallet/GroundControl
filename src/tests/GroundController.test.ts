import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DataSource } from "typeorm";
import { Request, Response, NextFunction } from "express";

// Mock TypeORM entities
vi.mock("../entity/TokenToAddress", () => ({
  TokenToAddress: class TokenToAddress {},
}));
vi.mock("../entity/TokenToHash", () => ({
  TokenToHash: class TokenToHash {},
}));
vi.mock("../entity/TokenToTxid", () => ({
  TokenToTxid: class TokenToTxid {},
}));
vi.mock("../entity/TokenConfiguration", () => ({
  TokenConfiguration: class TokenConfiguration {
    id!: number;
    token!: string;
    os!: string;
    level_all: boolean = true;
    level_transactions: boolean = true;
    level_price: boolean = true;
    level_news: boolean = true;
    level_tips: boolean = true;
    lang: string = "en";
    app_version: string = "1.0.0";
    created!: Date;
    last_online: Date = new Date();
  },
}));
vi.mock("../entity/SendQueue", () => ({
  SendQueue: class SendQueue {},
}));
vi.mock("../entity/PushLog", () => ({
  PushLog: class PushLog {},
}));
vi.mock("../entity/KeyValue", () => ({
  KeyValue: class KeyValue {},
}));

// Mock data-source to prevent initialization
const mockConnection = {
  getRepository: vi.fn().mockReturnValue({}),
  createQueryBuilder: vi.fn().mockReturnValue({
    delete: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue({}),
        }),
      }),
    }),
    where: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({}),
  }),
  query: vi.fn().mockResolvedValue([]),
};

vi.mock("../data-source", () => ({
  default: {
    initialize: vi.fn().mockResolvedValue(mockConnection),
  },
}));

// Mock crypto module using a factory function to ensure fresh instances
vi.mock("crypto", () => ({
  createHash: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue("6c60f404f8167a38fc70eaf8c17cd92e60f96e3f9dd9b6b5d3b9b5d5c5b5a5a5"),
  }),
}));

// Mock dotenv
vi.mock("dotenv", () => ({
  config: vi.fn(),
}));

// Mock require to prevent package.json access during module initialization
vi.mock("../../package.json", () => ({
  name: "groundcontrol",
  description: "GroundControl push server API",
  version: "3.0.1",
}));

// Mock global functions to prevent module initialization issues
global.setInterval = vi.fn() as any;
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
};

// Mock environment variables
const originalEnv = { ...process.env };

describe("GroundController", () => {
  let mockDataSource: DataSource;
  let mockRepository: any;
  let mockQueryBuilder: any;
  let groundController: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Set up require mock to return the mocked crypto module
    (global as any).require = vi.fn().mockImplementation((module: string) => {
      if (module === "crypto") {
        return {
          createHash: vi.fn().mockReturnValue({
            update: vi.fn().mockReturnThis(),
            digest: vi.fn().mockReturnValue("6c60f404f8167a38fc70eaf8c17cd92e60f96e3f9dd9b6b5d3b9b5d5c5b5a5a5"),
          }),
        };
      }
      const originalRequire = require;
      return originalRequire(module);
    });

    // Set up environment variables
    process.env.JAWSDB_MARIA_URL = "mock-db-url";
    process.env.GOOGLE_KEY_FILE = "mock-google-key";
    process.env.APNS_P8 = "mock-apns-p8";
    process.env.APNS_TOPIC = "com.mock.app";
    process.env.APPLE_TEAM_ID = "MOCK_TEAM_ID";
    process.env.APNS_P8_KID = "MOCK_KEY_ID";
    process.env.GOOGLE_PROJECT_ID = "mock-project-id";

    // Mock QueryBuilder
    mockQueryBuilder = {
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue({}),
      getCount: vi.fn().mockResolvedValue(10),
    };

    // Mock Repository
    mockRepository = {
      save: vi.fn().mockResolvedValue({}),
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn().mockResolvedValue(null),
      remove: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(5),
      createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
    };

    // Mock DataSource
    mockDataSource = {
      getRepository: vi.fn().mockReturnValue(mockRepository),
      createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
      query: vi.fn().mockResolvedValue([]),
    } as any;

    // Mock Express objects
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();

    // Dynamically import GroundController after setting up environment
    const { GroundController } = await import("../controller/GroundController");
    groundController = new GroundController((mockConnection as unknown) as DataSource);

    // Mock the connection property by directly setting repositories
    (groundController as any)._tokenToAddressRepository = mockRepository;
    (groundController as any)._tokenToHashRepository = mockRepository;
    (groundController as any)._tokenToTxidRepository = mockRepository;
    (groundController as any)._tokenConfigurationRepository = mockRepository;
    (groundController as any)._sendQueueRepository = mockRepository;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  describe("majorTomToGroundControl", () => {
    beforeEach(() => {
      mockRequest = {
        body: {
          token: "test-token",
          os: "ios",
          addresses: ["bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"],
          hashes: ["hash123"],
          txids: ["txid123"],
        },
      };
    });

    it("should save addresses, hashes, and txids successfully", async () => {
      await groundController.majorTomToGroundControl(mockRequest, mockResponse, mockNext);

      expect(mockRepository.save).toHaveBeenCalledTimes(3);
      expect(mockRepository.save).toHaveBeenCalledWith({
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        token: "test-token",
        os: "ios",
      });
      expect(mockRepository.save).toHaveBeenCalledWith({
        hash: "hash123",
        token: "test-token",
        os: "ios",
      });
      expect(mockRepository.save).toHaveBeenCalledWith({
        txid: "txid123",
        token: "test-token",
        os: "ios",
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.send).toHaveBeenCalledWith("");
    });

    it("should handle missing token", async () => {
      mockRequest.body.token = undefined;

      await groundController.majorTomToGroundControl(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith("token not provided");
    });

    it("should handle missing os", async () => {
      mockRequest.body.os = undefined;

      await groundController.majorTomToGroundControl(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith("token not provided");
    });

    it("should skip ignored addresses", async () => {
      mockRequest.body.addresses = ["1NXNHZr6Pbzi3VStcgaxwEhspTWNXQ3Q4G"]; // This is in the ignore list

      await groundController.majorTomToGroundControl(mockRequest, mockResponse, mockNext);

      expect(mockRepository.save).toHaveBeenCalledTimes(2); // Only hash and txid, not address
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it("should handle empty arrays gracefully", async () => {
      mockRequest.body.addresses = [];
      mockRequest.body.hashes = [];
      mockRequest.body.txids = [];

      await groundController.majorTomToGroundControl(mockRequest, mockResponse, mockNext);

      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it("should handle missing arrays by defaulting to empty arrays", async () => {
      mockRequest.body.addresses = undefined;
      mockRequest.body.hashes = undefined;
      mockRequest.body.txids = undefined;

      await groundController.majorTomToGroundControl(mockRequest, mockResponse, mockNext);

      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });
  });

  describe("unsubscribe", () => {
    beforeEach(() => {
      mockRequest = {
        body: {
          token: "test-token",
          os: "ios",
          addresses: ["bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"],
          hashes: ["hash123"],
          txids: ["txid123"],
        },
      };
    });

    it("should remove addresses, hashes, and txids successfully", async () => {
      const mockAddressRecord = { id: 1, address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" };
      const mockHashRecord = { id: 2, hash: "hash123" };
      const mockTxidRecord = { id: 3, txid: "txid123" };

      mockRepository.findOneBy.mockResolvedValueOnce(mockAddressRecord).mockResolvedValueOnce(mockHashRecord).mockResolvedValueOnce(mockTxidRecord);

      await groundController.unsubscribe(mockRequest, mockResponse, mockNext);

      expect(mockRepository.findOneBy).toHaveBeenCalledTimes(3);
      expect(mockRepository.remove).toHaveBeenCalledTimes(3);
      expect(mockRepository.remove).toHaveBeenCalledWith(mockAddressRecord);
      expect(mockRepository.remove).toHaveBeenCalledWith(mockHashRecord);
      expect(mockRepository.remove).toHaveBeenCalledWith(mockTxidRecord);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it("should handle missing token", async () => {
      mockRequest.body.token = undefined;

      await groundController.unsubscribe(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith("token not provided");
    });

    it("should handle records not found gracefully", async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await groundController.unsubscribe(mockRequest, mockResponse, mockNext);

      expect(mockRepository.findOneBy).toHaveBeenCalledTimes(3);
      expect(mockRepository.remove).toHaveBeenCalledTimes(3);
      expect(mockRepository.remove).toHaveBeenCalledWith(null);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });
  });

  describe("setTokenConfiguration", () => {
    beforeEach(() => {
      mockRequest = {
        body: {
          token: "test-token",
          os: "ios",
          level_all: false,
          level_transactions: true,
          level_price: false,
          level_news: true,
          level_tips: false,
          lang: "es",
          app_version: "2.0.0",
        },
      };
    });

    it("should update existing token configuration", async () => {
      const existingConfig = {
        token: "test-token",
        os: "ios",
        level_all: true,
        level_transactions: false,
        level_price: true,
        level_news: false,
        level_tips: true,
        lang: "en",
        app_version: "1.0.0",
      };
      mockRepository.findOneBy.mockResolvedValue(existingConfig);

      await groundController.setTokenConfiguration(mockRequest, mockResponse, mockNext);

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        token: "test-token",
        os: "ios",
      });
      expect(existingConfig.level_all).toBe(false);
      expect(existingConfig.level_transactions).toBe(true);
      expect(existingConfig.lang).toBe("es");
      expect(existingConfig.app_version).toBe("2.0.0");
      expect(mockRepository.save).toHaveBeenCalledWith(existingConfig);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should create new token configuration if not found", async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await groundController.setTokenConfiguration(mockRequest, mockResponse, mockNext);

      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe("enqueue", () => {
    it("should enqueue notification data", async () => {
      mockRequest = {
        body: {
          type: 1,
          token: "test-token",
          message: "Test notification",
        },
      };

      await groundController.enqueue(mockRequest, mockResponse, mockNext);

      expect(mockRepository.save).toHaveBeenCalledWith({
        data: JSON.stringify(mockRequest.body),
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getTokenConfiguration", () => {
    beforeEach(() => {
      mockRequest = {
        body: {
          token: "test-token",
          os: "ios",
        },
      };
    });

    it("should return existing token configuration", async () => {
      const existingConfig = {
        level_all: true,
        level_transactions: false,
        level_price: true,
        level_news: false,
        level_tips: true,
        lang: "es",
        app_version: "2.0.0",
      };
      mockRepository.findOneBy.mockResolvedValue(existingConfig);

      const result = await groundController.getTokenConfiguration(mockRequest, mockResponse, mockNext);

      expect(result).toEqual({
        level_all: true,
        level_transactions: false,
        level_price: true,
        level_news: false,
        level_tips: true,
        lang: "es",
        app_version: "2.0.0",
      });
    });

    it("should create and return new token configuration if not found", async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await groundController.getTokenConfiguration(mockRequest, mockResponse, mockNext);

      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        level_all: true,
        level_transactions: true,
        level_price: true,
        level_news: true,
        level_tips: true,
        lang: "en",
        app_version: "1.0.0",
      });
    });

    it("should return existing configuration when concurrent request created it first (ER_DUP_ENTRY)", async () => {
      const concurrentlyCreatedConfig = {
        level_all: true,
        level_transactions: false,
        level_price: true,
        level_news: false,
        level_tips: true,
        redacted: false,
        lang: "es",
        app_version: "2.0.0",
      };
      const duplicateError: any = new Error("Duplicate entry 'test-token:ios' for key 'IDX_40ed4dd221d0ff99647ddfa6ec'");
      duplicateError.code = "ER_DUP_ENTRY";
      duplicateError.errno = 1062;

      mockRepository.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce(concurrentlyCreatedConfig);
      mockRepository.save.mockRejectedValueOnce(duplicateError);

      const result = await groundController.getTokenConfiguration(mockRequest, mockResponse, mockNext);

      expect(mockRepository.findOneBy).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        level_all: true,
        level_transactions: false,
        level_price: true,
        level_news: false,
        level_tips: true,
        redacted: false,
        lang: "es",
        app_version: "2.0.0",
      });
    });

    it("should rethrow non-duplicate save errors", async () => {
      const dbError: any = new Error("Connection lost");
      dbError.code = "PROTOCOL_CONNECTION_LOST";

      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.save.mockRejectedValueOnce(dbError);

      await expect(groundController.getTokenConfiguration(mockRequest, mockResponse, mockNext)).rejects.toThrow("Connection lost");
    });
  });
});
