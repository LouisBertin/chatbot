function getUserAddress (id, addressCode) {
    client.query('SELECT * FROM users WHERE id = '+id+', address_code = ' + addressCode, function(err, result) {
        return result.rows
    });
}

module.exports = {
    getUserAddress: getUserAddress,
};