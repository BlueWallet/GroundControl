/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
  "/lightningInvoiceGotSettled": {
    post: {
      responses: {
        /** OK */
        200: unknown;
      };
      requestBody: {
        content: {
          "application/json": components["schemas"]["LightningInvoiceSettledNotification"];
        };
      };
    };
  };
  "/majorTomToGroundControl": {
    post: {
      responses: {
        /** Created */
        201: unknown;
      };
      requestBody: {
        content: {
          "application/json": {
            addresses?: string[];
            hashes?: string[];
            txids?: string[];
            token?: string;
            os?: string;
          };
        };
      };
    };
  };
  "/unsubscribe": {
    post: {
      responses: {
        /** Created */
        201: unknown;
      };
      requestBody: {
        content: {
          "application/json": {
            addresses?: string[];
            hashes?: string[];
            txids?: string[];
            token?: string;
            os?: string;
          };
        };
      };
    };
  };
  "/ping": {
    get: {
      responses: {
        /** OK */
        200: {
          content: {
            "application/json": components["schemas"]["ServerInfo"];
          };
        };
      };
    };
  };
  "/getTokenConfiguration": {
    post: {
      responses: {
        /** OK */
        200: {
          content: {
            "application/json": components["schemas"]["TokenConfiguration"];
          };
        };
      };
      requestBody: {
        content: {
          "application/json": {
            token?: string;
            os?: string;
          };
        };
      };
    };
  };
  "/setTokenConfiguration": {
    post: {
      responses: {
        /** OK */
        200: unknown;
      };
      requestBody: {
        content: {
          "application/json": components["schemas"]["TokenConfiguration"] & {
            token: string;
            os: string;
          };
        };
      };
    };
  };
  "/enqueue": {
    post: {
      responses: {
        /** OK */
        200: unknown;
      };
      requestBody: {
        content: {
          "application/json":
            | components["schemas"]["PushNotificationLightningInvoicePaid"]
            | components["schemas"]["PushNotificationOnchainAddressGotPaid"]
            | components["schemas"]["PushNotificationOnchainAddressGotUnconfirmedTransaction"]
            | components["schemas"]["PushNotificationTxidGotConfirmed"];
        };
      };
    };
  };
}

export interface components {
  schemas: {
    ServerInfo: {
      name?: string;
      description?: string;
      version?: string;
      uptime?: number;
      last_processed_block?: number;
      send_queue_size?: number;
      sent_24h?: number;
    };
    /** @enum {string} */
    NotificationLevel: "transactions" | "news" | "price" | "tips";
    TokenConfiguration: {
      level_all?: boolean;
      level_transactions?: boolean;
      level_news?: boolean;
      level_price?: boolean;
      level_tips?: boolean;
      lang?: string;
      app_version?: string;
    };
    /** @description object thats posted to GroundControl to notify end-user that his specific invoice was paid by someone */
    LightningInvoiceSettledNotification: {
      /** @description text that was embedded in invoice paid */
      memo?: string;
      /** @description hex string preimage */
      preimage?: string;
      /** @description hex string preimage hash */
      hash?: string;
      /** @description exactly how much satoshis was paid to make this invoice settked (>= invoice amount) */
      amt_paid_sat?: number;
    };
    /** @description payload for push notification delivered to phone */
    PushNotificationBase: {
      /**
       * @description type:
       *  * `1` - Your lightning invoice was paid
       *  * `2` - New transaction to one of your addresses
       *  * `3` - New unconfirmed transaction to one of your addresses
       *  * `4` - Transaction confirmed
       *  * `5` - Arbitrary text message
       *
       * @enum {integer}
       */
      type: 1 | 2 | 3 | 4 | 5;
      token: string;
      /** @enum {string} */
      os: "android" | "ios";
      badge?: number;
      level: components["schemas"]["NotificationLevel"];
    };
    PushNotificationLightningInvoicePaid: components["schemas"]["PushNotificationBase"] & {
      /** @enum {integer} */
      type?: 1;
      /** @enum {string} */
      level?: "transactions";
      /** @description amount of satoshis */
      sat: number;
      /** @description hash of specific ln invoice preimage */
      hash: string;
      /** @description text attached to bolt11 */
      memo: string;
    };
    PushNotificationOnchainAddressGotPaid: components["schemas"]["PushNotificationBase"] & {
      /** @enum {integer} */
      type?: 2;
      /** @enum {string} */
      level?: "transactions";
      /**
       * @description Only included if type is 2, 3, or 4
       * @default TRANSACTION_CATEGORY
       */
      category?: string;
      /** @description amount of satoshis */
      sat: number;
      /** @description user's onchain address that has incoming transaction */
      address: string;
      /** @description txid of the transaction where this address is one of the outputs */
      txid: string;
    };
    PushNotificationOnchainAddressGotUnconfirmedTransaction: components["schemas"]["PushNotificationBase"] & {
      /** @enum {integer} */
      type?: 3;
      /** @enum {string} */
      level?: "transactions";
      /**
       * @description Only included if type is 2, 3, or 4
       * @default TRANSACTION_CATEGORY
       */
      category?: string;
      /** @description amount of satoshis */
      sat: number;
      /** @description user's onchain address that has incoming transaction */
      address: string;
      /** @description txid of the transaction where this address is one of the outputs */
      txid: string;
    };
    PushNotificationTxidGotConfirmed: components["schemas"]["PushNotificationBase"] & {
      /** @enum {integer} */
      type?: 4;
      /** @enum {string} */
      level?: "transactions";
      /**
       * @description Only included if type is 2, 3, or 4
       * @default TRANSACTION_CATEGORY
       */
      category?: string;
      /** @description txid of the transaction that got confirmed */
      txid: string;
    };
    PushNotificationMessage: components["schemas"]["PushNotificationBase"] & {
      /** @enum {integer} */
      type?: 5;
      /** @description custom text thats displayed on push notification bubble */
      text: string;
    };
  };
}

export interface operations {}

export interface external {}
