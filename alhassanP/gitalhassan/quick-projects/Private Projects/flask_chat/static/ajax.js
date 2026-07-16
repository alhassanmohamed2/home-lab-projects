$(document).ready(function() {
    // Initialize SocketIO
    var socket = io();

    socket.on('connect', function() {
        console.log('Connected to WebSocket');
        chat_update(); // Initial load
    });

    socket.on('new_message', function(data) {
        chat_update();
    });

    socket.on('delete_message', function(data) {
        chat_update();
    });

    socket.on('edit_message', function(data) {
        chat_update();
    });

    $(document).on('click', '.send', function() {
        var chat_message = $.trim($('.msg').val());
        var username = $.trim($('.username').val()) || 'Anonymous';
        if (!chat_message || !username) {
            alert('Please enter a username and message');
            return;
        }
        $.ajax({
            url: "/send",
            method: "POST",
            data: {
                msg: chat_message,
                username: username
            },
            success: function(data) {
                $('.msg').val('');
            },
            error: function(xhr) {
                alert('Error sending message: ' + xhr.responseJSON.message);
            }
        });
    });

    $(document).on('click', '.delete', function() {
        var msg_id = $(this).data('msg-id');
        $.ajax({
            url: "/delete/" + msg_id,
            method: "POST",
            success: function(data) {
                console.log('Message deleted');
            },
            error: function(xhr) {
                alert('Error deleting message: ' + xhr.responseJSON.message);
            }
        });
    });

    $(document).on('click', '.edit', function() {
        var msg_id = $(this).data('msg-id');
        var new_message = prompt('Edit message:', $(this).data('msg-text'));
        var username = $.trim($('.username').val()) || 'Anonymous';
        if (new_message) {
            $.ajax({
                url: "/edit/" + msg_id,
                method: "POST",
                data: {
                    msg: new_message,
                    username: username
                },
                success: function(data) {
                    console.log('Message edited');
                },
                error: function(xhr) {
                    alert('Error editing message: ' + xhr.responseJSON.message);
                }
            });
        }
    });

    function chat_update() {
        $.ajax({
            url: "/chat_update",
            method: "POST",
            success: function(data) {
                $('.chat').html(data);
            },
            error: function(xhr) {
                console.error('Error updating chat:', xhr.responseJSON.message);
            }
        });
    }
});

// Prevent form resubmission
if (window.history.replaceState) {
    window.history.replaceState(null, null, window.location.href);
}