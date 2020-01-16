import json, math, bcrypt, re, time
from django.conf import settings
from django.http import HttpResponse
from django.core import serializers
from django.http import HttpResponseBadRequest


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


def get_utc_epoch_time(days=0):
    return int(round(time.time() - (int(days)*86400)))


def epoch_strftime(utc_time, regex):
    return time.strftime(regex, time.localtime(int(utc_time)))


def validate_password(password, hashed_password):
    return bcrypt.hashpw(password.encode('utf8'), hashed_password.encode('utf8')) == hashed_password


def create_password(password):
    return bcrypt.hashpw(password.encode('utf8'), bcrypt.gensalt())


def array_to_dict(array):
    dict_obj = {}
    for item in array:
        dict_obj[item['id']] = item

    return dict_obj
