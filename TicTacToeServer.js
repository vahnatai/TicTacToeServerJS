(function() {
	var http = require('http');
	var path = require('path');
	var url = require('url');
	var fs = require('fs');
	var querystring = require('querystring');
	
    var users = {}; // {ip: user}
    var games = [];

    /**
     *  Implements a Game with a naughts player and a crosses player.
     */
    function Game(naughtsPlayer, crossesPlayer) {
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

    function createNewGame(naughtsPlayer, crossesPlayer) {
        if (!naughtsPlayer) {
            throw 'Cannot create game: naughts(oes) player is not specified.';
        }
        if (!crossesPlayer) {
            throw 'Cannot create game: crosses(exes) player is not specified.';
        }
        if (naughtsPlayer.isPlaying() && crossesPlayer.isPlaying()) {
            throw 'Cannot create game: both of the specified players are already playing other games.';
        } else if (naughtsPlayer.isPlaying()) {
            throw 'Cannot create game: specified naughts(oes) player "' + naughtsPlayer.nickname + '" is already playing another game.';
        } else if (crossesPlayer.isPlaying()) {
            throw 'Cannot create game: specified crosses(exes) player "' + crossesPlayer.nickname + '" is already playing another game.';
        }
        var game = new Game(naughtsPlayer, crossesPlayer);
        games.push(game);
    }
    
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

    function request_getGrid(request, response) {
        var addr = request.connection.remoteAddress;
        var user = getUser(addr);
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({user: user}));
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
        if (parsedUrl.pathname === '/cgi/getCurrentUser') {
            request_getCurrentUser(request, response);
            return;
        } else if (parsedUrl.pathname === '/cgi/createNewUser') {
            request_createNewUser(request, response);
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