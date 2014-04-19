//(function() {
    var currentUser;
    var gameGrid;
    
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
    function createNewUser(username, successCallback, failCallback) {
        var sendData = {username: username};
        $.ajax({
            type: 'POST',
            url: './cgi/createNewUser',
            dataType: 'json',
            data: JSON.stringify(sendData),
            success: successCallback,
            error: failCallback
        });
    }
	
    // get an old username by IP or create a new username 
    getCurrentUser(function(username) {
        if (!username) {
        	$('#signInContainer').show();
        } else {
        	currentUser = username;
            $('#matchmakerContainer').show();
        }
    });
    
    
	$(document).ready(function() {
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
                $('#signInContainer').hide();
                $('#matchmakerContainer').show();
            }, function fail(request, status, error) {
                throw error;
            });
        }
		$('#submitNickButton').click(submitNickname);
        $('#newNickField').keypress(function (e) {
            if (e.which == 13) {
                submitNickname();
                return false;
            }
        });
        //XXX stuff
	});
//})();