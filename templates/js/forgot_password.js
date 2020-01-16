require('./../css/general.css');
require('./../css/forgot_password.css');
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
            $('#submit').click();
        }
    });

    $(document).on('click', '#submit', function () {
        var $submit = $(this);
        var $forgotPasswordContainer = $submit.closest('#forgot-password-wrapper');

        var postData = {
            'username': $forgotPasswordContainer.find('#username').val(),
            'base_url': globals.base_url
        };

        $.ajax({
            headers: {"X-CSRFToken": $submit.siblings('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/account/reset_password/',
            data: postData,
            dataType: 'json',
            type: "POST",
            success: function (response) {
                if (response['success']) {
                    $forgotPasswordContainer.find('#forgot-password-container').hide();
                    $forgotPasswordContainer.find('#email-sent').show();
                }
            },
            error: function (response) {
                $('.error').show();
            }
        });
    });

    $(document).on('click', '#change-password', function () {
        var $submit = $(this);
        var $forgotPasswordContainer = $submit.closest('#forgot-password-wrapper');
        var password1 = $forgotPasswordContainer.find('#password-1').val();
        var password2 = $forgotPasswordContainer.find('#password-2').val();
        var $error = $('.error');

        if(password1 != password2) {
            $error.text('Passwords do not match.');
            $error.show();
            return;
        }

        var code = (new URL(window.location.href)).searchParams.get("code");

        var postData = {
            'password1': $forgotPasswordContainer.find('#password-1').val(),
            'password2': $forgotPasswordContainer.find('#password-2').val(),
            'code': code
        };

        $.ajax({
            headers: {"X-CSRFToken": $submit.siblings('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/account/change_password/',
            data: postData,
            dataType: 'json',
            type: "POST",
            success: function (response) {
                if (response['success']) {
                    $forgotPasswordContainer.find('#forgot-password-container').hide();
                    $forgotPasswordContainer.find('#success').show();
                }
            },
            error: function (response) {
                $error.text(response.responseJSON['error_msg']);
                $('.error').show();
            }
        });
    });
});