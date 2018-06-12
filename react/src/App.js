import React, { Component } from 'react';
import Modal from 'react-modal';
import './App.css';

var AWS = require('aws-sdk/global');
var dynamo = require('aws-sdk/clients/dynamodb');
var s3 = require('aws-sdk/clients/s3');
var cognito = require('aws-sdk/clients/cognitoidentityserviceprovider');

class Utils {

    static getParameterByName(name, url) {
        if (!url) url = window.location.href
        name = name.replace(/[[]]/g, "\\$&")
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url)
        if (!results) return null
        if (!results[2]) return ''
        return decodeURIComponent(results[2].replace(/\+/g, " "))
    }

    static uuid() {
        var uuid = "", i, random;
        for (i = 0; i < 32; i++) {
            random = Math.random() * 16 | 0;
            if (i === 8 || i === 12 || i === 16 || i === 20) {
                uuid += "-"
            }
            uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
        }
        return uuid;
    }

}


class User extends Component {

    render() {
        return(
            <span>
                Hello {this.props.idToken['given_name']} ({this.props.idToken['cognito:username']})
            </span>
        )
    }
}

class UserSession extends Component {

    render() {
        return (
            <div id="userSession" className="box">
                { ! this.props.idToken && ! this.props.credentials ?
                    <div>
                        <a href='https://marciogh.auth.ap-southeast-2.amazoncognito.com/login?response_type=code&client_id=2dachdgldb4h4b5qkcia5l5egd&redirect_uri=https://7k0ts3z4l5.execute-api.ap-southeast-2.amazonaws.com/stg/my-react'>Login</a>
                    </div>
                    :
                    <div />
                }
                { this.props.idToken && ! this.props.credentials ?
                    <div>
                        <strong><User idToken={this.props.idToken} /></strong><br />Fetching your credentials, please wait...
                    </div>
                    :
                    <div />
                }
                { this.props.credentials ?
                    <div>
                        <strong><User idToken={this.props.idToken} /></strong><br />Your AWS identity is {this.props.credentials['identityId']}
                        <br />
                        <a href='index.html'>Logoff</a>
                    </div>
                    :
                    <div />
                }
            </div>
        )
    }

}

class ShareFile extends Component {

    constructor(props) {
        super(props)
        this.state = {
            modalIsOpen: false,
            users: [],
            status: null
        }

        this.openModal = this.openModal.bind(this);
        this.afterOpenModal = this.afterOpenModal.bind(this);
        this.closeModal = this.closeModal.bind(this);
        this.fetchUsers = this.fetchUsers.bind(this)
        this.share = this.share.bind(this)
        this.cip = new AWS.CognitoIdentityServiceProvider();
        this.dynamo = new AWS.DynamoDB();
    }

    openModal() {
        this.setState({
            modalIsOpen: true,
            status: null
        });
    }

    afterOpenModal() {
    }

    closeModal() {
        this.setState({
            users: [],
            modalIsOpen: false,
            status: null
        });
    }

    share(e) {
        const src = e.target.parentNode.id
        const dest = e.target.id

        this.dynamo.putItem({
            Item: {
                "uuid": {
                    S: Utils.uuid()
                },
                "src": {
                    S: src
                },
                "dest": {
                    S: dest
                },
            },
            TableName: "my-react-share"
        }).promise().then((r) => {
            this.setState({
                status: 'Shared!'
            })
            this.props.refreshShared()
            setTimeout(() => {this.closeModal()}, 1000)
        })
    }

    fetchUsers(event) {
        var filter = event.target.value
        if (filter.length >= 3) {
            var params = {
                UserPoolId: 'ap-southeast-2_Jvdm1PThu',
                AttributesToGet: [
                    'given_name',
                    'family_name',
                    'email',
                    'sub'
                ],
                Filter: '"given_name" ^= "' + filter + '"',
                Limit: 0
            };
            this.cip.listUsers(params).promise().then((users) => {
                this.setState({
                    users: users['Users']
                })
            }).catch((e) => {
                alert(e)
            })
        } else {
            this.setState({
                users: []
            })
        }
    }

