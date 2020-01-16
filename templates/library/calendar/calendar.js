//css
require('./../../library/calendar/calendar.css');

//jquery
var $ = require('jquery');

//handlebars
var calendarTemplate = require('./../../handlebars/calendar/double_calendar.hbs');

// these are human-readable month name labels, in order
var calMonthsLabels = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// these are the days of the week for each month, in order
var calDaysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function createDoubleCalendars(subtractMonth) {
    ////CURRENT MONTH////
    //Get current year, month, and date
    var calCurrentDate = new Date();
    calCurrentDate.setUTCMonth(calCurrentDate.getUTCMonth() - subtractMonth);
    var calCurrentMonth = calCurrentDate.getMonth();
    var calCurrentYear = calCurrentDate.getFullYear();

    //Get starting day of the month
    var firstDay = new Date(calCurrentYear, calCurrentMonth, 1);
    var startingDay = firstDay.getDay();

    //Get the length of the month
    var monthLength = calDaysPerMonth[calCurrentMonth];

    if (calCurrentMonth == 1) { // February only!
        if ((calCurrentYear % 4 == 0 && calCurrentYear % 100 != 0) || calCurrentYear % 400 == 0){
            monthLength = 29;
        }
    }
    ////CURRENT MONTH////

    ////PREVIOUS MONTH////
    //Get previous year, month, and date
    var calPreviousDate = new Date();
    calPreviousDate.setMonth(calPreviousDate.getMonth() - subtractMonth - 1);
    var calPreviousMonth = calPreviousDate.getMonth();
    var calPreviousYear = calPreviousDate.getFullYear();

    //Get starting day of the month
    var previousFirstDay = new Date(calPreviousYear, calPreviousMonth, 1);
    var previousStartingDay = previousFirstDay.getDay();

    //Get the length of the month
    var previousMonthLength = calDaysPerMonth[calPreviousMonth];

    if (calPreviousMonth == 1) { // February only!
        if ((calPreviousYear % 4 == 0 && calPreviousYear % 100 != 0) || calPreviousYear % 400 == 0){
            monthLength = 29;
        }
    }
    ////PREVIOUS MONTH////

    var calendarData = {
        'current': {
            'starting_day': startingDay,
            'month_length': monthLength,
            'month': calMonthsLabels[calCurrentMonth],
            'month_number': calCurrentMonth + 1,
            'year': calCurrentYear,
            'subtract': subtractMonth
        },
        'previous': {
            'starting_day': previousStartingDay,
            'month_length': previousMonthLength,
            'month': calMonthsLabels[calPreviousMonth],
            'month_number': calPreviousMonth + 1,
            'year': calPreviousYear,
            'subtract': subtractMonth + 1
        }
    };

    if(subtractMonth == 0) {
        calendarData['current_day'] = calCurrentDate.getDate();
    }

    var $calendarContainer = $('#calendar-container');
    $calendarContainer.empty();
    $calendarContainer.append(calendarTemplate(calendarData));
}

function inBetween($allElements, $firstElement, $secondElement, addFirst, addSecond) {
    //Returns the subarray of the array
    var firstElementIndex = addFirst ? $allElements.index($firstElement) : $allElements.index($firstElement) + 1;
    var secondElementIndex = addSecond ? $allElements.index($secondElement) + 1 : $allElements.index($secondElement);

    if(firstElementIndex < secondElementIndex) {
        return $allElements.slice(firstElementIndex, secondElementIndex);
    } else {
        if(!addFirst && addSecond) {
            return $allElements.slice(secondElementIndex - 1, firstElementIndex - 1);
        } else if (addFirst && !addSecond) {
            return $allElements.slice(secondElementIndex + 1, firstElementIndex + 1);
        } else {
            return $allElements.slice(secondElementIndex, firstElementIndex);
        }
    }
}

