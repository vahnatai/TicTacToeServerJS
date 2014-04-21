//(function() {
    var currentUser;
    var gameGrid;
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

    function getChallenge(successCallback) {
    	$.ajax({
			type: 'POST',
			url: './cgi/getChallenge',
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
            $mm.empty();
            for (key in users) {
                $mm.append($('<option>').val(key).text(users[key]));
            }
        }, console.error);
        getChallenge(function(challenge) {
			if (challenge) {
				if (confirm('User ' + challenge.challenger + ' has challenged you! Accept?')) {

				} else {
					
				}
			}
        });
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
        updateInterval = setInterval(populateMatchmaker, 200);
    }

    function showGame() {
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