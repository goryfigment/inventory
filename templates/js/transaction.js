require('./../css/general.css');
require('./../css/transaction.css');
require('./../css/permission.css');
require('./../library/fontawesome/fontawesome.js');
require('./../library/tippy/tippy.css');

//libraries
var $ = require('jquery');
require('./../js/general.js');

var storeItemTemplate = require('./../handlebars/store_item.hbs');
var createTransactionTemplate = require('./../handlebars/transaction/create.hbs');
var linkedColumnsTemplate = require('./../handlebars/transaction/link_columns.hbs');
var searchItemTemplate = require('./../handlebars/transaction/search_item.hbs');
var resultItemTemplate = require('./../handlebars/transaction/result_item.hbs');
var discountItemTemplate = require('./../handlebars/transaction/discount_item.hbs');
var receiptTemplate = require('./../handlebars/transaction/receipt.hbs');
var transactionTableTemplate = require('./../handlebars/transaction/transaction.hbs');
var receiptSettingsTemplate = require('./../handlebars/transaction/receipt_settings.hbs');

function popupHandler(e, popupData, template) {
    e.stopPropagation();
    var $overlay = $('#overlay');
    $overlay.empty();
    $overlay.addClass('active');
    if(template) {
        $overlay.append(template(popupData));
    }
}

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

