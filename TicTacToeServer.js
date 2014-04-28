(function() {
	var http = require('http');
	var path = require('path');
	var url = require('url');
	var fs = require('fs');
	var querystring = require('querystring');
	
    var users = {}; // {ip: user}
    var challenges = [];
    var rejectedChallenges = [];
    var games = [];

    /**
     *	Implements a challenge from one user to another. If accepted, a game is created.
     */
    function Challenge(challenger, target) {
    	this.id = Challenge.newId();
    	this.challenger = challenger;
    	this.target = target;
    	this.time = new Date().getTime();
    }
    Challenge.lastId = 0;
    Challenge.newId = function newId() {
    	return Challenge.lastId++;
    }

    /**
     *  Implements a Game with a naughts player and a crosses player.
     */
    function Game(naughtsPlayer, crossesPlayer) {
		if (!naughtsPlayer) {
            throw 'Cannot create game: naughts(oes) player is not specified.';
        }
        if (!crossesPlayer) {
            throw 'Cannot create game: crosses(exes) player is not specified.';
        }

        this.naughtsPlayer = naughtsPlayer;
        this.crossesPlayer = crossesPlayer;
        this.grid = [
            [null, null, null],
            [null, null, null],
            [null, null, null]
        ];
        this.currentPlayer = crossesPlayer;
    }
    Game.prototype.play = function play(player, row, column) {
        if (!player) {
            throw 'Error: player of given move not defined.';
        }
        if (player !== this.naughtsPlayer && player !== this.crossesPlayer) {
            throw 'Error: player of given move is not playing in this game.';
        }
        if (player !== this.currentPlayer) {
            throw 'Error: It\'s not ' + player.nickname + '\'s turn!';  
        }
        if (row < 0 || row >= this.grid.length || columns < 0 || columns >= this.grid[row].length) {
            throw 'Error: coordinates for given move are out of bounds. row: ' + row + ', column: ' + column;
        }
        if (this.grid[row][column]) {
            throw 'Error: coordinates for given move are already marked. row: ' + row + ', column: ' + column + ', value: ' + this.grid[row][column];
        }
        this.grid[row][column] = (player === this.naughtsPlayer ? 'O' : 'X');
    }

    /**
     *  Implements a player of Tic-Tac-Toe games.
     */
    function User(nickname) {
        this.nickname = nickname;
        this.activeGameID = null;
        this.wins = 0;
        this.losses = 0;
    }
    User.prototype.isPlaying = function isPlaying() {
        return this.activeGameID !== null;
    };
    User.prototype.win = function win() {
        this.activeGameID = null;
        this.wins++;
    };
    User.prototype.lose = function lose() {
        this.activeGameID = null;
        this.losses++;
    };
    
    function addUser(username, address) {
        if (users[address]) {
            console.error('Address ' + address + ' already associated.');
            return null;
        }
        users[address] = username;
        saveUsers();
        return username;
    }
    
    function removeUser(username, address) {
        if (!users[address] || users[address] !== username) {
            console.error('Attempt to remove username to address association that does not exist. User: ' + username + ' Addr: ' + address);
            return;
        }
        delete users[address];
        saveUsers();
    }
    
    function getUser(address) {
        if (users[address]) {
            return users[address];
        }
        return null;
    }
    
    function saveUsers() {
        fs.writeFile('./users.json', JSON.stringify(users), function(error) {
            if (error) {
                console.error('I/O error: ', error);
            }
        });
    }
    
    function request_getCurrentUser(request, response) {
        var addr = request.connection.remoteAddress;
        var user = getUser(addr);
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({user: user}));
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
            var addr = request.connection.remoteAddress;
            if (addUser(info.username, addr)) {
                result = {
                    success: true,
                    username: info.username
                };
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
        var addr = request.connection.remoteAddress;
        var user = getUser(addr);
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify(users));
    }

    function request_getGrid(request, response) {
        var addr = request.connection.remoteAddress;
        var user = getUser(addr);
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({user: user}));
    }

    function request_issueChallenge(request, response) {
    	var body = '';
        request.on('data', function(data) {
            body += data;
        });
        request.on('end', function() {
            var targetAddr = JSON.parse(body);
            var addr = request.connection.remoteAddress;
		    var challenger = getUser(addr);
		    var target = getUser(targetAddr);
		    var challenge = new Challenge(challenger, target);
		    challenges.push(challenge);
		    response.setHeader('content-type', 'application/json');
		    response.end(JSON.stringify(challenge));
        });
    }

    function request_getChallenge(request, response) {
	    var addr = request.connection.remoteAddress;
	    var user = getUser(addr);
	    var myChallenge = null;
	    for (i in challenges) {
	    	var challenge = challenges[i];
	    	if (challenge.target === user) {
	    		myChallenge = challenge;
	    		break;
	    	}
	    }
	    response.setHeader('content-type', 'application/json');
	    response.end(JSON.stringify(myChallenge));
    }

    function request_acceptChallenge(request, response) {
    	var body = '';
        request.on('data', function(data) {
            body += data;
        });
        request.on('end', function() {
            var acceptedChallenge = JSON.parse(body);
		    var accepter = getUser(request.connection.remoteAddress);
		    var result = null;
		    for (i in challenges) {
		    	var challenge = challenges[i];
		    	if (challenge.id === acceptedChallenge.id) {
		    		if (challenge.target !== accepter) {
		    			console.error("Accepter " + accepter + " attempting to accept challenge for " + challenge.target);
		    			break;
		    		}
	    			result = challenges[i];
	    			delete challenges[i];
	    			break;
		    	}
		    }
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
			    game = new Game(naughtsPlayer, crossesPlayer);
	        	games.push(game);
	        }
        	response.setHeader('content-type', 'application/json');
		    response.end(JSON.stringify(game));
        });
    }

    function request_rejectChallenge(request, response) {
    	var body = '';
        request.on('data', function(data) {
            body += data;
        });
        request.on('end', function() {
            var rejectedChallenge = JSON.parse(body);
		    var rejecter = getUser(request.connection.remoteAddress);
		    var result = null;
		    for (i in challenges) {
		    	var challenge = challenges[i];
		    	if (challenge.id === rejectedChallenge.id) {
		    		if (challenge.target !== rejecter) {
		    			console.error("Rejecter " + rejecter + " attempting to reject challenge for " + challenge.target);
		    			break;
		    		}
	    			result = challenges[i];
	    			delete challenges[i];
	    			rejectedChallenges.push(result);
	    			break;
		    	}
		    }
        	response.setHeader('content-type', 'application/json');
		    response.end(JSON.stringify(result));
        });
    }
    
	var server = http.createServer(function (request, response) {
		var parsedUrl = url.parse(request.url);
		if (!parsedUrl.pathname) {
			response.setHeader('content-type', 'text/plain');
			response.end('Error: bad path');
			return;
		}
		
		//check for CGI call
		//if (request.method === 'POST') {
        var cgiResolver = {
            '/cgi/getCurrentUser': request_getCurrentUser,
            '/cgi/createNewUser': request_createNewUser,
            '/cgi/getUserList': request_getUserList,
            '/cgi/issueChallenge': request_issueChallenge,
            '/cgi/getChallenge': request_getChallenge,
            '/cgi/acceptChallenge': request_acceptChallenge,
            '/cgi/rejectChallenge': request_rejectChallenge
        };
        var cgiFunc = cgiResolver[parsedUrl.pathname];
        if (cgiFunc) {
            cgiFunc(request, response);
            return;
        }
			// else {
				// response.setHeader('content-type', 'text/plain');
				// response.end('Error: bad POST path');
				// return;
			// }
		// }
		
		//host files
        if (parsedUrl.pathname === '/') {
            parsedUrl.pathname = '/index.html';
        }
		fs.readFile(path.normalize('.' + parsedUrl.pathname), function (error, data) {
			if (error) {
				response.setHeader('content-type', 'text/plain');
				response.end('I/O Error: ' + error);
				return;
			}
			var ext = path.extname(parsedUrl.pathname);
			var contentType;
			if (ext === '.html') {
				contentType = 'text/html';
			} else if (ext === '.css') {
				contentType = 'text/css';
			} else if (ext === '.js') {
				contentType = 'application/javascript';
			} else if (ext === '.json') {
				contentType = 'application/json';
			} else {
				contentType = 'text/plain';
			}
			response.setHeader('content-type', contentType);
			response.end(data);
		});
	});
	server.listen(8989);
})();