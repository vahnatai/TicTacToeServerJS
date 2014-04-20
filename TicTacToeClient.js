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
        getUserList(function success(userList) {
            var $mm = $('#matchmakerSelect');
            $mm.empty();
            userList.forEach(function(elem) {
                $mm.append($('<option>').val(elem).text(elem));
            });
        }, console.error);
    }

    function showSignIn() {
        $('#signInContainer').show();
        $('#submitNickButton').click(submitNickname);
        $('#newNickField').keypress(function (e) {
            if (e.which == 13) {
                submitNickname();
                return false;
            }
        });
        $('#matchmakerContainer').hide();
        $('#gameContainer').hide();
        clearInterval(updateInterval);
    }

    function showMatchmaker() {
        $('#signInContainer').hide();
        $('#submitNickButton').unbind();
        $('#newNickField').unbind();
        $('#usernameGreetSpan').text(currentUser);
        $('#matchmakerContainer').show();
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