declare namespace Components {
    namespace Schemas {
        /**
         * object thats posted to GroundControl to notify end-user that his specific invoice was paid by someone
         */
        export interface LightningInvoiceSettledNotification {
            /**
             * text that was embedded in invoice paid
             */
            memo?: string;
            /**
             * hex string preimage
             */
            preimage?: string;
            /**
             * hex string preimage hash
             */
            hash?: string;
            /**
             * exactly how much satoshis was paid to make this invoice settked (>= invoice amount)
             */
            amt_paid_sat?: number;
        }
        /**
         * payload for push notification delivered to phone
         */
        export interface PushNotificationBase {
            /**
             * type:
             *  * `1` - Your lightning invoice was paid
             *  * `2` - New transaction to one of your addresses
             *  * `3` - New unconfirmed transaction to one of your addresses
             *  * `4` - Transaction confirmed
             *
             */
            type: 1 | 2 | 3 | 4;
            token: string;
            os: "android" | "ios";
            badge?: number;
        }
        /**
         * payload for push notification delivered to phone
         */
        export interface PushNotificationLightningInvoicePaid {
            type: 1;
            token: string;
            os: "android" | "ios";
            badge?: number;
            /**
             * amount of satoshis
             */
            sat: number;
            /**
             * hash of specific ln invoice preimage
             */
            hash: string;
            /**
             * text attached to bolt11
             */
            memo: string;
        }
        /**
         * payload for push notification delivered to phone
         */
        export interface PushNotificationOnchainAddressGotPaid {
            type: 2;
            token: string;
            os: "android" | "ios";
            badge?: number;
            /**
             * amount of satoshis
             */
            sat: number;
            /**
             * user's onchain address that has incoming transaction
             */
            address: string;
            /**
             * txid of the transaction where this address is one of the outputs
             */
            txid: string;
        }
        /**
         * payload for push notification delivered to phone
         */
        export interface PushNotificationOnchainAddressGotUnconfirmedTransaction {
            type: 3;
            token: string;
            os: "android" | "ios";
            badge?: number;
            /**
             * amount of satoshis
             */
            sat: number;
            /**
             * user's onchain address that has incoming transaction
             */
            address: string;
            /**
             * txid of the transaction where this address is one of the outputs
             */
            txid: string;
        }
        /**
         * payload for push notification delivered to phone
         */
        export interface PushNotificationTxidGotConfirmed {
            type: 4;
            token: string;
            os: "android" | "ios";
            badge?: number;
            /**
             * txid of the transaction that got confirmed
             */
            txid: string;
        }
        export interface ServerInfo {
            name?: string;
            description?: string;
            version?: string;
            uptime?: number;
        }
    }
}
declare namespace Paths {
    namespace LightningInvoiceGotSettled {
        namespace Post {
            export type RequestBody = /* object thats posted to GroundControl to notify end-user that his specific invoice was paid by someone */ Components.Schemas.LightningInvoiceSettledNotification;
            namespace Responses {
                export interface $200 {
                }
            }
        }
    }
    namespace MajorTomToGroundControl {
        namespace Post {
            export interface RequestBody {
                addresses?: string[];
                hashes?: string[];
                txids?: string[];
                token?: string;
                os?: string;
            }
            namespace Responses {
                export interface $201 {
                }
            }
        }
    }
    namespace Ping {
        namespace Get {
            namespace Responses {
                export type $200 = Components.Schemas.ServerInfo;
            }
        }
    }
}

