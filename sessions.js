// person.js
'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const venom = require('venom-bot');
const axios = require('axios');

module.exports = class Sessions {

    static async start(sessionName, options = []) {
        Sessions.options = Sessions.options || options; //start object
        Sessions.sessions = Sessions.sessions || []; //start array

        var session = Sessions.getSession(sessionName);

        if (session == false) { //create new session
            console.log("session == false");
            session = await Sessions.addSesssion(sessionName);
        } else if (["CLOSED"].includes(session.state)) { //restart session
            console.log("session.state == CLOSED");
            session.state = "STARTING";
            session.status = 'notLogged';
            session.client = Sessions.initSession(sessionName);
            Sessions.setup(sessionName);
        } else if (["CONFLICT", "UNPAIRED", "UNLAUNCHED"].includes(session.state)) {
            console.log("client.useHere()");
            session.client.then(client => {
                client.useHere();
            });
        } else {
            console.log("session.state: " + session.state);
        }
        return session;
    } //start

    static async getStatus(sessionName, options = []) {
        Sessions.options = Sessions.options || options;
        Sessions.sessions = Sessions.sessions || [];

        var session = Sessions.getSession(sessionName);
        return session;
    } //getStatus

    static async addSesssion(sessionName) {
        var newSession = {
            name: sessionName,
            hook: null,
            qrcode: false,
            client: false,
            status: 'notLogged',
            state: 'STARTING'
        }
        Sessions.sessions.push(newSession);
        console.log("newSession.state: " + newSession.state);

        //setup session
        newSession.client = await Sessions.initSession(sessionName);
        Sessions.setup(sessionName);

        return newSession;
    } //addSession

    static async initSession(sessionName) {
        var session = Sessions.getSession(sessionName);

        const client = await venom.create(
            sessionName,
            //catchQR
            (base64Qrimg, asciiQR, attempts, urlCode) => {
                console.log('Number of attempts to read the qrcode: ', attempts);
                console.log('Terminal qrcode: ', asciiQR);
                console.log('base64 image string qrcode: ', base64Qrimg);
                console.log('urlCode (data-ref): ', urlCode);
            },
            // statusFind
            (statusSession, session) => {
                console.log('Status Session: ', statusSession); //return isLogged || notLogged || browserClose || qrReadSuccess || qrReadFail || autocloseCalled || desconnectedMobile || deleteToken
                //Create session wss return "serverClose" case server for close
                console.log('Session name: ', session);
            },
            // options
            {
                folderNameToken: 'tokens', //folder name when saving tokens
                mkdirFolderToken: '', //folder directory tokens, just inside the venom folder, example:  { mkdirFolderToken: '/node_modules', } //will save the tokens folder in the node_modules directory
                headless: false, // Headless chrome
                devtools: false, // Open devtools by default
                useChrome: false, // If false will use Chromium instance
                debug: false, // Opens a debug session
                logQR: true, // Logs QR automatically in terminal
                browserWS: '', // If u want to use browserWSEndpoint
                browserArgs: [''], // Parameters to be added into the chrome browser instance
                puppeteerOptions: {}, // Will be passed to puppeteer.launch
                disableSpins: true, // Will disable Spinnies animation, useful for containers (docker) for a better log
                disableWelcome: true, // Will disable the welcoming message which appears in the beginning
                updatesLog: true, // Logs info updates automatically in terminal
                autoClose: 60000, // Automatically closes the venom-bot only when scanning the QR code (default 60 seconds, if you want to turn it off, assign 0 or false)
                createPathFileToken: false, //creates a folder when inserting an object in the client's browser, to work it is necessary to pass the parameters in the function create browserSessionToken
            }
        );
        var browserSessionToken = await client.getSessionTokenBrowser();
        console.log("browserSessionToken: " + JSON.stringify(browserSessionToken));
        session.state = "CONNECTED";
        return client;
    }
    static async setup(sessionName) {
        var session = Sessions.getSession(sessionName);

        await session.client.then(client => {
            client.onMessage(async (message) => {
                var session = Sessions.getSession(sessionName);
                if (session.hook != null) {
                    var config = {
                        method: 'post',
                        url: session.hook,
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        data: message
                    };
                    await axios(config)
                        .then(function (response) {
                            console.log(JSON.stringify(response.data));
                        })
                        .catch(function (error) {
                            console.log(error);
                        });
                } else if (message.body == "TESTEBOT") {
                    client.sendText(message.from, 'Hello\nfriend!');
                }
            });
        });
    } //setup

    static async closeSession(sessionName) {
        var session = Sessions.getSession(sessionName);
        if (session) { //s?? adiciona se n??o existir
            if (session.state != "CLOSED") {
                if (session.client)
                    await session.client.then(async client => {
                        try {
                            await client.close();
                        } catch (error) {
                            console.log("client.close(): " + error.message);
                        }
                        session.state = "CLOSED";
                        session.client = false;
                        console.log("client.close - session.state: " + session.state);
                    });
                return { result: "success", message: "CLOSED" };
            } else { //close
                return { result: "success", message: session.state };
            }
        } else {
            return { result: "error", message: "NOTFOUND" };
        }
    } //close

    static getSession(sessionName) {
        var foundSession = false;
        if (Sessions.sessions)
            Sessions.sessions.forEach(session => {
                if (sessionName == session.name) {
                    foundSession = session;
                }
            });
        return foundSession;
    } //getSession

    static getSessions() {
        if (Sessions.sessions) {
            return Sessions.sessions;
        } else {
            return [];
        }
    } //getSessions

    static async getQrcode(sessionName) {
        var session = Sessions.getSession(sessionName);
        if (session) {
            //if (["UNPAIRED", "UNPAIRED_IDLE"].includes(session.state)) {
            if (["UNPAIRED_IDLE"].includes(session.state)) {
                //restart session
                await Sessions.closeSession(sessionName);
                Sessions.start(sessionName);
                return { result: "error", message: session.state };
            } else if (["CLOSED"].includes(session.state)) {
                Sessions.start(sessionName);
                return { result: "error", message: session.state };
            } else { //CONNECTED
                if (session.status != 'isLogged') {
                    return { result: "success", message: session.state, qrcode: session.qrcode };
                } else {
                    return { result: "success", message: session.state };
                }
            }
        } else {
            return { result: "error", message: "NOTFOUND" };
        }
    } //getQrcode

    static async sendText(req) {
        var params = {
            sessionName: req.body.sessionName,
            number: req.body.number,
            text: req.body.text
        }
        var session = Sessions.getSession(params.sessionName);
        if (session) {
            if (session.state == "CONNECTED") {
                await session.client.then(async client => {
                    console.log('#### send msg =', params);
                    return await client.sendText(params.number + '@c.us', params.text);
                });
                return { result: "success" }
            } else {
                return { result: "error", message: session.state };
            }
        } else {
            return { result: "error", message: "NOTFOUND" };
        }
    } //message

    static async sendTextToStorie(req) {
        var params = {
            sessionName: req.body.sessionName,
            text: req.body.text
        }
        var session = Sessions.getSession(params.sessionName);
        if (session) {
            if (session.state == "CONNECTED") {
                await session.client.then(async client => {
                    console.log('#### send msg =', params);
                    return await client.sendText('status@broadcast', params.text);
                });
                return {
                    result: "success"
                }
            } else {
                return {
                    result: "error",
                    message: session.state
                };
            }
        } else {
            return {
                result: "error",
                message: "NOTFOUND"
            };
        }
    } //message to storie

    static async sendFile(sessionName, number, base64Data, fileName, caption) {
        var session = Sessions.getSession(sessionName);
        if (session) {
            if (session.state == "CONNECTED") {
                var resultSendFile = await session.client.then(async (client) => {
                    var folderName = fs.mkdtempSync(path.join(os.tmpdir(), session.name + '-'));
                    var filePath = path.join(folderName, fileName);
                    fs.writeFileSync(filePath, base64Data, 'base64');
                    console.log(filePath);
                    return await client.sendFile(number + '@c.us', filePath, fileName, caption);
                }); //client.then(
                return { result: "success" };
            } else {
                return { result: "error", message: session.state };
            }
        } else {
            return { result: "error", message: "NOTFOUND" };
        }
    } //message

    static async sendImageStorie(sessionName, base64Data, fileName, caption) {
        var session = Sessions.getSession(sessionName);
        if (session) {
            if (session.state == "CONNECTED") {
                var resultSendFile = await session.client.then(async (client) => {
                    var folderName = fs.mkdtempSync(path.join(os.tmpdir(), session.name + '-'));
                    var filePath = path.join(folderName, fileName);
                    fs.writeFileSync(filePath, base64Data, 'base64');
                    console.log(filePath);
                    return await client.sendFile('status@broadcast', filePath, fileName, caption);
                }); //client.then(
                return {
                    result: "success"
                };
            } else {
                return {
                    result: "error",
                    message: session.state
                };
            }
        } else {
            return {
                result: "error",
                message: "NOTFOUND"
            };
        }
    } //sendImageStorie

    static async saveHook(req) {
        var sessionName = req.body.sessionName;
        /**
         * Verifica se encontra sess??o 
         */
        var foundSession = false;
        var foundSessionId = null;
        if (Sessions.sessions)
            Sessions.sessions.forEach((session, id) => {
                if (sessionName == session.name) {
                    foundSession = session;
                    foundSessionId = id;
                }
            });
        // Se n??o encontrar retorna erro
        if (!foundSession) {
            return { result: "error", message: 'Session not found' };
        } else {
            // Se encontrar cria vari??veis
            var hook = req.body.hook;
            foundSession.hook = hook;
            Sessions.sessions[foundSessionId] = foundSession;
            return { result: "success", message: 'Hook Atualizado' };
        }
    }

    static async sendContactVcard(sessionName, number, numberCard, nameCard) {
        var session = Sessions.getSession(sessionName);
        if (session) {
            if (session.state == "CONNECTED") {
                var resultSendContactVcard = await session.client.then(async (client) => {
                    return await client.sendContactVcard(number + '@c.us', numberCard + '@c.us', nameCard);
                }); //client.then(
                return {
                    result: "success"
                };
            } else {
                return {
                    result: "error",
                    message: session.state
                };
            }
        } else {
            return {
                result: "error",
                message: "NOTFOUND"
            };
        }
    } //vcard

    static async sendVoice(sessionName, number, voice) {
        var session = Sessions.getSession(sessionName);
        if (session) {
            if (session.state == "CONNECTED") {
                var resultSendVoice = await session.client.then(async (client) => {
                    return await client.sendVoiceBase64(number + '@c.us', voice);
                }); //client.then(
                return {
                    result: "success"
                };
            } else {
                return {
                    result: "error",
                    message: session.state
                };
            }
        } else {
            return {
                result: "error",
                message: "NOTFOUND"
            };
        }
    } //voice

    static async sendLocation(sessionName, number, lat, long, local) {
        var session = Sessions.getSession(sessionName);
        if (session) {
            if (session.state == "CONNECTED") {
                var resultSendLocation = await session.client.then(async (client) => {
                    return await client.sendLocation(number + '@c.us', lat, long, local);
                }); //client.then(
                return {
                    result: "success"
                };
            } else {
                return {
                    result: "error",
                    message: session.state
                };
            }
        } else {
            return {
                result: "error",
                message: "NOTFOUND"
            };
        }
    } //location

    static async sendLinkPreview(sessionName, number, url, caption) {
        var session = Sessions.getSession(sessionName);
        if (session) {
            if (session.state == "CONNECTED") {
                var resultSendLinkPreview = await session.client.then(async (client) => {
                    return await client.sendLinkPreview(number + '@c.us', url, caption);
                }); //client.then(
                return {
                    result: "success"
                };
            } else {
                return {
                    result: "error",
                    message: session.state
                };
            }
        } else {
            return {
                result: "error",
                message: "NOTFOUND"
            };
        }
    } //link

    static async getAllChatsNewMsg(sessionName) {
        var session = Sessions.getSession(sessionName);
        if (session) {
            if (session.state == "CONNECTED") {
                var resultGetAllChatsNewMsg = await session.client.then(async (client) => {
                    return client.getAllChatsNewMsg();
                });
                return {
                    result: resultGetAllChatsNewMsg
                };
            } else {
                return {
                    result: "error",
                    message: session.state
                };
            }
        } else {
            return {
                result: "error",
                message: "NOTFOUND"
            };
        }
    } //getAllChatsNewMsg

    static async getAllUnreadMessages(sessionName) {
        var session = Sessions.getSession(sessionName);
        if (session) {
            if (session.state == "CONNECTED") {
                var resultGetAllUnreadMessages = await session.client.then(async (client) => {
                    return await client.getAllUnreadMessages();
                });
                return {
                    result: resultGetAllUnreadMessages
                };
            } else {
                return {
                    result: "error",
                    message: session.state
                };
            }
        } else {
            return {
                result: "error",
                message: "NOTFOUND"
            };
        }
    } //getAllUnreadMessages

    static async checkNumberStatus(sessionName, number) {
        var session = Sessions.getSession(sessionName);
        //console.log(sessionName+number);
        if (session) {
            if (session.state == "CONNECTED") {
                var resultcheckNumberStatus = await session.client.then(async (client) => {
                    return await client.checkNumberStatus(number + '@c.us');
                });
                return {
                    result: resultcheckNumberStatus
                };
            } else {
                return {
                    result: "error",
                    message: session.state
                };
            }
        } else {
            return {
                result: "error",
                message: "NOTFOUND"
            };
        }
    } //saber se o n??mero ?? v??lido

    static async getNumberProfile(sessionName, number) {
        var session = Sessions.getSession(sessionName);
        //console.log(sessionName+number);
        if (session) {
            if (session.state == "CONNECTED") {
                var resultgetNumberProfile = await session.client.then(async (client) => {
                    return await client.getNumberProfile(number + '@c.us');
                });
                return {
                    result: resultgetNumberProfile
                };
            } else {
                return {
                    result: "error",
                    message: session.state
                };
            }
        } else {
            return {
                result: "error",
                message: "NOTFOUND"
            };
        }
    } //receber o perfil do usu??rio
}