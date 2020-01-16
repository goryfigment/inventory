var $ = require('jquery');

$(document).ready(function() {
    $(document).on({
        mouseenter: function () {
            var $element = $(this);
            var $tipPopup = $('#tip-popup');
            var $tipPopupArrow = $tipPopup.find('#tip-arrow');

            //Change the description of the tippy popup
            $tipPopup.find('#tip-content').html($element.attr('data-title'));

            var elementPosition = $element.offset();
            var tipPopupHalvedWidth = $tipPopup.outerWidth()/2;

            var tipPopupLeftPos = ($element.outerWidth()/2 + elementPosition['left']) - tipPopupHalvedWidth;

            $tipPopupArrow.css({left: tipPopupHalvedWidth - $tipPopupArrow.outerWidth(true)/2});

            //move first before animating
            $tipPopup.finish().css({top: elementPosition['top'], left: tipPopupLeftPos, 'transition-duration': '0ms'});

            //then animate sliding up
            $tipPopup.css({
                display: 'block',
                'transition-duration': '350ms',
                transform: 'translate3d(0,' + -($tipPopup.outerHeight() + 13) + 'px, 0)',
                opacity: 1
            });
        },
        mouseleave: function () {
            var $tipPopup = $('#tip-popup');
            var tipPopupCssTop = parseInt($tipPopup.css('top')) - ($tipPopup.outerHeight() + 13);
            $tipPopup.css({transform: '', 'transition-duration': '', top: tipPopupCssTop});
            $tipPopup.animate({
                opacity: 0,
                top: tipPopupCssTop + 13 + 'px'
            }, 350, function() {
                $tipPopup.css({opacity: 0, top: '', left: '', display: 'none'});
            });
        }
    }, '.tippy');
});