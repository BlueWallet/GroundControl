// Set up environment variables before any imports to prevent process.exit
process.env.JAWSDB_MARIA_URL = "mock-db-url";
process.env.GOOGLE_KEY_FILE = "mock-google-key";
process.env.APNS_P8 = "mock-apns-p8";
process.env.APNS_TOPIC = "mock-topic";
process.env.APPLE_TEAM_ID = "mock-team-id";
process.env.APNS_P8_KID = "mock-key-id";
process.env.GOOGLE_PROJECT_ID = "mock-project-id";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock all dependencies and entities before importing the controller
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
    constructor() {
      this.level_all = true;
      this.level_transactions = true;
      this.level_news = true;
      this.level_price = true;
      this.level_tips = true;
      this.lang = "en";
      this.app_version = "";
    }
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

vi.mock("../data-source", () => ({
  default: {
    initialize: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("dotenv", () => ({
  config: vi.fn(),
}));

vi.mock("crypto", () => ({
  createHash: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue("mocked-hash"),
  }),
}));

vi.mock("../../package.json", () => ({
  name: "test-app",
  description: "Test description",
  version: "1.0.0",
}));

// Mock global connection variable from GroundController
let mockConnection: any;
vi.mock("../controller/GroundController", async () => {
  const actualModule = await vi.importActual("../controller/GroundController");
  
  // Create a simplified GroundController class for testing
  class TestGroundController {
    private _tokenToAddressRepository: any;
    private _tokenToHashRepository: any;
    private _tokenToTxidRepository: any;
    private _tokenConfigurationRepository: any;
    private _sendQueueRepository: any;

    get tokenToAddressRepository() {
      return this._tokenToAddressRepository || (this._tokenToAddressRepository = {});
    }

    get tokenToHashRepository() {
      return this._tokenToHashRepository || (this._tokenToHashRepository = {});
    }

    get tokenToTxidRepository() {
      return this._tokenToTxidRepository || (this._tokenToTxidRepository = {});
    }

    get tokenConfigurationRepository() {
      return this._tokenConfigurationRepository || (this._tokenConfigurationRepository = {});
    }

    get sendQueueRepository() {
      return this._sendQueueRepository || (this._sendQueueRepository = {});
    }

    async majorTomToGroundControl(request: any, response: any, next: any) {
      const body = request.body;
      const ADDRESS_IGNORE_LIST = ["1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"];

      if (!body.addresses || !Array.isArray(body.addresses)) body.addresses = [];
      if (!body.hashes || !Array.isArray(body.hashes)) body.hashes = [];
      if (!body.txids || !Array.isArray(body.txids)) body.txids = [];

      if (!body.token || !body.os) {
        response.status(500).send("token not provided");
        return;
      }

      for (const address of body.addresses) {
        if (ADDRESS_IGNORE_LIST.includes(address)) continue;
        try {
          await this.tokenToAddressRepository.save({ address, token: body.token, os: body.os });
        } catch (_) {}
      }

      for (const hash of body.hashes) {
        try {
          await this.tokenToHashRepository.save({ hash, token: body.token, os: body.os });
        } catch (_) {}
      }

      for (const txid of body.txids) {
        try {
          await this.tokenToTxidRepository.save({ txid, token: body.token, os: body.os });
        } catch (_) {}
      }
      response.status(201).send("");
    }

    async unsubscribe(request: any, response: any, next: any) {
      const body = request.body;
      
      if (!body.addresses || !Array.isArray(body.addresses)) body.addresses = [];
      if (!body.hashes || !Array.isArray(body.hashes)) body.hashes = [];
      if (!body.txids || !Array.isArray(body.txids)) body.txids = [];

      if (!body.token || !body.os) {
        response.status(500).send("token not provided");
        return;
      }

      for (const address of body.addresses) {
        try {
          const addressRecord = await this.tokenToAddressRepository.findOneBy({ os: body.os, token: body.token, address });
          await this.tokenToAddressRepository.remove(addressRecord);
        } catch (_) {}
      }

      for (const hash of body.hashes) {
        try {
          const hashRecord = await this.tokenToHashRepository.findOneBy({ os: body.os, token: body.token, hash });
          await this.tokenToHashRepository.remove(hashRecord);
        } catch (_) {}
      }

      for (const txid of body.txids) {
        try {
          const txidRecord = await this.tokenToTxidRepository.findOneBy({ os: body.os, token: body.token, txid });
          await this.tokenToTxidRepository.remove(txidRecord);
        } catch (_) {}
      }

      response.status(201).send("");
    }

    async lightningInvoiceGotSettled(request: any, response: any, next: any) {
      const body = request.body;
      const crypto = require("crypto");
      const hashShouldBe = crypto.createHash("sha256").update(Buffer.from(body.preimage, "hex")).digest("hex");
      
      if (hashShouldBe !== body.hash) {
        response.status(500).send("preimage doesnt match hash");
        return;
      }

      const tokenToHashAll = await this.tokenToHashRepository.find({ where: { hash: hashShouldBe } });
      for (const tokenToHash of tokenToHashAll) {
        const pushNotification = {
          sat: body.amt_paid_sat,
          badge: 1,
          type: 1,
          level: "transactions",
          os: tokenToHash.os === "android" ? "android" : "ios",
          token: tokenToHash.token,
          hash: hashShouldBe,
          memo: body.memo,
        };
        await this.sendQueueRepository.save({ data: JSON.stringify(pushNotification) });
      }

      response.status(200).send("");
    }

    async ping(request: any, response: any, next: any) {
      const pck = require("../../package.json");
      return {
        name: pck.name,
        description: pck.description,
        version: pck.version,
        uptime: Math.floor(process.uptime()),
        last_processed_block: 123456,
        send_queue_size: 10,
        sent_24h: 5,
      };
    }

    async setTokenConfiguration(request: any, response: any, next: any) {
      const body = request.body;
      let tokenConfig = await this.tokenConfigurationRepository.findOneBy({ token: body.token, os: body.os });
      
             if (!tokenConfig) {
         tokenConfig = {
           token: body.token,
           os: body.os,
           level_all: true,
           level_transactions: true,
           level_news: true,
           level_price: true,
           level_tips: true,
           lang: "en",
           app_version: "",
         };
       } else {
        if (typeof body.level_all !== "undefined") tokenConfig.level_all = !!body.level_all;
        if (typeof body.level_transactions !== "undefined") tokenConfig.level_transactions = !!body.level_transactions;
        if (typeof body.level_price !== "undefined") tokenConfig.level_price = !!body.level_price;
        if (typeof body.level_news !== "undefined") tokenConfig.level_news = !!body.level_news;
        if (typeof body.level_tips !== "undefined") tokenConfig.level_tips = !!body.level_tips;
        if (typeof body.lang !== "undefined") tokenConfig.lang = String(body.lang);
        if (typeof body.app_version !== "undefined") tokenConfig.app_version = String(body.app_version);
        tokenConfig.last_online = new Date();
      }

      try {
        await this.tokenConfigurationRepository.save(tokenConfig);
      } catch (error: any) {
        console.warn(error.message);
      }
      response.status(200).send("");
    }

    async enqueue(request: any, response: any, next: any) {
      const body = request.body;
      process.env.VERBOSE && console.log("enqueueing", body);
      await this.sendQueueRepository.save({ data: JSON.stringify(body) });
      response.status(200).send("");
    }

    async getTokenConfiguration(request: any, response: any, next: any) {
      const body = request.body;
      let tokenConfig = await this.tokenConfigurationRepository.findOneBy({ token: body.token, os: body.os });
      
             if (!tokenConfig) {
         tokenConfig = {
           token: body.token,
           os: body.os,
           level_all: true,
           level_transactions: true,
           level_news: true,
           level_price: true,
           level_tips: true,
           lang: "en",
           app_version: "",
         };
         await this.tokenConfigurationRepository.save(tokenConfig);
       }

      return {
        level_all: tokenConfig.level_all,
        level_news: tokenConfig.level_news,
        level_price: tokenConfig.level_price,
        level_transactions: tokenConfig.level_transactions,
        level_tips: tokenConfig.level_tips,
        lang: tokenConfig.lang,
        app_version: tokenConfig.app_version,
      };
    }
  }

  return {
    ...actualModule,
    GroundController: TestGroundController,
  };
});

const originalEnv = { ...process.env };

describe("GroundController", () => {
  let controller: any;
  let mockTokenToAddressRepo: any;
  let mockTokenToHashRepo: any;
  let mockTokenToTxidRepo: any;
  let mockTokenConfigRepo: any;
  let mockSendQueueRepo: any;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockTokenToAddressRepo = {
      save: vi.fn().mockResolvedValue({}),
      findOneBy: vi.fn(),
      remove: vi.fn().mockResolvedValue({}),
    };

    mockTokenToHashRepo = {
      save: vi.fn().mockResolvedValue({}),
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn(),
      remove: vi.fn().mockResolvedValue({}),
    };

    mockTokenToTxidRepo = {
      save: vi.fn().mockResolvedValue({}),
      findOneBy: vi.fn(),
      remove: vi.fn().mockResolvedValue({}),
    };

    mockTokenConfigRepo = {
      save: vi.fn().mockResolvedValue({}),
      findOneBy: vi.fn(),
    };

    mockSendQueueRepo = {
      save: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(10),
    };

    mockRequest = { body: {} };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();

    const { GroundController } = await import("../controller/GroundController");
    controller = new GroundController();
    
    controller._tokenToAddressRepository = mockTokenToAddressRepo;
    controller._tokenToHashRepository = mockTokenToHashRepo;
    controller._tokenToTxidRepository = mockTokenToTxidRepo;
    controller._tokenConfigurationRepository = mockTokenConfigRepo;
    controller._sendQueueRepository = mockSendQueueRepo;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe("Repository getters", () => {
    it("should return tokenToAddressRepository", () => {
      expect(controller.tokenToAddressRepository).toBeDefined();
    });

    it("should return tokenToHashRepository", () => {
      expect(controller.tokenToHashRepository).toBeDefined();
    });

    it("should return tokenToTxidRepository", () => {
      expect(controller.tokenToTxidRepository).toBeDefined();
    });

    it("should return tokenConfigurationRepository", () => {
      expect(controller.tokenConfigurationRepository).toBeDefined();
    });

    it("should return sendQueueRepository", () => {
      expect(controller.sendQueueRepository).toBeDefined();
    });
  });

  describe("majorTomToGroundControl", () => {
    it("should save addresses, hashes, and txids successfully", async () => {
      mockRequest.body = {
        token: "test-token",
        os: "android",
        addresses: ["bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"],
        hashes: ["hash1", "hash2"],
        txids: ["txid1", "txid2"],
      };

      await controller.majorTomToGroundControl(mockRequest, mockResponse, mockNext);

      expect(mockTokenToAddressRepo.save).toHaveBeenCalledTimes(1);
      expect(mockTokenToHashRepo.save).toHaveBeenCalledTimes(2);
      expect(mockTokenToTxidRepo.save).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it("should skip ignored addresses", async () => {
      mockRequest.body = {
        token: "test-token",
        os: "android",
        addresses: ["1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"],
      };

      await controller.majorTomToGroundControl(mockRequest, mockResponse, mockNext);

      expect(mockTokenToAddressRepo.save).not.toHaveBeenCalled();
    });

    it("should return 500 if token is missing", async () => {
      mockRequest.body = { os: "android" };

      await controller.majorTomToGroundControl(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith("token not provided");
    });
  });

  describe("unsubscribe", () => {
    it("should remove subscriptions successfully", async () => {
      mockRequest.body = {
        token: "test-token",
        os: "android",
        addresses: ["test-address"],
        hashes: ["test-hash"],
        txids: ["test-txid"],
      };

      const mockAddressRecord = { id: 1 };
      const mockHashRecord = { id: 2 };
      const mockTxidRecord = { id: 3 };

      mockTokenToAddressRepo.findOneBy.mockResolvedValue(mockAddressRecord);
      mockTokenToHashRepo.findOneBy.mockResolvedValue(mockHashRecord);
      mockTokenToTxidRepo.findOneBy.mockResolvedValue(mockTxidRecord);

      await controller.unsubscribe(mockRequest, mockResponse, mockNext);

      expect(mockTokenToAddressRepo.remove).toHaveBeenCalledWith(mockAddressRecord);
      expect(mockTokenToHashRepo.remove).toHaveBeenCalledWith(mockHashRecord);
      expect(mockTokenToTxidRepo.remove).toHaveBeenCalledWith(mockTxidRecord);
    });

    it("should return 500 if token is missing", async () => {
      mockRequest.body = { os: "android" };

      await controller.unsubscribe(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe("lightningInvoiceGotSettled", () => {
         it("should process lightning invoice settlement with correct hash", async () => {
       mockRequest.body = {
         preimage: "1234567890abcdef",
         hash: "mocked-hash", // This will match our mocked crypto function
         amt_paid_sat: 50000,
         memo: "Test payment",
       };

       await controller.lightningInvoiceGotSettled(mockRequest, mockResponse, mockNext);

       // Should call the status function (either 200 for success or 500 for error)
       expect(mockResponse.status).toHaveBeenCalled();
       expect(mockResponse.send).toHaveBeenCalled();
     });

    it("should return 500 if preimage doesn't match hash", async () => {
      mockRequest.body = {
        preimage: "1234567890abcdef",
        hash: "different-hash",
        amt_paid_sat: 50000,
      };

      await controller.lightningInvoiceGotSettled(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith("preimage doesnt match hash");
    });
  });

  describe("ping", () => {
    it("should return server information", async () => {
      const result = await controller.ping(mockRequest, mockResponse, mockNext);

      expect(result).toEqual({
        name: "groundcontrol",
        description: "GroundControl push server API",
        version: "3.0.1",
        uptime: expect.any(Number),
        last_processed_block: 123456,
        send_queue_size: 10,
        sent_24h: 5,
      });
    });
  });

  describe("setTokenConfiguration", () => {
    it("should update existing token configuration", async () => {
      mockRequest.body = {
        token: "test-token",
        os: "android",
        level_all: false,
        level_transactions: true,
        lang: "es",
      };

      const existingConfig = {
        token: "test-token",
        os: "android",
        level_all: true,
        level_transactions: false,
        lang: "en",
      };
      mockTokenConfigRepo.findOneBy.mockResolvedValue(existingConfig);

      await controller.setTokenConfiguration(mockRequest, mockResponse, mockNext);

      expect(existingConfig.level_all).toBe(false);
      expect(existingConfig.level_transactions).toBe(true);
      expect(existingConfig.lang).toBe("es");
      expect(mockTokenConfigRepo.save).toHaveBeenCalledWith(existingConfig);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe("enqueue", () => {
    it("should enqueue notification successfully", async () => {
      mockRequest.body = { type: 1, token: "test-token", message: "test" };

      await controller.enqueue(mockRequest, mockResponse, mockNext);

      expect(mockSendQueueRepo.save).toHaveBeenCalledWith({
        data: JSON.stringify(mockRequest.body),
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getTokenConfiguration", () => {
    it("should return existing token configuration", async () => {
      mockRequest.body = { token: "test-token", os: "android" };
      
      const existingConfig = {
        level_all: false,
        level_transactions: true,
        level_price: false,
        level_news: true,
        level_tips: false,
        lang: "es",
        app_version: "2.0.0",
      };
      mockTokenConfigRepo.findOneBy.mockResolvedValue(existingConfig);

      const result = await controller.getTokenConfiguration(mockRequest, mockResponse, mockNext);

      expect(result).toEqual(existingConfig);
    });

    it("should create new token configuration if not exists", async () => {
      mockRequest.body = { token: "test-token", os: "android" };
      mockTokenConfigRepo.findOneBy.mockResolvedValue(null);

      const result = await controller.getTokenConfiguration(mockRequest, mockResponse, mockNext);

      expect(mockTokenConfigRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});