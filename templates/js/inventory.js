require('./../css/general.css');
require('./../css/inventory.css');
require('./../css/permission.css');
require('./../library/fontawesome/fontawesome.js');
require('./../library/tippy/tippy.css');

//libraries
var $ = require('jquery');
require('./../library/tippy/tippy.js');
require('./../js/general.js');

var storeTemplate = require('./../handlebars/store.hbs');
var storeEditTemplate = require('./../handlebars/store_edit.hbs');
var storeItemTemplate = require('./../handlebars/store_item.hbs');

var inventoryTemplate = require('./../handlebars/inventory/inventory.hbs');
var inventoryAddTemplate = require('./../handlebars/inventory/add.hbs');
var inventoryEditTemplate = require('./../handlebars/inventory/edit.hbs');
var inventoryDeleteTemplate = require('./../handlebars/inventory/delete.hbs');
var inventoryImportTemplate = require('./../handlebars/inventory/import.hbs');
var inventoryImportTableTemplate = require('./../handlebars/inventory/import_table.hbs');
var inventoryExportTemplate = require('./../handlebars/inventory/export.hbs');
var inventoryDropTemplate = require('./../handlebars/inventory/drop.hbs');
var inventoryReceivedTemplate = require('./../handlebars/inventory/received.hbs');
var inventoryDamagedTemplate = require('./../handlebars/inventory/damaged.hbs');
var inventoryResetTemplate = require('./../handlebars/inventory/reset.hbs');
var rowTemplate = require('./../handlebars/inventory/row.hbs');
var itemLogTemplate = require('./../handlebars/inventory/item_log.hbs');
var linkedColumnsTemplate = require('./../handlebars/transaction/link_columns.hbs');

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

function fileRequest(url, formData, success, error) {
    $.ajax({
        headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
        url: globals.base_url + url,
        data: formData,
        type: "POST",
        cache: false,
        contentType: false,
        processData: false,
        success: function (response) {
            success(response);
        },
        error: function (response) {
            error(response);
        }
    });
}

function editCheck(origValue, newValue, $editSubmit) {
    if(origValue !== newValue) {
        $editSubmit.prop('disabled', false);
    } else {
        $editSubmit.prop('disabled', true);
    }
}

function overlayError(response) {
    if(response.status && response.status == 403) {
        $('#overlay').find('.error').text(' - Permission Denied').show();
    } else {
        $('#overlay').find('.error').text(' - ' + response.responseText).show();
    }
}

function initiateHoverColumn() {
    $('.popup-table th').hover(function() {
        var t = parseInt($(this).index()) + 1;
        $('th:nth-child(' + t + ')').addClass('highlight');
        $('td:nth-child(' + t + ')').addClass('highlight');
    }, function() {
        var t = parseInt($(this).index()) + 1;
        $('th:nth-child(' + t + ')').removeClass('highlight');
        $('td:nth-child(' + t + ')').removeClass('highlight');
    });
}

function initiateDragDrop() {
    var $dragoverWrapper = $('#dragover-wrapper');

    $dragoverWrapper.on({
        'dragover dragenter': function(e) {
            e.preventDefault();
            e.stopPropagation();
            $dragoverWrapper.addClass('active');
        }
    });

    $dragoverWrapper.on({
        'dragexit dragleave': function() {
            $dragoverWrapper.removeClass('active');
        },
        'drop': function(e) {
            e.preventDefault();
            e.stopPropagation();

            var file = e.originalEvent.dataTransfer.files[0];
            var fileType = file.type;
            //console.log(fileType)

            if(fileType == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || fileType == 'application/vnd.ms-excel') {
                var formData = new FormData();
                formData.append('excel_file', file);

                function success(response) {
                    //console.log(JSON.stringify(response));
                    var $importTableWrapper = $('#import-table-wrapper');
                    $importTableWrapper.empty();
                    $importTableWrapper.append(inventoryImportTableTemplate(response));

                    var $popup = $('.popup');

                    //SHOW NEXT STEP
                    $('#import-step').show();
                    $popup.animate({scrollLeft: $popup.width()}, "slow");
                }

                function error(response) {
                    alert('File cannot be read!');
                }

                fileRequest('/inventory/read_excel/', formData, success, error);
            } else {
                alert('This file must be an excel or csv!');
            }
        }
    });
}

function checkStore() {
    if(!$('.store').length) {
        return false;
    } else {
        return true;
    }
}

function checkColumnsRows() {
    var storeId = $('.store.active').attr('data-id');
    var store = globals.stores[storeId];

    if(storeId === undefined) {
        $('#import-button').addClass('inactive');
        $('#add-button').addClass('inactive');
        $('#edit-button').addClass('inactive');
        $('#delete-button').addClass('inactive');
        $('#export-button').addClass('inactive');
        $('#drop-button').addClass('inactive');
        $('#received-button').addClass('inactive');
        $('#damaged-button').addClass('inactive');
        $('#reset-button').addClass('inactive');
    } else if(!store['columns'].length && !store['inventory'].length) {
        $('#import-button').removeClass('inactive');
        $('#add-button').removeClass('inactive');
        $('#edit-button').addClass('inactive');
        $('#delete-button').addClass('inactive');
        $('#export-button').addClass('inactive');
        $('#drop-button').addClass('inactive');
        $('#received-button').addClass('inactive');
        $('#damaged-button').addClass('inactive');
        $('#reset-button').addClass('inactive');
    } else {
        $('#edit-button').removeClass('inactive');
        $('#delete-button').removeClass('inactive');
        $('#export-button').removeClass('inactive');
        $('#drop-button').removeClass('inactive');
        $('#received-button').removeClass('inactive');
        $('#damaged-button').removeClass('inactive');
        $('#reset-button').removeClass('inactive');
    }
}

