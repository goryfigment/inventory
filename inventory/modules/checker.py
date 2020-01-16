import json
from django.http import HttpResponseBadRequest


def check_req_data(required_data, request):
    # Check if all necessary data is present
    for data in required_data:
        if data not in request:
            data = {'success': False, 'error_msg': 'Data not set.'}
            return HttpResponseBadRequest(json.dumps(data), 'application/json')


# Returns the establishment if success
def check_permission(user, business_id=None, store_id=None):
    # If the user is a boss account then check if he created the business/store
    if user.boss:
        if business_id and user.boss.business.id == int(business_id):
            return user.boss.business
    else:
        data = {'success': False, 'error_msg': 'User does not have permission.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')


# Checks if link columns and make sures that all data is applicable to column
def check_link_columns(link_column, item):
    quantity_column = link_column['quantity']
    cost_column = link_column['cost']
    price_column = link_column['price']

    error_list = []

    if quantity_column:
        quantity = item[quantity_column].strip()

        if quantity == "":
            item[quantity_column] = 0
        try:
            item[quantity_column] = int(quantity)
        except ValueError:
            error_list.append([quantity_column, 'Must be a whole number.'])

    if cost_column:
        cost = item[cost_column].strip()

        if cost == "":
            item[cost_column] = "0.00"
        try:
            item[cost_column] = '{0:.2f}'.format(float(cost))
        except ValueError:
            error_list.append([cost_column, 'Must be a whole or decimal number.'])

    if price_column:
        price = item[price_column].strip()

        if price == "":
            item[price_column] = "0.00"
        try:
            item[price_column] = '{0:.2f}'.format(float(price))
        except ValueError:
            error_list.append([price_column, 'Must be a whole or decimal number.'])

    if error_list:
        return HttpResponseBadRequest(json.dumps(error_list), 'application/json')
    else:
        return item

