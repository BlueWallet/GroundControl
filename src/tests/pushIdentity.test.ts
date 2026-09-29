import { describe, it, expect } from "vitest";
import { PUSH_IDENTITY_MAX_LENGTH, fitsVarcharColumn, isDataTooLongError, pushIdentityFitsStorage } from "../push-identity";

describe("pushIdentityFitsStorage", () => {
  it("accepts a normal device token and os", () => {
    expect(pushIdentityFitsStorage("ios", "a".repeat(64))).toBe(true);
    expect(pushIdentityFitsStorage("android", "fcm-token")).toBe(true);
  });

  it("accepts a token at the varchar limit", () => {
    expect(pushIdentityFitsStorage("ios", "a".repeat(PUSH_IDENTITY_MAX_LENGTH))).toBe(true);
  });

  it("rejects a token longer than the token column", () => {
    expect(pushIdentityFitsStorage("ios", "A".repeat(PUSH_IDENTITY_MAX_LENGTH + 1))).toBe(false);
    expect(pushIdentityFitsStorage("android", "A".repeat(40000))).toBe(false);
  });

  it("rejects an os longer than the os column", () => {
    expect(pushIdentityFitsStorage("a".repeat(PUSH_IDENTITY_MAX_LENGTH + 1), "token")).toBe(false);
  });

  it("rejects missing or non-string identities", () => {
    expect(pushIdentityFitsStorage(undefined, "token")).toBe(false);
    expect(pushIdentityFitsStorage("ios", undefined)).toBe(false);
    expect(pushIdentityFitsStorage("ios", "")).toBe(false);
    expect(pushIdentityFitsStorage("", "token")).toBe(false);
    expect(pushIdentityFitsStorage("ios", 123)).toBe(false);
  });
});

describe("fitsVarcharColumn", () => {
  it("accepts a normal address, hash, or txid", () => {
    expect(fitsVarcharColumn("bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh")).toBe(true);
    expect(fitsVarcharColumn("a".repeat(PUSH_IDENTITY_MAX_LENGTH))).toBe(true);
  });

  it("rejects values that cannot be stored in an unlengthened string column", () => {
    expect(fitsVarcharColumn("A".repeat(PUSH_IDENTITY_MAX_LENGTH + 1))).toBe(false);
    expect(fitsVarcharColumn("")).toBe(false);
    expect(fitsVarcharColumn(undefined)).toBe(false);
    expect(fitsVarcharColumn({ address: "bc1q" })).toBe(false);
  });
});

describe("isDataTooLongError", () => {
  it("matches MariaDB ER_DATA_TOO_LONG", () => {
    expect(isDataTooLongError({ code: "ER_DATA_TOO_LONG" })).toBe(true);
  });

  it("does not match other database errors", () => {
    expect(isDataTooLongError({ code: "ER_DUP_ENTRY" })).toBe(false);
    expect(isDataTooLongError(undefined)).toBe(false);
  });
});
