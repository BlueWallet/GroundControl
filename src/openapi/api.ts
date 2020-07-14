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
        export interface PushNotification {
            type: 1 | 2;
            token: string;
            /**
             * type:
             *  * `1` - Your lightning invoice was paid
             *  * `2` - New transaction to one of your addresses
             *
             */
            os: "android" | "ios";
            badge?: number;
        }
        /**
         * payload for push notification delivered to phone
         */
        export interface PushNotificationLightningInvoicePaid {
            type: 1;
            token: string;
            /**
             * type:
             *  * `1` - Your lightning invoice was paid
             *  * `2` - New transaction to one of your addresses
             *
             */
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