$(document).ready(function() {
    var activeStore = globals.stores[globals.active_store];

    $('#inventory-link').addClass('active');
    $('#store-container').append(storeItemTemplate({'stores': globals.stores, 'active_store': parseInt(globals.active_store)}));

    var $inventoryWrapper = $('#inventory-wrapper');
    $inventoryWrapper.append(inventoryTemplate({'stores_length': Object.keys(globals.stores).length, 'store': activeStore, 'boss_username': globals.boss_username}));

    var $logWrapper = $('#log-wrapper');
    $logWrapper.append(itemLogTemplate({'store': activeStore}));

    checkColumnsRows();
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

// STORE //
$(document).on('click', '#create-store-button', function (e) {
    popupHandler(e, {}, storeTemplate);
});

$(document).on('click', '.store', function () {
    var $inventoryWrapper = $('#inventory-wrapper');
    $inventoryWrapper.empty();
    $inventoryWrapper.append(inventoryTemplate({'store': globals.stores[$(this).closest('.store').attr('data-id')]}));
});

$(document).on('click', '.edit-store-button', function (e) {
    popupHandler(e, globals.stores[$(this).closest('.store').attr('data-id')], storeEditTemplate);
});

$(document).on('click', '.store:not(.active)', function () {
    $('#store-container').find('.active').removeClass('active');
    $(this).addClass('active');
});

$(document).on('keyup', '.edit#store-name', function () {
    var $this = $(this);

    editCheck(
        globals.stores[$this.closest('.popup').attr('data-id')]['name'],
        $this.val().trim().replace(/ +/g, " "),
        $('#edit-store-submit')
    );
});

function storeSuccess(response, exception) {
    var storeId = response['id'].toString();
    var $storeContainer = $('#store-container');

    var activeStore = $('.store.active').attr('data-id');

    //If we are deleting a store remove else add/edit!
    if(exception == 'delete') {
        delete globals.stores[storeId];
        //If the active store was clicked then just click first store of the list instead.
        if(activeStore == storeId) {
            activeStore = $storeContainer.find('.store').first().attr('data-id');
        }
    } else {
        globals.stores[storeId] = response;
    }

    //Update UI store list
    $storeContainer.empty();
    $storeContainer.append(storeItemTemplate({'stores': globals.stores}));

    //If we are adding a store click it!
    if(exception == 'add') {
        $('.store[data-id="' + storeId + '"]').click();
    } else {
        var $store = $('.store[data-id="' + activeStore + '"]');
        if($store.length) {
            $store.click();
        } else {
            var $inventoryWrapper = $('#inventory-wrapper');
            $inventoryWrapper.empty();
            $inventoryWrapper.append(inventoryTemplate({}));
        }
    }

    //Close popup
    $('#overlay').removeClass('active');
    checkColumnsRows();
}

//Create Store
$(document).on('click', '#create-store-submit', function () {
    var data = {
        'store_name': $('#store-name').val().trim().replace(/ +/g, " ")
    };

    sendRequest('/store/create_store/', data, 'POST', storeSuccess, overlayError, 'add');
});

//Edit Store
$(document).on('click', '#edit-store-submit', function () {
    var data = {
        'store_name': $('#store-name').val().trim().replace(/ +/g, " "),
        'id': $(this).closest('.popup').attr('data-id')
    };

    sendRequest('/store/edit_store/', data, 'POST', storeSuccess, overlayError, 'edit');
});

//Delete Store
$(document).on('click', '#delete-store-submit', function () {
    var data = {
        'id': $(this).closest('.popup').attr('data-id')
    };

    sendRequest('/store/delete_store/', data, 'POST', storeSuccess, overlayError, 'delete');
});
// STORE //

//SEARCH//
$(document).on('keyup', '#search-input', function () {
    var $searchInput = $(this);
    var searchValue = $searchInput.val().trim().toLowerCase();
    var $table = $('#inventory-table');

    //loops through rows
    $table.find('tr').each(function() {
        var $currentRow = $(this);
        var $columns = $currentRow.find('td');
        //loops through filters and compares
        for (var i = 0; i < $columns.length; i++) {
            //find each filter value
            var filterValue = $columns.text().toLowerCase();
            //if find match
            if(filterValue.indexOf(searchValue) != -1) {
                $currentRow.show();
            } else {
                $currentRow.hide();
            }
        }
    })
});
//SEARCH//

// ADD INVENTORY //
$(document).on('click', '#add-button', function (e) {
    var storeId = $('.store.active').attr('data-id');
    if(checkStore()) {
        popupHandler(e, {'columns': globals.stores[storeId]['columns']}, inventoryAddTemplate);
    } else {
        popupHandler(e, {}, storeTemplate);
    }
});


$(document).on('click', '#create-column-submit', function () {
    var columnName = $('#column-name').val();
    var storeId = $('.store.active').attr('data-id');

    var data = {
        column_name: columnName,
        id: storeId
    };

    function success(response) {
        //console.log(JSON.stringify(response));

        // Show updated inventory
        var $inventoryWrapper = $('#inventory-wrapper');
        $inventoryWrapper.empty();
        $inventoryWrapper.append(inventoryTemplate({'store': response['store'], 'boss_username': globals.boss_username}));

        // Remove popup
        $('#overlay').removeClass('active');

        // CACHE THE DATA
        globals.stores[storeId] = response['store'];

        checkColumnsRows();
    }

    sendRequest('/inventory/add_column/', data, 'POST', success, overlayError, 'edit');
});

$(document).on('click', '#create-row-submit', function () {
    var storeId = $('.store.active').attr('data-id');

    var itemData = {};

    $('.row-input').each(function() {
        var $currentInput = $(this);
        itemData[$currentInput.attr('data-column')] = $currentInput.val();
    });

    var data = JSON.stringify({
        item: itemData,
        id: storeId
    });

    function success(response) {
        $('#overlay').removeClass('active');
        var $inventoryTable = $('#inventory-table tbody');

        $inventoryTable.prepend(rowTemplate({'item': response['item'], 'columns': response['store']['columns']}));

        // CACHE THE DATA
        globals.stores[storeId] = response['store'];
        checkColumnsRows();
    }

    function error(response) {
        var $wrapper = $('#multiple-inputs');

        $wrapper.find('.error').each(function() {
            $(this).hide();
        });

        if(response.status && response.status == 403) {
            $wrapper.find('.error.permission').text('Permission Denied').show();
        } else {
            var errorList = JSON.parse(response.responseText);
            for (var i = 0; i < errorList.length; i++) {
                var columnName = errorList[i][0];
                var errorMsg = errorList[i][1];

                $wrapper.find(".error[data-column='" + columnName + "']").text(errorMsg).show();
            }
        }
    }

    sendRequest('/inventory/add_row/', data, 'POST', success, error, 'edit');
});
// ADD INVENTORY //


// EDIT INVENTORY //
$(document).on('click', '#edit-button:not(.inactive)', function (e) {
    var storeId = $('.store.active').attr('data-id');

    if(checkStore()) {
        popupHandler(e, {store: globals.stores[storeId]}, inventoryEditTemplate);
    } else {
        popupHandler(e, {}, storeTemplate);
    }

    initiateHoverColumn();
});

$(document).on('click', '#edit-inventory-wrapper .popup-table th', function () {
    var $this = $(this);
    if(!globals.edit_mode) {
        var value = $this.attr('data-value');
        var $instructions = $('#instructions');
        $this.html('<input value="' + value[0].toUpperCase() + value.slice(1) + '" />');
        $instructions.show();
        $instructions.html("Press '<b>ENTER</b>' to submit or exit EDIT MODE.");
        globals.edit_mode = true;
    }
});

$(document).on('click', '#edit-inventory-wrapper .popup-table tbody tr', function () {
    var $this = $(this);
    if(!globals.edit_mode) {
        var $td = $this.find('td');

        for (var i = 0; i < $td.length; i++) {
            var $currentRow = $($td[i]);
            var value = $currentRow.attr('data-value');
            $currentRow.html('<input value="' + value + '" />');
            $currentRow.find('input').css({width: String(value.length) + 'ch'})
        }

        var $instructions = $('#instructions');
        $instructions.show();
        $instructions.html("Press '<b>ENTER</b>' to submit or exit EDIT MODE.");
        globals.edit_mode = true;
    }
});

$(document).on('click', '.popup-table input', function (e) {
    e.stopPropagation();
});

$(document).on('keyup', function(e) {
    if (e.keyCode == 13 && globals.edit_mode) {
        var storeId = $('.store.active').attr('data-id');
        var $input = $('.popup-table').find('input');

        if($input.length > 1) {
            var $parent = $($($input[0]).parent());
        } else {
            $parent = $($input.parent());
        }

        var oldValue = $parent.attr('data-value');
        var newValue = $input.val().trim();
        var $popupInventoryWrapper = $('#popup-inventory-wrapper');

        //If parent is th and old value does not equal new value
        //Then we are editing a column
        if($parent.is('th') && newValue.toLowerCase() != oldValue) {
            var data = {
                new_column_name: newValue,
                prev_column_name: oldValue,
                id: storeId
            };

            sendRequest('/inventory/edit_column/', data, 'POST', success, overlayError, 'edit');

        } else if($parent.is('th') && newValue.toLowerCase() == oldValue) {
            $('#instructions').hide();
            $popupInventoryWrapper.empty();
            $popupInventoryWrapper.append(inventoryTemplate({'store': globals.stores[storeId], 'edit': true}));
            globals.edit_mode = false;
        } else if($parent.is('td')) {
            var itemData = {};

            $input.each(function() {
                var $currentInput = $(this);
                itemData[$currentInput.closest('td').attr('data-column')] = $currentInput.val();
            });

            data = JSON.stringify({
                'item': itemData,
                'item_id': $parent.closest('tr').attr('data-id'),
                'id': storeId
            });

            sendRequest('/inventory/edit_row/', data, 'POST', success, overlayError, 'edit');
        }

        function success(response) {
            var $inventoryWrapper = $('#inventory-wrapper');

            $popupInventoryWrapper.empty();
            $popupInventoryWrapper.append(inventoryTemplate({'store': response['store'], 'edit': true}));
            $inventoryWrapper.empty();
            $inventoryWrapper.append(inventoryTemplate({'store': response['store']}));

            globals.stores[storeId] = response['store'];
            globals.edit_mode = false;

            $('#instructions').text(response['success_msg']);
            initiateHoverColumn();
        }
    }
});
// EDIT INVENTORY //


// DELETE INVENTORY //
$(document).on('click', '#delete-button:not(.inactive)', function (e) {
    var storeId = $('.store.active').attr('data-id');

    if(checkStore()) {
        popupHandler(e, {store: globals.stores[storeId]}, inventoryDeleteTemplate);
    } else {
        popupHandler(e, {}, storeTemplate);
    }

    initiateHoverColumn();
});

$(document).on('click', '#delete-inventory-wrapper .popup-table th', function () {
    if(!globals.edit_mode) {
        var $this = $(this);
        var $highlight = $('.highlight');
        var $deleteSubmit = $('#delete-submit');

        $highlight.each(function() {
            $(this).addClass('chosen');
        });

        $('#delete-details').show();

        $deleteSubmit.attr('data-type', 'column');
        $deleteSubmit.attr('data-req', $this.attr('data-value'));
        globals.edit_mode = true;
    }
});

$(document).on('click', '#delete-inventory-wrapper .popup-table tbody tr', function () {
    if(!globals.edit_mode) {
        var $this = $(this);
        var $highlight = $this.find('td');
        var $deleteSubmit = $('#delete-submit');

        $highlight.each(function () {
            $(this).addClass('chosen');
        });

        $('#delete-details').show();

        $deleteSubmit.attr('data-type', 'row');
        $deleteSubmit.attr('data-req', $this.attr('data-id'));
        globals.edit_mode = true;
    }
});

$(document).on('click', '#delete-cancel', function () {
    var $chosen = $('.chosen');

    $chosen.each(function () {
        $(this).removeClass('chosen');
    });

    $('#delete-details').hide();

    globals.edit_mode = false;
});

$(document).on('click', '#delete-submit', function () {
    var $this = $(this);
    var storeId = $('.store.active').attr('data-id');
    var dataType = $this.attr('data-type');

    var data = {
        id: storeId
    };

    if(dataType == 'column') {
        data['column_name'] = $this.attr('data-req');

        sendRequest('/inventory/delete_column/', data, 'POST', success, overlayError, 'edit');
    } else {
        data['item_id'] = $this.attr('data-req');

        sendRequest('/inventory/delete_row/', data, 'POST', success, overlayError, 'edit');
    }

    function success(response) {
        var $popupInventoryWrapper = $('#popup-inventory-wrapper');
        var $inventoryWrapper = $('#inventory-wrapper');

        $popupInventoryWrapper.empty();
        $popupInventoryWrapper.append(inventoryTemplate({'store': response['store'], 'edit': true}));
        $inventoryWrapper.empty();
        $inventoryWrapper.append(inventoryTemplate({'store': response['store']}));

        globals.stores[storeId] = response['store'];
        globals.edit_mode = false;

        $('#delete-details').hide();
        initiateHoverColumn();
    }
});
// DELETE INVENTORY //

// IMPORT //
$(document).on('click', '#import-button', function (e) {
    var storeId = $('.store.active').attr('data-id');

    if(checkStore()) {
        popupHandler(e, {store: globals.stores[storeId]}, inventoryImportTemplate);
    } else {
        popupHandler(e, {}, storeTemplate);
    }

    initiateDragDrop();
});

$(document).on('click', '#dragover-wrapper', function () {
    $('#file-upload').click();
});

$(document).on('click', '#file-upload', function (e) {
    e.stopPropagation();
});

$(document).on('click', '#no-submit[data-step="import-step"]', function () {
    $('#file-upload').val('');
});

$(document).on('click', '.include-input', function () {
    var $includeInput = $(this);
    var $importTable = $includeInput.closest('#import-table');
    var columnPosition = (parseInt($includeInput.attr('data-column')) + 1).toString();
    var $columnData = $importTable.find('tbody tr td:nth-child(' + columnPosition + ')');

    $columnData.each(function() {
        if($includeInput.prop('checked')) {
            $(this).addClass('included');
        } else {
            $(this).removeClass('included');
        }
    });
});

$(document).on('change', '#file-upload', function () {
    var file = $(this).get(0).files[0];
    var formData = new FormData();
    formData.append('excel_file', file);


    //NEED TO GO TO NEXT STEP
    function success(response) {
        //console.log(JSON.stringify(response));
        var $importTableWrapper = $('#import-table-wrapper');
        $importTableWrapper.empty();
        $importTableWrapper.append(inventoryImportTableTemplate(response));

        var $popup = $('.popup');

        //SHOW NEXT STEP
        $('#import-step').show();
        $popup.animate({scrollLeft: $popup.width()}, "slow");
    }

    function error(response) {
        alert('File cannot be read!');
    }

    fileRequest('/inventory/read_excel/', formData, success, error);
});

$(document).on('click', '#import-submit', function () {
    //Find all included columns
    var $importTable = $('#import-table');
    var column = [];
    var inventory = {};
    var storeId = $('.popup').attr('data-id');
    var id = 1;
    var storeInventory = globals.stores[storeId]['inventory'];
    var inventoryObject = {};

    for (var i = 0; i < storeInventory.length; i++) {
        inventoryObject[storeInventory[i][0]] = storeInventory[i][1];
    }

    var globalKeys = Object.keys(inventoryObject);

    if(Object.keys(globalKeys).length !== 0) {
        id = parseInt(globalKeys[globalKeys.length-1]);
    }

    //GET HEADERS
    $importTable.find('.include-input:checked').each(function() {
        var $includeInput = $(this);
        var columnPosition = parseInt($includeInput.attr('data-column'));
        var columnHeader = $importTable.find('.header-input[data-column="' + columnPosition + '"]').val();
        column.push(columnHeader.toLowerCase());
    });

    //GET ROWS
    $importTable.find('tbody tr').each(function() {
        var $included = $(this).find('.included');
        var row = {};

        $included.each(function(i) {
            var current_header = column[i];
            row[current_header] = $(this).text();
        });

        inventory[id.toString()] = row;
        id += 1;
    });

    var data = {
        columns: column,
        inventory: inventory,
        id: storeId
    };

    function success(response) {
        //console.log(JSON.stringify(response));

        var $inventoryWrapper = $('#inventory-wrapper');
        $inventoryWrapper.empty();
        $inventoryWrapper.append(inventoryTemplate({'store': response['store']}));

        // Remove popup
        $('#overlay').removeClass('active');

        globals.stores[storeId] = response['store'];
        checkColumnsRows();
    }

    sendRequest('/inventory/import_submit/', JSON.stringify(data), 'POST', success, overlayError);
});
// IMPORT //

// EXPORT //
$(document).on('click', '#export-button:not(.inactive)', function (e) {
    var storeId = $('.store.active').attr('data-id');
    if(checkStore()) {
        popupHandler(e, {id: storeId}, inventoryExportTemplate);
    } else {
        popupHandler(e, {}, storeTemplate);
    }
});

function createXmlHttpRequestObject() {
    if(window.XMLHttpRequest) {
        return new XMLHttpRequest();
    } else {
        return new ActiveXObject("Microsoft.XMLHTTP")
    }
}

$(document).on('click', '#json-button', function () {
    var store = globals.stores[$('.popup').attr('data-id')];
    var storeInventory = store['inventory'];
    var columns = store['columns'];
    var inventory = {};
    var inventoryJson = [];

    for (var i = 0; i < storeInventory.length; i++) {
        inventory[storeInventory[i][0]] = storeInventory[i][1];
        inventoryJson.push(storeInventory[i][1]);
    }

    var data = JSON.stringify({'columns': {}, 'inventory': {}, 'type': 'json'});

    var tab = window.open();
    function success() {
        tab.document.open();
        tab.document.write('<pre style="background:#000; color:#fff; margin: -8px;">' + JSON.stringify({'inventory': inventoryJson}, null, 2) + '</pre>');
        tab.document.close();
    }

    sendRequest('/inventory/export_submit/', data, 'POST', success, overlayError);
});

$(document).on('click', '#csv-button', function () {
    var exportLink = document.getElementById('export-link');
    var store = globals.stores[$('.popup').attr('data-id')];
    var storeInventory = store['inventory'];
    var columns = store['columns'];
    var inventory = {};
    var inventoryJson = [];

    for (var i = 0; i < storeInventory.length; i++) {
        inventory[storeInventory[i][0]] = storeInventory[i][1];
        inventoryJson.push(storeInventory[i][1]);
    }

    var data = JSON.stringify({'columns': {}, 'inventory': {}, 'type': 'csv'});

    function success() {
        var csvFile = '';

        for (var i = 0; i < columns.length; i++) {
            if (i == columns.length - 1) {
                csvFile += columns[i] + '\r\n';
            } else {
                csvFile += columns[i] + ',';
            }
        }

        for (var p = 0; p < inventoryJson.length; p++) {
            var currentRow = inventoryJson[p];

            for (var c = 0; c < columns.length; c++) {
                if (c == columns.length - 1) {
                    csvFile += '"' + currentRow[columns[c]] + '"\r\n';
                } else {
                    csvFile += '"' + currentRow[columns[c]] + '",';
                }
            }
        }

        var blob = new Blob([csvFile], {type: 'text/csv;charset=utf-8;'});
        var url = URL.createObjectURL(blob);
        exportLink.setAttribute("href", url);
        exportLink.setAttribute("download", "inventory.csv");
        exportLink.click();
    }

    sendRequest('/inventory/export_submit/', data, 'POST', success, overlayError);
});

$(document).on('click', '#excel-button', function () {
    var exportLink = document.getElementById('export-link');
    var store = globals.stores[$('.popup').attr('data-id')];
    var storeInventory = store['inventory'];
    var columns = store['columns'];
    var inventory = {};
    var inventoryJson = [];

    for (var i = 0; i < storeInventory.length; i++) {
        inventory[storeInventory[i][0]] = storeInventory[i][1];
        inventoryJson.push(storeInventory[i][1]);
    }

    var xmlHttp = createXmlHttpRequestObject();
    xmlHttp.open('POST', '/inventory/export_submit/', true);
    xmlHttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    xmlHttp.setRequestHeader("X-CSRFToken", $('input[name="csrfmiddlewaretoken"]').attr('value'));
    xmlHttp.responseType = 'blob';

    xmlHttp.onload = function() {
        if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
            var blob = this.response;
            var contentTypeHeader = xmlHttp.getResponseHeader("Content-Type");
            exportLink.setAttribute("href", window.URL.createObjectURL(new Blob([blob], {type: contentTypeHeader})));
            exportLink.setAttribute("download", "inventory.xlsx");
            exportLink.click();
        } else if (xmlHttp.status === 403) {
            $('#export-wrapper').find('.error').text('Permission Denied').show();
        }
   };
   xmlHttp.send(JSON.stringify({'columns': columns, 'inventory': inventoryJson, 'type': 'excel'}));
});

$(document).on('click', '#export-submit', function () {
    var fileType = $('#export-type-input').val();
    var exportLink = document.getElementById('export-download');
    var store = globals.stores[$('.establishment.active').attr('data-id')];
    var storeInventory = store['inventory'];
    var columns = store['columns'];
    var inventory = {};
    var valid = false;
    var inventoryJson = [];

    for (var i = 0; i < storeInventory.length; i++) {
        inventory[storeInventory[i][0]] = storeInventory[i][1];
        inventoryJson.push(storeInventory[i][1]);
    }

    if(fileType == 'csv' || fileType == 'json') {
        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/inventory/export_submit/',
            data: JSON.stringify({'columns': {}, 'inventory': {}, 'type': fileType}),
            dataType: 'json',
            type: "POST",
            success: function (response) {
                valid = true;
                callback();
            },
            error: function (response) {
                if(response.status && response.status == 403) {
                    $('#export-wrapper').find('.error').text('Permission Denied').show();
                }
            }
        });
    }

    if(fileType == 'json') {
        var tab = window.open();
    }

    function callback() {
        if (valid && fileType == 'csv') {
            var csvFile = '';

            for (var i = 0; i < columns.length; i++) {
                if (i == columns.length - 1) {
                    csvFile += columns[i] + '\r\n';
                } else {
                    csvFile += columns[i] + ',';
                }
            }

            for (var p = 0; p < inventoryJson.length; p++) {
                var currentRow = inventoryJson[p];

                for (var c = 0; c < columns.length; c++) {
                    if (c == columns.length - 1) {
                        csvFile += '"' + currentRow[columns[c]] + '"\r\n';
                    } else {
                        csvFile += '"' + currentRow[columns[c]] + '",';
                    }
                }
            }

            var blob = new Blob([csvFile], {type: 'text/csv;charset=utf-8;'});
            var url = URL.createObjectURL(blob);
            exportLink.setAttribute("href", url);
            exportLink.setAttribute("download", "inventory.csv");
            exportLink.click();
        } else if (valid && fileType == 'json') {
            tab.document.open();
            tab.document.write('<pre style="background:#000; color:#fff; margin: -8px;">' + JSON.stringify({'inventory': inventoryJson}, null, 2) + '</pre>');
            tab.document.close();
        }
    }

    if(fileType == 'excel') {
        var xmlHttp = createXmlHttpRequestObject();
        xmlHttp.open('POST', '/inventory/export_submit/', true);
        xmlHttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
        xmlHttp.setRequestHeader("X-CSRFToken", $('input[name="csrfmiddlewaretoken"]').attr('value'));
        xmlHttp.responseType = 'blob';

        xmlHttp.onload = function() {
            if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
                var blob = this.response;
                var contentTypeHeader = xmlHttp.getResponseHeader("Content-Type");
                exportLink.setAttribute("href", window.URL.createObjectURL(new Blob([blob], {type: contentTypeHeader})));
                exportLink.setAttribute("download", "inventory.xlsx");
                exportLink.click();
            } else if (xmlHttp.status === 403) {
                $('#export-wrapper').find('.error').text('Permission Denied').show();
            }
       };
       xmlHttp.send(JSON.stringify({'columns': columns, 'inventory': inventoryJson, 'type': fileType}));
    }
});
// EXPORT //

