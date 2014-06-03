//(function() {
    var currentUser;
    var currentGame;
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

    function getGames(successCallback) {
        $.ajax({
            type: 'POST',
            url: './cgi/getGames',
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
            currentUser = data.user;
            showTabs();
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
                            //myGames.push(newGame);
                            populateTabBar();
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
                    populateTabBar();
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

    function populateTabBar() {
        // refresh games list
        getGames(function (games) {
            myGames = {};
            games.forEach(function (game) {
                myGames[game.id] = game;
            });
        });

        var $tabBar = $('#tabBar');
        var selectedId = $tabBar.find('.tabControl.selected').attr('id');

        // clear all but matchmaker
        $tabBar.find('*').not('#matchmakerTabControl').remove();

        // populate tabs from games list
        for (id in myGames) {
            var game = myGames[id];
            var opponent;
            if (game.naughtsPlayer === currentUser.nickname) {
                opponent = game.crossesPlayer;
            } else {
                opponent = game.naughtsPlayer;
            }
            var $newTab = $('<div class="tabControl">').text(opponent).attr('id', 'tabControl-' + game.id);
            $tabBar.append($newTab);
        }
        //reselect once-selected id, or matchmaker if missing
        var $selected = $tabBar.find('#'+selectedId);
        if ($selected.length > 0) {
            $selected.addClass('selected');
        } else {
            $('#matchmakerTabControl').addClass('selected');
        }


        $('.tabControl').click(function (){
            showGameTab($(this).index());
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
        $('#playButton').unbind();
        $('#gameContainer').hide();
        clearInterval(updateInterval);
    }

    function showGameTab(i) {
        $('.gameTab').hide();
        $('.gameTab').eq(i).show();
        $('.tabControl').removeClass('selected')
        $('.tabControl').eq(i).addClass('selected')
    }

    function showTabs() {
        $('#signInContainer').hide();
        $('#submitNickButton').unbind();
        $('#newNickField').unbind();
        $('#usernameGreetSpan').text(currentUser.nickname);
        $('#playButton').click(issueChallenge);
        $('#gameTabsContainer').show();

        showGameTab(0);
        populateTabBar();
        populateMatchmaker();
        clearInterval(updateInterval);
        updateInterval = setInterval(function () {
            populateTabBar();
            populateMatchmaker();
        }, 3000);
    }

	$(document).ready(function() {
        // get user from session or create a new user
        getCurrentUser(function(user) {
            if (!user) {
                showSignIn();
            } else {
                currentUser = user;
                showTabs();
            }
        });
	});
//})();