function getReceipt(data) {
    function success(response) {
        if(response['success']){
            console.log(JSON.stringify(response));
        }
    }

    function error(response) {
        alert('ERROR CREATING RECEIPT');
    }

    sendRequest('/transaction/print_receipt/', data, 'POST', success, error);
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

function scrollToElement($container, $element, speed){
    var elementTop = $element.offset().top;
    var elementHeight = $element.height();
    var containerTop = $container.offset().top;
    var containerHeight = $container.height();

    if ((((elementTop - containerTop) + elementHeight) > 0) && ((elementTop - containerTop) < containerHeight)) {

    } else {
        $container.animate({
            scrollTop: $element.offset().top - $container.offset().top + $container.scrollTop()
        }, speed);
    }
}

function upAndDownPopups(keyCode, $popup, $options, scroll) {
    var $selected = $popup.find('.selected');
    var $firstOption = $options.filter(':visible').eq(0);
    var $lastOption = $options.filter(':visible').eq(-1);

    if (keyCode == 40) { //down arrow
        var $nextOption = $selected.nextAll($options).filter(':visible').first();
        if($selected.length) {
            $selected.removeClass('selected');
            if($nextOption.length){
                $nextOption.addClass('selected');
                if(scroll) {
                    scrollToElement($popup, $nextOption, 50);
                }
            } else{
                $firstOption.addClass('selected');
                if(scroll) {
                    scrollToElement($popup, $firstOption, 50);
                }
            }
        } else {
            $firstOption.addClass('selected');
            if(scroll) {
                scrollToElement($popup, $firstOption, 50);
            }
        }
    } else if (keyCode == 38) { //up arrow
        var $prevOption = $selected.prevAll($options).filter(':visible').first();
        if($selected.length) {
            $selected.removeClass('selected');
            if($prevOption.length){
                $prevOption.addClass('selected');
                if(scroll) {
                    scrollToElement($popup, $prevOption, 50);
                }
            }else{
                $lastOption.addClass('selected');
                if(scroll) {
                    scrollToElement($popup, $lastOption, 50);
                }
            }
        } else {
            $lastOption.addClass('selected');
            if(scroll) {
                scrollToElement($popup, $lastOption, 50);
            }
        }
    } else if(keyCode == 13) { //enter button
        $selected.trigger('click');
    }
}


function calculateTotal() {
    var $tax = $('#tax');
    var taxRate = parseFloat($tax.attr('data-tax'));
    var subtotal = 0;

    $('.transaction-item').each(function() {
        subtotal += parseFloat($(this).find('.transaction-price').text());
    });

    subtotal = currencyFormat(subtotal*100);
    var tax = currencyFormat((Math.round(subtotal*taxRate*100)/100)*100);
    var total = currencyFormat(subtotal*100 + tax*100);

    $('#subtotal').html(subtotal);
    $tax.html(tax);
    $('#total').html(total);
}


$(document).ready(function() {
    $('#transaction-link').addClass('active');
    $('#store-container').append(storeItemTemplate({'stores': globals.stores}));
    $('#receipt-wrapper').append(receiptSettingsTemplate(globals.settings));

    var storeId = localStorage.getItem('clicked_store');

    if (storeId === null) {
        var $storeItem = $('.store')[0];
    } else {
        $storeItem = $('.store[data-id="' + storeId + '"]');
    }

    if($storeItem.length) {
        $storeItem.click();
    } else {
        var $transactionWrapper = $('#transaction-wrapper');
        $transactionWrapper.append(transactionTableTemplate({'store': globals.stores[storeId]}));
    }

});

// POPUP //
$(document).on('click', '.popup', function (e) {
    e.stopPropagation();
});

$(document).on('click', 'body, #cancel-submit, #exit-button', function () {
    $('#overlay').removeClass('active');
    globals.edit_mode = false;
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
    $popup.animate({scrollLeft: -$popup.width()}, "slow", function() {
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
    var $transactionWrapper = $('#transaction-wrapper');

    $('#store-container').find('.active').removeClass('active');
    $this.addClass('active');
    localStorage.setItem("clicked_store", String(storeId));
    $transactionWrapper.empty();
    $transactionWrapper.append(transactionTableTemplate({'store': globals.stores[storeId]}));
});
// STORE //

// TABS //
function tabHandler($tab, $wrapper) {
    $('.tab.active').removeClass('active');
    $tab.addClass('active');

    $('.active-tab').removeClass('active-tab');
    $wrapper.addClass('active-tab');
}

$(document).on('click', '.tab', function () {
    var $this = $(this);
    tabHandler($this, $('#' + $this.attr('data-type')));
});
// TABS //

// CREATE TRANSACTION //
$(document).on('click', '#create-transactions-button', function (e) {
    //Get active store
    var storeId = $('.store.active').attr('data-id');
    var store = globals.stores[storeId];
    var linkedColumns = store['link_columns'];

    if(linkedColumns['name'] && linkedColumns['price'] && linkedColumns['cost'] && linkedColumns['quantity']) {
        popupHandler(e, {'id': store['id'], 'name': store['name'], 'tax': store['tax']}, createTransactionTemplate);
    } else {
        popupHandler(e, {'id': store['id'], 'columns': store['columns'], 'link_columns': store['link_columns']}, linkedColumnsTemplate);
    }
});

//Payment type
$(document).on('click', '.payment-type:not(.selected)', function () {
    var $paymentType = $(this);
    $paymentType.siblings('.selected').removeClass('selected');
    $paymentType.addClass('selected');
});

//Quantity change
$(document).on('change click keyup', '.quantity-input', function () {
    var $quantityInput = $(this);
    var $transactionItem = $quantityInput.closest('.transaction-item');
    var $transactionPrice = $transactionItem.find('.transaction-price');
    var $discountItem = $transactionItem.find('.discount-item');
    var $eachText = $quantityInput.siblings('.each-text');
    var quantity = parseInt($quantityInput.val());
    var itemSubtotal = (parseFloat($transactionItem.data('item')['price'])*100)*quantity;

    if (quantity == 0) {
        quantity = 1
    }

    if($discountItem.attr('data-type') == 'percent') {
        var discount = parseFloat($discountItem.attr('data-percent'))/100 * itemSubtotal;
        $discountItem.find('.discount').text(currencyFormat(discount)+'-');
        var itemTotal = itemSubtotal - discount;
        var eachDiscountedItem = currencyFormat(itemTotal/quantity);
        $quantityInput.attr('data-each', eachDiscountedItem);
        $eachText.text('@ ' + eachDiscountedItem + ' ea)');
    } else if($discountItem.attr('data-type') == 'dollar') {
        discount = parseFloat($discountItem.find('.discount-delete').attr('data-discount'))*100;
        itemTotal = itemSubtotal - discount;
        eachDiscountedItem = currencyFormat(Math.ceil(itemTotal/quantity));
        $quantityInput.attr('data-each', eachDiscountedItem);
        $eachText.text('@ ' + eachDiscountedItem + ' ea)');
    } else {
        itemTotal = itemSubtotal;
    }

    var price = currencyFormat(itemTotal);

    $transactionPrice.text(currencyFormat(itemTotal));
    calculateTotal();
});

//Discount
$(document).on('click', '.discount-button', function () {
    $(this).siblings('#discount-submit-wrapper').addClass('active');
});

$(document).on('click', '.discount-cancel', function () {
    $(this).closest('#discount-submit-wrapper').removeClass('active');
});

$(document).on('click', '.discount-delete', function () {
    var $discountDelete = $(this);
    var $transactionItem = $discountDelete.closest('.transaction-item');
    var $transactionPrice = $transactionItem.find('.transaction-price');
    var price = parseFloat($transactionPrice.text());
    var discount = parseFloat($discountDelete.attr('data-discount'));
    var $quantityInput = $transactionItem.find('.quantity-input');
    var $eachText = $quantityInput.siblings('.each-text');
    var quantity = parseInt($quantityInput.val());
    if(quantity == 0){
        quantity = 1;
    }

    $discountDelete.closest('.discount-item').remove();
    var itemSubtotal = price*100 + discount*100;
    var eachItem = currencyFormat(itemSubtotal/quantity);

    $quantityInput.attr('data-each', eachItem);
    $eachText.text('@ ' + eachItem + ' ea)');

    $transactionPrice.text(currencyFormat(itemSubtotal));

    calculateTotal();

    $transactionItem.find('.discount-button').addClass('active');
});

$(document).on('click', '.discount-submit', function () {
    var $discountSubmit = $(this);
    var $transactionItem = $discountSubmit.closest('.transaction-item');
    var $discountMoneyInput = $discountSubmit.siblings('.discount-money-input');
    var moneyValue = $discountMoneyInput.val().trim();
    var $percentMoneyInput = $discountSubmit.siblings('.discount-percent-input');
    var percentValue = $percentMoneyInput.val().trim();
    var numberRegex = /^((^\d+$)|(\d+(\.\d *)?)|((\d*\.)?\d+))$/;
    var $discountWrapper = $transactionItem.find('.discount-wrapper');
    var $discountButton = $discountWrapper.siblings('.discount-button');
    var $discountSubmitWrapper = $discountWrapper.siblings('#discount-submit-wrapper');
    var $transactionPrice = $transactionItem.find('.transaction-price');
    var transactionPrice = parseFloat($transactionPrice.text());
    var $quantityInput = $transactionItem.find('.quantity-input');
    var quantity = parseInt($quantityInput.val());
    if(quantity == 0){
        quantity = 1;
    }

    var $eachText = $quantityInput.siblings('.each-text');

    if(moneyValue != '') {
        if(numberRegex.test(moneyValue)) {
            var discount = parseFloat(moneyValue);
            $discountWrapper.html(discountItemTemplate({'type': 'dollar', 'total': discount.toFixed(2)}));
            $discountButton.removeClass('active');
            $discountSubmitWrapper.removeClass('active');

            var itemTotalDiscounted = transactionPrice*100 - discount*100;
            var eachDiscountedItem = currencyFormat(itemTotalDiscounted/quantity);

            $quantityInput.attr('data-each', eachDiscountedItem);
            $eachText.text('@ ' + eachDiscountedItem + ' ea)');
            $transactionPrice.text(currencyFormat(itemTotalDiscounted));
            calculateTotal();
        } else {
            alert('Must be a number!')
        }
    } else if (percentValue != '') {
        if(numberRegex.test(percentValue)) {
            discount = parseFloat(percentValue)/100 * transactionPrice;
            $discountWrapper.html(discountItemTemplate({'type': 'percent', 'percent': percentValue, 'total': discount.toFixed(2)}));
            $discountButton.removeClass('active');
            $discountSubmitWrapper.removeClass('active');

            itemTotalDiscounted = transactionPrice*100 - discount*100;
            eachDiscountedItem = currencyFormat(itemTotalDiscounted/quantity);

            $quantityInput.attr('data-each', eachDiscountedItem);
            $eachText.text('@ ' + eachDiscountedItem + ' ea)');
            $transactionPrice.text(currencyFormat(itemTotalDiscounted));
            calculateTotal();
        } else {
            alert('Must be a number!')
        }
    }
});

//Delete item
$(document).on('click', '.delete-button', function () {
    var $deleteButton = $(this);
    $deleteButton.closest('.transaction-item').remove();

    calculateTotal();
});

//Create Transaction
$(document).on('click', 'body', function () {
    var $searchPopup = $('#search-popup');
    if($searchPopup.hasClass('active')){
        $searchPopup.removeClass('active');
    }
});

$(document).on('click', '#search-input', function (e) {
    e.stopPropagation();
    e.preventDefault();

    var $searchPopup = $('#search-popup');
    if(!$searchPopup.hasClass('active') && $searchPopup.children().length != 0){
        $searchPopup.addClass('active');
    }
});

$(document).on('keyup', '#search-input', function (e) {
    e.stopPropagation();
    e.preventDefault();
    var $searchInput = $(this);
    var $searchPopup = $searchInput.siblings('#search-popup');
    var $searchItems = $searchPopup.find('.search-item');
    var $activeSearchItem = $searchPopup.find('.search-item.selected');
    var keycode = e.keyCode;

    if($searchPopup.is(':visible') && (keycode == 38 || keycode == 40)) {
        upAndDownPopups(keycode, $searchPopup, $searchItems, true);
        return;
    } else if(keycode == 13 && $activeSearchItem.length) {
        $activeSearchItem.click();
        return;
    }

    var searchValue = $searchInput.val().toLowerCase().trim();
    var storeId = $searchInput.attr('data-id');

    var postData = {
        search_value: searchValue,
        id: storeId
    };

    function success(response) {
        var searchList = response;
        $searchPopup.empty();

        if(searchList.length) {
            $searchPopup.addClass('active');
        } else {
            $searchPopup.removeClass('active');
        }

        for (var i = 0; i < searchList.length; i++) {
            var searchItem = searchList[i];
            var $generatedHtml = $(searchItemTemplate(searchItem));
            $generatedHtml.data('item_data', searchItem);
            $searchPopup.append($generatedHtml);
        }
    }

    function error(response) {
        if(response.status && response.status == 403) {
            $('#overlay').find('.error').text('Permission Denied').show();
        } else {
            $('#overlay').find('.error').text(response.responseText).show();
        }
    }

    if(searchValue.length > 0) {
        sendRequest('/transaction/search/', postData, 'GET', success, error);
    }
});

$(document).on('click', '.search-item', function () {
    var $searchItem = $(this);
    var itemData = $searchItem.data('item_data');

    var $searchPopup = $searchItem.closest('#search-popup');
    var $searchInput = $searchPopup.siblings('#search-input');
    var $resultContainer = $('#receipt-item-container');

    $searchPopup.removeClass('active');
    $searchInput.val(itemData['name']);

    var $generatedHtml = $(resultItemTemplate(itemData));
    $generatedHtml.data('item', itemData);
    $resultContainer.append($generatedHtml);

    calculateTotal();
});

$(document).on({
    mouseenter: function () {
        var $searchItem = $(this);
        var $activeSearchItem = $searchItem.siblings('.selected');
        $activeSearchItem.removeClass('selected');
        $searchItem.addClass('selected');
    },
    mouseleave: function () {
       $(this).removeClass("selected");
    }
}, '.search-item');

$(document).on('click', '#transaction-submit-button', function () {
    var storeId = $(this).data('id');
    var paymentType = $('.payment-type.selected').attr('data-payment_type');
    var memo = $('#memo-input').val().trim();
    var $receiptResultWrapper = $('#receipt-result-wrapper');
    var subtotal = $receiptResultWrapper.find('#subtotal').text();
    var tax = $receiptResultWrapper.find('#tax').attr('data-tax');
    var taxRate = $receiptResultWrapper.find('#tax-rate').text();
    var taxTotal = $receiptResultWrapper.find('#tax').text();
    var total = $receiptResultWrapper.find('#total').text();
    var items = {};

    $('.transaction-item').each(function() {
        var $transactionItem = $(this);
        var quantity = parseInt($transactionItem.find('.quantity-input').val().trim());
        var itemId = $transactionItem.attr('data-id');
        var itemName = $transactionItem.find('.transaction-name').text();
        var discount =  parseFloat($(this).find('.discount').text().replace('-', ''));
        var price = $transactionItem.data('item')['price'];
        if (itemId in items) {
            items[itemId]['quantity'] +=  quantity;
            items[itemId]['discount'] +=  discount;
        } else {
            items[itemId] = {};
            items[itemId]['name'] = itemName;
            items[itemId]['quantity'] = quantity;
            items[itemId]['discount'] = discount;
            items[itemId]['price'] = price;
        }
    });

    for (var key in items) {
        var current_item = items[key];
        current_item['discount'] = currencyFormat(parseFloat(current_item['discount'])*100);
    }

    var postData = JSON.stringify({
        'payment_type': paymentType,
        'subtotal': subtotal,
        'tax': tax,
        'memo': memo,
        'items': items,
        'store_id': storeId,
        'tax_rate': taxRate,
        'tax_total': taxTotal,
        'total': total,
        'tax_percent': tax + '%'
    });

    function success(response) {
        //console.log(JSON.stringify(response));
        globals.stores[storeId]['transactions'] = response['store_transactions'];

        for (var key in postData['items']) {
            var current_item = items[key];
            current_item['paid'] = currencyFormat(parseFloat(current_item['price'])*100 - parseFloat(current_item['discount'])*100);
        }

        getReceipt(JSON.stringify({'transaction': response['transaction']}));

        alert('Transaction Created!');

        var $receiptSection = $('#receipt-section');
        $receiptSection.empty();
        $receiptSection.append(receiptTemplate({'tax': tax}));

        var $transactionWrapper = $('#transaction-wrapper');

        $transactionWrapper.empty();
        $transactionWrapper.append(transactionTableTemplate({'store': globals.stores[storeId]}))
    }

    function error(response) {
        if(response.status && response.status == 403) {
            alert('Permission Denied');
        } else {
            alert(response.responseText);
        }
    }

    sendRequest('/transaction/create/', postData, 'POST', success, error);
});

// CREATE TRANSACTION //

// LINK COLUMNS //
$(document).on('click', '.edit-store-button', function (e) {
    popupHandler(e, globals.stores[$(this).closest('.store').attr('data-id')], linkedColumnsTemplate);
});

$(document).on('click', '#linked-column-submit', function () {
    var postData = JSON.stringify({
        'store_id': $(this).attr('data-id'),
        'link_columns': {
            'name': $('#name-column-input').val(),
            'price': $('#price-column-input').val(),
            'quantity': $('#quantity-column-input').val(),
            'cost': $('#cost-column-input').val()
        }
    });

    function success(response) {
        //JSON.stringify(response);
        var $storeContainer = $('.store-container');
        $storeContainer.empty();
        $storeContainer.append(storeItemTemplate({'stores': globals.stores}));

        $('#overlay').removeClass('active');
        globals.stores[response['id']] = response;
    }

    function error(response) {
        if(response.status && response.status == 403) {
            $('#overlay').find('.error').text('Permission Denied').show();
        } else {
            $('#overlay').find('.error').text(response.responseText).show();
        }
    }

    sendRequest('/transaction/link_columns/', postData, 'POST', success, error);
});
// LINK COLUMNS //

// RECEIPT SETTINGS //
$(document).on('click', '#add-footer-button, #add-header-button', function () {
    var $lineContainer = $(this).siblings('.line-container');
    var $receiptInputWrapper = $lineContainer.find('.receipt-input-wrapper');
    //Copy last item
    var $copyItem = $receiptInputWrapper.last().clone();
    var newNumber = String(parseInt($copyItem.attr('data-number')) + 1);
    $copyItem.attr('data-number', newNumber);
    $copyItem.find('.receipt-input-container .receipt-text-label').text('Text (Line ' + newNumber + ')');
    $copyItem.find('.receipt-text-input').val('');
    $lineContainer.append($copyItem);

    var $receiptPreviewWrapper = $('#receipt-'+$receiptInputWrapper.attr('data-type')+'-wrapper');
    var $copyPreviewItem = $receiptPreviewWrapper.find('.receipt-line').last().clone();
    $copyPreviewItem.attr('data-receipt_id', newNumber);
    $copyPreviewItem.text('');
    $receiptPreviewWrapper.append($copyPreviewItem);
});

$(document).on('click', '.delete-line-item', function () {
    var $item = $(this).closest('.receipt-input-wrapper');
    var $wrapper = $item.parent();
    var $items = $wrapper.find('.receipt-input-wrapper');

    var $receiptPreviewWrapper = $('#receipt-'+$item.attr('data-type')+'-wrapper');
    var $previewItem = $receiptPreviewWrapper.find('.receipt-line[data-receipt_id="' + $item.attr('data-number') + '"]');

    if($items.length > 1) {
        $item.remove();
        $previewItem.remove();

        var number = 1;

        $wrapper.find('.receipt-input-wrapper').each(function() {
            var $this = $(this);
            $this.attr('data-number', number);
            $this.find('.receipt-input-container .receipt-text-label').text('Text (Line ' + number + ')');
            number += 1;
        });

        number = 1;

        $receiptPreviewWrapper.find('.receipt-line').each(function() {
            var $this = $(this);
            $this.attr('data-receipt_id', number);
            number += 1;
        });
    }
});

$(document).on('click', '#save-receipt-settings', function () {
    var ipAddress = '';

    var header = {
        'lines': []
    };

    var footer = {
        'lines': []
    };

    function getLineData($this, lineType) {
        var text = $this.find('.receipt-text-input').val().trim();

        var currentData = {
            'size': $this.find('.font-size-input').val(),
            'align': $this.find('.font-alignment-input').val(),
            'text': text
        };

        if(text != '' && lineType == 'header') {
            header['lines'].push(currentData);
        } else if(text != '' && lineType == 'footer') {
            footer['lines'].push(currentData);
        }
    }

    $('#printer-address-wrapper').find('.printer-address').each(function() {
        ipAddress = ipAddress + $(this).val().trim() + '.';
    });

    $('#header-container').find('.header-item').each(function() {
        getLineData($(this), 'header');
    });

    $('#footer-container').find('.footer-item').each(function() {
        getLineData($(this), 'footer');
    });

    var postData = {
        'ip_address': ipAddress.substring(0, ipAddress.length - 1),
        'header': header,
        'footer': footer
    };

    $.ajax({
        headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
        url: globals.base_url + '/transaction/save_receipt/',
        data: JSON.stringify(postData),
        dataType: 'json',
        type: "POST",
        success: function (response) {
            //console.log(JSON.stringify(response));

            var $settingResult = $('#receipt-settings-result');
            $settingResult.removeClass('denied');
            $settingResult.addClass('success');
            $settingResult.text('Saved!');
            $settingResult.show();
            $settingResult.fadeOut(2000);
        },
        error: function (response) {
            if(response.status && response.status == 403) {
                var $settingResult = $('#receipt-settings-result');
                $settingResult.removeClass('success');
                $settingResult.addClass('denied');
                $settingResult.text('Permission Denied');
                $settingResult.show();
                $settingResult.fadeOut(2000);
            }
        }
    });
});
// RECEIPT SETTINGS //

//RECEIPT PREVIEW //
$(document).on('keydown keyup', '.receipt-text-input', function () {
    var $receiptTextInput = $(this);
    var lineId = $receiptTextInput.closest('.receipt-input-wrapper').attr('data-number');
    var textValue = $receiptTextInput.val();
    var $receiptInputWrapper = $receiptTextInput.closest('.receipt-input-wrapper');

    $('#receipt-'+$receiptInputWrapper.attr('data-type')+'-wrapper').find('[data-receipt_id="' + lineId + '"]').text(textValue);
});

$(document).on('focusin', '.font-alignment-input', function() {
    $(this).data('val', $(this).val());
}).on('change','.font-alignment-input', function() {
    var $this = $(this);
    var lineId = $this.closest('.receipt-input-wrapper').attr('data-number');
    var lineType = $this.closest('.receipt-input-wrapper').attr('data-type');
    var $receiptLine = $('#receipt-'+lineType+'-wrapper').find('[data-receipt_id="' + lineId + '"]');

    $receiptLine.removeClass('align-'+ $this.data('val'));
    $receiptLine.addClass('align-'+ $this.val());
    $this.attr('data-value', $this.val());
});

$(document).on('focusin', '.font-size-input', function() {
    $(this).data('val', $(this).val());
}).on('change','.font-size-input', function() {
    var $this = $(this);
    var lineId = $this.closest('.receipt-input-wrapper').attr('data-number');
    var lineType = $this.closest('.receipt-input-wrapper').attr('data-type');
    var $receiptLine = $('#receipt-'+lineType+'-wrapper').find('[data-receipt_id="' + lineId + '"]');

    $receiptLine.removeClass('font-'+$this.data('val'));
    $receiptLine.addClass('font-'+$this.val());
    $this.data('val', $this.val());
});
//RECEIPT PREVIEW//