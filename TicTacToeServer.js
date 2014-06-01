var requirejs = require('requirejs');
requirejs.config({
    //ensure module paths are relative to this file
    nodeRequire: require
});
requirejs(
    ['http', 'path', 'url', 'fs', 'querystring', 'connect', './tictactoe.js'],
    function(http, path, url, fs, querystring, connect, tictactoe) {
	
    var users = {}; // {nick: user}
    var challenges = [];
    var rejectedChallenges = [];
    var acceptedChallenges = [];
    var games = [];

    function addUser(username) {
        if (users[username]) {
            console.error('User ' + username + ' already exists.');
            return null;
        }
        var user = users[username] = new tictactoe.model.User(username);
        saveUsers();
        return username;
    }
    
    function removeUser(username) {
        if (!users[username]) {
            console.error('Attempt to remove user that does not exist. User: ' + username);
            return;
        }
        delete users[username];
        saveUsers();
    }
    
    function getUser(username) {
        if (users[username]) {
            return users[username];
        }
        return null;
    }
    
    function saveUsers() {
        fs.writeFile('./users.json', JSON.stringify(users, null, 4), function(error) {
            if (error) {
                console.error('I/O error: ', error);
            }
        });
    }
    
    function request_getCurrentUser(request, response) {
        var username = request.session.username || null;
        var user;
        user = getUser(username);
        if (!user) {
            username = request.session.username = null;
        }
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({user: username}));
    }
	
    function request_createNewUser(request, response) {
        var body = '';
        var info;
        request.on('data', function(data) {
            body += data;
        });
        request.on('end', function() {
            info = JSON.parse(body);
            
            var result;
            if (addUser(info.username)) {
                result = {
                    success: true,
                    username: info.username
                };
                request.session.username = info.username;
            } else {
                result = {
                    success: false,
                    error: 'User already exists for this address.'
                };
            }
            response.setHeader('content-type', 'application/json');
            response.end(JSON.stringify(result));
        });
    }

    function request_getUserList(request, response) {
        // var username = request.session.username || null;
        // var user = getUser(username);
        // TODO maybe remove current user from list?
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify(Object.keys(users)));
    }

    function request_getGrid(request, response) {
        var username = request.session.username;
        var user = getUser(username);
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({user: user}));
    }

    function request_issueChallenge(request, response) {
    	var body = '';
        request.on('data', function(data) {
            body += data;
        });
        request.on('end', function() {
            var targetUsername = JSON.parse(body);
            var username = request.session.username;
		    var challenger = getUser(username);
		    var target = getUser(targetUsername);
		    var challenge = new tictactoe.model.Challenge(challenger.nickname, target.nickname);
		    challenges.push(challenge);
		    response.setHeader('content-type', 'application/json');
		    response.end(JSON.stringify(challenge));
        });
    }

    function request_getChallenges(request, response) {
	    var username = request.session.username;
	    var user = getUser(username);
	    var myChallenges = {
            pending: [],
            accepted: [],
            rejected: []
        };
        //pending
        challenges.forEach(function (challenge, i) {
	    	if (challenge.target === user.nickname) {
	    		myChallenges.pending.push(challenge);
	    	}
	    });

        //accepted
        acceptedChallenges.forEach(function (challenge, i) {
            if (challenge.challenger === user.nickname) {
                myChallenges.accepted.push(challenge);
                acceptedChallenges.splice(i, 1);
            }
        });

        //rejected
        rejectedChallenges.forEach(function (challenge, i) {
            if (challenge.challenger === user.nickname) {
                myChallenges.rejected.push(challenge);
                rejectedChallenges.splice(i, 1);
            }
        });

	    response.setHeader('content-type', 'application/json');
	    response.end(JSON.stringify(myChallenges));
    }

    function request_acceptChallenge(request, response) {
    	var body = '';
        request.on('data', function(data) {
            body += data;
        });
        request.on('end', function() {
            var acceptedChallenge = JSON.parse(body);
		    var accepter = getUser(request.session.username);
		    var result = null;
		    for (i in challenges) {
		    	var challenge = challenges[i];
		    	if (challenge.id === acceptedChallenge.id) {
		    		if (challenge.target !== accepter.nickname) {
		    			console.error("Accepter " + accepter.nickname + " attempting to accept challenge for " + challenge.target);
		    			break;
		    		}
	    			result = challenges[i];
	    			delete challenges[i];
                    acceptedChallenges.push(result);
                    console.log("User " + accepter.nickname + " ACCEPT " + challenge.challenger);
	    			break;
		    	}
		    }

            //init game instance
		    var game = null;
		    if (result) {
		    	var naughtsPlayer, crossesPlayer;
		    	if (Math.round(Math.random() * 100) % 2) {
		    		naughtsPlayer = acceptedChallenge.target;
		    		crossesPlayer = acceptedChallenge.challenger;
		    	} else {
		    		naughtsPlayer = acceptedChallenge.challenger;
		    		crossesPlayer = acceptedChallenge.target;
		    	}
			    game = new tictactoe.model.Game(naughtsPlayer, crossesPlayer);
	        	games.push(game);
                result.gameId = game.id;
	        }
        	response.setHeader('content-type', 'application/json');
		    response.end(JSON.stringify(game));
        });
    }

    function request_rejectChallenge(request, response) {
        console.log('REJECTED');
    	var body = '';
        request.on('data', function(data) {
            body += data;
        });
        request.on('end', function() {
            var rejectedChallenge = JSON.parse(body);
		    var rejecter = getUser(request.session.username);
		    var result = null;
		    for (i in challenges) {
		    	var challenge = challenges[i];
		    	if (challenge.id === rejectedChallenge.id) {
		    		if (challenge.target !== rejecter.nickname) {
		    			console.error("Rejecter " + rejecter.nickname + " attempting to reject challenge for " + challenge.target);
		    			break;
		    		}
	    			result = challenges[i];
	    			delete challenges[i];
	    			rejectedChallenges.push(result);
                    console.log("User " +  rejecter.nickname + " REJECT " + challenge.challenger);
	    			break;
		    	}
		    }
        	response.setHeader('content-type', 'application/json');
		    response.end(JSON.stringify(result));
        });
    }

    var cgiResolver = {
        '/cgi/getCurrentUser': request_getCurrentUser,
        '/cgi/createNewUser': request_createNewUser,
        '/cgi/getUserList': request_getUserList,
        '/cgi/issueChallenge': request_issueChallenge,
        '/cgi/getChallenges': request_getChallenges,
        '/cgi/acceptChallenge': request_acceptChallenge,
        '/cgi/rejectChallenge': request_rejectChallenge
    };

    var ONE_HOUR = 60 * 60 * 1000;

    var app = connect()
        .use(connect.static('./'))
        .use(connect.cookieParser())
        .use(connect.cookieSession({
            secret: 'nyan-nyan-nyan!',  //use cookie to store session data in request.session using secret
            cookie: {
                maxAge: ONE_HOUR
            }
        }))
        .use(function (request, response){
            var parsedUrl = url.parse(request.url);
            if (!parsedUrl.pathname) {
                response.setHeader('content-type', 'text/plain');
                response.end('Error: bad path');
                return;
            }
            
            //check for CGI call
            if (request.method === 'POST') {
                var cgiFunc = cgiResolver[parsedUrl.pathname];
                if (cgiFunc) {
                    cgiFunc(request, response);
                    return;
                } else {
                    response.setHeader('content-type', 'text/plain');
                    response.end('Error: bad POST path');
                    return;
                }
            }
        });
    
	http.createServer(app).listen(8989);
})();