// DROP //
$(document).on('click', '#drop-button:not(.inactive)', function (e) {
    var storeId = $('.store.active').attr('data-id');

    if(checkStore()) {
        popupHandler(e, {id: storeId}, inventoryDropTemplate);
    } else {
        popupHandler(e, {}, storeTemplate);
    }
});

$(document).on('click', '#drop-table-submit', function () {
    var storeId = $('#drop-inventory-wrapper').attr('data-id');

    var data = {
        drop_table: true,
        id: storeId
    };

    function success(response) {
        var $inventoryWrapper = $('#inventory-wrapper');
        $inventoryWrapper.empty();
        $inventoryWrapper.append(inventoryTemplate({'store': response['store']}));

        // Remove popup
        $('#overlay').removeClass('active');

        globals.stores[storeId] = response['store'];
        checkColumnsRows();
    }

    sendRequest('/inventory/drop_table/', data, 'POST', success, overlayError);
});
// DROP //

// RECEIVED //
$(document).on('click', '#received-button:not(.inactive)', function (e) {
    var storeId = $('.store.active').attr('data-id');
    var store = globals.stores[storeId];
    var linkedColumns = store['link_columns'];

    console.log(storeId)
    console.log(JSON.stringify(store))
    console.log(store['id'])

    if(checkStore()) {
        if(linkedColumns['name'] && linkedColumns['price'] && linkedColumns['cost'] && linkedColumns['quantity']) {
            popupHandler(e, {store: globals.stores[storeId]}, inventoryReceivedTemplate);
        } else {
            popupHandler(e, {'id': store['id'], 'columns': store['columns'], 'link_columns': store['link_columns']}, linkedColumnsTemplate);
        }
    } else {
        popupHandler(e, {}, storeTemplate);
    }
});


