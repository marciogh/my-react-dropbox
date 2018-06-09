const getParameterByName = (name, url) => {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
};

const uuid = () => {
    var uuid = "",
        i,
        random;
    for (i = 0; i < 32; i++) {
        random = Math.random() * 16 | 0;
        if (i == 8 || i == 12 || i == 16 || i == 20) {
            uuid += "-";
        }
        uuid += (i == 12 ? 4 : i == 16 ? random & 3 | 8 : random).toString(16);
    }
    return uuid;
};

let sts;
let s3;
let cip;
let dynamo;

class UserSession extends React.Component {

    constructor(props) {
        super(props);
    }

    render() {
        return React.createElement(
            "div",
            { id: "userSession", className: "box" },
            !this.props.idToken && !this.props.credentials ? React.createElement(
                "div",
                null,
                React.createElement(
                    "a",
                    { href: "https://marciogh.auth.ap-southeast-2.amazoncognito.com/login?response_type=code&client_id=2dachdgldb4h4b5qkcia5l5egd&redirect_uri=https://7k0ts3z4l5.execute-api.ap-southeast-2.amazonaws.com/stg/my-react" },
                    "Login"
                )
            ) : React.createElement("div", null),
            this.props.idToken && !this.props.credentials ? React.createElement(
                "div",
                null,
                "Hello ",
                this.props.idToken['given_name'],
                React.createElement("br", null),
                "Fetching your credentials, please wait..."
            ) : React.createElement("div", null),
            this.props.credentials ? React.createElement(
                "div",
                null,
                "Hello ",
                this.props.idToken['given_name'],
                React.createElement("br", null),
                "Your identity is ",
                this.props.credentials['identityId'],
                React.createElement("br", null),
                React.createElement(
                    "a",
                    { href: "index.html" },
                    "Logoff"
                )
            ) : React.createElement("div", null)
        );
    }

}

class ShareFile extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            users: []
        };

        this.fetchUsers = this.fetchUsers.bind(this);
        this.share = this.share.bind(this);
        cip = new AWS.CognitoIdentityServiceProvider();
        dynamo = new AWS.DynamoDB();
    }

    share(e) {
        const src = e.target.parentNode.id;
        const dest = e.target.id;

        dynamo.putItem({
            Item: {
                "uuid": {
                    S: uuid()
                },
                "src": {
                    S: src
                },
                "dest": {
                    S: dest
                }
            },
            TableName: "my-react-share"
        }).promise().then(r => {
            this.setState({
                users: []
            });
            this.props.refreshShared();
            alert('Shared!');
        });
    }

    fetchUsers(event) {
        var filter = event.target.value;
        if (filter.length >= 3) {
            var params = {
                UserPoolId: 'ap-southeast-2_Jvdm1PThu',
                AttributesToGet: ['given_name', 'family_name', 'email', 'sub'],
                Filter: '\"given_name\" ^= \"' + filter + '\"',
                Limit: 0
            };
            cip.listUsers(params).promise().then(users => {
                this.setState({
                    users: users['Users']
                });
            }).catch(e => {
                alert(e);
            });
        } else {
            this.setState({
                users: []
            });
        }
    }

    render() {
        return React.createElement(
            "div",
            { className: "box" },
            React.createElement(
                "span",
                null,
                "Share with "
            ),
            React.createElement("input", { type: "text", size: "5", onChange: this.fetchUsers }),
            React.createElement(
                "div",
                { className: "shareDropDown" },
                React.createElement(
                    "ul",
                    { id: this.props.src },
                    this.state.users.map(user => {
                        var sub = user['Attributes']['0']['Value'];
                        var given_name = user['Attributes']['1']['Value'];
                        var family_name = user['Attributes']['2']['Value'];
                        var email = user['Attributes']['3']['Value'];
                        return React.createElement(
                            "li",
                            { id: sub, onClick: this.share },
                            given_name,
                            " ",
                            family_name,
                            " ",
                            email
                        );
                    })
                )
            )
        );
    }
}

class FileBox extends React.Component {

    constructor(props) {
        super(props);

        this.upload = this.upload.bind(this);
        this.deleteObject = this.deleteObject.bind(this);
        this.refreshObjects = this.refreshObjects.bind(this);

        this.state = {
            loading: true,
            contents: []
        };

        this.refreshObjects();
    }

    upload() {

        this.setState({
            loading: true
        });

        const inputf = document.getElementById("my-file");

        s3.upload({
            Bucket: 'my-react',
            Key: AWS.config.credentials.identityId + '/' + inputf.files[0].name,
            Body: inputf.files[0]
        }).promise().then(() => {
            inputf.value = "";
            this.refreshObjects();
        }).catch(e => {
            alert(e);
        });
    }

    refreshObjects() {

        this.setState({
            loading: true
        });

        s3.listObjects({
            Bucket: 'my-react',
            Prefix: AWS.config.credentials.identityId + '/'
        }).promise().then(v => {
            this.setState({
                contents: v['Contents'],
                loading: false
            });
        }).catch(e => {
            alert(e);
        });
    }

