var $ = require('jquery');
require('./../library/tippy/tippy.js');

$(document).on('click', '#account-link', function () {
    $(this).closest('#nav-wrapper').toggleClass('account-active');
});

$(document).on('click', '#logout-link', function () {
    window.location.replace(globals.base_url + '/logout');
});