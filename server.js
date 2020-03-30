require('dotenv').config();
const crypto = require('crypto');
const express = require("express");
const cons = require("consolidate");
const path = require("path");
const jwt = require("jsonwebtoken");
const rp = require("request-promise");
const cookieParser = require('cookie-parser');
const WEBCHAT_SECRET = process.env.WEBCHAT_SECRET;
const DIRECTLINE_ENDPOINT_URI = process.env.DIRECTLINE_ENDPOINT_URI;
const APP_SECRET = process.env.APP_SECRET;
const directLineTokenEp = `https://${DIRECTLINE_ENDPOINT_URI || "directline.botframework.com"}/v3/directline/tokens/generate`;

// Initialize the web app instance,
const app = express();
app.engine('html', cons.swig);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));
app.use(cookieParser());
// Indicate which directory static resources
// (e.g. stylesheets) should be served from.
app.use(express.static(path.join(__dirname, "public")));
// begin listening for requests.
const port = process.env.PORT || 8080;
const region = process.env.REGION || "Unknown";
const appInsightInstrumnetationKey = process.env.APPINSIGHTS_INSTRUMENTATIONKEY;

app.listen(port, function() {
    console.log("Express server listening on port " + port);
});

const appConfig = {
    isHealthy : false,
    options : {
        method: 'POST',
        uri: directLineTokenEp,
        headers: {
            'Authorization': 'Bearer ' + WEBCHAT_SECRET
        },
        json: true
    }
};

function healthResponse(res, statusCode, message) {
    res.status(statusCode).send({
        health: message,
        region: region
    });
}
function healthy(res) {
    healthResponse(res, 200, "Ok");
}

function unhealthy(res) {
    healthResponse(res, 503, "Unhealthy");
}

app.get('/health', function(req, res){
    if (!appConfig.isHealthy) {
        rp(appConfig.options)
            .then((body) => {
                appConfig.isHealthy = true;
                healthy(res);
            })
            .catch((err) =>{
                unhealthy(res);
            });
    }
    else {
        healthy(res);
    }
});

app.get('/', async function(req, res) {
    res.render('index', {
        jwtToken: await get_jwt(req),
        appInsightInstrumnetationKey: appInsightInstrumnetationKey
    });
  });

async function get_jwt(req){
    return await rp(appConfig.options)
        .then(function (parsedBody) {
            var userid = req.query.userId || req.cookies.userid;
            if (!userid) {
                userid = crypto.randomBytes(4).toString('hex');
                res.cookie("userid", userid);
            }

            var response = {};
            response['userId'] = userid;
            response['userName'] = req.query.userName;
            response['locale'] = req.query.locale;
            response['connectorToken'] = parsedBody.token;
            response['optionalAttributes'] = {age: 33};
            if (req.query.lat && req.query.long)  {
                response['location'] = {lat: req.query.lat, long: req.query.long};
            }
            response['directLineURI'] = DIRECTLINE_ENDPOINT_URI;
            const jwtToken = jwt.sign(response, APP_SECRET);
            return jwtToken;
        })
        .catch(function (err) {
            appConfig.isHealthy = false;
            console.log("failed");
            return "";
        });
}
