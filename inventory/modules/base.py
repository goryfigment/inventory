import json, math, bcrypt, re, time
from django.conf import settings
from django.http import HttpResponse
from django.core import serializers
from django.http import HttpResponseBadRequest
from inventory.models import Transaction, Store, ItemLog


def get_base_url():
    return settings.BASE_URL


def render_json(data):
    return HttpResponse(json.dumps(data), 'application/json')


def decimal_format(f, n, round_decimal):
    d = '{:0.' + str(n) + 'f}'
    if round_decimal:
        return d.format(round(float(f) * 10 ** n) / 10 ** n)
    else:
        return d.format(math.floor(float(f) * 10 ** n) / 10 ** n)


def bad_request(message, data):
    data = {'success': False, 'error_msg:': message, 'data': data}
    return HttpResponseBadRequest(json.dumps(data), 'application/json')


def model_to_dict(model):
    try:
        serial_obj = serializers.serialize('json', [model])
        obj_as_dict = json.loads(serial_obj)[0]['fields']
        obj_as_dict['id'] = model.pk
        return obj_as_dict
    except:
        return None


def models_to_dict(model_list):
    model_list = list(model_list)
    my_list = []
    for model in model_list:
        model_dict = model_to_dict(model)
        if model_dict:
            my_list.append(model_dict)

    return my_list


def transaction_name_regex(string, item):
    key_list = re.findall('\{{.*?\}}', string)
    for key in key_list:
        item_key = key.replace('{{', '').replace('}}', '')
        string = string.replace(key, item[item_key])

    return string


def transaction_total(transactions):
    total = {'cash': 0, 'credit': 0, 'total': 0}
    for trans in transactions:
        item_discount = 0
        trans['total'] = 0
        trans['timestamp'] = epoch_strftime(trans['date'], '%b %#d, %Y %I:%M%p')

        for item in trans['items']:
            item_discount += float(item['discount'])

        # Calculations
        trans_tax = round(float(trans['tax'])*float(trans['subtotal'])*100)/100
        trans_total = float(trans['subtotal']) + trans_tax - float(item_discount)
        # Data: Tax, Discount, Total
        trans['tax'] = '{0:.2f}'.format(trans_tax)
        trans['discount'] = '{0:.2f}'.format(item_discount)
        trans['total'] = '{0:.2f}'.format(trans_total)

        if trans['payment_type'] == 'Cash':
            total['cash'] += trans_total
        else:
            total['credit'] += trans_total

        total['total'] += trans_total

    return {'total': {'cash': '{0:.2f}'.format(total['cash']), 'credit': '{0:.2f}'.format(total['credit']), 'total': '{0:.2f}'.format(total['total'])}, 'transactions': transactions}


def get_utc_epoch_time(days=0):
    return int(round(time.time() - (int(days)*86400)))


def epoch_strftime(utc_time, regex):
    return time.strftime(regex, time.localtime(int(utc_time)))


def get_transactions(boss_id, start_time=None, end_time=None, order='date'):
    if start_time and end_time:
        return models_to_dict(Transaction.objects.filter(boss=boss_id, date__range=(start_time, end_time)).order_by(order))
    else:
        return models_to_dict(Transaction.objects.filter(boss=boss_id).order_by(order))


def validate_password(password, hashed_password):
    return bcrypt.hashpw(password.encode('utf8'), hashed_password.encode('utf8')) == hashed_password


def create_password(password):
    return bcrypt.hashpw(password.encode('utf8'), bcrypt.gensalt())


def get_boss(current_user):
    if current_user.boss:
        return current_user.boss
    else:
        return current_user.employee.boss


def sort_inventory(store, user_inventory):
    if store.order_by != 'none':
        return sorted(user_inventory.items(), key=lambda (k, v): v[store.order_by], reverse=store.reverse)
    else:
        return sorted(user_inventory.items(), key=lambda (k, v): int(k), reverse=False)


def check_req_data(required_data, request):
    # Check if all necessary data is present
    for data in required_data:
        if data not in request:
            data = {'success': False, 'error_msg': 'Data not set.'}
            return HttpResponseBadRequest(json.dumps(data), 'application/json')


def inventory_operation(request, action, operation, link_column, callback_function):
    current_user = request.user
    store = Store.objects.get(id=request.POST['id'])
    linked_columns = store.link_columns

    changing_column = linked_columns[link_column]
    name_column = linked_columns['name']
    item = store.inventory[request.POST['item_id']]
    previous_value = item[changing_column]

    # Do operation
    item[changing_column] = callback_function(item[changing_column], request.POST['change_value'])

    store.save()

    created_item_log = ItemLog.objects.create(
        user=current_user,
        action=action,
        operation=operation,
        item_name=item[name_column],
        change=request.POST['change_value'],
        previous_value=previous_value,
        details={"notes": request.POST['details']}
    )

    created_item_log.store = store
    created_item_log.save()
    item_logs = list(ItemLog.objects.filter(store=store).order_by('-date').values(
        'user__first_name', 'user__last_name', 'action', 'operation', 'item_name', 'change', 'previous_value',
        'date', 'details', 'id'))

    store.inventory = sort_inventory(store, store.inventory)
    store_dict = model_to_dict(store)

    ordered_logs = []
    datetime_holder = ''
    l_dict = None

    for l in item_logs:
        current_datetime = epoch_strftime(l['date'], "%A %B %d, %Y")
        # Data: Tax, Discount, Total
        l['timestamp'] = epoch_strftime(l['date'], '%b %#d, %Y %I:%M%p')

        # Split different dates
        if datetime_holder == current_datetime:
            l_dict['logs'].append(l)
        else:
            if l_dict is not None:
                ordered_logs.append(l_dict)
            l_dict = {'datetime': current_datetime, 'logs': []}
            datetime_holder = current_datetime
            l_dict['logs'].append(l)

    # Append the last date
    if l_dict is not None:
        ordered_logs.append(l_dict)

    store_dict['item_log'] = ordered_logs

    return {'store': store_dict}
