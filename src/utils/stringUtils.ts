export class StringUtils {
  static shortenAddress(address: string): string {
    if (address.length < 10) return address;
    return address.substring(0, 5) + "...." + address.substring(address.length - 4);
  }

  static shortenTxid(txid: string): string {
    return StringUtils.shortenAddress(txid);
  }
}
