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
var helper = require('./helper')

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
                        // origin: {
                        //     lat: response.json.results[0].geometry.location.lat,
                        //     lng: response.json.results[0].geometry.location.lng
                        // },
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

                            //res.json(steps)
                            for (var i = 0, len = steps.length; i < len; i++) {
                                if (steps[i].travel_mode == 'WALKING') {
                                    if (i === 0) {
                                        message += 'On va commencer par un peu de marche :) Il faut ';
                                    } else if (i === len - 1) {
                                        message += ' On est presque arrivé courage 💪, il ne reste plus qu\'au ';
                                    } else {
                                        message += ' Il faut ';
                                    }
                                    message += steps[i].html_instructions + ' (' + steps[i].duration.text + ') ';
                                }
                                if (steps[i].travel_mode == 'TRANSIT') {
                                    if (i !== 0) {
                                        message += ', ensuite ';
                                    }
                                    message += 'prend la ligne ' + steps[i].transit_details.line.short_name;
                                    message += ' de ' + steps[i].transit_details.departure_stop.name + ' jusque ' + steps[i].transit_details.arrival_stop.name;
                                    message += ' (' + steps[i].html_instructions + ')';
                                    message += ' ca te prendra ' + steps[i].duration.text + '. ';
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
    helper.getUserAddress(1411203568983927, 'work', function(err, result) {
        if(err) {
            return res.status(500).end()
        }

        console.log(result.rows)
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

            if (typeof latLngFrom.lat === 'undefined') {
                from = req.body.result.parameters['street-address-from'];
            }

            googleMapsClient.geocode({
                address: from
            }, function(err, response) {
                if (!err) {
                    if (typeof latLngFrom.lat === 'undefined') {
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
                                        if (steps[i].travel_mode == 'WALKING') {
                                            if (i === 0) {
                                                message += 'On va commencer par un peu de marche 👟 Il faut ';
                                            } else if (i === len - 1) {
                                                message += ' On est presque arrivé courage 💪, il ne reste plus qu\'à ';
                                            } else {
                                                message += ' Il faut ';
                                            }
                                            message += steps[i].html_instructions + ' (' + steps[i].duration.text + ') ';
                                        }
                                        if (steps[i].travel_mode == 'TRANSIT') {
                                            if (i !== 0) {
                                                message += ', ensuite ';
                                            }
                                            message += 'prends la ligne ' + steps[i].transit_details.line.short_name;
                                            message += ' de ' + steps[i].transit_details.departure_stop.name + ' jusqu\'à ' + steps[i].transit_details.arrival_stop.name;
                                            message += ' (' + steps[i].html_instructions + ')';
                                            message += ' ca te prendra ' + steps[i].duration.text + '. ';
                                        }
                                    }

                                    message += 'Voila, tu es arrivé ! :)🚩';

                                    res.json({
                                        "messages": [
                                            {
                                                "buttons": [
                                                    {
                                                        "postback": "https://www.google.com/maps/search/?api=1&query=" + to,
                                                        "text": "Voir mon lieu de travail"
                                                    }
                                                ],
                                                "imageUrl": "https://maps.googleapis.com/maps/api/staticmap?size=512x512&maptype=roadmap&zoom=16&markers=size:mid%7Ccolor:red%7C"+latLngFrom.lat+","+latLngFrom.lng,
                                                "platform": "facebook",
                                                "title": "Cela correspond ?",
                                                "type": 1
                                            },
                                            {
                                                "text": message,
                                            }
                                        ]
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
                // retrieve data : result.rows
                for (var i in result.rows) {
                    val = result.rows[i];

                    if (currentFbId == val.id) {
                        res.json({
                            "speech": "L'adresse de votre entreprise est déjà renseignée",
                        });
                        return false;
                    }
                }

                res.json({
                    "speech": "Où travaillez-vous ?",
                });
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
        case  "webhook.user.update.address.custom":
            var newWorkplace = req.body.result.parameters['street-address'];

            // geocoding
            googleMapsClient.geocode({
                address: newWorkplace
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
                                "title": "C'est ici ?",
                                "type": 1
                            }
                        ]
                    });
                }
            });

            break;
        case "webhook.user.update.address.custom.yes":
            var updateAddressFbuserId = req.body.originalRequest.data.sender.id
            var updateAddressFbuser = req.body.result.contexts[0].parameters['street-address'];

            googleMapsClient.geocode({
                address: updateAddressFbuser
            }, function(err, response) {
                if (!err) {
                    var formated_adress = response.json.results[0].formatted_address
                    var lat = response.json.results[0].geometry.location.lat
                    var lng = response.json.results[0].geometry.location.lng

                    client.query('UPDATE users SET address_txt=($1), lat=($2), lng=($3) WHERE id=($4)',
                        [formated_adress, lat, lng, updateAddressFbuserId]);}
            });

            break;
        case "webhook.user.address.current":
            var displayCurrentWorkplaceAddress = req.body.originalRequest.data.sender.id

            client.query('SELECT * FROM users WHERE id = ' + displayCurrentWorkplaceAddress, function(err, result) {
                for (var i in result.rows) {
                    val = result.rows[i];

                    res.json({
                        "speech": "Voici ton adresse : " + val.address_txt,
                    });
                }
            });

            break;
        case "webhook.user.home":
            var currentFbIdHome = parseInt(req.body.originalRequest.data.sender.id)

            client.query("SELECT id FROM users WHERE address_code = 'home'", function(err, result) {
                // retrieve data : result.rows
                for (var i in result.rows) {
                    val = result.rows[i];

                    if (currentFbIdHome == val.id) {
                        res.json({
                            "speech": "L'adresse de votre domicile est déjà renseignée",
                        });
                        return false;
                    }
                }

                res.json({
                    "speech": "Où habitez-vous ?",
                });
            });

            break;
        case "webhook.user.home.place":
            // get workplace
            var home = req.body.result.parameters['street-address'];

            // geocoding
            googleMapsClient.geocode({
                address: home
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
                                        "text": "Voir mon domicile"
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

            break
        case "webhook.user.data.workplace.yes":
            var fbuserIdHome = req.body.originalRequest.data.sender.id
            var addressHome = req.body.result.contexts[0].parameters['street-address'];

            googleMapsClient.geocode({
                address: addressHome
            }, function(err, response) {
                if (!err) {
                    var formated_adress = response.json.results[0].formatted_address
                    var lat = response.json.results[0].geometry.location.lat
                    var lng = response.json.results[0].geometry.location.lng

                    client.query('INSERT INTO users(id, address_code, address_txt, lat, lng) values($1, $2, $3, $4, $5)',
                        [parseInt(fbuserId), 'home', formated_adress, lat, lng]);
                }
            });

            break;

    }
})

app.listen(PORT, function () {
    console.log(`Listening on ${ PORT }`)
})
