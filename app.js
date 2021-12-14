'use strict';

const path = require('path');
/* */
const {createLogger, format, transports} = require('winston');
/* express and http */
const ejs = require('ejs');
const express = require('express');
const app = express();
const http = require('http');
const https = require('https');
/* parsers */
const cookieParser = require('cookie-parser');
/* error handler */
const errorHandler = require('errorhandler');
/* seesion and passport */
const session = require('express-session');
const passport = require('passport');
/* mqtt client for devices */
const mqtt = require('mqtt');
/* */
const config = require('./config');
config.notification = config.notification || [];

const Device = require('./device');

/* */
const clArgv = process.argv.slice(2);

/* Logging */
global.logger = createLogger({
    level: 'info',
    format: format.combine(
        format.errors({stack: true}),
        format.timestamp(),
        format.printf(({level, message, timestamp, stack}) => {
            return `${timestamp} ${level}: ${stack !== undefined ? stack : message}`;
        }),
    ),
    transports: [
        new transports.Console({
            silent: clArgv.indexOf('--log-info') === -1
        })
    ],
});

if (clArgv.indexOf('--log-error') > -1) {
    global.logger.add(new transports.File({filename: 'log/error.log', level: 'error'}));
}

/* */
app.engine('ejs', ejs.__express);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './views'));
app.use(express.static('views'));
app.use(cookieParser());
app.use(express.json({
    extended: false,
}));
app.use(express.urlencoded({
    extended: true,
}));
app.use(errorHandler());
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
}));

/* passport */
app.use(passport.initialize());
app.use(passport.session());

/* passport auth */
require('./auth');

/* routers */
const {site: r_site, oauth2: r_oauth2, user: r_user, client: r_client} = require('./routes');

app.get('/', r_site.index);
app.get('/login', r_site.loginForm);
app.post('/login', r_site.login);
app.get('/logout', r_site.logout);
app.get('/account', r_site.account);
app.get('/dialog/authorize', r_oauth2.authorization);
app.post('/dialog/authorize/decision', r_oauth2.decision);
app.post('/oauth/token', r_oauth2.token);
app.get('/api/userinfo', r_user.info);
app.get('/api/clientinfo', r_client.info);
app.get('/provider/v1.0', r_user.ping);
app.get('/provider', r_user.ping);
app.get('/provider/v1.0/user/devices', r_user.devices);
app.post('/provider/v1.0/user/devices/query', r_user.query);
app.post('/provider/v1.0/user/devices/action', r_user.action);
app.post('/provider/v1.0/user/unlink', r_user.unlink);

/* create http server */
const httpServer = http.createServer(app);
httpServer.listen(config.http.port);

/* cache devices from config to global */
global.devices = [];
if (config.devices) {
    config.devices.forEach(opts => {
        global.devices.push(new Device(opts));
    });
}

/* create subscriptions array */
const subscriptions = [];
global.devices.forEach(device => {
    device.data.custom_data.mqtt.forEach(mqtt => {
        const {instance, state: topic} = mqtt;
        if (instance !== undefined && topic !== undefined) {
            subscriptions.push({deviceId: device.data.id, instance, topic});
        }
    });
});

/* Create MQTT client (variable) in global */
global.mqttClient = mqtt.connect(`mqtt://${config.mqtt.host}`, {
    port: config.mqtt.port,
    username: config.mqtt.user,
    password: config.mqtt.password,
    clientId: 'yandex2mqtt',
}).on('error', err => {
    throw err;
}).on('connect', () => { /* on connect event handler */
    const topics = subscriptions.map(pair => pair.topic);

    global.mqttClient.subscribe(topics);
}).on('offline', () => { /* on offline event handler */
    global.logger.log('info', {message: `mqtt offline`});
    setTimeout(() => {
        if (!global.mqttClient.connected && !global.mqttClient.reconnecting) {
            global.logger.log('info', {message: `reconnecting...`});
            global.mqttClient.reconnect();
        } else {
            global.logger.log('info', {message: `reconnected`});
        }
    }, 100);
}).on('message', (topic, message) => { /* on get message event handler */
    const subscription = subscriptions.find(sub => topic.toLowerCase() === sub.topic.toLowerCase());
    if (subscription === undefined) return;

    const {deviceId, instance} = subscription;
    const ldevice = global.devices.find(d => d.data.id == deviceId);
    ldevice.updateState(`${message}`, instance);

    /* Make Request to Yandex Dialog notification API */
    Promise.all(config.notification.map(el => {
        let {skill_id, oauth_token, user_id} = el;

        return new Promise(resolve => {
            const req = https.request({
                hostname: 'dialogs.yandex.net',
                port: 443,
                path: `/api/v1/skills/${skill_id}/callback/state`,
                method: 'POST',
                headers: {
                    'Content-Type': `application/json`,
                    'Authorization': `OAuth ${oauth_token}`
                }
            }, res => {
                res.on('data', d => {
                    global.logger.log('info', {message: `${d}`});
                });
            });
                
            req.on('error', error => {
                global.logger.log('error', {message: `${error}`});
            });
            
            const {id, capabilities, properties} = ldevice.getState();
            const response = {
                "ts": Math.floor(Date.now() / 1000),
                "payload": {
                    "user_id": `${user_id}`,
                    "devices": [{
                        id,
                        capabilities: capabilities.filter(c => c.state.instance === instance),
                        properties: properties.filter(p => p.state.instance === instance)
                    }],
                }
            };

            req.write(JSON.stringify(response));

            req.end();

            resolve(true);
        });
    }));

    /* */
});

module.exports = app;
