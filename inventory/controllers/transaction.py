import re
from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest
from django.forms.models import model_to_dict
from inventory.modules.base import decimal_format, get_boss, epoch_strftime, models_to_dict
from inventory.models import Store, Transaction
from inventory.decorators import login_required, data_required, user_permission
from inventory.modules.receipt_printer import receipt_printer


@login_required
@user_permission('boss_only')
@data_required(['store_id', 'link_columns'], 'BODY')
def linked_columns(request):
    store = Store.objects.get(id=request.BODY['store_id'])
    store_inventory = store.inventory

    link_columns = request.BODY['link_columns']

    for link_type, column in link_columns.iteritems():
        if link_type == 'price' or link_type == 'cost':  # Turn all data to float values
            for item_id, item in store_inventory.iteritems():
                current_price = item[column]
                if current_price.replace('.', '', 1).isdigit():
                    item[column] = decimal_format(float(current_price), 2, False)
                else:
                    item[column] = '0.00'

        elif link_type == 'quantity':  # Turn all data to int values
            for key, item in store_inventory.iteritems():
                current_quantity = item[column]
                if str(current_quantity).isdigit():
                    item[column] = int(current_quantity)
                else:
                    item[column] = 0

    store.link_columns = link_columns

    store.save()

    return JsonResponse(model_to_dict(store), safe=False)


@login_required
@data_required(['search_value', 'id'], 'GET')
def inventory_search(request):
    store = Store.objects.get(id=request.GET['id'])
    search_value = re.sub(r'[^\w]', '', request.GET['search_value'])
    search_results = []

    # Get inventory
    user_inventory = store.inventory
    link_columns = store.link_columns

    name_key = link_columns['name']
    price_key = link_columns['price']

    # Get filters
    filters = store.transaction_filter

    if 'ALL' in filters:
        filters = user_inventory.values()[0].keys()

    # Loop through inventory
    for key, item in user_inventory.iteritems():
        # Loop through filters
        for data in filters:
            # Check if 'search' matches!
            current_data = re.sub(r'[^\w]', '', str(item[data])).lower()
            if search_value in current_data:
                # Create new data defined by the user
                new_data = {'price': item[price_key], 'name': item[name_key], 'id': key}
                search_results.append(new_data)
                break

    return JsonResponse(search_results, safe=False)


@login_required
@user_permission('transaction')
@data_required(['store_id', 'items', 'payment_type', 'tax', 'subtotal', 'memo'], 'BODY')
def create_transaction(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    store_id = request.BODY['store_id']
    store = Store.objects.get(id=store_id)
    user_inventory = store.inventory
    quantity_column = store.link_columns['quantity']
    cost_column = store.link_columns['cost']
    transaction_items = request.BODY['items']

    if not len(transaction_items):
        return HttpResponseBadRequest('Must have at least one item per transaction.', 'application/json')

    for key, item in transaction_items.iteritems():
        item['id'] = key
        item['cost'] = user_inventory[key][cost_column]

    item_list = []

    # Subtract from inventory
    for key, item in transaction_items.iteritems():
        inventory_item = user_inventory[key]
        inventory_qty = int(inventory_item[quantity_column])
        transaction_qty = int(item['quantity'])
        inventory_qty -= transaction_qty

        if inventory_qty < 0:
                inventory_qty = 0

        user_inventory[key][quantity_column] = inventory_qty
        item_list.append(item)
        store.save()

    transaction = Transaction.objects.create(
        boss=current_boss,
        seller=current_user,
        store=store,
        payment_type=request.BODY['payment_type'],
        subtotal=request.BODY['subtotal'],
        tax=request.BODY['tax'],
        memo=request.BODY['memo'],
        items=item_list
    )

    transactions = models_to_dict(store.transaction_set.all().order_by('-date'))
    ordered_transactions = []
    datetime_holder = ''
    t_dict = None

    for t in transactions:
        item_discount = 0
        current_datetime = epoch_strftime(t['date'], "%A %B %d, %Y")

        # Calculations
        t_tax = round(float(t['tax'])*float(t['subtotal'])*100)/100
        t_total = float(t['subtotal']) + t_tax - float(item_discount)
        # Data: Tax, Discount, Total
        t['timestamp'] = epoch_strftime(t['date'], '%b %#d, %Y %I:%M%p')
        t['tax'] = '{0:.2f}'.format(t_tax)
        t['discount'] = '{0:.2f}'.format(item_discount)
        t['total'] = '{0:.2f}'.format(t_total)

        # Split different dates
        if datetime_holder == current_datetime:
            t_dict['transactions'].append(t)
        else:
            if t_dict is not None:
                ordered_transactions.append(t_dict)
            t_dict = {'datetime': current_datetime, 'transactions': []}
            datetime_holder = current_datetime
            t_dict['transactions'].append(t)
    # Append the last date
    if t_dict is not None:
        ordered_transactions.append(t_dict)

    return JsonResponse({'transaction': model_to_dict(transaction), 'store_transactions': ordered_transactions, 'success': True}, safe=False)


@login_required
@data_required(['transaction'], 'BODY')
def print_receipt(request):
    current_user = request.user
    current_boss = get_boss(current_user)

    # Print receipt
    receipt_printer(current_boss.settings, request.BODY['transaction'])

    return JsonResponse({'success': True}, safe=False)


@login_required
@user_permission('boss_only')
@data_required(['ip_address', 'header', 'footer'], 'BODY')
def save_receipt_settings(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    user_settings = current_boss.settings

    user_settings.ip_address = request.BODY['ip_address']
    user_settings.header = request.BODY['header']
    user_settings.footer = request.BODY['footer']

    user_settings.save()

    return JsonResponse({'transaction_settings': model_to_dict(user_settings)}, safe=False)
