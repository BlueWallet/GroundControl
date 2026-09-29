import { describe, it, expect } from "vitest";
import { MalformedNotificationError, notificationPayloadIsSendable } from "../notification-payload";

describe("notificationPayloadIsSendable", () => {
  it("accepts a paid-address notification that includes an address", () => {
    expect(notificationPayloadIsSendable({ type: 2, address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", txid: "abc" })).toBe(true);
  });

  it("rejects a paid-address notification with no address", () => {
    expect(notificationPayloadIsSendable({ type: 2, txid: "abc" })).toBe(false);
    expect(notificationPayloadIsSendable({ type: 2, address: undefined })).toBe(false);
    expect(notificationPayloadIsSendable({ type: 2, address: "" })).toBe(false);
    expect(notificationPayloadIsSendable({ type: 3, address: undefined })).toBe(false);
  });

  it("rejects a confirmation notification with no txid", () => {
    expect(notificationPayloadIsSendable({ type: 4 })).toBe(false);
    expect(notificationPayloadIsSendable({ type: 4, txid: "" })).toBe(false);
  });

  it("accepts a confirmation notification with a txid", () => {
    expect(notificationPayloadIsSendable({ type: 4, txid: "abc123def456789" })).toBe(true);
  });

  it("leaves notification types that do not read those fields alone", () => {
    expect(notificationPayloadIsSendable({ type: 1, hash: "abc" })).toBe(true);
    expect(notificationPayloadIsSendable({ type: 5, text: "hello" })).toBe(true);
  });
});

describe("MalformedNotificationError", () => {
  it("is an Error subclass the sender can catch without treating it as a transport failure", () => {
    const error = new MalformedNotificationError("type 2 notification is missing address");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(MalformedNotificationError);
    expect(error.message).toBe("type 2 notification is missing address");
  });
});