$(document).on('click', '#received-wrapper #choose-step tbody tr', function () {
    var $this = $(this);
    var itemId = $this.attr('data-id');
    var $popup = $('.popup');
    var $receivedBody = $('#received-tbody');

    $receivedBody.empty();
    $receivedBody.append($this.clone());
    $('#received-submit').attr('data-id', itemId);
    $('#received-step').show();
    $popup.animate({scrollLeft: $popup.width()}, "slow");
});

$(document).on('click', '#received-submit', function () {
    var storeId = $('#received-wrapper').attr('data-id');

    var postData = {
        id: storeId,
        change_value: $('#received-input').val(),
        details: $('#details-input').val(),
        item_id: $(this).attr('data-id')
    };

    function success(response) {
        //console.log(JSON.stringify(response));
        $('#operation-overlay').removeClass('active');

        globals.stores[storeId] = response['store'];

        var $inventoryWrapper = $('#inventory-wrapper');
        $inventoryWrapper.empty();
        $inventoryWrapper.append(inventoryTemplate({'store': response['store']}));

        var $logWrapper = $('#log-wrapper');
        $logWrapper.empty();
        $logWrapper.append(itemLogTemplate({'store': response['store']}));

        $('#log-tab').click();

        // Remove popup
        $('#overlay').removeClass('active');
    }

    function error(response) {
        if(response.status && response.status == 403) {
            $('#received-step').find('.error').text('Permission Denied').show();
        } else {
            $('#received-step').find('.error').text(response.responseText).show();
        }
    }

    sendRequest('/inventory/received/', postData, 'POST', success, error);
});
// RECEIVED //