    render() {

        const customStyles = {
            /*
            content : {
                top                   : '50%',
                left                  : '50%',
                right                 : 'auto',
                bottom                : 'auto',
                marginRight           : '-50%',
                transform             : 'translate(-50%, -50%)'
            }
            */
        };

        return (
            <div>
                <button onClick={this.openModal}>Share</button>
                <Modal
                    isOpen={this.state.modalIsOpen}
                    onAfterOpen={this.afterOpenModal}
                    onRequestClose={this.closeModal}
                    style={customStyles}
                    contentLabel="Example Modal"
                >
                    <div className="box">
                        <button onClick={this.closeModal}>Cancel</button><br />
                        <span>Share <strong>{this.props.src.split('/').pop()}</strong> with </span>
                        <input type="text" onChange={this.fetchUsers} />
                        <div className="shareDropDown">
                            <ul id={this.props.src} >
                                { this.state.users.map((user) => {
                                    var username = user['Username']
                                    var sub = user['Attributes']['0']['Value']
                                    var given_name = user['Attributes']['1']['Value']
                                    var family_name = user['Attributes']['2']['Value']
                                    var email = user['Attributes']['3']['Value']
                                    return (
                                        <li id={sub} onClick={this.share}>{username} {given_name} {family_name} {email}</li>
                                    )
                                })}
                            </ul>
                        </div>
                        <strong>{this.state.status}</strong>
                    </div>
                </Modal>
            </div>
        )
    }
}

class FileBox extends Component {

    constructor(props) {
        super(props)

        this.upload = this.upload.bind(this);
        this.deleteObject = this.deleteObject.bind(this);
        this.refreshObjects = this.refreshObjects.bind(this);
        this.s3 = new AWS.S3();

        this.state = {
            loading: true,
            contents: []
        }

        this.refreshObjects()

    }

    upload() {

        this.setState({
            loading: true
        })

        const inputf = document.getElementById("my-file")

        this.s3.upload({
            Bucket: 'my-react',
            Key: AWS.config.credentials.identityId + '/' + inputf.files[0].name,
            Body: inputf.files[0]
        }).promise().then(() => {
            inputf.value = ""
            this.refreshObjects()
        }).catch((e) => {
            alert(e)
        })

    }

    refreshObjects() {

        this.setState({
            loading: true
        })

        this.s3.listObjects({
            Bucket: 'my-react',
            Prefix: AWS.config.credentials.identityId + '/'
        }).promise().then((v) => {
            this.setState({
                contents: v['Contents'],
                loading: false
            })
        }).catch((e) => {
            alert(e)
        })

    }

    deleteObject(key) {

        this.dynamo = new AWS.DynamoDB()

        this.setState({
            loading: true
        })

        this.s3.deleteObject({
            Bucket: 'my-react',
            Key: key
        }).promise().then(() => {
            this.dynamo.scan({
                TableName: 'my-react-share',
                FilterExpression: "src=:src",
                ExpressionAttributeValues: {
                    ":src": {S: key}
                }
            }).promise().then((v) => {
                v['Items'].map((i) => {
                    console.log(i)
                    const params = {
                        TableName: 'my-react-share',
                        Key: {
                            "uuid": i.uuid
                        }
                    }
                    console.log(params)
                    this.dynamo.deleteItem(params, function (err, data) {
                        if (err) {
                            console.log('FAIL:  Error deleting item from dynamodb - ' + err);
                        }
                        else {
                            console.log("DEBUG:  deleteItem worked. ");
                        }
                    });
                })
                this.props.refreshShared()
                this.refreshObjects()
            }).catch((e) => {
                alert(e)
            })
        }).catch((e) => {
            alert(e)
        })

    }

