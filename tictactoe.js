define(function () {

    /**
     *  Make one class extend another.
     *
     *  @param base {function} Base class constructor.
     *  @param sub {function} Sub-class constructor.
     */
    function extend(base, sub, properties) {
        sub.prototype = Object.create(base.prototype);
        sub.prototype.constructor = sub;
        Object.defineProperty(sub.prototype, 'constructor', { 
            enumerable: false, 
            value: sub 
        });
        if (typeof properties !== 'undefined' && properties) {
            for (propName in properties) {
                sub.prototype[propName] = properties[propName];
                Object.defineProperty(sub.prototype, propName, { 
                    enumerable: true, 
                    value: properties[propName]
                });
            }
        }
        sub.prototype._super = base;
    }

    /**
     *  @namespace tictactoe
     */
    var tictactoe = {};
    tictactoe.model = {};

    /**
     *  Implements a player of Tic-Tac-Toe games.
     */
    function User(nickname) {
        //TODO constraints on value of nickname(must be string, etc) 
        this.nickname = nickname;
        this.activeGameIDs = [];
        this.wins = 0;
        this.losses = 0;
    }
    User.prototype.isPlaying = function isPlaying() {
        return Boolean(this.activeGameIDs.length);
    };
    User.prototype.win = function win(gameID) {
        var index = this.activeGameIDs.indexOf(gameID);
        if (index < 0) {
            console.error('Player ' + this.nickname + ' cannot win a game they are not playing in! GameID: ' + gameID);
            return;
        }
        this.activeGameIDs = null;
        this.wins++;
    };
    User.prototype.lose = function lose(gameID) {
        var index = this.activeGameIDs.indexOf(gameID);
        if (index < 0) {
            console.error('Player ' + this.nickname + ' cannot lose a game they are not playing in! GameID: ' + gameID);
            return;
        }
        this.activeGameID = null;
        this.losses++;
    };
    User.prototype.toJSON = function toJSON() {
        this.className = this.constructor.name;
        return this;
    };
    User.jsonReviver = function (key, value) {
        if (!value.hasOwnProperty('className') || value['className'] !== 'User') {
            console.error('Tried to revive User from non-User JSON string.');
            return null;
        }
        var user = new User(null);
        for (attr in value) {
            if (attr !== 'className') {
                user[attr] = value[attr];
            }
        }
        return user;
    };
    User.parseJSON = function parseJSON(jsonString) {
        var user = JSON.parse(jsonString, User.jsonReviver);
    };
    tictactoe.model.User = User;


    /**
     *  Implements a Game with a naughts player and a crosses player.
     */
    var lastGameId = -1;
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
        this.id = ++lastGameId;
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
    Game.prototype.hasPlayer = function hasPlayer(username) {
        return (this.naughtsPlayer === username || this.crossesPlayer === username);
    };
    Game.prototype.toJSON = function toJSON() {
        this.className = this.constructor.name;
        return this;
    };
    Game.jsonReviver = function (key, value) {
        if (!value.hasOwnProperty('className') || value['className'] !== 'Game') {
            console.error('Tried to revive Game from non-Game JSON string.');
            return null;
        }
        var game = new Game(null, null);
        for (attr in value) {
            if (attr !== 'className') {
                game[attr] = value[attr];
            }
        }
        return game;
    };
    Game.parseJSON = function parseJSON(jsonString) {
        var user = JSON.parse(jsonString, Game.jsonReviver);
    };
    tictactoe.model.Game = Game;


    /**
     *  Implements a challenge from one user to another. If accepted, a game is created.
     */
    var lastChallengeId = 0;
    function Challenge(challenger, target) {
        this.id = lastChallengeId++;
        this.challenger = challenger;
        this.target = target;
        this.time = new Date().getTime();
    }
    tictactoe.model.Challenge = Challenge;


    return tictactoe;
});