    deleteObject(key) {

        this.setState({
            loading: true
        });

        s3.deleteObject({
            Bucket: 'my-react',
            Key: key
        }).promise().then(() => {
            this.refreshObjects();
        }).catch(e => {
            alert(e);
        });
    }

    render() {
        return React.createElement(
            "div",
            { id: "fileBox", className: "box" },
            React.createElement(
                "h2",
                null,
                "My files"
            ),
            React.createElement(
                "span",
                null,
                "Upload file"
            ),
            React.createElement("input", { type: "file", id: "my-file", onChange: this.upload }),
            React.createElement(
                "ul",
                null,
                this.state.contents.map(v => {
                    return React.createElement(
                        "li",
                        null,
                        React.createElement(
                            "div",
                            { "class": "delete" },
                            React.createElement(
                                "button",
                                { onClick: e => this.deleteObject(v.Key, e) },
                                "X"
                            )
                        ),
                        React.createElement(
                            "div",
                            { "class": "share" },
                            React.createElement(ShareFile, { refreshShared: this.props.refreshShared, src: v.Key })
                        ),
                        React.createElement(
                            "div",
                            { "class": "name" },
                            v.Key.split('/').pop()
                        )
                    );
                })
            ),
            this.state.loading ? React.createElement(
                "div",
                null,
                React.createElement("img", { src: "loading.gif", width: "30" })
            ) : React.createElement("div", null)
        );
    }

}

class SharedWithMe extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            loading: true
        };

        this.deleteEntry = this.deleteEntry.bind(this);
        props.refreshShared();
    }

    deleteEntry(uuid) {
        dynamo = new AWS.DynamoDB();
        dynamo.deleteItem({
            Key: {
                "uuid": {
                    S: uuid
                }
            },
            TableName: "my-react-share"
        }).promise().then(r => {
            this.props.refreshShared();
        });
    }

    render() {
        return React.createElement(
            "div",
            { id: "sharedWithMe", className: "box" },
            React.createElement(
                "h2",
                null,
                "Shared with me"
            ),
            React.createElement(
                "ul",
                null,
                this.props.contents.map(v => {
                    return React.createElement(
                        "li",
                        null,
                        React.createElement(
                            "div",
                            null,
                            React.createElement(
                                "button",
                                { onClick: e => this.deleteEntry(v.uuid['S'], e) },
                                "X"
                            )
                        ),
                        React.createElement(
                            "div",
                            null,
                            React.createElement(
                                "a",
                                { href: 'https://7k0ts3z4l5.execute-api.ap-southeast-2.amazonaws.com/stg/my-react-share?uuid=' + v.uuid['S'] },
                                v.src['S'].split("/").pop()
                            )
                        )
                    );
                })
            )
        );
    }

}

class RootElement extends React.Component {

    constructor(props) {

        super(props);

        const idTokenParam = getParameterByName('id_token');

        this.state = {
            idToken: false,
            credentials: false,
            contents: [],
            shareContents: [],
            loading: true
        };

        if (idTokenParam) {

            this.state = {
                idToken: JSON.parse(atob(idTokenParam.split(".")[1])),
                credentials: false,
                contents: [],
                shareContents: [],
                loading: true
            };

            AWS.config.region = 'ap-southeast-2';

            const loginsObj = {
                ['cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_Jvdm1PThu']: idTokenParam
            };

            AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                IdentityPoolId: 'ap-southeast-2:1a7c2b8c-0d74-4cc9-9bad-5cfc8fd8551b',
                Logins: loginsObj
            });

            sts = new AWS.STS();
            s3 = new AWS.S3();

            Promise.all([AWS.config.credentials.getPromise(), sts.getCallerIdentity().promise()]).then(callerIdentity => {
                callerIdentity['identityId'] = AWS.config.credentials.identityId;
                this.setState({
                    credentials: callerIdentity
                });
            }).catch(e => {
                alert(e);
            });
        }
    }

    refreshShared() {
        dynamo = new AWS.DynamoDB();
        dynamo.scan({
            TableName: 'my-react-share',
            FilterExpression: "dest=:dest",
            ExpressionAttributeValues: {
                ":dest": { S: this.state['idToken']['sub'] }
            }
        }).promise().then(v => {
            this.setState({
                shareContents: v['Items']
            });
        }).catch(e => {
            alert(e);
        });
    }

    render() {

        return React.createElement(
            "div",
            null,
            React.createElement(UserSession, { idToken: this.state.idToken, credentials: this.state.credentials }),
            this.state.credentials ? React.createElement(
                "div",
                null,
                React.createElement(FileBox, {
                    refreshShared: this.refreshShared.bind(this)
                }),
                React.createElement(SharedWithMe, {
                    me: this.state.idToken['sub'],
                    contents: this.state.shareContents,
                    refreshShared: this.refreshShared.bind(this)
                })
            ) : React.createElement("div", null)
        );
    }

}

ReactDOM.render(React.createElement(RootElement, null), document.getElementById('root'));

