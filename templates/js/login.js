require('./../css/general.css');
require('./../css/login.css');
var $ = require('jquery');

function init() {
    $('#username').focus();
    $('#home-header').show();
    $('.inner-wrapper').show();
}

$(document).ready(function() {

    init();

    $(document).on('keyup', '#username', function (e) {
        if (e.keyCode == 13) {
            $('#password').select();
        }
    });

    $(document).on('keyup', '#password', function (e) {
        if (e.keyCode == 13) {
            $('#login').click();
        }
    });

    $(document).on('click', '#login', function () {
        var $submit = $(this);
        var $loginContainer = $submit.closest('#login-container');

        var postData = {
            'username': $loginContainer.find('#username').val(),
            'password': $loginContainer.find('#password').val()
        };

        $.ajax({
            headers: {"X-CSRFToken": $submit.siblings('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/account/login/',
            data: postData,
            dataType: 'json',
            type: "POST",
            success: function (response) {
                if (response['success']) {
                    window.location.replace(globals.base_url + '/inventory');
                }
            },
            error: function (response) {
                $('.error').show();
            }
        });
    });
});