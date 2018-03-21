const express = require('express')
const path = require('path')
const axios = require("axios");
const PORT = process.env.PORT || 5000
var bodyParser = require('body-parser');
var googleMapsClient = require('@google/maps').createClient({
    key: 'AIzaSyAW7MCC53fSBXr66c5f0lA6m5cf5RUyQOA'
});

const app = express()
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.get('/', function (req, res) {
    // test GMAP API returns
    var from, to;

    googleMapsClient.geocode({
        address: '6 rue Nolet, Paris'
    }, function(err, response) {
        if (!err) {
            from = response.json.results[0].formatted_address;

            googleMapsClient.geocode({
                address: '39 rue de montreuil Vincennes'
            }, function(err, response) {
                if (!err) {
                    to = response.json.results[0].formatted_address;
                    googleMapsClient.directions({
                        origin: from,
                        destination: to,
                        //arrival_time: inOneHour,
                        mode: 'transit',
                        language: 'fr',
                        //mode: 'walking',
                        //alternatives: true,
                        transit_mode: ['bus', 'rail'],
                        transit_routing_preference: 'fewer_transfers',
                    }, function(err, response) {
                        if (!err) {

                            res.json(
                                response.json.routes[0].legs[0]
                            );
                        }
                    });
                }
            });
        }
    });

    //res.send('Hello world !')
})

app.get('/gmap', function (req, res) {
    // Geocode an address.
    googleMapsClient.geocode({
        address: '39 rue de montreuil Vincennes'
    }, function(err, response) {
        if (!err) {
            res.json(response.json.results[0].formatted_address);
        }
    });
})

app.post('/action', function (req, res) {
    switch (req.body.result.metadata.intentName) {
        case "webhook.metro.status":
            var metroLine = req.body.result.parameters['metro-line-number'];
            metroLine = metroLine.replace(' bis', 'b');
            var apiUrl = 'https://api-ratp.pierre-grimaud.fr/v3/traffic/metros/' + metroLine + '?_format=json';

            axios.get(apiUrl).then(function(response) {
                let message = response.data.result.message;
                if (response.data.result.slug === 'normal') {
                    message = 'Bonne nouvelle, tout va bien pour le moment :)';
                }
                if (response.data.result.slug === 'normal_trav') {
                    message = 'Pas d\'accident ou de retards, juste les travaux qui continuent ! ' + message;
                }
                res.json({
                    "speech": message,
                });
            }).catch(function(error) {
                let message = error;
                res.json({
                    "speech": message,
                });
            });

            break;
        case "webhook.rer.status":
            var rerLine = req.body.result.parameters['rer-line-letter'];
            var apiUrl = 'https://api-ratp.pierre-grimaud.fr/v3/traffic/rers/' + rerLine + '?_format=json';

            axios.get(apiUrl).then(function(response) {
                let message = response.data.result.message;
                if (response.data.result.slug === 'normal') {
                    message = 'C\'est étonnant mais on dirait que tout va bien sur la ligne aujourd\'hui :P';
                }
                if (response.data.result.slug === 'normal_trav') {
                    message = 'Pas d\'accident ou de retards, juste les travaux qui continuent ! ' + message;
                }
                res.json({
                    "speech": message,
                });
            }).catch(function(error) {
                let message = error;
                res.json({
                    "speech": message,
                });
            });

            break;
        case "webhook.travel.time":
            var from, to;

            googleMapsClient.geocode({
                address: '6 rue Nolet, Paris'
            }, function(err, response) {
                if (!err) {
                    from = response.json.results[0].formatted_address;

                    googleMapsClient.geocode({
                        address: '39 rue de montreuil Vincennes'
                    }, function(err, response) {
                        if (!err) {
                            to = response.json.results[0].formatted_address;
                            googleMapsClient.directions({
                                origin: from,
                                destination: to,
                                mode: 'transit',
                                language: 'fr',
                                //mode: 'walking',
                                //alternatives: true,
                                transit_mode: ['bus', 'rail'],
                                transit_routing_preference: 'fewer_transfers',
                            }, function(err, response) {
                                if (!err) {

                                    res.json({
                                        "speech": 'Avec les transports en commun tu en as pour ' + response.json.routes[0].legs[0].duration.text + ':)',
                                    });
                                }
                            });
                        }
                    });
                }
            });

            break;
        case "webhook.user.data.workplace":
            // get workplace
            let workplace = req.body.result.parameters['street-address'];

            // geocoding
            googleMapsClient.geocode({
                address: workplace
            }, function(err, response) {
                if (!err) {
                    let formated_adress = response.json.results[0].formatted_address

                    res.json({
                        "messages": [
                            {
                                "buttons": [
                                    {
                                        "postback": "https://www.google.com/maps/search/?api=1&query=" + formated_adress,
                                        "text": "Voir mon lieu de travail"
                                    }
                                ],
                                "imageUrl": "https://maps.googleapis.com/maps/api/staticmap?center=" + formated_adress + "&zoom=13&size=400x400",
                                "platform": "facebook",
                                "title": "Cela correspond ?",
                                "type": 1
                            }
                        ]
                    });
                }
            });

            break;
    }
})

app.listen(PORT, function () {
    console.log(`Listening on ${ PORT }`)
})