function checkDates() {
    var $calendarContainer = $('#calendar-container');
    var $calendarInputWrapper = $calendarContainer.siblings('#calendar-input-wrapper');
    var firstStringDate = $calendarInputWrapper.attr('data-first-selected-date');
    var lastStringDate = $calendarInputWrapper.attr('data-last-selected-date');
    var firstDate = new Date(firstStringDate);
    var lastDate = new Date(lastStringDate);

    //Get min date
    var $leftCalendar = $calendarContainer.find('#left-calendar');
    var $allLeftDates = $leftCalendar.find('td:not(.nonSelectable)');
    var leftYear = $leftCalendar.find('.year').text();
    var leftMonth = $leftCalendar.find('.month').attr('data-month');
    var leftFirstDay = $allLeftDates.first().text();
    var leftLastDay = $allLeftDates.last().text();
    var minLeftDate = new Date(leftMonth + '/' + leftFirstDay + '/' + leftYear + ' 00:00:00').valueOf();
    var maxLeftDate = new Date(leftMonth + '/' + leftLastDay + '/' + leftYear + ' 23:59:59').valueOf();

    //Get max date
    var $rightCalendar = $calendarContainer.find('#right-calendar');
    var $allRightDates = $rightCalendar.find('td:not(.nonSelectable)');
    var rightYear = $rightCalendar.find('.year').text();
    var rightMonth = $rightCalendar.find('.month').attr('data-month');
    var rightFirstDay = $allRightDates.first().text();
    var rightLastDay = $allRightDates.last().text();
    var minRightDate = new Date(rightMonth + '/' + rightFirstDay + '/' + rightYear + ' 00:00:00').valueOf();
    var maxRightDate = new Date(rightMonth + '/' + rightLastDay + '/' + rightYear + ' 23:59:59').valueOf();

    var firstEpoch = firstDate.valueOf();
    var lastEpoch = lastDate.valueOf();

    var firstExistInLeftCalendar = firstEpoch >= minLeftDate && firstEpoch <= maxLeftDate;
    var lastExistInLeftCalendar = lastEpoch >= minLeftDate && lastEpoch <= maxLeftDate;
    var firstExistInRightCalendar = firstEpoch >= minRightDate && firstEpoch <= maxRightDate;
    var lastExistInRightCalendar = lastEpoch >= minRightDate && lastEpoch <= maxRightDate;

    var $elements = 0;

    if((typeof firstStringDate != 'undefined' && firstStringDate != '') && (typeof lastStringDate != 'undefined' && lastStringDate != '')) {
        var firstExistInBothCalendars = firstEpoch >= minLeftDate && firstEpoch <= maxRightDate;
        var lastExistInBothCalendars = lastEpoch >= minLeftDate && lastEpoch <= maxRightDate;

        //Check if first and last date exist within both calendar
        if(firstExistInBothCalendars && lastExistInBothCalendars) {
            //Check if first and last date exist within the same month
            if(firstExistInLeftCalendar && lastExistInLeftCalendar) {
                var $firstSelectedDate = $allLeftDates.eq(firstDate.getDate() - 1);
                var $lastSelectedDate = $allLeftDates.eq(lastDate.getDate() - 1);
                $elements = inBetween($allLeftDates, $firstSelectedDate, $lastSelectedDate, false, false);
            } else if(firstExistInRightCalendar && lastExistInRightCalendar) {
                $firstSelectedDate = $allRightDates.eq(firstDate.getDate() - 1);
                $lastSelectedDate = $allRightDates.eq(lastDate.getDate() - 1);
                $elements = inBetween($allRightDates, $firstSelectedDate, $lastSelectedDate, false, false);
            } else if(firstExistInLeftCalendar && lastExistInRightCalendar) {
                $firstSelectedDate = $allLeftDates.eq(firstDate.getDate() - 1);
                $lastSelectedDate = $allRightDates.eq(lastDate.getDate() - 1);
                var $leftElements = inBetween($allLeftDates, $firstSelectedDate, $allLeftDates.last(), false, true);
                var $rightElements = inBetween($allRightDates, $allRightDates.first(), $lastSelectedDate, true, false);
                $elements = $.merge($leftElements, $rightElements);
            } else {
                $firstSelectedDate = $allRightDates.eq(firstDate.getDate() - 1);
                $lastSelectedDate = $allLeftDates.eq(lastDate.getDate() - 1);
                $leftElements = inBetween($allLeftDates, $lastSelectedDate, $allLeftDates.last(), false, true);
                $rightElements = inBetween($allRightDates, $allRightDates.first(), $firstSelectedDate, true, false);

                $elements = $.merge($leftElements, $rightElements);
            }

            $firstSelectedDate.addClass('first-selected-date');
            $lastSelectedDate.addClass('last-selected-date');

        //Check if at least one date exist in left calendar
        } else if(firstExistInBothCalendars || lastExistInBothCalendars) {
            var firstDateIsGreaterThanMaxRightDate = firstEpoch > maxRightDate;
            var lastDateIsGreaterThanMaxRightDate = lastEpoch > maxRightDate;

            var firstDateIsLessThanMinLeftDate = firstEpoch < minLeftDate;
            var lastDateIsLessThanMinLeftDate = firstEpoch > minLeftDate;

            if((firstExistInLeftCalendar && lastDateIsGreaterThanMaxRightDate) || (lastExistInLeftCalendar && firstDateIsGreaterThanMaxRightDate)) {
                if(firstExistInLeftCalendar && lastDateIsGreaterThanMaxRightDate) {
                    $firstSelectedDate = $allLeftDates.eq(firstDate.getDate() - 1);
                } else {
                    $firstSelectedDate = $allLeftDates.eq(lastDate.getDate() - 1);
                }

                $leftElements = inBetween($allLeftDates, $firstSelectedDate, $allLeftDates.last(), false, true);
                $rightElements = inBetween($allRightDates, $allRightDates.first(), $allRightDates.last(), true, true);
                $elements = $.merge($leftElements, $rightElements);

                $firstSelectedDate.addClass('first-selected-date');
            } else if((firstExistInRightCalendar && lastDateIsGreaterThanMaxRightDate) || (lastExistInRightCalendar && firstDateIsGreaterThanMaxRightDate)) {
                if(firstExistInRightCalendar && lastDateIsGreaterThanMaxRightDate) {
                    $firstSelectedDate = $allRightDates.eq(firstDate.getDate() - 1);
                } else {
                    $firstSelectedDate = $allRightDates.eq(lastDate.getDate() - 1);
                }

                $elements = inBetween($allRightDates, $firstSelectedDate, $allRightDates.last(), false, true);
                $firstSelectedDate.addClass('first-selected-date');
            } else if((firstExistInLeftCalendar && lastDateIsLessThanMinLeftDate) || (lastExistInLeftCalendar && firstDateIsLessThanMinLeftDate)) {
                if(firstExistInLeftCalendar && lastDateIsLessThanMinLeftDate) {
                    $firstSelectedDate = $allLeftDates.eq(firstDate.getDate() - 1);
                } else {
                    $firstSelectedDate = $allLeftDates.eq(lastDate.getDate() - 1);
                }

                $elements = inBetween($allLeftDates, $allLeftDates.first(), $firstSelectedDate, true, false);
                $firstSelectedDate.addClass('first-selected-date');
            } else if((firstExistInRightCalendar && lastDateIsLessThanMinLeftDate)  || (lastExistInRightCalendar && firstDateIsLessThanMinLeftDate)) {
                if(firstExistInRightCalendar && lastDateIsLessThanMinLeftDate) {
                    $firstSelectedDate = $allRightDates.eq(firstDate.getDate() - 1);
                } else {
                    $firstSelectedDate = $allRightDates.eq(lastDate.getDate() - 1);
                }

                $leftElements = inBetween($allLeftDates, $allLeftDates.first(), $allLeftDates.last(), true, true);
                $rightElements = inBetween($allRightDates, $allRightDates.first(), $firstSelectedDate, true, false);
                $elements = $.merge($leftElements, $rightElements);
                $firstSelectedDate.addClass('first-selected-date');
            }
        } else if((firstEpoch < minLeftDate && lastEpoch > maxRightDate) || (lastEpoch < minLeftDate && firstEpoch > maxRightDate)) {
            $elements = $.merge($allLeftDates, $allRightDates);
        }

        if($elements.length) {
            $elements.each(function() {
                $(this).addClass('in-between');
            });
        }

    //Check if a since date exist
    } else if((typeof firstStringDate != 'undefined' && firstStringDate != '') && firstExistInLeftCalendar) {
        $allLeftDates.eq(firstDate.getDate() - 1).addClass('first-selected-date');
    } else if((typeof firstStringDate != 'undefined' && firstStringDate != '') && firstExistInRightCalendar) {
        $allRightDates.eq(firstDate.getDate() - 1).addClass('first-selected-date');
    } else if((typeof lastStringDate != 'undefined' && lastStringDate != '') && lastExistInLeftCalendar) {
        $allLeftDates.eq(lastDate.getDate() - 1).addClass('last-selected-date');
    } else if((typeof lastStringDate != 'undefined' && lastStringDate != '') && lastExistInRightCalendar) {
        $allRightDates.eq(lastDate.getDate() - 1).addClass('last-selected-date');
    }
}

