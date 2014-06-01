//(function() {
    var currentUser;
    var myGames = [];
    var updateInterval;
    
	/**
	 *	Via AJAX, get the current user for this address, if exists.
	 */
	function getCurrentUser(callback) {
		$.post('./cgi/getCurrentUser', function(data) {
			callback(data.user);
		}, 'json');
	}
    
    /**
     *  Via AJAX, attempt to create a new user associated with this address.
     */
    function createNewUser(username, successCallback, errorCallback) {
        var sendData = {username: username};
        $.ajax({
            type: 'POST',
            url: './cgi/createNewUser',
            dataType: 'json',
            data: JSON.stringify(sendData),
            success: successCallback,
            error: errorCallback
        });
    }

    /**
     *  Via AJAX, get a list of currently active usernames.
     */
    function getUserList(successCallback, errorCallback) {
        $.ajax({
            type: 'POST',
            url: './cgi/getUserList',
            success: successCallback,
            error: errorCallback
        });
    }

    function issueChallenge() {
    	var selectedPartner = $('#matchmakerSelect').val();
    	if (selectedPartner) {
    		$.ajax({
    			type: 'POST',
    			url: './cgi/issueChallenge',
    			dataType: 'json',
    			data: JSON.stringify(selectedPartner),
    			success: function (data) {
    				console.log(data)
    			},
    			error: console.error
    		});
    	}
    }

    function getChallenges(successCallback) {
        $.ajax({
            type: 'POST',
            url: './cgi/getChallenges',
            success: successCallback,
            error: console.error
        });
    }

    function acceptChallenge(challenge, successCallback) {
        $.ajax({
            type: 'POST',
            url: './cgi/acceptChallenge',
            dataType: 'json',
            data: JSON.stringify(challenge),
            success: successCallback,
            error: console.error
        });
    }

    function rejectChallenge(challenge, successCallback) {
        $.ajax({
            type: 'POST',
            url: './cgi/rejectChallenge',
            dataType: 'json',
            data: JSON.stringify(challenge),
            success: successCallback,
            error: console.error
        });
    }

    function submitNickname() {
        if (currentUser) {
            throw 'Current user already defined.';
            return;
        }
        var desiredName = $('#newNickField').val();
        if (!desiredName) {
            $('#newNickField').focus();
            throw 'Error: empty nickname.';
            return;
        }
        createNewUser(desiredName, function success(data) {
            currentUser = data.username;
            showMatchmaker();
        }, function fail(request, status, error) {
            throw error;
        });
    }

    function populateMatchmaker() {
        getUserList(function success(users) {
            var $mm = $('#matchmakerSelect');
            var oldVal = $mm.val();
            $mm.empty();
            for (key in users) {
                $mm.append($('<option>').val(users[key]).text(users[key]));
            }
            if (oldVal) {
                $mm.val(oldVal);
            }
        }, console.error);

        //check for pending challenges against you
        getChallenges(function(challenges) {
            challenges.pending.forEach(function (challenge) {
                if (challenge) {
                    if (confirm('User ' + challenge.challenger + ' has challenged you! Accept?')) {
                        acceptChallenge(challenge, function(newGame) {
                            if (!newGame) {
                                //failure
                            }
                            myGames.push(newGame);
                            populateTabBar(myGames);
                            showGame();
                        });
                    } else {
                        rejectChallenge(challenge, function(rejectedChallenge) {
                            if (!rejectedChallenge) {
                                //failure
                            }
                        });
                    }
                }
            });

            //check for accepted challenges you've made
            challenges.accepted.forEach(function (challenge) {
                if (challenge) {
                    alert('User ' + challenge.target + ' has accepted your challenge!');
                    // TODO update games list
                    populateTabBar(myGames);
                    showGame();
                }
            });

            //check for rejected challenges you've made
            challenges.rejected.forEach(function (challenge) {
                if (challenge) {
                    alert('User ' + challenge.target + ' has rejected your challenge!');
                }
            });
        });

        
    }

    function populateTabBar(games) {
        var $tabBar = $('#tabBar');
        $tabBar.empty();
        games.forEach(function (game) {
            var opponent;
            if (game.naughtsPlayer === currentUser) {
                opponent = game.crossesPlayer;
            } else {
                opponent = game.naughtsPlayer;
            }
            var $newTab = $('<div class="tabControl">').text(opponent).attr('id', 'tabControl-' + game.id);
            $newTab.click(function(){alert(this.id.split('-')[1])});
            $tabBar.append($newTab);
        });
    }

    function renderGame(game, $container) {
        $container.empty();
        for (row in game.grid) {
            var $row = $('<div class="gameRow">');
            for (col in game.grid[0]) {
                var $cell = $('<div class="gameCell">').text(game.grid[row][col] || '_');
                $row.append($cell);
            }
            $container.append($row);
        }
    }

    function showSignIn() {
        $('#signInContainer').show();
        $('#submitNickButton').click(submitNickname);
        $('#newNickField').keypress(function (event) {
            if (event.which == 13) {
                submitNickname();
                return false;
            }
        });
        $('#newNickField').focus();
        $('#matchmakerContainer').hide();
        $('#playButton').unbind();
        $('#gameContainer').hide();
        clearInterval(updateInterval);
    }

    function showMatchmaker() {
        $('#signInContainer').hide();
        $('#submitNickButton').unbind();
        $('#newNickField').unbind();
        $('#usernameGreetSpan').text(currentUser);
        $('#matchmakerContainer').show();
        $('#playButton').click(issueChallenge);
        $('#gameContainer').hide();

        populateMatchmaker();
        clearInterval(updateInterval);
        updateInterval = setInterval(populateMatchmaker, 2000);
    }

    function showGame(tabNumber) {
        $('#signInContainer').hide();
        $('#submitNickButton').unbind();
        $('#newNickField').unbind();
        $('#matchmakerContainer').hide();
        $('#playButton').unbind();
        $('#gameContainer').show();
        clearInterval(updateInterval);
    }

	$(document).ready(function() {
        // get an old username by IP or create a new username 
        getCurrentUser(function(username) {
            if (!username) {
                showSignIn();
            } else {
                currentUser = username;
                showMatchmaker();
            }
        });
	});
//})();