// DAMAGED //
$(document).on('click', '#damaged-button:not(.inactive)', function (e) {
    var storeId = $('.store.active').attr('data-id');
    var store = globals.stores[storeId];
    var linkedColumns = store['link_columns'];

    if(checkStore()) {
        if(linkedColumns['name'] && linkedColumns['price'] && linkedColumns['cost'] && linkedColumns['quantity']) {
            popupHandler(e, {store: globals.stores[storeId]}, inventoryDamagedTemplate);
        } else {
            popupHandler(e, {'id': store['id'], 'columns': store['columns'], 'link_columns': store['link_columns']}, linkedColumnsTemplate);
        }
    } else {
        popupHandler(e, {}, storeTemplate);
    }
});

$(document).on('click', '#damaged-wrapper #choose-step tbody tr', function () {
    var $this = $(this);
    var itemId = $this.attr('data-id');
    var $popup = $('.popup');
    var $receivedBody = $('#damaged-tbody');

    $receivedBody.empty();
    $receivedBody.append($this.clone());
    $('#damaged-submit').attr('data-id', itemId);
    $('#damaged-step').show();
    $popup.animate({scrollLeft: $popup.width()}, "slow");
});

$(document).on('click', '#damaged-submit', function () {
    var storeId = $('#damaged-wrapper').attr('data-id');

    var postData = {
        id: storeId,
        change_value: $('#damaged-input').val(),
        details: $('#details-input').val(),
        item_id: $(this).attr('data-id')
    };

    function success(response) {
        //console.log(JSON.stringify(response));
        $('#operation-overlay').removeClass('active');

        globals.stores[storeId] = response['store'];

        var $inventoryWrapper = $('#inventory-wrapper');
        $inventoryWrapper.empty();
        $inventoryWrapper.append(inventoryTemplate({'store': response['store']}));

        var $logWrapper = $('#log-wrapper');
        $logWrapper.empty();
        $logWrapper.append(itemLogTemplate({'store': response['store']}));

        $('#log-tab').click();

        // Remove popup
        $('#overlay').removeClass('active');
    }

    function error(response) {
        if(response.status && response.status == 403) {
            $('#damaged-step').find('.error').text('Permission Denied').show();
        } else {
            $('#damaged-step').find('.error').text(response.responseText).show();
        }
    }

    sendRequest('/inventory/damaged/', postData, 'POST', success, error);
});
// DAMAGED //


