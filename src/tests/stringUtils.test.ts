import { describe, it, expect } from "vitest";
import { StringUtils } from "../utils/stringUtils";

describe("StringUtils", () => {
  describe("shortenAddress", () => {
    it("should shorten long addresses correctly", () => {
      const longAddress = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
      const result = StringUtils.shortenAddress(longAddress);
      expect(result).toBe("bc1qx....0wlh");
    });

    it("should shorten long transaction IDs correctly", () => {
      const longTxid = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";
      const result = StringUtils.shortenAddress(longTxid);
      expect(result).toBe("a1b2c....3456");
    });

    it("should return address unchanged if length is less than 10", () => {
      const shortAddress = "short";
      const result = StringUtils.shortenAddress(shortAddress);
      expect(result).toBe("short");
    });

    it("should handle exactly 10 character addresses", () => {
      const tenCharAddress = "1234567890";
      const result = StringUtils.shortenAddress(tenCharAddress);
      expect(result).toBe("12345....7890");
    });

    it("should handle empty strings", () => {
      const emptyAddress = "";
      const result = StringUtils.shortenAddress(emptyAddress);
      expect(result).toBe("");
    });
  });

  describe("shortenTxid", () => {
    it("should behave exactly like shortenAddress", () => {
      const longTxid = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";
      const resultFromShortenTxid = StringUtils.shortenTxid(longTxid);
      const resultFromShortenAddress = StringUtils.shortenAddress(longTxid);

      expect(resultFromShortenTxid).toBe(resultFromShortenAddress);
      expect(resultFromShortenTxid).toBe("a1b2c....3456");
    });

    it("should handle short transaction IDs", () => {
      const shortTxid = "abc123";
      const result = StringUtils.shortenTxid(shortTxid);
      expect(result).toBe("abc123");
    });
  });
});
