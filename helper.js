const pg = require('pg');
const connectionString = "postgres://rmwavbfvtbeyss:3825e353072eeb06ef4687fc7655ae68b7a99c4c7c51e26e67026801cd30ceee@ec2-54-204-44-140.compute-1.amazonaws.com:5432/dalifn8rdhdpfm"
var client = new pg.Client(connectionString);
client.connect();

function getUserAddress (id, addressCode, callback) {
    client.query('SELECT * FROM users WHERE id = '+id, callback);
}

module.exports = {
    getUserAddress: getUserAddress,
};