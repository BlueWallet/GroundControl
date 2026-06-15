import { describe, expect, it } from "vitest";
import { LruCache } from "./lru-cache";

describe("LruCache", () => {
  it("evicts the oldest txid when the cache exceeds its maximum size", () => {
    const cache = new LruCache(2);

    cache.add("tx-1");
    cache.add("tx-2");
    cache.add("tx-3");

    expect(cache.size).toBe(2);
    expect(cache.has("tx-1")).toBe(false);
    expect(cache.has("tx-2")).toBe(true);
    expect(cache.has("tx-3")).toBe(true);
  });

  it("refreshes recently seen txids before evicting", () => {
    const cache = new LruCache(2);

    cache.add("tx-1");
    cache.add("tx-2");
    expect(cache.has("tx-1")).toBe(true);
    cache.add("tx-3");

    expect(cache.has("tx-1")).toBe(true);
    expect(cache.has("tx-2")).toBe(false);
    expect(cache.has("tx-3")).toBe(true);
  });

  it("evicts in least-recently-used order across many interleaved adds and reads", () => {
    const cache = new LruCache(3);

    cache.add("a");
    cache.add("b");
    cache.add("c");

    cache.has("a"); // refresh a -> order: b, c, a
    cache.add("d"); // evict oldest (b)
    expect(cache.has("b")).toBe(false);

    // order now: c, a, d
    cache.add("e"); // evict oldest (c)
    expect(cache.has("c")).toBe(false);
    expect(cache.has("a")).toBe(true);
    expect(cache.has("d")).toBe(true);
    expect(cache.has("e")).toBe(true);
    expect(cache.size).toBe(3);
  });

  it("stays bounded and correct under heavy churn", () => {
    const max = 1000;
    const cache = new LruCache(max);
    for (let i = 0; i < 50000; i++) cache.add("tx-" + i);

    expect(cache.size).toBe(max);
    expect(cache.has("tx-0")).toBe(false);
    expect(cache.has("tx-49999")).toBe(true);
    expect(cache.has("tx-49000")).toBe(true);
  });
});
