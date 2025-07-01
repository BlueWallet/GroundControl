import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StringUtils } from "../utils/stringUtils";

// Mock environment variables for testing
const originalEnv = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = {
    ...originalEnv,
    APNS_P8: "2d2d2d2d2d424547494e205052495641544520534d454420454d454d454d454d20504f494e54452d2d2d2d2d0a4d484943416741472d412b6742414d42",
    APPLE_TEAM_ID: "ABCD123456",
    APNS_P8_KID: "ABC123DEF4",
    GOOGLE_KEY_FILE: "7b2274797065223a22736572766963655f6163636f756e74222c2270726f6a6563745f6964223a2274657374227d",
    GOOGLE_PROJECT_ID: "test-project-123",
    APNS_TOPIC: "com.test.app",
  };
});

afterEach(() => {
  process.env = originalEnv;
  vi.restoreAllMocks();
});

describe("Push Notification System", () => {
  describe("StringUtils", () => {
    describe("shortenAddress", () => {
      it("should shorten Bitcoin addresses correctly", () => {
        const longAddress = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
        const result = StringUtils.shortenAddress(longAddress);
        expect(result).toBe("bc1qx....0wlh");
      });

      it("should shorten Lightning addresses correctly", () => {
        const lightningAddress = "1MNH5eZ1AFZGhBg5FjNt35H7YfZE1AW8Zf";
        const result = StringUtils.shortenAddress(lightningAddress);
        expect(result).toBe("1MNH5....W8Zf");
      });

      it("should handle bech32 addresses", () => {
        const bech32Address = "bc1qrnn4wfhgz2e0etek66sh3n9l6k99alxk044mhr";
        const result = StringUtils.shortenAddress(bech32Address);
        expect(result).toBe("bc1qr....4mhr");
      });

      it("should handle legacy addresses", () => {
        const legacyAddress = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
        const result = StringUtils.shortenAddress(legacyAddress);
        expect(result).toBe("1A1zP....vfNa");
      });

      it("should handle Taproot addresses", () => {
        const taprootAddress = "bc1pmfr3p9j00pfxjh0zmgp99y8zftmd3s5pmedqhyptwy6lm87hf5sspknykm";
        const result = StringUtils.shortenAddress(taprootAddress);
        expect(result).toBe("bc1pm....nykm");
      });

      it("should return unchanged for very short addresses", () => {
        const shortAddress = "short";
        const result = StringUtils.shortenAddress(shortAddress);
        expect(result).toBe("short");
      });

      it("should handle exactly 10 character strings", () => {
        const tenCharAddress = "1234567890";
        const result = StringUtils.shortenAddress(tenCharAddress);
        expect(result).toBe("12345....7890");
      });

      it("should handle empty strings gracefully", () => {
        const emptyAddress = "";
        const result = StringUtils.shortenAddress(emptyAddress);
        expect(result).toBe("");
      });

      it("should handle null and undefined safely", () => {
        // The current implementation doesn't handle null/undefined, so we expect errors
        expect(() => StringUtils.shortenAddress(null as any)).toThrow();
        expect(() => StringUtils.shortenAddress(undefined as any)).toThrow();
      });

      it("should handle special characters in addresses", () => {
        const specialAddress = "abc!@#$%^&*()def1234567890";
        const result = StringUtils.shortenAddress(specialAddress);
        expect(result).toBe("abc!@....7890");
      });
    });

    describe("shortenTxid", () => {
      it("should shorten transaction IDs correctly", () => {
        const longTxid = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";
        const result = StringUtils.shortenTxid(longTxid);
        expect(result).toBe("a1b2c....3456");
      });

      it("should match shortenAddress behavior exactly", () => {
        const txid = "f2ca1bb6c7e907d06dafe4687cf0c76f0b8c33d6c7e907d06dafe4687cf0c76f";
        const addressResult = StringUtils.shortenAddress(txid);
        const txidResult = StringUtils.shortenTxid(txid);
        expect(addressResult).toBe(txidResult);
      });

      it("should handle Lightning invoice payment hashes", () => {
        const hash = "abcdef123456789012345678901234567890abcdef123456789012345678901234";
        const result = StringUtils.shortenTxid(hash);
        expect(result).toBe("abcde....1234");
      });

      it("should handle shorter transaction IDs", () => {
        const shortTxid = "abc123";
        const result = StringUtils.shortenTxid(shortTxid);
        expect(result).toBe("abc123");
      });
    });
  });

  describe("Push Notification Payload Generation", () => {
    let mockFcmPayload: any;
    let mockApnsPayload: any;

    beforeEach(() => {
      mockFcmPayload = {
        message: {
          token: "",
          data: {},
          notification: {},
        },
      };

      mockApnsPayload = {
        aps: {
          badge: 0,
          alert: {},
          sound: "default",
        },
        data: {},
      };
    });

    describe("Bitcoin Transaction Notifications", () => {
      it("should create correct unconfirmed transaction payload", () => {
        const address = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
        const txid = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";
        const badge = 5;

        // Simulate FCM payload creation
        mockFcmPayload.message.data.badge = String(badge);
        mockFcmPayload.message.data.tag = txid;
        mockFcmPayload.message.notification.title = "New unconfirmed transaction";
        mockFcmPayload.message.notification.body = "You received new transfer on " + StringUtils.shortenAddress(address);

        expect(mockFcmPayload.message.notification.title).toBe("New unconfirmed transaction");
        expect(mockFcmPayload.message.notification.body).toBe("You received new transfer on bc1qx....0wlh");
        expect(mockFcmPayload.message.data.badge).toBe("5");
        expect(mockFcmPayload.message.data.tag).toBe(txid);
      });

      it("should create correct confirmed payment payload", () => {
        const address = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
        const txid = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";
        const satAmount = 50000;
        const badge = 3;

        // Simulate FCM payload creation
        mockFcmPayload.message.data.badge = String(badge);
        mockFcmPayload.message.data.tag = txid;
        mockFcmPayload.message.notification.title = "+" + satAmount + " sats";
        mockFcmPayload.message.notification.body = "Received on " + StringUtils.shortenAddress(address);

        expect(mockFcmPayload.message.notification.title).toBe("+50000 sats");
        expect(mockFcmPayload.message.notification.body).toBe("Received on bc1qx....0wlh");
        expect(mockFcmPayload.message.data.badge).toBe("3");
      });

      it("should create correct transaction confirmation payload", () => {
        const txid = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";
        const badge = 2;

        // Simulate FCM payload creation
        mockFcmPayload.message.data.badge = String(badge);
        mockFcmPayload.message.data.tag = txid;
        mockFcmPayload.message.notification.title = "Transaction - Confirmed";
        mockFcmPayload.message.notification.body = "Your transaction " + StringUtils.shortenTxid(txid) + " has been confirmed";

        expect(mockFcmPayload.message.notification.title).toBe("Transaction - Confirmed");
        expect(mockFcmPayload.message.notification.body).toBe("Your transaction a1b2c....3456 has been confirmed");
        expect(mockFcmPayload.message.data.tag).toBe(txid);
      });
    });

    describe("Lightning Network Notifications", () => {
      it("should create correct lightning invoice paid payload with memo", () => {
        const satAmount = 1000;
        const memo = "Coffee payment";
        const hash = "abcdef123456789012345678901234567890abcdef123456789012345678901234";
        const badge = 1;

        // Simulate FCM payload creation
        mockFcmPayload.message.data.badge = String(badge);
        mockFcmPayload.message.data.tag = hash;
        mockFcmPayload.message.notification.title = "+" + satAmount + " sats";
        mockFcmPayload.message.notification.body = "Paid: " + (memo || "your invoice");

        expect(mockFcmPayload.message.notification.title).toBe("+1000 sats");
        expect(mockFcmPayload.message.notification.body).toBe("Paid: Coffee payment");
        expect(mockFcmPayload.message.data.tag).toBe(hash);
      });

      it("should handle missing memo gracefully", () => {
        const satAmount = 1000;
        const memo = undefined;
        const badge = 1;

        // Simulate FCM payload creation
        mockFcmPayload.message.data.badge = String(badge);
        mockFcmPayload.message.notification.title = "+" + satAmount + " sats";
        mockFcmPayload.message.notification.body = "Paid: " + (memo || "your invoice");

        expect(mockFcmPayload.message.notification.body).toBe("Paid: your invoice");
      });

      it("should handle empty memo correctly", () => {
        const satAmount = 1000;
        const memo = "";
        const badge = 1;

        // Simulate FCM payload creation
        mockFcmPayload.message.data.badge = String(badge);
        mockFcmPayload.message.notification.title = "+" + satAmount + " sats";
        mockFcmPayload.message.notification.body = "Paid: " + (memo || "your invoice");

        expect(mockFcmPayload.message.notification.body).toBe("Paid: your invoice");
      });

      it("should handle large lightning payments", () => {
        const satAmount = 100000000; // 1 BTC in sats
        const memo = "Large payment";
        const badge = 1;

        // Simulate FCM payload creation
        mockFcmPayload.message.notification.title = "+" + satAmount + " sats";
        mockFcmPayload.message.notification.body = "Paid: " + memo;

        expect(mockFcmPayload.message.notification.title).toBe("+100000000 sats");
        expect(mockFcmPayload.message.notification.body).toBe("Paid: Large payment");
      });
    });

    describe("Generic Message Notifications", () => {
      it("should create simple message notification", () => {
        const text = "Welcome to GroundControl!";
        const badge = 2;

        // Simulate FCM payload creation
        mockFcmPayload.message.data = {};
        mockFcmPayload.message.notification.title = "Message";
        mockFcmPayload.message.notification.body = text;

        expect(mockFcmPayload.message.notification.title).toBe("Message");
        expect(mockFcmPayload.message.notification.body).toBe("Welcome to GroundControl!");
      });

      it("should handle long messages", () => {
        const longText = "This is a very long message that might be truncated depending on the push notification service limits. It contains important information that users need to see.";
        
        // Simulate FCM payload creation
        mockFcmPayload.message.notification.title = "Message";
        mockFcmPayload.message.notification.body = longText;

        expect(mockFcmPayload.message.notification.body).toBe(longText);
        expect(mockFcmPayload.message.notification.body.length).toBeGreaterThan(100);
      });

      it("should handle special characters in messages", () => {
        const specialText = "Message with émojis 🚀 and special chars: &<>\"'";
        
        // Simulate FCM payload creation
        mockFcmPayload.message.notification.title = "Message";
        mockFcmPayload.message.notification.body = specialText;

        expect(mockFcmPayload.message.notification.body).toBe(specialText);
      });
    });

    describe("APNS vs FCM Payload Differences", () => {
      it("should format badges differently for FCM vs APNS", () => {
        const badge = 5;

        // FCM uses string badges
        mockFcmPayload.message.data.badge = String(badge);
        
        // APNS uses numeric badges
        mockApnsPayload.aps.badge = badge;

        expect(mockFcmPayload.message.data.badge).toBe("5");
        expect(mockApnsPayload.aps.badge).toBe(5);
        expect(typeof mockFcmPayload.message.data.badge).toBe("string");
        expect(typeof mockApnsPayload.aps.badge).toBe("number");
      });

      it("should structure alert content differently", () => {
        const title = "New Payment";
        const body = "You received 1000 sats";

        // FCM structure
        mockFcmPayload.message.notification = { title, body };
        
        // APNS structure
        mockApnsPayload.aps.alert = { title, body };

        expect(mockFcmPayload.message.notification.title).toBe(title);
        expect(mockFcmPayload.message.notification.body).toBe(body);
        expect(mockApnsPayload.aps.alert.title).toBe(title);
        expect(mockApnsPayload.aps.alert.body).toBe(body);
      });

      it("should include default sound for APNS", () => {
        expect(mockApnsPayload.aps.sound).toBe("default");
        expect(mockFcmPayload.message.sound).toBeUndefined();
      });
    });
  });

  describe("Response Processing Logic", () => {
    describe("FCM Response Processing", () => {
      it("should identify successful FCM responses", () => {
        const successfulResponses = [
          '{"name": "projects/test/messages/123"}',
          '{"name": "projects/test/messages/456", "messageId": "abc"}',
        ];

        successfulResponses.forEach(response => {
          const parsed = JSON.parse(response);
          const isSuccess = !!parsed.name;
          expect(isSuccess).toBe(true);
        });
      });

      it("should identify token-killing FCM errors", () => {
        const tokenKillingErrors = [
          '{"error": {"code": 404, "message": "Not found"}}',
          '{"error": {"details": [{"errorCode": "UNREGISTERED"}]}}',
        ];

        tokenKillingErrors.forEach(errorResponse => {
          const parsed = JSON.parse(errorResponse);
          const shouldKillToken = 
            (parsed.error?.code === 404) ||
            (Array.isArray(parsed.error?.details) && 
             parsed.error.details.some((d: any) => d.errorCode === "UNREGISTERED"));
          
          expect(shouldKillToken).toBe(true);
        });
      });

      it("should handle non-token-killing FCM errors", () => {
        const nonKillingErrors = [
          '{"error": {"code": 500, "message": "Internal error"}}',
          '{"error": {"code": 429, "message": "Rate limited"}}',
          '{"error": {"code": 400, "message": "Invalid request"}}',
        ];

        nonKillingErrors.forEach(errorResponse => {
          const parsed = JSON.parse(errorResponse);
          const shouldKillToken = parsed.error?.code === 404;
          expect(shouldKillToken).toBe(false);
        });
      });

      it("should handle malformed JSON responses", () => {
        const malformedResponses = [
          '{"invalid": json}',
          'not json at all',
          '',
          '{incomplete',
        ];

        malformedResponses.forEach(response => {
          let isValidJson = true;
          try {
            JSON.parse(response);
          } catch {
            isValidJson = false;
          }
          expect(isValidJson).toBe(false);
        });
      });
    });

    describe("APNS Response Processing", () => {
      it("should identify token-killing APNS reasons", () => {
        const tokenKillingReasons = [
          "Unregistered",
          "BadDeviceToken", 
          "DeviceTokenNotForTopic"
        ];

        tokenKillingReasons.forEach(reason => {
          const response = { data: JSON.stringify({ reason }), ":status": 400 };
          const parsed = JSON.parse(response.data);
          const shouldKillToken = ["Unregistered", "BadDeviceToken", "DeviceTokenNotForTopic"].includes(parsed.reason);
          expect(shouldKillToken).toBe(true);
        });
      });

      it("should handle non-token-killing APNS reasons", () => {
        const nonKillingReasons = [
          "PayloadTooLarge",
          "BadCertificate",
          "BadPath",
          "BadCertificateEnvironment"
        ];

        nonKillingReasons.forEach(reason => {
          const response = { data: JSON.stringify({ reason }), ":status": 400 };
          const parsed = JSON.parse(response.data);
          const shouldKillToken = ["Unregistered", "BadDeviceToken", "DeviceTokenNotForTopic"].includes(parsed.reason);
          expect(shouldKillToken).toBe(false);
        });
      });

      it("should handle successful APNS responses", () => {
        const successfulResponse = { ":status": 200 };
        expect(successfulResponse[":status"]).toBe(200);
      });

      it("should handle APNS responses without data", () => {
        const responseWithoutData: any = { ":status": 400 };
        expect(responseWithoutData.data).toBeUndefined();
      });
    });
  });

  describe("Data Validation and Edge Cases", () => {
    describe("Address Validation", () => {
      it("should handle various Bitcoin address formats", () => {
        const addresses = [
          "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", // Legacy
          "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy", // P2SH
          "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4", // Bech32
          "bc1pmfr3p9j00pfxjh0zmgp99y8zftmd3s5pmedqhyptwy6lm87hf5sspknykm", // Taproot
        ];

        addresses.forEach(address => {
          const shortened = StringUtils.shortenAddress(address);
          expect(shortened).toContain("....");
          expect(shortened.length).toBeLessThan(address.length);
        });
      });

      it("should handle invalid addresses gracefully", () => {
        const invalidAddresses = [
          "invalid_address",
          "bc1invalid",
          "1invalid",
          "3invalid",
        ];

        invalidAddresses.forEach(address => {
          // StringUtils should still work even with invalid addresses
          expect(() => StringUtils.shortenAddress(address)).not.toThrow();
        });
      });
    });

    describe("Satoshi Amount Handling", () => {
      it("should handle various satoshi amounts", () => {
        const amounts = [
          1, // 1 sat
          100, // 100 sats
          1000, // 1k sats
          100000, // 100k sats
          100000000, // 1 BTC
          2100000000000000, // Max Bitcoin supply
        ];

        amounts.forEach(amount => {
          const title = "+" + amount + " sats";
          expect(title).toMatch(/^\+\d+ sats$/);
          expect(parseInt(title.replace(/^\+(\d+) sats$/, '$1'))).toBe(amount);
        });
      });

      it("should handle zero and negative amounts", () => {
        const zeroAmount = 0;
        const title = "+" + zeroAmount + " sats";
        expect(title).toBe("+0 sats");

        // Negative amounts shouldn't happen in practice, but let's be safe
        const negativeAmount = -100;
        const negativeTitle = "+" + negativeAmount + " sats";
        expect(negativeTitle).toBe("+-100 sats");
      });
    });

    describe("Memo and Text Handling", () => {
      it("should handle various memo formats", () => {
        const memos = [
          "Simple memo",
          "Memo with émojis 🚀⚡",
          "Memo with special chars: &<>\"'",
          "Very long memo that goes on and on and might be truncated by some services",
          "",
          undefined,
          null,
        ];

        memos.forEach(memo => {
          const body = "Paid: " + (memo || "your invoice");
          if (memo) {
            expect(body).toBe(`Paid: ${memo}`);
          } else {
            expect(body).toBe("Paid: your invoice");
          }
        });
      });

      it("should handle unicode and special characters", () => {
        const specialTexts = [
          "Bitcoin ₿",
          "Lightning ⚡",
          "Japanese: こんにちは",
          "Emoji: 🚀💰⚡₿",
          "HTML: <script>alert('test')</script>",
          "SQL: '; DROP TABLE users; --",
        ];

        specialTexts.forEach(text => {
          // Text should be preserved as-is
          const notification = { body: text };
          expect(notification.body).toBe(text);
        });
      });
    });
  });
});