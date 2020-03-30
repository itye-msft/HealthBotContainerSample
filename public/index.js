function getUserLocation(callback) {
    navigator.geolocation.getCurrentPosition(
        function(position) {
            var latitude  = position.coords.latitude;
            var longitude = position.coords.longitude;
            var location = {
                lat: latitude,
                long: longitude
            }
            callback(location);
        },
        function(error) {
            // user declined to share location
            console.log("location error:" + error.message);
            callback();
        });
}

function initBotConversation() {
    if (jwtToken == "") {
        alert("Error, cannot connect to the service.");
        return;
    }
    // extract the data from the JWT
    const jsonWebToken = jwtToken;
    const tokenPayload = JSON.parse(atob(jsonWebToken.split('.')[1]));
    const user = {
        id: tokenPayload.userId,
        name: tokenPayload.userName,
        locale: tokenPayload.locale
    };
    let domain = undefined;
    if (tokenPayload.directLineURI) {
        domain =  "https://" +  tokenPayload.directLineURI + "/v3/directline";
    }
    var botConnection = window.WebChat.createDirectLine({
        token: tokenPayload.connectorToken,
        domain: domain
    });
    const styleOptions = {
        botAvatarImage: 'https://docs.microsoft.com/en-us/azure/bot-service/v4sdk/media/logo_bot.svg?view=azure-bot-service-4.0',
        // botAvatarInitials: '',
        // userAvatarImage: '',
        hideSendBox: false, /* set to true to hide the send box from the view */
        botAvatarInitials: 'Bot',
        userAvatarInitials: 'You',
        backgroundColor: '#F8F8F8'
    };

    const store = window.WebChat.createStore({}, function(store) { return function(next) { return function(action) {
        if (action.type === 'DIRECT_LINE/CONNECT_FULFILLED') {
            store.dispatch({
                type: 'DIRECT_LINE/POST_ACTIVITY',
                meta: {method: 'keyboard'},
                payload: {
                    activity: {
                        type: "invoke",
                        name: "InitConversation",
                        locale: user.locale,
                        value: {
                            // must use for authenticated conversation.
                            jsonWebToken: jsonWebToken,

                            // Use the following activity to proactively invoke a bot scenario
                            /*
                            triggeredScenario: {
                                trigger: "{scenario_id}",
                                args: {
                                    myVar1: "{custom_arg_1}",
                                    myVar2: "{custom_arg_2}"
                                }
                            }
                            */
                        }
                    }
                }
            });

        }
        else if (action.type === 'DIRECT_LINE/INCOMING_ACTIVITY') {
            if (action.payload && action.payload.activity && action.payload.activity.type === "event" && action.payload.activity.name === "ShareLocationEvent") {
                // share
                getUserLocation(function (location) {
                    store.dispatch({
                        type: 'WEB_CHAT/SEND_POST_BACK',
                        payload: { value: JSON.stringify(location) }
                    });
                });
            }
        }
        return next(action);
    }}});
    const webchatOptions = {
        directLine: botConnection,
        styleOptions: styleOptions,
        store: store,
        userID: user.id,
        username: user.name,
        locale: user.locale
    };
    startChat(user, webchatOptions);
}

function startChat(user, webchatOptions) {
    const botContainer = document.getElementById('webchat');
    window.WebChat.renderWebChat(webchatOptions, botContainer);
}