    render() {
        return (
            <div id="fileBox" className="box">
                <h2>My files</h2>
                <span>Upload file</span><br />
                <input type='file' id='my-file' onChange={this.upload} />
                <ul>
                    { this.state.contents.map((v) => {
                        return (
                            <li>
                                <div class="delete"><button onClick={(e) => this.deleteObject(v.Key, e)}>X</button></div>
                                <div class="share"><ShareFile refreshShared={this.props.refreshShared} src={v.Key} /></div>
                                <div class="name">{v.Key.split('/').pop()}</div>
                            </li>
                        )
                    })
                    }
                </ul>
                { this.state.loading ?
                    <div><img src='loading.gif' alt='Loading' width='30' /></div>
                    :
                    <div />
                }
            </div>
        )
    }

}

class SharedWithMe extends Component {

    constructor(props) {
        super(props)

        this.dynamo = new AWS.DynamoDB();

        this.state = {
            loading: true,
        }

        this.deleteEntry = this.deleteEntry.bind(this);
        props.refreshShared()
    }


    deleteEntry(uuid) {
        this.dynamo.deleteItem({
            Key: {
                "uuid": {
                    S: uuid
                },
            },
            TableName: "my-react-share"
        }).promise().then((r) => {
            this.props.refreshShared()
        })
    }

    render() {
        return (
            <div id="sharedWithMe" className="box">
                <h2>Shared with me</h2>
                <ul>
                    { this.props.contents.map((v) => {
                        return (
                            <li>
                                <div><button onClick={(e) => this.deleteEntry(v.uuid['S'], e)}>X</button></div>
                                <div>
                                    <a href={'https://7k0ts3z4l5.execute-api.ap-southeast-2.amazonaws.com/stg/my-react-share?uuid=' + v.uuid['S']}>
                                        {v.src['S'].split("/").pop()}
                                    </a>
                                </div>
                            </li>
                        )
                    })
                    }
                </ul>
            </div>
        )
    }

}

class App extends Component {

    constructor(props) {

        super(props);

        const idTokenParam = Utils.getParameterByName('id_token')

        this.state = {
            idToken: false,
            credentials: false,
            contents: [],
            shareContents: [],
            loading: true
        }

        if (idTokenParam) {

            this.state = {
                idToken: JSON.parse(atob(idTokenParam.split(".")[1])),
                credentials: false,
                contents: [],
                shareContents: [],
                loading: true
            }

            AWS.config.region = 'ap-southeast-2'

            const loginsObj = {
                'cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_Jvdm1PThu': idTokenParam
            }

            AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                IdentityPoolId: 'ap-southeast-2:1a7c2b8c-0d74-4cc9-9bad-5cfc8fd8551b',
                Logins: loginsObj
            })
            AWS.config.credentials.clearCachedId()

            this.sts = new AWS.STS()
            this.dynamo = new AWS.DynamoDB()

            Promise.all([
                AWS.config.credentials.getPromise(),
                this.sts.getCallerIdentity().promise()
            ]).then((callerIdentity) => {
                callerIdentity['identityId'] = AWS.config.credentials.identityId
                this.setState({
                    credentials: callerIdentity
                })
            }).catch((e) => {
                alert(e)
            })
        }

    }

    refreshShared() {
        this.dynamo.scan({
            TableName: 'my-react-share',
            FilterExpression: "dest=:dest",
            ExpressionAttributeValues: {
                ":dest": {S: this.state['idToken']['sub']}
            }
        }).promise().then((v) => {
            this.setState({
                shareContents: v['Items']
            })
        }).catch((e) => {
            alert(e)
        })

    }

    render() {

        return (
            <div>
                <UserSession idToken={this.state.idToken} credentials={this.state.credentials} />
                {
                    this.state.credentials ?
                        <div>
                            <FileBox
                                refreshShared={this.refreshShared.bind(this)}
                            />
                            <SharedWithMe
                                me={this.state.idToken['sub']}
                                contents={this.state.shareContents}
                                refreshShared={this.refreshShared.bind(this)}
                            />
                        </div>
                        :
                        <div />
                }
            </div>
        )
    }

}

export default App;