// RESET //
$(document).on('click', '#reset-button:not(.inactive)', function (e) {
    var storeId = $('.store.active').attr('data-id');
    var store = globals.stores[storeId];
    var linkedColumns = store['link_columns'];

    if(checkStore()) {
        if(linkedColumns['name'] && linkedColumns['price'] && linkedColumns['cost'] && linkedColumns['quantity']) {
            popupHandler(e, {store: globals.stores[storeId]}, inventoryResetTemplate);
        } else {
            popupHandler(e, {'id': store['id'], 'columns': store['columns'], 'link_columns': store['link_columns']}, linkedColumnsTemplate);
        }
    } else {
        popupHandler(e, {}, storeTemplate);
    }
});

$(document).on('click', '#reset-wrapper #choose-step tbody tr', function () {
    var $this = $(this);
    var itemId = $this.attr('data-id');
    var $popup = $('.popup');
    var $selectBody = $('#select-tbody');

    $selectBody.empty();
    $selectBody.append($this.clone());
    $('#price-selection').attr('data-id', itemId);
    $('#cost-selection').attr('data-id', itemId);
    $('#select-step').show();
    $popup.animate({scrollLeft: $popup.width()}, "slow");
});

$(document).on('click', '#price-selection', function () {
    var $this = $(this);
    var itemId = $this.attr('data-id');
    var $popup = $('.popup');
    var $tableWrapper = $('#price-table-wrapper');

    $tableWrapper.empty();
    $tableWrapper.append($('.select-table').clone());
    $('#price-submit').attr('data-id', itemId);
    $('#price-step').show();
    $popup.animate({scrollLeft: $popup.width()*2}, "slow");
});

