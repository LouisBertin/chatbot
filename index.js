const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

const app = express()

app.get('/', function (req, res) {
    res.send('Hello World!')
})

app.get('/json', function (req, res) {
    res.json({"foo": "bar"});
})

app.post('/action', function (req, res) {
    let test = req.body.result.parameters['metro-line-number']

    res.json({
        "speech": "this text is spoken out loud if the platform supports voice interactions",
        "displayText": test,
    });
})

app.listen(PORT, function () {
    console.log(`Listening on ${ PORT }`)
})
