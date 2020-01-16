import time
import os
import shutil
from PIL import Image
from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest
from django.forms.models import model_to_dict
import pandas as pd
from io import BytesIO as IO
import inventory.modules.checker as checker
from inventory.modules.base import get_boss, sort_inventory, inventory_operation
from inventory.models import ItemLog, Store, User
from inventory.decorators import login_required, user_permission, data_required


@login_required
@user_permission('boss_only')
@data_required(['column_name', 'id'], 'POST')
def add_column(request):
    store_id = request.POST['id']
    store = Store.objects.get(id=store_id)

    column_name = request.POST['column_name'].lower().strip()
    items = store.inventory
    columns = store.columns

    if column_name == '':
        return HttpResponseBadRequest('This field is required.', 'application/json')

    if column_name in columns:
        return HttpResponseBadRequest('Column name already exist.', 'application/json')

    columns.append(column_name)
    for key, item in items.iteritems():
        item.update({column_name: ""})

    store.save()

    store.inventory = sort_inventory(store, store.inventory)

    return JsonResponse({'store': model_to_dict(store)}, safe=False)


@login_required
@user_permission('boss_only')
@data_required(['item', 'id'], 'BODY')
def add_row(request):
    store = Store.objects.get(id=request.BODY['id'])
    columns = store.columns
    linked_columns = store.link_columns

    # Check if all link columns has static data
    item = checker.check_link_columns(linked_columns, request.BODY['item'])
    if isinstance(item, HttpResponseBadRequest):
        return item

    for key, val in item.iteritems():
        if key not in columns:
            return HttpResponseBadRequest('All columns do not exist.', 'application/json')

    items = store.inventory

    if len(items):
        item_id = int(max(items, key=int)) + 1
    else:
        item_id = 1

    items[item_id] = item

    store.save()

    store.inventory = sort_inventory(store, store.inventory)

    return JsonResponse({'item': {item_id: item}, 'store': model_to_dict(store)}, safe=False)


@login_required
@user_permission('boss_only')
@data_required(['new_column_name', 'prev_column_name', 'id'], 'POST')
def edit_column(request):
    store = Store.objects.get(id=request.POST['id'])

    prev_column_name = request.POST['prev_column_name']
    new_column_name = request.POST['new_column_name']
    columns = store.columns
    items = store.inventory
    linked_columns = store.link_columns

    if prev_column_name not in columns:
        return HttpResponseBadRequest('Column does not exist.', 'application/json')

    if new_column_name == '':
        return HttpResponseBadRequest('Field is required.', 'application/json')

    if new_column_name in columns:
        return HttpResponseBadRequest('Column name already exist.', 'application/json')

    # Edit column list
    store.columns = [w.replace(prev_column_name, new_column_name) for w in columns]

    # Edit inventory
    for key, item in items.iteritems():
        item[new_column_name] = item.pop(prev_column_name)

    # Check link columns
    for key, item in linked_columns.iteritems():
        if linked_columns[key] == prev_column_name:
            linked_columns[key] = new_column_name

    # Check name link column
    name_regex = linked_columns['name']
    if name_regex:
        linked_columns['name'] = name_regex.replace('{{' + prev_column_name + '}}', '{{' + new_column_name + '}}')

    # Check transaction filters
    store.transaction_filter = [w.replace(prev_column_name, new_column_name) for w in columns]

    if prev_column_name == store.order_by:
        store.order_by = new_column_name

    store.save()

    # user_types = UserType.objects.filter(boss=current_boss)
    # for user_type in user_types:
    #     permission = user_type.permission
    #     permission.save()

    store.inventory = sort_inventory(store, store.inventory)

    return JsonResponse({'store': model_to_dict(store), 'success_msg': 'Column successfully changed!'}, safe=False)


