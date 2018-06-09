exports.handler = function(event, context, callback) {

    var AWS = require('aws-sdk');
    var https = require("https");
    var querystring = require('querystring');

    var postData = querystring.stringify({
        grant_type: 'authorization_code',
        client_id: '2dachdgldb4h4b5qkcia5l5egd',
        redirect_uri: 'https://7k0ts3z4l5.execute-api.ap-southeast-2.amazonaws.com/stg/my-react',
        code: event['queryStringParameters']['code']
    });

    var options = {
        hostname: 'marciogh.auth.ap-southeast-2.amazoncognito.com',
        port: 443,
        path: '/oauth2/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic MmRhY2hkZ2xkYjRoNGI1cWtjaWE1bDVlZ2Q6ZTk5ZDNlMTNyaG92dGxkMWx1Nzg4NDJ2ZnNkcG5mdnQ4YWpzaG5oOG44cGQzYXRpYTdj'
        }
    };

    var req = https.request(options, function(res) {
        
        res.setEncoding('utf8');

        res.on('data', function (body) {

            console.log('on data ' + body)
            var id_token = JSON.parse(body)['id_token']
            var data = id_token.split('.')
            var userdata = new Buffer(data[1], 'base64').toString('ascii')

            callback(null, {
                "statusCode": 301,
                "headers": {
                    "Location": "https://marciogh.com/my-react/index.html?id_token=" + id_token
                },
                "isBase64Encoded": false,
                "body": ""
            })

        });
    });

    req.on('error', function(e) {

        console.log('on error' + e.message);

        callback({
            "statusCode": 500,
            "headers": {},
            "isBase64Encoded": false,
            "body": JSON.stringify(e.message)
        })

    });

    console.log(postData)
    req.write(postData);
    req.end();

};
