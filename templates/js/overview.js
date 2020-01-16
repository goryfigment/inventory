require('./../css/general.css');
require('./../css/overview.css');
require('./../library/fontawesome/fontawesome.js');

var storeTemplate = require('./../handlebars/store.hbs');
var storeEditTemplate = require('./../handlebars/store_edit.hbs');
var storeItemTemplate = require('./../handlebars/store_item.hbs');
var overviewTemplate = require('./../handlebars/overview/overview.hbs');
var overviewTotalTemplate = require('./../handlebars/overview/overview_total.hbs');
var salesSummaryTemplate = require('./../handlebars/overview/sales_summary.hbs');

//libraries
var $ = require('jquery');
require('./../js/general.js');

// GET day report, week report, month report, all report
// Product Report, Sales Summary

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

function currencyFormat(cents) {
    cents = Math.round(cents);

    if (cents == 0) {
        return cents.toFixed(2);
    } else if(cents < 100){
        if (cents > 0 || cents > -100) {
            return (cents/100).toFixed(2);
        } else {
            cents = cents.toString();
            return cents.substring(0,cents.length-2)+"."+cents.substring(cents.length-2)
        }
    }else {
        cents = cents.toString();
        return cents.substring(0,cents.length-2)+"."+cents.substring(cents.length-2)
    }
}

