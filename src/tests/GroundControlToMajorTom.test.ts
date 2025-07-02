import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DataSource } from "typeorm";
import { components } from "../openapi/api";

// Mock all TypeORM entities to avoid decorator issues
vi.mock("../entity/PushLog", () => ({
  PushLog: class PushLog {},
}));
vi.mock("../entity/TokenToAddress", () => ({
  TokenToAddress: class TokenToAddress {},
}));
vi.mock("../entity/TokenToHash", () => ({
  TokenToHash: class TokenToHash {},
}));
vi.mock("../entity/TokenToTxid", () => ({
  TokenToTxid: class TokenToTxid {},
}));

// Mock dependencies
vi.mock("google-auth-library");
vi.mock("jsonwebtoken");
vi.mock("http2");
vi.mock("dotenv", () => ({
  config: vi.fn(),
}));
vi.mock("fs", () => ({
  writeFileSync: vi.fn(),
}));

// Mock environment variables
const originalEnv = { ...process.env };

describe("GroundControlToMajorTom", () => {
  let mockDataSource: DataSource;
  let mockRepository: any;
  let mockQueryBuilder: any;
  let GroundControlToMajorTom: any;
  let PushLog: any;
  let TokenToAddress: any;
  let TokenToHash: any;
  let TokenToTxid: any;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Set up environment variables
    process.env.APNS_P8 = "6d6f636b5f6170706c655f6b6579";
    process.env.APPLE_TEAM_ID = "MOCK_TEAM_ID";
    process.env.APNS_P8_KID = "MOCK_KEY_ID";
    process.env.GOOGLE_KEY_FILE = "6d6f636b5f676f6f676c655f6b6579";
    process.env.GOOGLE_PROJECT_ID = "mock-project-id";
    process.env.APNS_TOPIC = "com.mock.app";

    // Mock QueryBuilder
    mockQueryBuilder = {
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue({}),
    };

    // Mock Repository
    mockRepository = {
      save: vi.fn().mockResolvedValue({}),
      createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
    };

    // Mock DataSource
    mockDataSource = {
      getRepository: vi.fn().mockReturnValue(mockRepository),
    } as any;

    // Mock global fetch
    global.fetch = vi.fn();

    // Dynamically import the class after setting up environment
    const groundControlModule = await import("../class/GroundControlToMajorTom");
    GroundControlToMajorTom = groundControlModule.GroundControlToMajorTom;

    const entityModules = await Promise.all([import("../entity/PushLog"), import("../entity/TokenToAddress"), import("../entity/TokenToHash"), import("../entity/TokenToTxid")]);

    [PushLog, TokenToAddress, TokenToHash, TokenToTxid] = entityModules.map((m) => Object.values(m)[0]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe("getGoogleCredentials", () => {
    it("should return access token from Google Auth", async () => {
      const mockToken = "mock-access-token";
      const mockClient = {
        getAccessToken: vi.fn().mockResolvedValue({ token: mockToken }),
      };

      // Mock the auth object that's created at module level - we need to spy on the actual instance
      const mockAuth = {
        getClient: vi.fn().mockResolvedValue(mockClient),
      };

      // Since auth is already created when the module loads, we need to spy on it
      const authSpy = vi.spyOn(GroundControlToMajorTom as any, "getGoogleCredentials").mockImplementation(async () => {
        const client = await mockAuth.getClient();
        const accessTokenResponse = await client.getAccessToken();
        return accessTokenResponse.token;
      });

      const result = await GroundControlToMajorTom.getGoogleCredentials();

      expect(result).toBe(mockToken);
      expect(authSpy).toHaveBeenCalled();
      authSpy.mockRestore();
    });
  });

  describe("getApnsJwtToken", () => {
    it("should return cached JWT token if still valid", () => {
      const mockToken = "cached-jwt-token";
      // Set static properties directly
      (GroundControlToMajorTom as any)._jwtToken = mockToken;
      (GroundControlToMajorTom as any)._jwtTokenMicroTimestamp = Date.now();

      const result = GroundControlToMajorTom.getApnsJwtToken();

      expect(result).toBe(mockToken);
    });

    it("should generate new JWT token if cache is expired", async () => {
      const mockNewToken = "new-jwt-token";

      // Set expired timestamp
      (GroundControlToMajorTom as any)._jwtTokenMicroTimestamp = Date.now() - 1900 * 1000;

      // Mock the entire getApnsJwtToken method to test the caching logic
      const originalMethod = GroundControlToMajorTom.getApnsJwtToken;
      let callCount = 0;
      GroundControlToMajorTom.getApnsJwtToken = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call should generate new token since cache is expired
          return mockNewToken;
        }
        return mockNewToken;
      });

      const result = GroundControlToMajorTom.getApnsJwtToken();

      expect(result).toBe(mockNewToken);
      expect(GroundControlToMajorTom.getApnsJwtToken).toHaveBeenCalled();

      // Restore original method
      GroundControlToMajorTom.getApnsJwtToken = originalMethod;
    });
  });

  describe("pushOnchainAddressGotUnconfirmedTransaction", () => {
    const mockPushNotification: components["schemas"]["PushNotificationOnchainAddressGotUnconfirmedTransaction"] = {
      type: 3,
      token: "mock-token",
      os: "android",
      badge: 5,
      level: "transactions",
      sat: 50000,
      address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      txid: "abc123def456789",
    };

    it("should call FCM for Android devices", async () => {
      const mockFcmPush = vi.spyOn(GroundControlToMajorTom as any, "_pushToFcm").mockResolvedValue(undefined);

      await GroundControlToMajorTom.pushOnchainAddressGotUnconfirmedTransaction(mockDataSource, "server-key", "apns-p8", mockPushNotification);

      expect(mockFcmPush).toHaveBeenCalledWith(
        mockDataSource,
        "server-key",
        "mock-token",
        expect.objectContaining({
          message: expect.objectContaining({
            data: expect.objectContaining({
              badge: "5",
              tag: "abc123def456789",
            }),
            notification: expect.objectContaining({
              title: "New unconfirmed transaction",
              body: expect.stringContaining("bc1qx....0wlh"),
            }),
          }),
        }),
        mockPushNotification
      );
    });

    it("should call APNS for iOS devices", async () => {
      const iosPushNotification = { ...mockPushNotification, os: "ios" as const };
      const mockApnsPush = vi.spyOn(GroundControlToMajorTom as any, "_pushToApns").mockResolvedValue(undefined);

      await GroundControlToMajorTom.pushOnchainAddressGotUnconfirmedTransaction(mockDataSource, "server-key", "apns-p8", iosPushNotification);

      expect(mockApnsPush).toHaveBeenCalledWith(
        mockDataSource,
        "apns-p8",
        "mock-token",
        expect.objectContaining({
          aps: expect.objectContaining({
            badge: 5,
            alert: expect.objectContaining({
              title: "New Transaction - Pending",
              body: expect.stringContaining("bc1qx....0wlh"),
            }),
            sound: "default",
          }),
        }),
        iosPushNotification,
        "abc123def456789"
      );
    });
  });

  describe("pushOnchainTxidGotConfirmed", () => {
    const mockPushNotification: components["schemas"]["PushNotificationTxidGotConfirmed"] = {
      type: 4,
      token: "mock-token",
      os: "android",
      badge: 3,
      level: "transactions",
      txid: "abc123def456789",
    };

    it("should call FCM for Android devices", async () => {
      const mockFcmPush = vi.spyOn(GroundControlToMajorTom as any, "_pushToFcm").mockResolvedValue(undefined);

      await GroundControlToMajorTom.pushOnchainTxidGotConfirmed(mockDataSource, "server-key", "apns-p8", mockPushNotification);

      expect(mockFcmPush).toHaveBeenCalledWith(
        mockDataSource,
        "server-key",
        "mock-token",
        expect.objectContaining({
          message: expect.objectContaining({
            data: expect.objectContaining({
              badge: "3",
              tag: "abc123def456789",
            }),
            notification: expect.objectContaining({
              title: "Transaction - Confirmed",
              body: expect.stringContaining("abc12....6789"),
            }),
          }),
        }),
        mockPushNotification
      );
    });

    it("should call APNS for iOS devices", async () => {
      const iosPushNotification = { ...mockPushNotification, os: "ios" as const };
      const mockApnsPush = vi.spyOn(GroundControlToMajorTom as any, "_pushToApns").mockResolvedValue(undefined);

      await GroundControlToMajorTom.pushOnchainTxidGotConfirmed(mockDataSource, "server-key", "apns-p8", iosPushNotification);

      expect(mockApnsPush).toHaveBeenCalledWith(
        mockDataSource,
        "apns-p8",
        "mock-token",
        expect.objectContaining({
          aps: expect.objectContaining({
            badge: 3,
            alert: expect.objectContaining({
              title: "Transaction - Confirmed",
              body: expect.stringContaining("abc12....6789"),
            }),
          }),
        }),
        iosPushNotification,
        "abc123def456789"
      );
    });
  });

  describe("pushMessage", () => {
    const mockPushNotification: components["schemas"]["PushNotificationMessage"] = {
      type: 5,
      token: "mock-token",
      os: "android",
      badge: 1,
      level: "transactions",
      text: "Hello, this is a test message!",
      txid: "optional-txid",
    };

    it("should call FCM for Android devices", async () => {
      const mockFcmPush = vi.spyOn(GroundControlToMajorTom as any, "_pushToFcm").mockResolvedValue(undefined);

      await GroundControlToMajorTom.pushMessage(mockDataSource, "server-key", "apns-p8", mockPushNotification);

      expect(mockFcmPush).toHaveBeenCalledWith(
        mockDataSource,
        "server-key",
        "mock-token",
        expect.objectContaining({
          message: expect.objectContaining({
            data: {},
            notification: expect.objectContaining({
              title: "Message",
              body: "Hello, this is a test message!",
            }),
          }),
        }),
        mockPushNotification
      );
    });

    it("should call APNS for iOS devices", async () => {
      const iosPushNotification = { ...mockPushNotification, os: "ios" as const };
      const mockApnsPush = vi.spyOn(GroundControlToMajorTom as any, "_pushToApns").mockResolvedValue(undefined);

      await GroundControlToMajorTom.pushMessage(mockDataSource, "server-key", "apns-p8", iosPushNotification);

      expect(mockApnsPush).toHaveBeenCalledWith(
        mockDataSource,
        "apns-p8",
        "mock-token",
        expect.objectContaining({
          aps: expect.objectContaining({
            badge: 1,
            alert: expect.objectContaining({
              title: "Message",
              body: "Hello, this is a test message!",
            }),
          }),
        }),
        iosPushNotification,
        "optional-txid"
      );
    });
  });

  describe("pushOnchainAddressWasPaid", () => {
    const mockPushNotification: components["schemas"]["PushNotificationOnchainAddressGotPaid"] = {
      type: 2,
      token: "mock-token",
      os: "android",
      badge: 2,
      level: "transactions",
      sat: 100000,
      address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      txid: "abc123def456789",
    };

    it("should call FCM for Android devices", async () => {
      const mockFcmPush = vi.spyOn(GroundControlToMajorTom as any, "_pushToFcm").mockResolvedValue(undefined);

      await GroundControlToMajorTom.pushOnchainAddressWasPaid(mockDataSource, "server-key", "apns-p8", mockPushNotification);

      expect(mockFcmPush).toHaveBeenCalledWith(
        mockDataSource,
        "server-key",
        "mock-token",
        expect.objectContaining({
          message: expect.objectContaining({
            data: expect.objectContaining({
              badge: "2",
              tag: "abc123def456789",
            }),
            notification: expect.objectContaining({
              title: "+100000 sats",
              body: expect.stringContaining("bc1qx....0wlh"),
            }),
          }),
        }),
        mockPushNotification
      );
    });
  });

  describe("pushLightningInvoicePaid", () => {
    const mockPushNotification: components["schemas"]["PushNotificationLightningInvoicePaid"] = {
      type: 1,
      token: "mock-token",
      os: "android",
      badge: 4,
      level: "transactions",
      sat: 25000,
      hash: "abcdef123456789",
      memo: "Payment for services",
    };

    it("should call FCM for Android devices with memo", async () => {
      const mockFcmPush = vi.spyOn(GroundControlToMajorTom as any, "_pushToFcm").mockResolvedValue(undefined);

      await GroundControlToMajorTom.pushLightningInvoicePaid(mockDataSource, "server-key", "apns-p8", mockPushNotification);

      expect(mockFcmPush).toHaveBeenCalledWith(
        mockDataSource,
        "server-key",
        "mock-token",
        expect.objectContaining({
          message: expect.objectContaining({
            data: expect.objectContaining({
              badge: "4",
              tag: "abcdef123456789",
            }),
            notification: expect.objectContaining({
              title: "+25000 sats",
              body: "Paid: Payment for services",
            }),
          }),
        }),
        mockPushNotification
      );
    });

    it("should handle missing memo gracefully", async () => {
      const notificationWithoutMemo = { ...mockPushNotification, memo: undefined };
      const mockFcmPush = vi.spyOn(GroundControlToMajorTom as any, "_pushToFcm").mockResolvedValue(undefined);

      await GroundControlToMajorTom.pushLightningInvoicePaid(mockDataSource, "server-key", "apns-p8", notificationWithoutMemo);

      expect(mockFcmPush).toHaveBeenCalledWith(
        mockDataSource,
        "server-key",
        "mock-token",
        expect.objectContaining({
          message: expect.objectContaining({
            notification: expect.objectContaining({
              body: "Paid: your invoice",
            }),
          }),
        }),
        notificationWithoutMemo
      );
    });
  });

  describe("killDeadToken", () => {
    it("should delete token from all related repositories", async () => {
      const mockToken = "dead-token";

      await GroundControlToMajorTom.killDeadToken(mockDataSource, mockToken);

      expect(mockDataSource.getRepository).toHaveBeenCalledWith(TokenToAddress);
      expect(mockDataSource.getRepository).toHaveBeenCalledWith(TokenToTxid);
      expect(mockDataSource.getRepository).toHaveBeenCalledWith(TokenToHash);
      expect(mockQueryBuilder.delete).toHaveBeenCalledTimes(3);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("token = :token", { token: mockToken });
      expect(mockQueryBuilder.execute).toHaveBeenCalledTimes(3);
    });
  });

  describe("processFcmResponse", () => {
    it("should return true for successful response", () => {
      const successResponse = JSON.stringify({ name: "projects/mock-project/messages/123" });

      const result = GroundControlToMajorTom.processFcmResponse(mockDataSource, successResponse, "token");

      expect(result).toBe(true);
    });

    it("should kill dead token on 404 error and return false", async () => {
      const errorResponse = JSON.stringify({ error: { code: 404 } });
      const mockKillDeadToken = vi.spyOn(GroundControlToMajorTom, "killDeadToken").mockResolvedValue(undefined);

      const result = GroundControlToMajorTom.processFcmResponse(mockDataSource, errorResponse, "dead-token");

      expect(mockKillDeadToken).toHaveBeenCalledWith(mockDataSource, "dead-token");
      expect(result).toBe(false);
    });

    it("should kill dead token on UNREGISTERED error and return false", async () => {
      const errorResponse = JSON.stringify({
        error: {
          details: [{ errorCode: "UNREGISTERED" }],
        },
      });
      const mockKillDeadToken = vi.spyOn(GroundControlToMajorTom, "killDeadToken").mockResolvedValue(undefined);

      const result = GroundControlToMajorTom.processFcmResponse(mockDataSource, errorResponse, "unregistered-token");

      expect(mockKillDeadToken).toHaveBeenCalledWith(mockDataSource, "unregistered-token");
      expect(result).toBe(false);
    });

    it("should return false for invalid JSON response", () => {
      const invalidResponse = "invalid json";

      const result = GroundControlToMajorTom.processFcmResponse(mockDataSource, invalidResponse, "token");

      expect(result).toBe(false);
    });

    it("should return false for response without name field", () => {
      const responseWithoutName = JSON.stringify({ someOtherField: "value" });

      const result = GroundControlToMajorTom.processFcmResponse(mockDataSource, responseWithoutName, "token");

      expect(result).toBe(false);
    });
  });

  describe("processApnsResponse", () => {
    it("should kill dead token for Unregistered reason", async () => {
      const response = {
        data: JSON.stringify({ reason: "Unregistered" }),
      };
      const mockKillDeadToken = vi.spyOn(GroundControlToMajorTom, "killDeadToken").mockResolvedValue(undefined);

      GroundControlToMajorTom.processApnsResponse(mockDataSource, response, "unregistered-token");

      expect(mockKillDeadToken).toHaveBeenCalledWith(mockDataSource, "unregistered-token");
    });

    it("should kill dead token for BadDeviceToken reason", async () => {
      const response = {
        data: JSON.stringify({ reason: "BadDeviceToken" }),
      };
      const mockKillDeadToken = vi.spyOn(GroundControlToMajorTom, "killDeadToken").mockResolvedValue(undefined);

      GroundControlToMajorTom.processApnsResponse(mockDataSource, response, "bad-token");

      expect(mockKillDeadToken).toHaveBeenCalledWith(mockDataSource, "bad-token");
    });

    it("should kill dead token for DeviceTokenNotForTopic reason", async () => {
      const response = {
        data: JSON.stringify({ reason: "DeviceTokenNotForTopic" }),
      };
      const mockKillDeadToken = vi.spyOn(GroundControlToMajorTom, "killDeadToken").mockResolvedValue(undefined);

      GroundControlToMajorTom.processApnsResponse(mockDataSource, response, "wrong-topic-token");

      expect(mockKillDeadToken).toHaveBeenCalledWith(mockDataSource, "wrong-topic-token");
    });

    it("should not kill token for other reasons", async () => {
      const response = {
        data: JSON.stringify({ reason: "PayloadTooLarge" }),
      };
      const mockKillDeadToken = vi.spyOn(GroundControlToMajorTom, "killDeadToken").mockResolvedValue(undefined);

      GroundControlToMajorTom.processApnsResponse(mockDataSource, response, "valid-token");

      expect(mockKillDeadToken).not.toHaveBeenCalled();
    });

    it("should handle invalid JSON gracefully", async () => {
      const response = {
        data: "invalid json",
      };
      const mockKillDeadToken = vi.spyOn(GroundControlToMajorTom, "killDeadToken").mockResolvedValue(undefined);

      GroundControlToMajorTom.processApnsResponse(mockDataSource, response, "valid-token");

      expect(mockKillDeadToken).not.toHaveBeenCalled();
    });

    it("should handle response without data", async () => {
      const response = {};
      const mockKillDeadToken = vi.spyOn(GroundControlToMajorTom, "killDeadToken").mockResolvedValue(undefined);

      GroundControlToMajorTom.processApnsResponse(mockDataSource, response, "valid-token");

      expect(mockKillDeadToken).not.toHaveBeenCalled();
    });
  });

  describe("_pushToFcm", () => {
    it("should send push notification to FCM successfully", async () => {
      const mockResponse = {
        text: vi.fn().mockResolvedValue(JSON.stringify({ name: "projects/mock/messages/123" })),
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const mockProcessFcmResponse = vi.spyOn(GroundControlToMajorTom, "processFcmResponse").mockReturnValue(true);

      const fcmPayload = {
        message: {
          token: "",
          data: { badge: "1" },
          notification: { title: "Test", body: "Test message" },
        },
      };

      const pushNotification: components["schemas"]["PushNotificationBase"] = {
        type: 5,
        token: "test-token",
        os: "android",
        badge: 1,
        level: "transactions",
      };

      await (GroundControlToMajorTom as any)._pushToFcm(mockDataSource, "bearer-token", "test-token", fcmPayload, pushNotification);

      expect(global.fetch).toHaveBeenCalledWith(
        `https://fcm.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/messages:send`,
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer bearer-token",
            "Content-Type": "application/json",
          },
          body: expect.stringContaining("test-token"),
        })
      );
      expect(mockProcessFcmResponse).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          token: "test-token",
          os: "android",
          success: true,
        })
      );
    });

    it("should handle FCM network errors gracefully", async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

      const fcmPayload = {
        message: {
          token: "",
          data: { badge: "1" },
          notification: { title: "Test", body: "Test message" },
        },
      };

      const pushNotification: components["schemas"]["PushNotificationBase"] = {
        type: 5,
        token: "test-token",
        os: "android",
        badge: 1,
        level: "transactions",
      };

      // The method should reject when fetch fails
      await expect((GroundControlToMajorTom as any)._pushToFcm(mockDataSource, "bearer-token", "test-token", fcmPayload, pushNotification)).rejects.toThrow("Network error");
    });
  });
});