function fillDateInputs($calendarContainer, firstStringDate, lastStringDate) {
    var $calendarInputWrapper = $calendarContainer.siblings('#calendar-input-wrapper');
    var $leftInputContainer = $calendarInputWrapper.find('#left-input-container');
    var $rightInputContainer = $calendarInputWrapper.find('#right-input-container');

    var firstDate = new Date(firstStringDate);
    var lastDate = new Date(lastStringDate);

    if(firstDate.valueOf() < lastDate.valueOf()) {
        $leftInputContainer.find('.month-input').val(addZeroFillers(firstDate.getMonth() + 1));
        $leftInputContainer.find('.day-input').val(addZeroFillers(firstDate.getDate()));
        $leftInputContainer.find('.year-input').val(firstDate.getFullYear());
        $leftInputContainer.find('.hour-input').val('12');
        $leftInputContainer.find('.minute-input').val('00');
        $leftInputContainer.find('.period-input').val('AM');
        $calendarInputWrapper.attr('data-first-selected-date', firstStringDate.replace('23:59:59', '00:00:00'));

        $rightInputContainer.find('.month-input').val(addZeroFillers(lastDate.getMonth() + 1));
        $rightInputContainer.find('.day-input').val(addZeroFillers(lastDate.getDate()));
        $rightInputContainer.find('.year-input').val(lastDate.getFullYear());
        $rightInputContainer.find('.hour-input').val('11');
        $rightInputContainer.find('.minute-input').val('59');
        $rightInputContainer.find('.period-input').val('PM');
        $calendarInputWrapper.attr('data-last-selected-date', lastStringDate.replace('00:00:00', '23:59:59'));
    } else {
        $leftInputContainer.find('.month-input').val(addZeroFillers(lastDate.getMonth() + 1));
        $leftInputContainer.find('.day-input').val(addZeroFillers(lastDate.getDate()));
        $leftInputContainer.find('.year-input').val(lastDate.getFullYear());
        $leftInputContainer.find('.hour-input').val('12');
        $leftInputContainer.find('.minute-input').val('00');
        $leftInputContainer.find('.period-input').val('AM');
        $calendarInputWrapper.attr('data-first-selected-date', lastStringDate.replace('23:59:59', '00:00:00'));

        $rightInputContainer.find('.month-input').val(addZeroFillers(firstDate.getMonth() + 1));
        $rightInputContainer.find('.day-input').val(addZeroFillers(firstDate.getDate()));
        $rightInputContainer.find('.year-input').val(firstDate.getFullYear());
        $rightInputContainer.find('.hour-input').val('11');
        $rightInputContainer.find('.minute-input').val('59');
        $rightInputContainer.find('.period-input').val('PM');
        $calendarInputWrapper.attr('data-last-selected-date', firstStringDate.replace('00:00:00', '23:59:59'));
    }
}

