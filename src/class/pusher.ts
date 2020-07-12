import '../openapi/api';
import {getRepository} from "typeorm";
import {PushLog} from "../entity/PushLog";
import {TokenToAddress} from "../entity/TokenToAddress";
const Frisbee = require('frisbee');

/**
 * Since we cant attach any code to openapi schema definition, this is a repository of transforming pushnotification object
 * (thats created from apenapi schema) to actual payload thats gona be pushed to fcm/apns. In most basic case we would
 * need to only fill title/body according to user language.
 *
 * One method per each notification type.
 */
export class Pusher {

    static async pushLightningInvoicePaid(serverKey: string, pushNotification: Components.Schemas.PushNotificationLightningInvoicePaid)  : Promise <[object, object]> {
        const fcmPayload = {
            "data" : {},
            "notification" : {
                "body" : 'Paid: ' + (pushNotification.memo || 'your invoice'),
                "title": '+' + pushNotification.sat + ' sats',
                "badge": pushNotification.badge,
            }
        };

        return Pusher._pushToFcm(serverKey, pushNotification.token, fcmPayload, pushNotification);
    }

    protected static async _pushToFcm(serverKey: string, token: string, fcmPayload: object, pushNotification: Components.Schemas.PushNotification) : Promise <[object, object]> {
        const _api = new Frisbee({ baseURI: 'https://fcm.googleapis.com' });

        fcmPayload['to'] = token;
        fcmPayload['priority'] = 'high';

        // now, we pass some of the notification properties as data properties to FCM payload:
        for (let dataKey of Object.keys(pushNotification)) {
            if (['token', 'os', 'badge'].includes(dataKey)) continue;
            fcmPayload['data'][dataKey] = pushNotification[dataKey];
        }

        const apiResponse = await _api.post(
            '/fcm/send',
            Object.assign(
                {},
                {
                    headers: {
                        'Authorization': 'key=' + serverKey,
                        'Content-Type': 'application/json',
                        'Host': 'fcm.googleapis.com',
                    },
                    body: fcmPayload,
                },
            ),
        );

        let responseJson = {};
        if (typeof apiResponse.body === 'object') responseJson = apiResponse.body;
        delete fcmPayload['to']; // compacting a bit, we dont need token in payload as well

        const PushLogRepository = getRepository(PushLog);
        await PushLogRepository.save( { token: token, payload: JSON.stringify(fcmPayload), success: !!responseJson['success'] });

        return [fcmPayload, responseJson];
    }
}