@login_required
@user_permission('boss_only')
@data_required(['item', 'item_id', 'id'], 'BODY')
def edit_row(request):
    store = Store.objects.get(id=request.BODY['id'])
    linked_columns = store.link_columns

    item = checker.check_link_columns(linked_columns, request.BODY['item'])

    if isinstance(item, HttpResponseBadRequest):
        return item

    item_id = str(request.BODY['item_id'])
    columns = store.columns
    items = store.inventory

    for key, val in item.iteritems():
        if key not in columns:
            return HttpResponseBadRequest('All columns do not exist.', 'application/json')

    items[item_id] = item
    store.save()

    store.inventory = sort_inventory(store, store.inventory)

    return JsonResponse({'store': model_to_dict(store), 'success_msg': 'Row successfully changed!'}, safe=False)


@login_required
@user_permission('boss_only')
@data_required(['column_name', 'id'], 'POST')
def delete_column(request):
    store = Store.objects.get(id=request.POST['id'])

    column_name = request.POST['column_name']
    columns = store.columns
    items = store.inventory
    linked_columns = store.link_columns

    if column_name == '':
        return HttpResponseBadRequest('Column name is an empty string.', 'application/json')

    if column_name not in columns:
        return HttpResponseBadRequest('Column name does not exist.', 'application/json')

    # Remove column from list
    columns.remove(column_name)

    # Delete column from inventory
    for key, item in items.iteritems():
        item.pop(column_name, None)

    # Check link columns
    for key, item in linked_columns.iteritems():
        if linked_columns[key] == column_name:
            linked_columns[key] = False

    transaction_filter = store.transaction_filter

    if column_name == store.order_by:
        store.order_by = "none"

    # Check transaction filter
    if column_name in transaction_filter:
        transaction_filter.remove(column_name)

    store.save()

    store.inventory = sort_inventory(store, store.inventory)

    return JsonResponse({'store': model_to_dict(store)}, safe=False)


@login_required
@user_permission('boss_only')
@data_required(['item_id', 'id'], 'POST')
def delete_row(request):
    store = Store.objects.get(id=request.POST['id'])

    item_id = str(request.POST['item_id'])
    items = store.inventory

    items.pop(item_id, None)
    store.save()
    store.inventory = sort_inventory(store, store.inventory)

    return JsonResponse({'store': model_to_dict(store)}, safe=False)


@login_required
@user_permission('boss_only')
@data_required(['excel_file'], 'FILES')
def read_excel(request):
    excel_file = pd.read_excel(request.FILES['excel_file'])

    columns = excel_file.columns

    json_data = {'headers': [], 'data': [], 'column': {}}

    for index in range(0, len(excel_file[columns[0]])):
        row_data = []

        for column in columns:
            if index == 0:
                json_data['headers'].append(column)

            current_data = excel_file[column][index]

            try:
                current_data = str(current_data)
            except:
                current_data = str(current_data.encode('utf-8', 'ignore'))

            if current_data == 'nan':
                current_data = ""
            else:
                current_data = " ".join(current_data.strip().split())

            row_data.append(current_data)

        json_data['data'].append(row_data)

    return JsonResponse(json_data, safe=False)


@login_required
@user_permission('boss_only')
@data_required(['inventory', 'columns', 'id'], 'BODY')
def import_submit(request):
    store = Store.objects.get(id=request.BODY['id'])
    post_inventory = request.BODY['inventory']
    custom_column = store.columns
    post_column = request.BODY['columns']
    user_inventory = store.inventory
    linked_columns = store.link_columns
    missing_columns = []

    for column in custom_column:
        if column in post_column:
            post_column.remove(column)
        else:
            missing_columns.append(column)

    store.columns = custom_column + post_column

    # Check every item
    if len(user_inventory):

        # If adding new columns add to every item
        for column in post_column:
            for key, item in user_inventory.iteritems():
                item[column] = ""

        quantity_column = linked_columns['quantity']
        cost_column = linked_columns['cost']
        price_column = linked_columns['price']

        for key, item in post_inventory.iteritems():
            # Add missing columns to new items
            for column in missing_columns:
                item[column] = ""

            if quantity_column:
                quantity = item[quantity_column].strip()
                if quantity == "" or not quantity.isdigit():
                    quantity = 0
                else:
                    quantity = int(quantity)

                item[quantity_column] = quantity

            if cost_column:
                cost = item[cost_column].strip()
                if cost == "" or not cost.isdigit():
                    cost = 0
                else:
                    cost = int(cost)

                item[cost_column] = cost

            if price_column:
                price = item[price_column].strip()
                if price == "" or not price.isdigit():
                    price = 0
                else:
                    price = int(price)

                item[price_column] = price

    store.inventory.update(post_inventory)
    store.save()
    store.inventory = sort_inventory(store, store.inventory)

    return JsonResponse({'store': model_to_dict(store)}, safe=False)


