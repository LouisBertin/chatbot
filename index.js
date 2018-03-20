const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
var bodyParser = require('body-parser');

const app = express()
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.get('/', function (req, res) {
    res.send('Hello World!')
})

app.get('/json', function (req, res) {
    res.json({"foo": "bar"});
})

app.post('/action', function (req, res) {
    switch (req.body.result.metadata.intentName) {
        case "webhook.metro.status":
            let metroLine = req.body.result.parameters['metro-line-number'];
            res.json({
                "speech": metroLine,
            });
            break;
        case "webhook.travel.time":
            let travelTime = 'tu en as pour 20 minutes';
            res.json({
                "speech": travelTime,
            });
            break;
    }
})

app.listen(PORT, function () {
    console.log(`Listening on ${ PORT }`)
})