$(document).on('click', '#cost-selection', function () {
    var $this = $(this);
    var itemId = $this.attr('data-id');
    var $popup = $('.popup');
    var $tableWrapper = $('#cost-table-wrapper');

    $tableWrapper.empty();
    $tableWrapper.append($('.select-table').clone());
    $('#cost-submit').attr('data-id', itemId);
    $('#cost-step').show();
    $popup.animate({scrollLeft: $popup.width()*2}, "slow");
});

$(document).on('click', '#price-submit', function () {
    var storeId = $('#reset-wrapper').attr('data-id');
    var postData = {
        id: storeId,
        change_value: $('#price-input').val(),
        details: $('#details-input').val(),
        item_id: $(this).attr('data-id')
    };

    function success(response) {
        //console.log(JSON.stringify(response));
        $('#operation-overlay').removeClass('active');

        globals.stores[storeId] = response['store'];

        var $inventoryWrapper = $('#inventory-wrapper');
        $inventoryWrapper.empty();
        $inventoryWrapper.append(inventoryTemplate({'store': response['store']}));

        var $logWrapper = $('#log-wrapper');
        $logWrapper.empty();
        $logWrapper.append(itemLogTemplate({'store': response['store']}));

        $('#log-tab').click();

        // Remove popup
        $('#overlay').removeClass('active');
    }

    function error(response) {
        if(response.status && response.status == 403) {
            $('#price-step').find('.error').text('Permission Denied').show();
        } else {
            $('#price-step').find('.error').text(response.responseText).show();
        }
    }

    sendRequest('/inventory/reset_price/', postData, 'POST', success, error);
});

