const express = require("express");
const cors = require('cors');
const Sessions = require("./sessions");
require('dotenv').config();

let app = express();

app.use(cors());
app.use(express.json({
    limit: '20mb',
    extended: true
}));

let appPort = process.env.PORT || 3085;

app.listen(appPort, () => {
    console.log("Http server running on port " + appPort);
});


app.get("/", async (req, res, next) => {
    let result = { "result": "ok" };
    res.json(result);
});//

app.get("/start", async (req, res, next) => {
    try{
        console.log("starting..." + req.query.sessionName);
        let session = await Sessions.start(req.query.sessionName);
        if (["CONNECTED", "QRCODE", "STARTING"].includes(session.state)) {
            res.json({ result: 'success', message: session.state });
        } else {
            res.json({ result: 'error', message: session.state });
        }
    }catch(error){
        res.json({ result: 'error', error });
    }
});//start

app.get("/status", async (req, res, next) => {
    let session = await Sessions.getStatus(req.query.sessionName);
    console.log(session);
    res.json({
        result: (!session.state) ? 'NOT_FOUND' : session.state
    });
}); //status

app.get("/qrcode", async (req, res, next) => {
    console.log("qrcode..." + req.query.sessionName);
    let session = Sessions.getSession(req.query.sessionName);
    try{
        if (session != false) {
            if (session.status != 'isLogged') {
                if (req.query.image) {
                    session.qrcode = session.qrcode.replace('data:image/png;base64,', '');
                    const imageBuffer = Buffer.from(session.qrcode, 'base64');
                    res.writeHead(200, {
                        'Content-Type': 'image/png',
                        'Content-Length': imageBuffer.length
                    });
                    res.end(imageBuffer);
                } else {
                    res.json({ result: "success", message: session.state, qrcode: session.qrcode });
                }
            } else {
                res.json({ result: "error", message: session.state });
            }
        } else {
            res.json({ result: "error", message: "NOTFOUND" });
        }
    }catch(error){
        res.json({ result: 'error', error });
    }
});//qrcode

app.post("/sendHook", async function sendText(req, res, next) {
    let result = await Sessions.saveHook(req);
    res.json(result);
});//sendText

app.post("/sendText", async function sendText(req, res, next) {
    try{
        let result = await Sessions.sendText(req);
        res.json(result);
    }catch(error){
        res.json({ result: 'error', error });
    }
});//sendText

app.post("/sendTextToStorie", async (req, res, next) => {
    let result = await Sessions.sendTextToStorie(req);
    res.json(result);
}); //sendTextToStorie

app.post("/sendFileFromBase64", async (req, res, next) => {
    let result = await Sessions.sendFileFromBase64(
        req.body.sessionName,
        req.body.number,
        req.body.base64Data,
        req.body.fileName,
        req.body.caption
    );
    res.json(result);
});//sendFile

app.post("/sendImageStorie", async (req, res, next) => {
    let result = await Sessions.sendImageStorie(
        req.body.sessionName,
        req.body.base64Data,
        req.body.fileName,
        req.body.caption
    );
    res.json(result);
}); //sendImageStorie

app.post("/sendLink", async (req, res, next) => {
    let result = await Sessions.sendLinkPreview(
        req.body.sessionName,
        req.body.number,
        req.body.url,
        req.body.caption
    );
    res.json(result);
}); //sendLinkPreview

app.post("/sendContactVcard", async (req, res, next) => {
    let result = await Sessions.sendContactVcard(
        req.body.sessionName,
        req.body.number,
        req.body.numberCard,
        req.body.nameCard
    );
    res.json(result);
}); //sendContactVcard

app.post("/sendVoice", async (req, res, next) => {
    let result = await Sessions.sendVoice(
        req.body.sessionName,
        req.body.number,
        req.body.voice
    );
    res.json(result);
}); //sendVoice

app.post("/sendLocation", async (req, res, next) => {
    let result = await Sessions.sendLocation(
        req.body.sessionName,
        req.body.number,
        req.body.lat,
        req.body.long,
        req.body.local
    );
    res.json(result);
}); //sendLocation

app.get("/getAllChatsNewMsg", async (req, res, next) => {
    let result = await Sessions.getAllChatsNewMsg(req.body.sessionName);
    res.json(result);
}); //getAllChatsNewMsg

app.get("/getAllUnreadMessages", async (req, res, next) => {
    let result = await Sessions.getAllUnreadMessages(req.body.sessionName);
    res.json(result);
}); //getAllUnreadMessages

app.get("/checkNumberStatus", async (req, res, next) => {
    let result = await Sessions.checkNumberStatus(
        req.body.sessionName,
        req.body.number
    );
    res.json(result);
}); //Verifica Numero

app.get("/getNumberProfile", async (req, res, next) => {
    let result = await Sessions.getNumberProfile(
        req.body.sessionName,
        req.body.number
    );
    res.json(result);
}); //Verifica perfil

app.get("/close", async (req, res, next) => {
    let result = await Sessions.closeSession(req.query.sessionName);
    res.json(result);
});//close
