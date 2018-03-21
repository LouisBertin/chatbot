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

                            var message = '';
                            var steps = response.json.routes[0].legs[0].steps;
                            for (var i = 0, len = steps.length; i < len; i++) {

                                if (steps[i].travel_mode == 'TRANSIT') {
                                    message += 'Prend la ligne ' + steps[i].transit_details.line.short_name;
                                    message += ' de ' + steps[i].transit_details.departure_stop.name + ' jusque ' + steps[i].transit_details.arrival_stop.name;
                                    message += "\n " + steps[i].html_instructions;
                                    message += "\n (" + steps[i].duration.text + ")";
                                }
                            }

                            res.json(
                                //response.json.routes[0].legs[0].steps
                                message
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
            res.json(response.json.results[0].geometry.location);
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
        case "webhook.travel.time.from":
            var contexts = req.body.result.contexts;

            for (var i = 0, len = contexts.length; i < len; i++) {
                if (contexts[i].name == 'webhooktraveltime-followup') {
                    var from = contexts[i].parameters['street-address-from'];
                }
            }
            var to = req.body.result.parameters['street-address-to'];

            googleMapsClient.geocode({
                address: from
            }, function(err, response) {
                if (!err) {
                    from = response.json.results[0].formatted_address;

                    googleMapsClient.geocode({
                        address: to
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
                                transit_mode: ['rail'],
                                transit_routing_preference: 'fewer_transfers',
                            }, function(err, response) {
                                if (!err) {

                                    res.json({
                                        "speech": 'Avec les transports en commun tu en as pour ' + response.json.routes[0].legs[0].duration.text + ' :)',
                                    });
                                }
                            });
                        }
                    });
                }
            });

            break;
        case "webhook.travel.route.from":
            var contexts = req.body.result.contexts;

            for (var i = 0, len = contexts.length; i < len; i++) {
                if (contexts[i].name == 'webhooktravelroute-followup') {
                    var from = contexts[i].parameters['street-address-from'];
                }
            }
            var to = req.body.result.parameters['street-address-to'];

            googleMapsClient.geocode({
                address: from
            }, function(err, response) {
                if (!err) {
                    from = response.json.results[0].formatted_address;

                    googleMapsClient.geocode({
                        address: to
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
                                transit_mode: ['rail'],
                                transit_routing_preference: 'fewer_transfers',
                            }, function(err, response) {
                                if (!err) {
                                    var message = '';
                                    var steps = response.json.routes[0].legs[0].steps;
                                    for (var i = 0, len = steps.length; i < len; i++) {

                                        if (steps[i].travel_mode == 'TRANSIT') {
                                            message += 'prend la ligne ' + steps[i].transit_details.line.short_name;
                                            message += ' de ' + steps[i].transit_details.departure_stop.name + ' jusque ' + steps[i].transit_details.arrival_stop.name;
                                            message += ' (' + steps[i].html_instructions + ')';
                                            message += ' ca te prendra ' + steps[i].duration.text + '. Après tu ';
                                        }
                                    }

                                    res.json({
                                        "speech": message,
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

            console.log(req.body.originalRequest.data.sender.id);

            // geocoding
            googleMapsClient.geocode({
                address: workplace
            }, function(err, response) {
                if (!err) {
                    let formated_adress = response.json.results[0].formatted_address
                    var lat = response.json.results[0].geometry.location.lat
                    var lng = response.json.results[0].geometry.location.lng

                    res.json({
                        "messages": [
                            {
                                "buttons": [
                                    {
                                        "postback": "https://www.google.com/maps/search/?api=1&query=" + formated_adress,
                                        "text": "Voir mon lieu de travail"
                                    }
                                ],
                                "imageUrl": "https://maps.googleapis.com/maps/api/staticmap?size=512x512&maptype=roadmap&zoom=16&markers=size:mid%7Ccolor:red%7C"+lat+","+lng,
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