$(document).on('click', '#cost-submit', function () {
    var storeId = $('#reset-wrapper').attr('data-id');
    var postData = {
        id: storeId,
        change_value: $('#cost-input').val(),
        details: $('#details-input').val(),
        item_id: $(this).attr('data-id')
    };

    function success(response) {
        //console.log(JSON.stringify(response));
        $('#operation-overlay').removeClass('active');

        globals.stores[storeId] = response['store'];

        var $inventoryWrapper = $('#inventory-wrapper');
        $inventoryWrapper.empty();
        $inventoryWrapper.append(inventoryTemplate({'store': response['store']}));

        var $logWrapper = $('#log-wrapper');
        $logWrapper.empty();
        $logWrapper.append(itemLogTemplate({'store': response['store']}));

        $('#log-tab').click();

        // Remove popup
        $('#overlay').removeClass('active');
    }

    function error(response) {
        if(response.status && response.status == 403) {
            $('#cost-step').find('.error').text('Permission Denied').show();
        } else {
            $('#cost-step').find('.error').text(response.responseText).show();
        }
    }

    sendRequest('/inventory/reset_cost/', postData, 'POST', success, error);
});
// RESET //

// LINK COLUMNS //
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
        globals.stores[response['id']]['link_columns'] = response['link_columns'];
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