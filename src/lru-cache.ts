export class LruCache {
  private readonly entries = new Map<string, true>();
  // Persistent forward iterator used for eviction. Creating a fresh
  // `entries.keys().next()` on every eviction is O(n) in the number of
  // tombstones left at the head of the Map by prior deletes, which degrades
  // to ~O(n^2) under churn. Advancing a single long-lived iterator instead
  // keeps eviction amortized O(1) and is the only thing that scaled in the
  // mempool-sized benchmark (~270ms vs ~20s for 300k evictions).
  private evictionCursor = this.entries.keys();

  constructor(private readonly maxSize: number) {
    if (maxSize < 1) throw new Error("maxSize must be greater than zero");
  }

  get size() {
    return this.entries.size;
  }

  has(key: string) {
    if (!this.entries.has(key)) return false;

    this.entries.delete(key);
    this.entries.set(key, true);
    return true;
  }

  add(key: string) {
    if (!key) return;

    if (this.entries.has(key)) this.entries.delete(key);
    this.entries.set(key, true);

    while (this.entries.size > this.maxSize) this.evictOldest();
  }

  private evictOldest() {
    let next = this.evictionCursor.next();
    if (next.done) {
      // Cursor caught up to the tail (or was created on an empty map); restart
      // it from the current oldest entry.
      this.evictionCursor = this.entries.keys();
      next = this.evictionCursor.next();
    }
    if (!next.done) this.entries.delete(next.value);
  }
}
