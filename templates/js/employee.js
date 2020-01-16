require('./../css/general.css');
require('./../css/employee.css');
require('./../css/permission.css');
require('./../library/fontawesome/fontawesome.js');

//libraries
var $ = require('jquery');
require('./../js/general.js');

var storeItemTemplate = require('./../handlebars/store_item.hbs');
var createEmployeeTemplate = require('./../handlebars/employee/create.hbs');
var editEmployeeTemplate = require('./../handlebars/employee/edit.hbs');
var employeeTemplate = require('./../handlebars/employee/employee.hbs');

function sendRequest(url, data, request_type, success, error, exception) {
    $.ajax({
        headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
        url: globals.base_url + url,
        data: data,
        dataType: 'json',
        type: request_type,
        success: function (response) {
            success(response, exception);
        },
        error: function (response) {
            error(response, exception);
        }
    });
}

function popupHandler(e, popupData, template) {
    e.stopPropagation();
    var $overlay = $('#overlay');
    $overlay.empty();
    $overlay.addClass('active');
    if(template) {
        $overlay.append(template(popupData));
    }
}

function checkEmail(email) {
    return /\S+@\S+\.\S+/.test(email);
}

function errorCheck(username, password, email, firstName, lastName) {
    var errorList = [];

    // Check if username is greater than 2 characters or less than 16
    if(username.length <= 2 || username.length >= 16) {
        var $error = $('.error.username');
        $error.text('Must be between 3 to 15 characters.');
        $error.show();
        errorList.push($error);
    }

    // Check if password is 8 characters or more.
    if(password.length <= 7) {
        $error = $('.error.password');
        $error.text('Must be 8 characters or more.');
        $error.show();
        errorList.push($error);
    }

    if(!checkEmail(email)) {
        $error = $('.error.email');
        $error.text('Must be a valid email.');
        $error.show();
        errorList.push($error);
    }

    if(firstName.length == 0) {
        $error = $('.error.first-name');
        $error.text('Cannot be empty.');
        $error.show();
        errorList.push($error);
    }

    if(lastName.length == 0) {
        $error = $('.error.last-name');
        $error.text('Cannot be empty.');
        $error.show();
        errorList.push($error);
    }

    return errorList;
}

$(document).ready(function() {
    $('#employee-link').addClass('active');
    $('#store-container').append(storeItemTemplate({'stores': globals.stores}));

    var storeId = localStorage.getItem('clicked_store');

    if (storeId === null) {
        var $storeItem = $('.store')[0];
    } else {
        $storeItem = $('.store[data-id="' + storeId + '"]');
    }

    $storeItem.click();
});

// POPUP //
$(document).on('click', '.popup', function (e) {
    e.stopPropagation();
});

$(document).on('click', 'body, #cancel-submit, #exit-button', function () {
    $('#overlay').removeClass('active');
    globals.edit_mode = false;
});

$(document).on('keyup',function(e) {
    if (e.keyCode == 27) {
       $('#overlay').removeClass('active');
        globals.edit_mode = false;
    }
});

$(document).on('click', '.next-step', function () {
    var $popup = $('.popup');
    var $this = $(this);

    //SHOW NEXT STEP
    if($this.attr('data-step')) {
        var $nextStep = $('#' + $this.attr('data-step'));
        $nextStep.show();
    }

    $popup.animate({scrollLeft: $popup.width()}, "slow");
});

$(document).on('click', '.prev-step', function () {
    var $popup = $('.popup');
    var $this = $(this);

    var multiplier = 1;

    if($this.attr('data-multiplier')) {
        multiplier = Number($this.attr('data-multiplier'));
    }

    $popup.animate({scrollLeft: -$popup.width()*multiplier}, "slow", function() {
        if($this.attr('data-step')) {
            var $thisStep = $('#' + $this.attr('data-step'));
            $thisStep.hide();
        }
    })
});
// POPUP //

// STORE //
$(document).on('click', '.store:not(.active)', function () {
    var $this = $(this);
    var storeId = $this.attr('data-id');
    var $employeeWrapper = $('#employee-wrapper');

    $('#store-container').find('.active').removeClass('active');
    $this.addClass('active');
    localStorage.setItem("clicked_store", String(storeId));
    $employeeWrapper.empty();
    $employeeWrapper.append(employeeTemplate({'store': globals.stores[storeId]}));
});
// STORE //


// CREATE TRANSACTION //
$(document).on('click', '#create-employee-button', function (e) {
    //Get active store
    var storeId = $('.store.active').attr('data-id');
    var store = globals.stores[storeId];

    popupHandler(e, {}, createEmployeeTemplate);
});

$(document).on('click', '.user-next-step', function () {
    var $this = $(this);
    var type = $this.attr('data-type');
    var $popup = $('.popup');
    var $userCreateSubmit = $('#user-create-submit');

    $('#employee-title').text($this.find('h5').text());
    $('#employee-description').text($this.find('p').text());
    $userCreateSubmit.attr('data-id', $('.store.active').attr('data-id'));
    $userCreateSubmit.attr('data-type', $this.attr('data-type'));
    $('#create-step').show();
    $popup.animate({scrollLeft: $popup.width()}, "slow");
});