function addZeroFillers(number) {
    if(number.toString().length == 1) {
        return '0' + number;
    } else {
        return number;
    }
}

function resetCalendar() {
    var $calendarWrapper = $('#calendar-wrapper');
    var $calendarInputWrapper = $calendarWrapper.find('#calendar-input-wrapper');

    $calendarInputWrapper.attr('data-first-selected-date', '');
    $calendarInputWrapper.attr('data-last-selected-date', '');

    $calendarWrapper.find('input').each(function() {
        $(this).val('');
    });

    $calendarWrapper.find('.in-between').each(function() {
        $(this).removeClass('in-between');
    });

    var $firstSelectedDate = $calendarWrapper.find('.first-selected-date');
    $firstSelectedDate.removeClass('first-selected-date');
    var $lastSelectedDate = $calendarWrapper.find('.last-selected-date');
    $lastSelectedDate.removeClass('last-selected-date');
}

$(document).ready(function() {
    $(document).on('click', '#time-range', function () {
        $('#overlay').addClass('active');
        createDoubleCalendars(0);
    });

    $(document).on('click', '#overlay, #calendar-exit', function () {
        $('#overlay').removeClass('active');
        resetCalendar();
    });

    //Prevents the click from triggering other elements
    $(document).on('click', '#calendar-wrapper', function (e) {
        e.stopPropagation();
    });


    $(document).on('click', '.right-arrow:not([data-month="0"])', function () {
        var $rightArrow = $(this);
        var currentMonth = parseInt($rightArrow.attr('data-month'));

        var newCurrentMonth = currentMonth - 1;

        if (currentMonth != 0) {
            $rightArrow.attr('data-month', currentMonth - 1);
        }

        createDoubleCalendars(newCurrentMonth);
        checkDates();
    });

    $(document).on('click', '.left-arrow', function () {
        var $leftArrow = $(this);
        var currentMonth = parseInt($leftArrow.attr('data-month'));
        $leftArrow.attr('data-month', currentMonth + 1);

        createDoubleCalendars(currentMonth);
        checkDates();
    });

    $(document).on({
        mouseenter: function () {
            var $date = $(this);
            var $calendarContainer = $date.closest('#calendar-container');
            var $calendarInputWrapper = $calendarContainer.siblings('#calendar-input-wrapper');
            var firstStringDate = $calendarInputWrapper.attr('data-first-selected-date');
            var lastStringDate = $calendarInputWrapper.attr('data-last-selected-date');

            //if there is a selected date then select all dates in range
            var $firstSelectedDate = $calendarContainer.find('.first-selected-date');
            var $lastSelectedDate = $calendarContainer.find('.last-selected-date');

            if($lastSelectedDate.length || (typeof lastStringDate != 'undefined' && lastStringDate != '')) {
                return;
            } else if($firstSelectedDate.length) {
                //first know where the first-selected date is at
                var $selectedDateWrapper = $firstSelectedDate.closest('.month-wrapper');
                var $hoveredDateWrapper = $date.closest('.month-wrapper');

                if($selectedDateWrapper.is($hoveredDateWrapper)) {
                    var $elements = inBetween($hoveredDateWrapper.find('td'), $firstSelectedDate, $date, false, true);
                } else {
                    var $allSelectedDates = $selectedDateWrapper.find('td:not(.nonSelectable)');
                    var $allHoveredDates = $hoveredDateWrapper.find('td:not(.nonSelectable)');

                    if($selectedDateWrapper.is('#left-calendar') && $hoveredDateWrapper.is('#right-calendar')) {
                        var $selectedDateElements = inBetween($allSelectedDates, $firstSelectedDate, $allSelectedDates.last(), false, true);
                        var $hoveredDateElements = inBetween($allHoveredDates, $allHoveredDates[0], $date, true, true);
                    } else {
                        $selectedDateElements = inBetween($allSelectedDates, $allSelectedDates[0], $firstSelectedDate, true, false);
                        $hoveredDateElements = inBetween($allHoveredDates, $date, $allHoveredDates.last(), true, true);
                    }

                    $elements = $.merge($selectedDateElements, $hoveredDateElements);
                }

                $elements.each(function() {
                    $(this).addClass('in-between');
                });

            } else if((typeof firstStringDate != 'undefined' && firstStringDate != '') && (typeof lastStringDate == 'undefined' || lastStringDate == '')) {
                var firstDate = new Date(firstStringDate);
                $hoveredDateWrapper = $date.closest('.month-wrapper');

                var lastYear = $hoveredDateWrapper.find('.year').text();
                var lastMonth = $hoveredDateWrapper.find('.month').attr('data-month');
                var lastDay = $date.text();

                var lastDate = new Date(lastMonth + '/' + lastDay + '/' + lastYear + ' 00:00:00');

                if(firstDate.valueOf() > lastDate.valueOf()) {
                    var $allRightDates = $calendarContainer.find('#right-calendar td:not(.nonSelectable)');
                    if($hoveredDateWrapper.is('#left-calendar')) {
                        var $allLeftDates = $calendarContainer.find('#left-calendar td:not(.nonSelectable)');
                        var $leftDateElements = inBetween($allLeftDates, $date, $allLeftDates.last(), true, true);
                        var $rightDateElements = inBetween($allRightDates, $allRightDates.first(), $allRightDates.last(), true, true);
                        $elements = $.merge($leftDateElements, $rightDateElements);
                    } else {
                        $elements = inBetween($allRightDates, $date, $allRightDates.last(), true, true);
                    }
                } else {
                    $allLeftDates = $calendarContainer.find('#left-calendar td:not(.nonSelectable)');
                    if($hoveredDateWrapper.is('#left-calendar')) {
                        $elements = inBetween($allLeftDates, $allLeftDates.first(), $date, true, true);
                    } else {
                        $allRightDates = $calendarContainer.find('#right-calendar td:not(.nonSelectable)');
                        $leftDateElements = inBetween($allLeftDates, $allLeftDates.first(), $allLeftDates.last(), true, true);
                        $rightDateElements = inBetween($allRightDates, $allRightDates.first(), $date, true, true);
                        $elements = $.merge($leftDateElements, $rightDateElements);
                    }
                }

                $elements.each(function() {
                    $(this).addClass('in-between');
                });
            } else { //remove any existing hovered elements
                var $hoveredDate = $calendarContainer.find('.hovered');
                $hoveredDate.removeClass('hovered');
                //then add hovered to the date the mouse is hovering on
                $date.addClass('hovered');
            }
        },
        mouseleave: function () {
            var $date = $(this);
            var $calendarContainer = $date.closest('#calendar-container');
            var $calendarInputWrapper = $calendarContainer.siblings('#calendar-input-wrapper');
            var firstStringDate = $calendarInputWrapper.attr('data-first-selected-date');
            var lastStringDate = $calendarInputWrapper.attr('data-last-selected-date');

            //if first and last date exist don't remove in-between
            if(!(typeof firstStringDate != 'undefined' && firstStringDate != '') && (typeof lastStringDate != 'undefined' && lastStringDate != '')) {
                $('.in-between').each(function() {
                    $(this).removeClass('in-between');
                });
            } else if(((typeof firstStringDate != 'undefined' && firstStringDate != '') && !(typeof lastStringDate != 'undefined' && lastStringDate != '')) || (!(typeof firstStringDate != 'undefined' && firstStringDate != '') && (typeof lastStringDate != 'undefined' && lastStringDate != ''))) {
                $('.in-between').each(function() {
                    $(this).removeClass('in-between');
                });
            }

        }
    }, '#calendar-container tbody td:not(.nonSelectable)');

    $(document).on('click', '.first-selected-date', function () {
        var $firstSelectedDate = $(this);
        var $calendarContainer = $firstSelectedDate.closest('#calendar-container');
        var $lastSelectedDate = $calendarContainer.find('.last-selected-date');
        var $calendarInputWrapper = $calendarContainer.siblings('#calendar-input-wrapper');

        if($lastSelectedDate.length) {
            $firstSelectedDate.removeClass('first-selected-date');
            $lastSelectedDate.removeClass('last-selected-date');
            $lastSelectedDate.addClass('first-selected-date');

            $calendarInputWrapper.attr('data-first-selected-date', $calendarInputWrapper.attr('data-last-selected-date'));
            $calendarInputWrapper.attr('data-last-selected-date', '');

            $calendarContainer.find('.in-between').each(function() {
                $(this).removeClass('in-between');
            });
        } else {
            $firstSelectedDate.removeClass('first-selected-date');
            $calendarInputWrapper.attr('data-first-selected-date', '');
        }
    });

    $(document).on('click', '.last-selected-date', function () {
        var $lastSelectedDate = $(this);
        var $calendarContainer = $lastSelectedDate.closest('#calendar-container');
        var $calendarInputWrapper = $calendarContainer.siblings('#calendar-input-wrapper');
        $lastSelectedDate.removeClass('last-selected-date');
        $calendarInputWrapper.attr('data-last-selected-date', '');

        $('.in-between').each(function() {
            $(this).removeClass('in-between');
        });
    });

    $(document).on('click', '#calendar-container tbody td:not(.nonSelectable):not(.first-selected-date):not(.last-selected-date)', function () {
        var $date = $(this);
        var $calendarContainer = $date.closest('#calendar-container');
        var $firstSelectedDate = $calendarContainer.find('.first-selected-date');
        var $calendarInputWrapper = $calendarContainer.siblings('#calendar-input-wrapper');
        var firstStringDate = $calendarInputWrapper.attr('data-first-selected-date');
        var lastStringDate = $calendarInputWrapper.attr('data-last-selected-date');

        //if user clicks on a date and both first and last exist then return
        if((typeof firstStringDate != 'undefined' && firstStringDate != '') && (typeof lastStringDate != 'undefined' && lastStringDate != '')) {
            return;
        //else if at least the first date exist on calendar or at all then assign last date
        } else if($firstSelectedDate.length || (typeof firstStringDate != 'undefined' && firstStringDate != '')) {
            $date.mouseenter();
            $date.addClass('last-selected-date');
            var $lastDateWrapper = $date.closest('.month-wrapper');

            var lastYear = $lastDateWrapper.find('.year').text();
            var lastMonth = $lastDateWrapper.find('.month').attr('data-month');
            var lastDay = $date.text();
            var lastDateString = lastMonth + '/' + lastDay + '/' + lastYear + ' 00:00:00';

            fillDateInputs($calendarContainer, firstStringDate, lastDateString);
        //else assign first date
        } else {
            $date.mouseenter();
            $date.addClass('first-selected-date');
            $date.removeClass('hovered');

            //save date string to calendar input wrapper
            var $firstDateWrapper = $date.closest('.month-wrapper');
            var firstYear = $firstDateWrapper.find('.year').text();
            var firstMonth = $firstDateWrapper.find('.month').attr('data-month');
            var firstDay = $date.text();
            var firstDate = firstMonth + '/' + firstDay + '/' + firstYear + ' 00:00:00';

            $calendarInputWrapper = $calendarContainer.siblings('#calendar-input-wrapper');
            $calendarInputWrapper.attr('data-first-selected-date', firstDate);
        }
    });

    //Month input to day input
    $(document).on('keyup', '.month-input', function (e) {
        var $monthInput = $(this);
        if($monthInput.val().length >= 2 && e.keyCode != '9') {
            $monthInput.siblings('.day-input').select();
        }
    });

    //Day input to year input
    $(document).on('keyup', '.day-input', function () {
        var $dayInput = $(this);
        if($dayInput.val().length >= 2) {
            $dayInput.siblings('.year-input').select();
        }
    });

    //Year input to hour input
    $(document).on('keyup', '.year-input', function () {
        var $yearInput = $(this);
        if($yearInput.val().length >= 4) {
            $yearInput.closest('.calendar-input-container').find('.hour-input').select();
        }
    });

    //Hour input to minute input
    $(document).on('keyup', '.hour-input', function () {
        var $hourInput = $(this);
        if($hourInput.val().length >= 2) {
            $hourInput.siblings('.minute-input').select();
        }
    });

    //Minute input to period input
    $(document).on('keyup', '.minute-input', function () {
        var $minuteInput = $(this);
        if($minuteInput.val().length >= 2) {
            $minuteInput.closest('.calendar-input-container').find('.period-input').select();
        }
    });

    //Reset calendar
    $(document).on('click', '#calendar-reset', function () {
        resetCalendar();
    });
});