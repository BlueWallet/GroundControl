/** Length TypeORM gives an unlengthened string column on MariaDB (`varchar(255)`). */
export const PUSH_IDENTITY_MAX_LENGTH = 255;

export const PUSH_IDENTITY_REJECT_MESSAGE = "token or os missing or too long";

/**
 * `send_queue.data` is TEXT, so a payload can carry a token that does not fit
 * `token_configuration.token`. Those rows must be rejected before INSERT.
 */
export function pushIdentityFitsStorage(os: unknown, token: unknown): boolean {
  return fitsVarcharColumn(os) && fitsVarcharColumn(token);
}

/** Unlengthened TypeORM string columns are `varchar(255)` on MariaDB. */
export function fitsVarcharColumn(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= PUSH_IDENTITY_MAX_LENGTH;
}

export function isDataTooLongError(error: { code?: string; driverError?: { code?: string } } | null | undefined): boolean {
  return error?.code === "ER_DATA_TOO_LONG" || error?.driverError?.code === "ER_DATA_TOO_LONG";
}
