/*
 * @Author: Eduardo Policarpo
 * @contact: +55 43996611437
 * @Date: 2021-05-10 18:09:49
 * @LastEditTime: 2021-06-07 03:18:01
 */
const wppconnect = require('@wppconnect-team/wppconnect');
const Sessions = require('../controllers/sessions');
const events = require('../controllers/events');
const webhooks = require('../controllers/webhooks');
const firebase = require('../firebase/db');
const config = require('../config');
const firestore = firebase.firestore();
module.exports = class Wppconnect {

    static async start(req, res, session) {

        let token = await this.getToken(session);

        try {
            const client = await wppconnect.create({
                session: session,
                tokenStore: 'memory',
                catchQR: (base64Qrimg, ascii) => {
                    webhooks.wh_qrcode(session, base64Qrimg)
                    this.exportQR(req, res, base64Qrimg, session);
                    Sessions.addInfoSession(session, {
                        qrCode: base64Qrimg
                    })
                },
                statusFind: (statusSession, session) => {
                    console.log(statusSession)
                    Sessions.addInfoSession(session, {
                        status: statusSession
                    })
                    if (statusSession != 'qrReadSuccess') {
                        webhooks.wh_connect(session, statusSession)
                    }
                    if (statusSession === 'browserClose' ||
                        statusSession === 'qrReadFail' ||
                        statusSession === 'autocloseCalled' ||
                        statusSession === 'serverClose') {
                        req.io.emit('whatsapp-status', false)
                    }
                    if (statusSession === 'isLogged' ||
                        statusSession === 'qrReadSuccess' ||
                        statusSession === 'chatsAvailable' ||
                        statusSession === 'inChat') {
                        req.io.emit('whatsapp-status', true)
                    }

                },
                headless: true,
                logQR: true,
                browserWS: '', //browserless !=  '' ? browserless.replace('https://', 'wss://')+'?token='+token_browser : '',
                useChrome: true,
                updatesLog: false,
                autoClose: 90000,
                browserArgs: [
                    '--log-level=3',
                    '--no-default-browser-check',
                    '--disable-site-isolation-trials',
                    '--no-experiments',
                    '--ignore-gpu-blacklist',
                    '--ignore-certificate-errors',
                    '--ignore-certificate-errors-spki-list',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--disable-default-apps',
                    '--enable-features=NetworkService',
                    '--disable-setuid-sandbox',
                    '--no-sandbox',
                    // Extras
                    '--disable-webgl',
                    '--disable-threaded-animation',
                    '--disable-threaded-scrolling',
                    '--disable-in-process-stack-traces',
                    '--disable-histogram-customizer',
                    '--disable-gl-extensions',
                    '--disable-composited-antialiasing',
                    '--disable-canvas-aa',
                    '--disable-3d-apis',
                    '--disable-accelerated-2d-canvas',
                    '--disable-accelerated-jpeg-decoding',
                    '--disable-accelerated-mjpeg-decode',
                    '--disable-app-list-dismiss-on-blur',
                    '--disable-accelerated-video-decode',
                ],

                createPathFileToken: false,
                sessionToken: {
                    WABrowserId: token.WABrowserId,
                    WASecretBundle: token.WASecretBundle,
                    WAToken1: token.WAToken1,
                    WAToken2: token.WAToken2
                }

            })

            wppconnect.defaultLogger.level = 'silly';
            let info = await client.getHostDevice()
            let tokens = await client.getSessionTokenBrowser()
            let browser = []
            // browserless != '' ? browserless+'/devtools/inspector.html?token='+token_browser+'&wss='+browserless.replace('https://', '')+':443/devtools/page/'+client.page._target._targetInfo.targetId : null
            webhooks.wh_connect(session, 'connected', info.wid.user, browser, tokens)
            events.receiveMessage(session, client)
            events.statusMessage(session, client)
            if (config.useHere === 'true') {
                events.statusConnection(session, client)
            }
            Sessions.addInfoSession(session, {
                client: client,
                tokens: tokens
            })
            return client, tokens;
        } catch (error) {
            console.log(error)
        }

    }

    static async stop(session) {
        let data = Sessions.getSession(session)
        let response = await data.client.close()
        if (response) {
            return true
        }
        return false
    }
    static async exportQR(req, res, qrCode, session) {
        qrCode = qrCode.replace('data:image/png;base64,', '');
        const imageBuffer = Buffer.from(qrCode, 'base64');
        req.io.emit('qrCode',
            {
                data: 'data:image/png;base64,' + imageBuffer.toString('base64'),
                session: session
            }
        );
    }

    static async getToken(session) {
        return new Promise(async (resolve, reject) => {
            try {
                const Session = await firestore.collection('Sessions').doc(session);
                const dados = await Session.get();
                if (!dados.exists) {
                    resolve('no results found')
                } else {
                    let data = {
                        'WABrowserId': dados.data().WABrowserId,
                        'WASecretBundle': dados.data().WASecretBundle,
                        'WAToken1': dados.data().WAToken1,
                        'WAToken2': dados.data().WAToken2
                    }
                    resolve(data)
                }

            } catch (error) {
                reject(error)
            }
        })
    }
}