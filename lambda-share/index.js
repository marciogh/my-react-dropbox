exports.handler = function(event, context, callback) {

    var AWS = require('aws-sdk');
    var dynamo = new AWS.DynamoDB();
    var s3 = new AWS.S3();
    const uuidv1 = require('uuid/v1');

    var uuid = event['queryStringParameters']['uuid']

    dynamo.getItem({
        TableName: 'my-react-share',
        Key: {
            "uuid": {
                S: uuid
            },
        }
    }).promise().then((v) => {
        if (v['Item'] == undefined) {
            throw Error('Share not found')
        }
        const url = s3.getSignedUrl('getObject', {
            Bucket: 'my-react',
            Key: v['Item']['src']['S'],
            Expires: 60
        })
        callback(null, {
            "statusCode": 301,
            "headers": {
                "Location": url
            },
            "isBase64Encoded": false,
            "body": ""
        }).catch((e) => {
            console.log(e)
            callback(null, {
                "statusCode": 500,
                "headers": {},
                "isBase64Encoded": false,
                "body": e.message
            })
        })
    }).catch((e) => {
        console.log(e)
        callback(null, {
            "statusCode": 500,
            "headers": {},
            "isBase64Encoded": false,
            "body": e.message
        })
    })

};
