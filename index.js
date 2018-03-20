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
    let metroLine = req.body.result.parameters['metro-line-number'];

    res.json({
        "speech": metroLine,
    });
})

app.listen(PORT, function () {
    console.log(`Listening on ${ PORT }`)
})
