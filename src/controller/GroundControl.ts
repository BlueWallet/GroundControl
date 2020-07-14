import '../openapi/api';
import {getRepository} from "typeorm";
import {NextFunction, Request, Response} from "express";
import {User} from "../entity/User";
import {TokenToAddress} from "../entity/TokenToAddress";
import { TokenToHash } from "../entity/TokenToHash";
import {GroundControlToMajorTom} from "../class/GroundControlToMajorTom";
const fs = require('fs');
const pck = require('../../package.json');

export class GroundControl {

    private tokenToAddressRepository = getRepository(TokenToAddress);
    private tokenToHashRepository = getRepository(TokenToHash);

    /**
     * Submit bitcoin addressess that you wish to be notified about to specific push token. Token serves as unique identifier of a device/user. Also, OS of the token
     *
     * @param request
     * @param response
     * @param next
     */
    async majorTomToGroundControl(request: Request, response: Response, next: NextFunction) {
        const body: Paths.MajorTomToGroundControl.Post.RequestBody = request.body;
        // todo: checks that we are receiving data and that there are not too much records in it (probably 1000 addresses for a start is enough)

        if (!body.addresses || !Array.isArray(body.addresses)) {
            response.status(500).send('addresses not provided');
            return;
        }
        if (!body.hashes || !Array.isArray(body.hashes)) {
            response.status(500).send('hashes not provided');
            return;
        }
        if (!body.token || !body.os) {
            response.status(500).send('token not provided');
            return;
        }

        // todo: refactor into single batch save
        for (const address of body.addresses) {
            // todo: validate bitcoin address
            console.log(body.token, '->', address);
            try {
                await this.tokenToAddressRepository.save({address, token: body.token, os: body.os});
            } catch (_) {}
        }

        // todo: refactor into single batch save
        for (const hash of body.hashes) {
            // todo: validate hash
            console.log(body.token, '->', hash);
            try {
                await this.tokenToHashRepository.save({ hash, token: body.token, os: body.os});
            } catch (_) {}
        }
        response.status(201).send('');
    }

    async lightningInvoiceGotSettled(request: Request, response: Response, next: NextFunction) {
        const body: Paths.LightningInvoiceGotSettled.Post.RequestBody = request.body;

        const hashShouldBe = require('crypto').createHash('sha256').update(Buffer.from(body.preimage, 'hex')).digest('hex');
        if (hashShouldBe !== body.hash) {
            response.status(500).send('preimage doesnt match hash');
            return;
        }

        const tokenToHashAll = await this.tokenToHashRepository.find({ hash: hashShouldBe });
        for (const tokenToHash of tokenToHashAll) {
            const serverKey = process.env.FCM_SERVER_KEY;
            const apnsPem = process.env.APNS_PEM || fs.readFileSync(__dirname + '/../../Certificates.pem').toString('hex');
            if (tokenToHash && serverKey && apnsPem) {
                console.warn('pushing to token', tokenToHash.token, tokenToHash.os);
                const pushNotification: Components.Schemas.PushNotificationLightningInvoicePaid = {
                    sat: body.amt_paid_sat,
                    badge: 1,
                    type: 1,
                    os: tokenToHash.os === 'android' ? 'android' : 'ios', //hacky
                    token: tokenToHash.token,
                    hash: hashShouldBe,
                    memo: body.memo,
                };

                await GroundControlToMajorTom.pushLightningInvoicePaid(serverKey, apnsPem, pushNotification);
            }
        }

        response.status(200).send('');
    }

    async ping(request: Request, response: Response, next: NextFunction) {
        const serverInfo: Paths.Ping.Get.Responses.$200 = {
            description: pck.description,
            version: pck.version,
            uptime: 666
        };

        return serverInfo;
    }
}