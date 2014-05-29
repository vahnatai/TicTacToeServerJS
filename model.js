define(function () {

    var model = {};

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
    model.User = User;


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
    model.Game = Game;


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
    model.Challenge = Challenge;


    return model;
});