$(document).on('click', '#user-create-submit', function () {
    var $this = $(this);
    var $errors = $('.error');
    $errors.hide();

    var username = $('#username').val();
    var password = $('#password').val();
    var email = $('#email').val();
    var firstName = $('#first-name').val();
    var lastName = $('#last-name').val();
    var userType = $this.attr('data-type');
    var storeId = $this.attr('data-id');
    var errorList = errorCheck(username, password, email, firstName, lastName);

    if(errorList.length > 0) {
        return;
    }

    var postData = {
        'username': username,
        'email': email,
        'password': password,
        'first_name': firstName,
        'last_name': lastName,
        'type': userType,
        'store': storeId
    };

    $.ajax({
        headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
        url: globals.base_url + '/employee/register/',
        data: postData,
        dataType: 'json',
        type: "POST",
        success: function (response) {
            globals.stores[storeId] = response['store'];

            var $employeeWrapper = $('#employee-wrapper');
            $employeeWrapper.empty();
            $employeeWrapper.append(employeeTemplate({'store': globals.stores[storeId]}));

            $('#overlay').removeClass('active');
        },
        error: function (response) {
            console.log(JSON.stringify(response.responseJSON));

            var error = response.responseJSON['error_msg'];

            if (error == 'Username must be between 3 to 15 characters.') {
                var $error = $('.error.username');
                $error.text(error);
                $error.show();
            } else if(error == 'Username exists.') {
                $error = $('.error.username');
                $error.text('Username is not available.');
                $error.show();
            }

            if (error == 'Password must be 8 characters or more.') {
                $error = $('.error.password');
                $error.text(error);
                $error.show();

            } else if(error == 'Invalid password.') {
                $error = $('.error.password');
                $error.text('Password must contain letter and digit.');
                $error.show();
            }

            if(error == 'Invalid email.') {
                $error = $('.error.email');
                $error.text('Must be a valid email.');
                $error.show();
            } else if(error == 'Email exists.') {
                $error = $('.error.email');
                $error.text('Email is not available.');
                $error.show();
            }

            if(error == 'Must have a first name.') {
                $error = $('.error.first_name');
                $error.show();
            }

            if(error == 'Must have a last name.') {
                $error = $('.error.last_name');
                $error.show();
            }
        }
    });
});
// EMPLOYEE //

// EDIT/DELETE//
$(document).on('click', '.employee-edit-button', function (e) {
    //Get active store
    var storeId = $('.store.active').attr('data-id');
    //var store = globals.stores[storeId];

    var employeeId = $(this).attr('data-id');
    var employee = globals.stores[storeId]['employees'][employeeId];

    popupHandler(e, {'employee': employee, 'store_id': storeId}, editEmployeeTemplate);
});

$(document).on('click', '#delete-user-prompt', function () {
    $('#delete-overlay').addClass('active');
});

$(document).on('click', '#delete-overlay, .delete-cancel-button', function () {
    $('#delete-overlay').removeClass('active');
});

$(document).on('click', '#overlay-delete-wrapper', function (e) {
    e.stopPropagation();
});

$(document).on('click', '#user-edit-submit', function () {
    var $this = $(this);
    var $errors = $('.error');
    $errors.hide();

    var username = $('#username').val();
    var password = $('#password').val();
    var email = $('#email').val();
    var firstName = $('#first-name').val();
    var lastName = $('#last-name').val();
    var userType = $('#type').val();
    var storeId = $this.attr('data-store_id');
    var employeeId = $this.attr('data-id');
    var errorList = errorCheck(username, password, email, firstName, lastName);

    if(errorList.length > 0) {
        return;
    }

    var postData = {
        'username': username,
        'email': email,
        'password': password,
        'first_name': firstName,
        'last_name': lastName,
        'type': userType,
        'store': storeId,
        'employee': employeeId
    };

    $.ajax({
        headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
        url: globals.base_url + '/employee/edit/',
        data: postData,
        dataType: 'json',
        type: "POST",
        success: function (response) {
            globals.stores[storeId] = response['store'];

            var $employeeWrapper = $('#employee-wrapper');
            $employeeWrapper.empty();
            $employeeWrapper.append(employeeTemplate({'store': globals.stores[storeId]}));

            $('#overlay').removeClass('active');
        },
        error: function (response) {
            console.log(JSON.stringify(response.responseJSON));

            var error = response.responseJSON['error_msg'];

            if (error == 'Username must be between 3 to 15 characters.') {
                var $error = $('.error.username');
                $error.text(error);
                $error.show();
            } else if(error == 'Username exists.') {
                $error = $('.error.username');
                $error.text('Username is not available.');
                $error.show();
            }

            if (error == 'Password must be 8 characters or more.') {
                $error = $('.error.password');
                $error.text(error);
                $error.show();

            } else if(error == 'Invalid password.') {
                $error = $('.error.password');
                $error.text('Password must contain letter and digit.');
                $error.show();
            }

            if(error == 'Invalid email.') {
                $error = $('.error.email');
                $error.text('Must be a valid email.');
                $error.show();
            } else if(error == 'Email exists.') {
                $error = $('.error.email');
                $error.text('Email is not available.');
                $error.show();
            }

            if(error == 'Must have a first name.') {
                $error = $('.error.first_name');
                $error.show();
            }

            if(error == 'Must have a last name.') {
                $error = $('.error.last_name');
                $error.show();
            }
        }
    });
});

$(document).on('click', '#user-delete-submit', function (e) {
    var $this = $(this);
    var employeeId = $this.attr('data-id');
    var storeId = $this.attr('data-store_id');

    var postData = {
        'employee': employeeId,
        'store': storeId
    };

    function success(response) {
        globals.stores[storeId] = response['store'];

        var $employeeWrapper = $('#employee-wrapper');
        $employeeWrapper.empty();
        $employeeWrapper.append(employeeTemplate({'store': globals.stores[storeId]}));

        $('#overlay').removeClass('active');
    }

    function error(response) {
        alert('Permission Error');
    }

    sendRequest('/employee/delete/', postData, 'POST', success, error)
});
// EDIT/DELETE //



