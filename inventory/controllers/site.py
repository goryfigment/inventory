import time
import json
from django.shortcuts import render
from django.http import HttpResponseRedirect
from django.forms.models import model_to_dict
from base import get_base_url
from inventory.modules.base import get_boss, models_to_dict, epoch_strftime
from inventory.models import User, Transaction, ItemLog, Employee


def error_page(request):
    data = {
        'base_url': get_base_url()
    }

    return render(request, '404.html', data)


def server_error(request):
    data = {
        'base_url': get_base_url()
    }

    return render(request, '500.html', data)


def home(request):
    data = {
        'base_url': get_base_url()
    }

    # If user is login redirect to overview
    if request.user.is_authenticated():
        return HttpResponseRedirect('/inventory/')

    return render(request, 'home.html', data)


def register(request):
    data = {
        'base_url': get_base_url()
    }

    # If user is login redirect to overview
    if request.user.is_authenticated():
        return HttpResponseRedirect('/inventory/')

    return render(request, 'register.html', data)


def login(request):
    data = {
        'base_url': get_base_url()
    }

    # If user is login redirect to overview
    if request.user.is_authenticated():
        return HttpResponseRedirect('/inventory/')

    return render(request, 'login.html', data)


def forgot_password(request):
    data = {
        'base_url': get_base_url(),
        'expired': False
    }

    if 'code' in request.GET:
        current_user = User.objects.get(reset_link=request.GET['code'])

        if (int(round(time.time())) - current_user.reset_date) > 86400:
            data['expired'] = True

    # If user is login redirect to overview
    if request.user.is_authenticated():
        return HttpResponseRedirect('/inventory/')

    return render(request, 'forgot_password.html', data)


def overview(request):
    current_user = request.user

    # If not login go to login page
    if not request.user.is_authenticated():
        return HttpResponseRedirect('/login/')

    current_boss = get_boss(current_user)

    user_business = current_boss.business
    # user_settings['business_tax'] = decimal_format(float(user_business.tax)*100, 3, False)
    stores = user_business.stores.all().values()
    store_dict = {}

    for current_store in stores:
        store_id = str(current_store['id'])
        store_dict[store_id] = current_store
        store_dict[store_id]['transactions'] = []
        transactions = models_to_dict(Transaction.objects.filter(store_id=store_id).order_by('-date'))

        ordered_transactions = []
        datetime_holder = ''
        t_dict = None

        for t in transactions:
            item_discount = 0
            current_datetime = epoch_strftime(t['date'], "%A %B %d, %Y")
            epoch_date = time.mktime(time.strptime(current_datetime, "%A %B %d, %Y"))

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
                t_dict = {'datetime': current_datetime, 'epoch': epoch_date, 'transactions': []}
                datetime_holder = current_datetime
                t_dict['transactions'].append(t)
        # Append the last date
        if t_dict is not None:
            ordered_transactions.append(t_dict)

        store_dict[store_id]['transactions'] = ordered_transactions

    data = {
        'base_url': get_base_url(),
        'name': current_user.first_name + " " + current_user.last_name,
        'username': current_user.username,
        'business_id': user_business.id,
        'business_name': user_business.name,
        'stores': json.dumps(store_dict)
    }

    # if len(user_business.inventory):
    #     user_settings['example_item'] = next(iter(user_business.inventory.items()))[1]

    return render(request, 'overview.html', data)


