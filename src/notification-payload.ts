export class MalformedNotificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MalformedNotificationError";
  }
}

export const NOTIFICATION_PAYLOAD_REJECT_MESSAGE = "notification missing required field";

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Type 2 and 3 notifications pass `address` to `shortenAddress`, and type 4
 * passes `txid`. A missing value throws `Cannot read properties of undefined
 * (reading 'length')` and the sender exits without removing the queue row.
 */
export function notificationPayloadIsSendable(payload: ({ type?: unknown; address?: unknown; txid?: unknown } & Record<string, unknown>) | null | undefined): boolean {
  if (!payload) return false;
  switch (payload.type) {
    case 2:
    case 3:
      return hasText(payload.address);
    case 4:
      return hasText(payload.txid);
    default:
      return true;
  }
}

export function assertNotificationPayloadIsSendable(payload: { type?: unknown; address?: unknown; txid?: unknown } & Record<string, unknown>): void {
  if (!notificationPayloadIsSendable(payload)) {
    throw new MalformedNotificationError(`type ${payload?.type} notification is missing a required field`);
  }
}