@login_required
@user_permission('boss_only')
@data_required(['inventory', 'columns', 'type'], 'BODY')
def export_submit(request):
    if request.BODY['type'] == 'excel':
        byte_io = IO()

        excel_file = pd.DataFrame(request.BODY['inventory'])
        excel_file = excel_file[request.BODY['columns']]

        writer = pd.ExcelWriter(byte_io, engine='xlsxwriter')
        excel_file.to_excel(writer, sheet_name='Inventory')
        writer.save()
        writer.close()

        byte_io.seek(0)

        response = HttpResponse(byte_io.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename=inventory.xlsx'

        return response
    else:
        return JsonResponse({}, safe=False)


@login_required
@user_permission('boss_only')
@data_required(['drop_table', 'id'], 'POST')
def drop_table(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    if current_user.boss:
        boss_username = current_user.username
    else:
        boss_username = User.objects.get(boss=current_user.employee.boss).username

    store = Store.objects.get(id=request.POST['id'])

    if request.POST['drop_table']:
        # Remove directory
        asset_directory = os.path.abspath(os.path.join(os.path.dirname( __file__ ), '..', '..', 'templates', 'bundle', 'assets', 'files'))
        boss_directory = os.path.join(asset_directory, boss_username)
        store_directory = os.path.join(boss_directory, store.name)

        if os.path.exists(store_directory):
            shutil.rmtree(store_directory)

        store.inventory = {}
        store.columns = []
        store.link_columns = {"quantity": False, "price": False, "cost": False, "name": False}
        store.picture_column = ''
        store.save()

        user_settings = current_boss.settings
        user_settings.save()

        return JsonResponse({'store': model_to_dict(store)}, safe=False)


@login_required
@user_permission('operation')
@data_required(['item_id', 'change_value', 'id', 'details'], 'POST')
def received(request):
    try:
        request.POST['change_value'] = int(request.POST['change_value'])
    except ValueError:
        return HttpResponseBadRequest('Must be a whole number.', 'application/json')

    def received_operation(column, change_value):
        return int(column) + change_value

    return JsonResponse(inventory_operation(request, 'Edit', 'Received', 'quantity', received_operation), safe=False)


@login_required
@user_permission('operation')
@data_required(['item_id', 'change_value', 'id', 'details'], 'POST')
def damaged(request):
    try:
        request.POST['change_value'] = int(request.POST['change_value'])
    except ValueError:
        return HttpResponseBadRequest('Must be a whole number.', 'application/json')

    def damaged_operation(column, change_value):
        return int(column) - change_value

    return JsonResponse(inventory_operation(request, 'Edit', 'Damaged', 'quantity', damaged_operation), safe=False)


@login_required
@user_permission('operation')
@data_required(['item_id', 'change_value', 'id', 'details'], 'POST')
def reset_cost(request):
    try:
        request.POST['change_value'] = float(request.POST['change_value'])
    except ValueError:
        return HttpResponseBadRequest('Must be a decimal or whole number.', 'application/json')

    def received_operation(column, change_value):
        return '{0:.2f}'.format(change_value)

    return JsonResponse(inventory_operation(request, 'Edit', 'Reset Cost', 'cost', received_operation), safe=False)


@login_required
@user_permission('operation')
@data_required(['item_id', 'change_value', 'id', 'details'], 'POST')
def reset_price(request):
    try:
        request.POST['change_value'] = float(request.POST['change_value'])
    except ValueError:
        return HttpResponseBadRequest('Must be a decimal or whole number.', 'application/json')

    def received_operation(column, change_value):
        return '{0:.2f}'.format(change_value)

    return JsonResponse(inventory_operation(request, 'Edit', 'Reset Price', 'price', received_operation), safe=False)