def inventory(request):
    current_user = request.user

    # Only go to overview if user is logged in
    if not current_user.is_authenticated():
        return HttpResponseRedirect('/login/')

    current_boss = get_boss(current_user)
    user_type = 'boss'
    if not current_user.boss:
        user_type = current_user.employee.type

    user_business = current_boss.business
    stores = user_business.stores.all().values()
    store_dict = {}

    if len(stores):
        active_store = str(stores.first()['id'])
    else:
        active_store = ''

    for current_store in stores:
        store_id = str(current_store['id'])
        store_dict[store_id] = current_store
        store_inventory = current_store['inventory']

        if current_store['order_by'] != 'none':
            current_store['inventory'] = sorted(store_inventory.items(), key=lambda (k, v): v[current_store['order_by']], reverse=current_store['reverse'])
        else:
            current_store['inventory'] = sorted(store_inventory.items(), key=lambda (k, v): int(k), reverse=False)

        store_log = list(ItemLog.objects.filter(store_id=store_id).order_by('-date').values(
            'user__first_name', 'user__last_name', 'action', 'operation', 'item_name', 'change', 'previous_value',
            'date', 'details', 'id'))

        ordered_logs = []
        datetime_holder = ''
        l_dict = None

        for l in store_log:
            current_datetime = epoch_strftime(l['date'], "%A %B %d, %Y")
            # Data: Tax, Discount, Total
            l['timestamp'] = epoch_strftime(l['date'], '%b %#d, %I:%M%p')

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

        current_store['item_log'] = ordered_logs

    data = {
        'base_url': get_base_url(),
        'business_id': user_business.id,
        'business_name': user_business.name,
        'active_store': active_store,
        'name': current_user.first_name + " " + current_user.last_name,
        'username': current_user.username,
        'stores': json.dumps(store_dict),
        'user_type': user_type
    }

    return render(request, 'inventory.html', data)


def transaction(request):
    current_user = request.user

    # If not login go to login page
    if not request.user.is_authenticated():
        return HttpResponseRedirect('/login/')

    current_boss = get_boss(current_user)
    user_type = 'boss'
    if not current_user.boss:
        user_type = current_user.employee.type

    user_settings = model_to_dict(current_boss.settings)
    user_business = current_boss.business
    # user_settings['business_tax'] = decimal_format(float(user_business.tax)*100, 3, False)
    user_settings['ip_address'] = user_settings['ip_address'].split('.')
    stores = user_business.stores.all().values()
    store_dict = {}

    for current_store in stores:
        store_id = str(current_store['id'])
        store_dict[store_id] = current_store
        store_dict[store_id]['transactions'] = []
        transactions = models_to_dict(Transaction.objects.filter(store_id=store_id).order_by('-date'))

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

        store_dict[store_id]['transactions'] = ordered_transactions

    data = {
        'base_url': get_base_url(),
        'name': current_user.first_name + " " + current_user.last_name,
        'username': current_user.username,
        'business_id': user_business.id,
        'business_name': user_business.name,
        'stores': json.dumps(store_dict),
        'start_point': user_settings['start_time'],
        'date_range': user_settings['date_range'],
        'settings': json.dumps(user_settings),
        'all': 'ALL',
        'user_type': user_type
    }

    # if len(user_business.inventory):
    #     user_settings['example_item'] = next(iter(user_business.inventory.items()))[1]

    return render(request, 'transaction.html', data)


def employee(request):
    current_user = request.user

    # If user is login redirect to overview
    if not request.user.is_authenticated():
        return HttpResponseRedirect('/login/')

    current_boss = get_boss(current_user)
    user_type = 'boss'
    if not current_user.boss:
        user_type = current_user.employee.type

    user_business = current_boss.business
    stores = user_business.stores.all().values()
    store_dict = {}

    for current_store in stores:
        store_id = str(current_store['id'])
        store_dict[store_id] = current_store
        employees = Employee.objects.filter(boss=current_boss, store=store_id).order_by('-type')
        employees_dict = {}

        for current_employee in employees:
            employee_user = User.objects.get(employee_id=current_employee.id)
            employee_id = current_employee.id
            employees_dict[employee_id] = {'first_name': employee_user.first_name, 'last_name': employee_user.last_name,
            'type': current_employee.type, 'username': employee_user.username, 'email': employee_user.email,
            'id': employee_id}

        store_dict[store_id]['employees'] = employees_dict

    data = {
        'base_url': get_base_url(),
        'name': current_user.first_name + " " + current_user.last_name,
        'stores': json.dumps(store_dict),
        'user_type': user_type,
        'username': current_user.username
    }

    return render(request, 'employee.html', data)