function dateFormat(d) {
    var month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return month[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

$(document).ready(function() {
    $('#overview-link').addClass('active');
    $('#store-container').append(storeItemTemplate({'stores': globals.stores}));

    var storeId = localStorage.getItem('clicked_store');

    if (storeId === null) {
        var $storeItem = $('.store')[0];
    } else {
        $storeItem = $('.store[data-id="' + storeId + '"]');
    }

    $storeItem.click();
});

// STORE //
$(document).on('click', '.store:not(.active)', function () {
    var $this = $(this);
    var storeId = $this.attr('data-id');
    $('#store-container').find('.active').removeClass('active');
    $this.addClass('active');

    createGraph(storeId, 'day');
});
// STORE //

// TABS //
$(document).on('click', '.tab', function () {
    var $this = $(this);
    $('.tab.active').removeClass('active');
    $this.addClass('active');
    createGraph($('.store.active').attr('data-id'), $this.attr('data-span'));
});
// TABS //

function getTransactions(startDate, endDate, transactions) {
    var all_transactions = [];
    var startEpoch = Math.abs(startDate.valueOf() / 1000);
    var endEpoch = Math.abs(endDate.valueOf() / 1000);

    for (var t = 0; t <= transactions.length - 1; t++) {
        var transaction = transactions[t];
        var transactionEpoch = transaction['epoch'];

        if(transactionEpoch >= startEpoch && transactionEpoch <= endEpoch) {
            all_transactions = all_transactions.concat(transactions[t]['transactions']);
        }
    }
    return all_transactions;
}

function createGraph(storeId, timespan) {
    if(timespan == 'day') {
        var transactions = globals.stores[storeId]['transactions'];
        var startDate = new Date(transactions[0]['datetime']);
        startDate.setHours(0, 0, 0, 0);
        var endDate = new Date(transactions[0]['datetime']);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);

        var dateString = dateFormat(startDate);
    } else if(timespan == 'week') {
        transactions = globals.stores[storeId]['transactions'];
        endDate = new Date(transactions[0]['datetime']);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
        startDate = new Date(transactions[0]['datetime']);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        dateString = dateFormat(startDate) + ' - ' + dateFormat(new Date(transactions[0]['datetime']));
    } else if(timespan == 'month') {
        transactions = globals.stores[storeId]['transactions'];
        endDate = new Date(transactions[0]['datetime']);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
        startDate = new Date(transactions[0]['datetime']);
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        dateString = dateFormat(startDate) + ' - ' + dateFormat(new Date(transactions[0]['datetime']));
    } else if(timespan == 'year') {
        transactions = globals.stores[storeId]['transactions'];
        endDate = new Date(transactions[0]['datetime']);
        endDate.setHours(0, 0, 0, 0);
        startDate = new Date(transactions[0]['datetime']);
        startDate.setFullYear(startDate.getFullYear() - 1);
        dateString = dateFormat(startDate) + ' - ' + dateFormat(new Date(transactions[0]['datetime']));
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
    } else if(timespan == 'all') {
        transactions = globals.stores[storeId]['transactions'];
        endDate = new Date(transactions[0]['datetime']);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
        startDate = new Date(transactions[transactions.length - 1]['datetime']);
        startDate.setHours(0, 0, 0, 0);
        dateString = dateFormat(startDate) + ' - ' + dateFormat(new Date(transactions[0]['datetime']));
    }

    $('time').text(dateString);
    var all_transactions = getTransactions(startDate, endDate, transactions);
    createOverviewGraph(all_transactions, startDate, endDate);
    productReport(all_transactions);
    salesSummary(all_transactions);
}

function productReport(transactions) {
    var productData = {};

    var quantityList = [['Item', 'Sell Quantity']];
    var productList = [['Item', 'Profit']];

    for (var i = 0; i < transactions.length; i++) {
        var items = transactions[i]['items'];

        for (var g = 0; g < items.length; g++) {
            var item = items[g];
            var itemId = item['id'].toString();
            var profit = parseFloat(item['price']) - parseFloat(item['cost']);

            if (!(itemId in productData)) {
                productData[itemId] = {};
                productData[itemId]['name'] = item['name'];
                productData[itemId]['quantity'] = 0;
                productData[itemId]['profit'] = 0;
            }

            productData[itemId]['quantity'] += parseInt(item['quantity']);
            productData[itemId]['profit'] += profit;
        }
    }

    for (var key in productData) {
        var currentItem = productData[key];

        quantityList.push([currentItem['name'], currentItem['quantity']]);
        productList.push([currentItem['name'], currentItem['profit']]);
    }

    google.charts.load("current", {
        callback: function () {
            createPieChart(quantityList.slice(0, 10), document.getElementById('quantity-chart'));
            createPieChart(productList.slice(0, 10), document.getElementById('profit-chart'));
            $('#overview-top-wrapper h2').show();
        },
        packages:['corechart']
    });
}

// OVERVIEW //
function createOverviewGraph(transactions, startTime, endTime) {
    var transactionGraphArray = [];
    var hourRange = Math.abs(endTime - startTime) / 3.6e6;
    var dayRange = Math.abs(endTime - startTime) / 8.64e7;
    var monthRange = Math.abs(endTime - startTime) / 2629743000;

    if (hourRange <= 24 && dayRange <= 1) {
        var seperation = 'hour';
        var differenceTime = 3599999;
        var loopRange = hourRange;

        //Subtract hour by one since we add one in the for loop
        startTime.setHours(startTime.getHours() - 1);
    } else if(dayRange > 1 && monthRange < 2) {
        seperation = 'day';
        differenceTime = 86400000;
        loopRange = Math.round(dayRange);

        //Subtract day by one since we add one in the for loop
        startTime.setDate(startTime.getDate() - 1);
    } else if(monthRange > 2) {
        seperation = 'month';
        differenceTime = 2629743000;
        loopRange = Math.round(monthRange);

        //Subtract month by one since we add one in the for loop
        startTime.setMonth(startTime.getMonth() - 1);
    }

    var templateCash = 0;
    var templateCredit = 0;
    var templateDiscount = 0;
    var templateTax = 0;
    var templateTotal = 0;

    // Loop through the day
    for (var t = 1; t <= loopRange; t++) {
        if(seperation == 'hour') {
            startTime.setHours(startTime.getHours() + 1);
        } else if (seperation == 'day') {
            startTime.setDate(startTime.getDate() + 1);
        } else {
            startTime.setMonth(startTime.getMonth() + 1);
        }

        var initialTime = startTime.valueOf();
        var initialTimestamp = new Date(initialTime);
        var rangeTime = initialTime + differenceTime;

        if(seperation == 'month') {
            initialTimestamp.setMonth(initialTimestamp.getMonth() + 1);
        }

        var hourTotal = 0;

        // Loop through the transaction
        for (var i = 0; i < transactions.length; i++) {
            var transaction = transactions[i];

            //convert to milliseconds epoch
            var milliEpoch = parseInt(transaction['date']) * 1000;

            if(milliEpoch >= initialTime && milliEpoch <= rangeTime) {
                // Calculate current transaction total (subtotal + tax - discount)
                var currentDiscount = 0;
                // Loop through the items to calculate discount
                var items = transaction['items'];
                for (var d = 0; d < items.length; d++) {
                    var item = items[d];
                    currentDiscount += parseFloat(item['discount'])*100;
                }

                var currentSubtotal = parseFloat(transaction['subtotal'])*100;
                var currentTax = parseFloat(transaction['tax'])*100;
                //var currentTax = currencyMath(currentSubtotal, '*', transaction['tax'], true, false);
                var currentTotal = currentSubtotal - currentDiscount + currentTax;

                hourTotal += currentTotal;

                //Handle template totals
                if(transaction['payment_type'] == 'Cash') {
                    templateCash += currentTotal;
                } else {
                    templateCredit += currentTotal;
                }
                templateTotal += currentTotal;
            }
        }
        transactionGraphArray.push([initialTimestamp, parseFloat(currencyFormat(hourTotal))]);
    }

    google.charts.load("current", {
        callback: function () {
            var $overviewWrapper = $('#overview-wrapper');
            $overviewWrapper.empty();
            $overviewWrapper.append(overviewTemplate({}));

            var $overviewTotalWrapper = $('#overview-total-wrapper');
            $overviewTotalWrapper.empty();
            $overviewTotalWrapper.append(overviewTotalTemplate({
                'cash': currencyFormat(templateCash),
                'credit': currencyFormat(templateCredit),
                'total': currencyFormat(templateTotal)
            }));
            createOverviewChart(seperation, transactionGraphArray);
        },
        packages:['corechart', 'line']
    });
}

function createOverviewChart(seperation, array) {
    var data = new google.visualization.DataTable();
    data.addColumn('date', 'Date');
    data.addColumn('number', 'Payments');

    data.addRows(array);

    if(seperation == 'hour') {
        var dateRegex = "MMM d, h:mma - h:59a";
    } else if(seperation == 'day') {
        dateRegex = "MMM d, h:mma";
    }

    var date_formatter = new google.visualization.DateFormat({
        pattern: dateRegex
    });
    date_formatter.format(data, 0);

    var options = {
        curveType: 'function',
        animation: {
            startup: true,
            duration: 1500,
            easing: 'out'
        },
        height: 200,
        width: 350,
        lineWidth: 3,
        pointSize: 0,
        chartArea: {
            left: '0%',
            right: '0%',
            top: '0%',
            bottom: '0%',
            width: '100%',
            height: '100%'
        },
        series: {
            //0: { color: '#0EC160' },
            0: { color: '#08E8FF' }
        },
        hAxis: {
            title: '',
            format: 'MMM dd',
            gridlines: {
                color: 'transparent'
            },
            textStyle: {
                color: 'bfbfbf'
            },
            titleTextStyle: {
                color: 'bfbfbf'
            },
            textPosition: 'none'
        },
        vAxis: {
            title: '',
            format: 'currency',
            minValue: 0,
            gridlines: {
                color: 'transparent'
            },
            textStyle: {
                color: 'bfbfbf'
            },
            titleTextStyle: {
                color: 'bfbfbf'
            },
            //viewWindow: {
            //    min: 0
            //},
            textPosition: 'none'
        },
        legend: { position: 'none' },
        trendlines: {
            0: {
                type: 'polynomial',
                opacity: 0.4,
                pointSize: 0,
                tooltip: false,
                enableInteractivity: false
            }
        },
        focusTarget: 'category',
        backgroundColor: 'transparent'
    };

    var overviewChart = document.getElementById('overview-chart');
    var chart = new google.visualization.LineChart(overviewChart);

    chart.draw(data, options);
}

function createPieChart(array, wrapper) {
    var data = google.visualization.arrayToDataTable(array);

    var number_formatter = new google.visualization.NumberFormat({
        fractionDigits: '2'
    });

    number_formatter.format(data, 1);

    var options = {
        backgroundColor: 'transparent',
        height: 250,
        width: 350,
        chartArea: {
            left: '10%',
            right: '3%',
            width: '90%',
            height: '100%'
        },
        legend: {textStyle: {color: '83c6e3', fontSize: 10}}
    };

    var chart = new google.visualization.PieChart(wrapper);

    chart.draw(data, options);
}
// OVERVIEW //

function salesSummary(transactions) {
    var totalTax = 0;
    var totalDiscounts = 0;
    var totalCash = 0;
    var totalCredit = 0;
    var total = 0;

    var totalAmerican = 0;
    var totalDiscover = 0;
    var totalMaster = 0;
    var totalVisa = 0;

    //#Quantity
    var cashQuantity = 0;
    var creditQuantity = 0;
    var americanQuantity = 0;
    var discoverQuantity = 0;
    var masterQuantity = 0;
    var visaQuantity = 0;

    for (var i = 0; i < transactions.length; i++) {
        var transaction = transactions[i];
        var subtotal = parseFloat(transaction['subtotal'])*100;
        var paymentType = transaction['payment_type'];
        totalTax += parseFloat(transaction['tax'])*100;
        total += subtotal;

        var items = transaction['items'];

        for (var d = 0; d < items.length; d++) {
            var item = items[d];
            totalDiscounts += parseFloat(item['discount'])*100;
        }

        if(paymentType == "Cash") {
            totalCash += subtotal;
            cashQuantity += 1;
        } else {
            totalCredit += subtotal;
            creditQuantity += 1;
        }

        if(paymentType == "American Express") {
            totalAmerican += subtotal;
            americanQuantity += 1;
        } else if(paymentType == "Discover") {
            totalDiscover += subtotal;
            discoverQuantity += 1;
        } else if(paymentType == "MasterCard") {
            totalMaster += subtotal;
            masterQuantity += 1;
        } else if(paymentType == "Visa") {
            totalVisa += subtotal;
            visaQuantity += 1;
        }
    }

    var data = {
        'total_tax': currencyFormat(totalTax),
        'total_discount': currencyFormat(totalDiscounts),
        'total_cash': currencyFormat(totalCash),
        'total_credit': currencyFormat(totalCredit),
        'total': currencyFormat(total + totalTax),

        'total_american': currencyFormat(totalAmerican),
        'total_discover': currencyFormat(totalDiscover),
        'total_master': currencyFormat(totalMaster),
        'total_visa': currencyFormat(totalVisa),

        'cash_quantity': cashQuantity,
        'credit_quantity': creditQuantity,
        'american_quantity': americanQuantity,
        'discover_quantity': discoverQuantity,
        'master_quantity': masterQuantity,
        'visa_quantity': visaQuantity,
        'total_transactions': transactions.length
    };

    var $salesSummaryWrapper = $('#sales-summary-wrapper');
    $salesSummaryWrapper.empty();
    $salesSummaryWrapper.append(salesSummaryTemplate(data));
}