/**
 * Bitcoin Core sometimes reports `addresses` as an array, sometimes a single
 * `address`. A non-array value must not be iterated: `for...of` on a plain
 * object throws, and `for...of` on a string walks one character at a time.
 */
export function scriptPubKeyAddresses(scriptPubKey: { addresses?: unknown; address?: unknown } | null | undefined): string[] {
  if (!scriptPubKey) return [];

  let list: unknown[] = [];
  if (Array.isArray(scriptPubKey.addresses)) list = scriptPubKey.addresses;
  else if (typeof scriptPubKey.addresses === "string") list = [scriptPubKey.addresses];
  else if (typeof scriptPubKey.address === "string") list = [scriptPubKey.address];

  return list.filter((address): address is string => typeof address === "string" && address.length > 0);
}
