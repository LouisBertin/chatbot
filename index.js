const express = require('express')
const path = require('path')
const axios = require("axios");
const PORT = process.env.PORT || 5000
var bodyParser = require('body-parser');
var googleMapsClient = require('@google/maps').createClient({
    key: 'AIzaSyAW7MCC53fSBXr66c5f0lA6m5cf5RUyQOA'
});
const pg = require('pg');
const connectionString = "postgres://rmwavbfvtbeyss:3825e353072eeb06ef4687fc7655ae68b7a99c4c7c51e26e67026801cd30ceee@ec2-54-204-44-140.compute-1.amazonaws.com:5432/dalifn8rdhdpfm"
var client = new pg.Client(connectionString);
client.connect();

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
                        //origin: [parseFloat(response.json.results[0].geometry.location.lat), parseFloat(response.json.results[0].geometry.location.lng)],
                        //origin: { lat: response.json.results[0].geometry.location.lat, lng: response.json.results[0].geometry.location.lng },
                        origin: {
                            lat: response.json.results[0].geometry.location.lat,
                            lng: response.json.results[0].geometry.location.lng
                        },
                        //origin: '41.43206,-81.38992',
                        //origin: from,
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

                            res.json(steps)
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
    var test = {
        "id": "fb43d312-a594-4af5-be91-e65a9b8a742e",
        "timestamp": "2018-03-21T15:59:12.865Z",
        "lang": "fr",
        "result": {
            "source": "agent",
            "resolvedQuery": "oui",
            "action": "webhookuserdata.webhookuserdata-custom.webhookuserdataworkplace-yes",
            "actionIncomplete": false,
            "parameters": {},
            "contexts": [
                {
                    "name": "webhookuserdataworkplace-followup",
                    "parameters": {
                        "street-address": "39 bis rue de montreuil",
                        "street-address.original": "39 bis rue de montreuil"
                    },
                    "lifespan": 1
                }
            ],
            "metadata": {
                "intentId": "8c7c8da7-8c42-466c-b7f4-b465d831a6d5",
                "webhookUsed": "true",
                "webhookForSlotFillingUsed": "false",
                "webhookResponseTime": 173,
                "intentName": "webhook.user.data.workplace.yes"
            },
            "fulfillment": {
                "speech": "",
                "messages": [
                    {
                        "type": 0,
                        "platform": "facebook",
                        "speech": "Super! Cette adresse a été enregistrée :)"
                    }
                ]
            },
            "score": 1
        },
        "status": {
            "code": 206,
            "errorType": "partial_content",
            "errorDetails": "Webhook call failed. Error: 500 Internal Server Error",
            "webhookTimedOut": false
        },
        "sessionId": "d0c43a9b-89a4-4147-aa28-0502c90a604d",
        "alternativeResultsFromKnowledgeService": {}
    }

    res.json(test)
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
                } else if (response.data.result.slug === 'normal_trav') {
                    message = 'Pas d\'accident ou de retards, juste les travaux qui continuent ! ' + message + ' 🚧';
                } else {
                    message += ' ⚠🚇';
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
                } else if (response.data.result.slug === 'normal_trav') {
                    message = 'Pas d\'accident ou de retards, juste les travaux qui continuent ! ' + message + ' 🚧';
                } else {
                    message += ' ⚠🚇';
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
            var from = 'Place de Clichy';
            var to = '';
            var latLngFrom = {};

            for (var i = 0, len = contexts.length; i < len; i++) {
                if (contexts[i].name == 'webhooktravelroute-followup') {
                   to = contexts[i].parameters['street-address-to'];
                }
                if (contexts[i].name == 'facebook_location') {
                    latLngFrom = {
                        lat: contexts[i].parameters.lat,
                        lng: contexts[i].parameters.long
                    }
                }
            }

            if (latLngFrom.lat.length <= 0) {
                from = req.body.result.parameters['street-address-from'];
            }

            googleMapsClient.geocode({
                address: from
            }, function(err, response) {
                if (!err) {
                    if (latLngFrom.lat.length <= 0) {
                        latLngFrom = {
                            lat: response.json.results[0].geometry.location.lat,
                            lng: response.json.results[0].geometry.location.lng
                        }
                    }

                    googleMapsClient.geocode({
                        address: to
                    }, function(err, response) {
                        if (!err) {
                            to = response.json.results[0].formatted_address;
                            googleMapsClient.directions({
                                origin: latLngFrom,
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
                                            message += ' ca te prendra ' + steps[i].duration.text + '. ';
                                            if (i < len - 1) {
                                                message += 'Après tu ';
                                            }
                                        }
                                    }

                                    if (message.length == 0) {
                                        message = 'Le plus rapide c\'est à pied :)👟';
                                    } else {
                                        message += 'es arrivé ! :)🚩';
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
        case "webhook.user.data":
            var currentFbId = parseInt(req.body.originalRequest.data.sender.id)

            client.query('SELECT id FROM users', function(err, result) {
                if(err) {
                    return console.error('error running query', err);
                }
                // retrieve data : result.rows
                for (var i in result.rows) {
                    val = result.rows[i];
                    console.log(val.id)
                    console.log('current : ' + currentFbId)

                    if (currentFbId == val.id) {
                        console.log('it works')
                        res.json({
                            "speech": "L'adresse de votre domicile est déjà renseignée",
                        });
                    }
                }
            });

            break;
        case "webhook.user.data.workplace":
            // get workplace
            var workplace = req.body.result.parameters['street-address'];

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
        case "webhook.user.data.workplace.yes":
            var fbuserId = req.body.originalRequest.data.sender.id
            var address = req.body.result.contexts[0].parameters['street-address'];

            googleMapsClient.geocode({
                address: address
            }, function(err, response) {
                if (!err) {
                    var formated_adress = response.json.results[0].formatted_address
                    var lat = response.json.results[0].geometry.location.lat
                    var lng = response.json.results[0].geometry.location.lng

                    client.query('INSERT INTO users(id, address_code, address_txt, lat, lng) values($1, $2, $3, $4, $5)',
                        [parseInt(fbuserId), 'work', formated_adress, lat, lng]);
                }
            });

            break;
    }
})

app.listen(PORT, function () {
    console.log(`Listening on ${ PORT }`)
})
