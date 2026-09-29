import { describe, it, expect } from "vitest";
import { scriptPubKeyAddresses } from "../script-pub-key";

describe("scriptPubKeyAddresses", () => {
  it("returns addresses from a standard output", () => {
    expect(scriptPubKeyAddresses({ addresses: ["bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"] })).toEqual(["bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"]);
  });

  it("returns a single address field", () => {
    expect(scriptPubKeyAddresses({ address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" })).toEqual(["bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"]);
  });

  it("does not iterate a string of addresses one character at a time", () => {
    expect(scriptPubKeyAddresses({ addresses: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" })).toEqual(["bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"]);
  });

  it("returns nothing when addresses is not iterable", () => {
    expect(scriptPubKeyAddresses({ addresses: { nested: true } })).toEqual([]);
    expect(scriptPubKeyAddresses(undefined)).toEqual([]);
  });
});
