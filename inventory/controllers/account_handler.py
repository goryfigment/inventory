import json
import re
import uuid
import time
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from django.http import HttpResponseRedirect, HttpResponseBadRequest, JsonResponse

from django.contrib.auth import authenticate, login, logout

from inventory.settings_secret import GMAIL, GMAIL_PASSWORD
from inventory.modules.base import render_json, get_boss, model_to_dict
import inventory.modules.base as helper
from inventory.models import User, Boss, Business, Settings, Employee, Store
from inventory.decorators import data_required, user_permission


def register(request):
    helper.check_req_data(['username', 'email', 'password', 'first_name', 'last_name', 'business_name'], request.POST)

    username = request.POST['username'].strip().lower()
    email = request.POST['email'].strip().lower()
    password = request.POST['password']
    first_name = request.POST['first_name']
    last_name = request.POST['last_name']
    business_name = request.POST['business_name']

    # Check first name
    if not len(first_name):
        print username
        data = {'success': False,  'error_msg': 'Must have a first name.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check last name
    if not len(last_name):
        print username
        data = {'success': False,  'error_msg': 'Must have a last name.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check business name
    if not len(business_name):
        print username
        data = {'success': False,  'error_msg': 'Must have a business name.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check username
    if len(username) <= 2 or len(username) >= 16:
        print username
        data = {'success': False,  'error_msg': 'Username must be between 3 to 15 characters.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check Email
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        data = {'success': False,  'error_msg': 'Invalid email.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check if valid password: Must be 8 or more characters and contain a combo of letters and numbers
    if not len(password) >= 8:
        data = {'success': False,  'error_msg': 'Password must be 8 characters or more.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    if not bool(re.search(r'\d', password)) or not bool(re.search(r'[a-zA-Z]', password)):
        data = {'success': False,  'error_msg': 'Invalid password.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check if email exist in the database
    if User.objects.filter(username=username).exists():
        data = {'success': False,  'error_msg': 'Username exists.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check if email exist in the database
    if User.objects.filter(email=email).exists():
        data = {'success': False,  'error_msg': 'Email exists.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    user_settings = Settings.objects.create()
    business = Business.objects.create(name=business_name)
    boss = Boss.objects.create(settings=user_settings, business=business)
    User.objects.create(
        username=username,
        email=email,
        password=helper.create_password(password),
        first_name=first_name,
        last_name=last_name,
        boss=boss
    )

    # Validate password
    auth_user = authenticate(email=email, password=password)
    # Login user
    login(request, auth_user)

    return render_json({'success': True})


def user_login(request):
    helper.check_req_data(['username', 'password'], request.POST)

    username = request.POST['username'].strip().lower()
    password = request.POST['password'].strip().lower()

    if '@' in username:
        # Check Email
        if not re.match(r"[^@]+@[^@]+\.[^@]+", username):
            data = {'success': False,  'error_msg': 'Invalid email'}
            return HttpResponseBadRequest(json.dumps(data), 'application/json')

        # Check if the user exist first
        if not User.objects.filter(email=username).exists():
            data = {'success': False,  'error_msg': 'User does not exists.'}
            return HttpResponseBadRequest(json.dumps(data), 'application/json')

        # Validate password
        user = authenticate(email=username, password=password)
    else:
        # Check if username is over 15 characters
        if len(username) > 15:
            data = {'success': False,  'error_msg': 'Username to long.'}
            return HttpResponseBadRequest(json.dumps(data), 'application/json')
        # Check if the user exist first
        if not User.objects.filter(username=username).exists():
            data = {'success': False,  'error_msg': 'User does not exists.'}
            return HttpResponseBadRequest(json.dumps(data), 'application/json')

        # Validate password
        user = authenticate(username=username, password=password)

    login(request, user)

    return render_json({'success': True})


def user_logout(request):
    logout(request)
    return HttpResponseRedirect('/login/')


@data_required(['username', 'base_url'], 'POST')
def reset_password(request):
    username = request.POST['username']

    try:
        if '@' in username:
            current_user = User.objects.get(email=username)
        else:
            current_user = User.objects.get(username=username)
    except:
        data = {'success': False,  'error_msg': 'User does not exists.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    reset_link = uuid.uuid4().hex

    current_user.reset_link = reset_link
    current_user.reset_date = int(round(time.time()))
    current_user.save()

    from_email = "whey2ez@noreply.com"
    to_email = current_user.email
    name = current_user.first_name
    link = request.POST['base_url'] + '/forgot_password?code=' + reset_link

    # Create message container - the correct MIME type is multipart/alternative.
    msg = MIMEMultipart('alternative')
    msg['Subject'] = "Whey2eZ - Forgotten Password"
    msg['From'] = from_email
    msg['To'] = to_email

    # Create the body of the message (a plain-text and an HTML version).
    text = "Hi " + name + "!\nWe received a request to reset your Whey2eZ password.\n\n" \
           "Click the link to change your password: " + link
    html = """\
    <html>
      <head></head>
      <body>
        <div>
        <p>Hi """ + name + """!<br><br>
           We received a request to reset your Whey2eZ password.<br><br>
           <a href='""" + link + """'>Click here to change your password.</a>
        </p>
      </body>
    </html>
    """

    # Record the MIME types of both parts - text/plain and text/html.
    part1 = MIMEText(text, 'plain')
    part2 = MIMEText(html, 'html')
    msg.attach(part1)
    msg.attach(part2)

    # Send the message via local SMTP server.
    s = smtplib.SMTP('smtp.gmail.com', 587)
    s.ehlo()
    s.starttls()
    s.login(GMAIL, GMAIL_PASSWORD)

    # sendmail function takes 3 arguments: sender's address, recipient's address
    s.sendmail(from_email, to_email, msg.as_string())
    s.quit()

    return JsonResponse({'success': True}, safe=False)


@data_required(['password1', 'password2', 'code'], 'POST')
def change_password(request):
    password1 = request.POST['password1']
    password2 = request.POST['password2']
    current_user = User.objects.get(reset_link=request.POST['code'])

    if (int(round(time.time())) - current_user.reset_date) > 86400:
        data = {'success': False,  'error_msg': 'Password recovery expired.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    if password1 == password2:
        if not len(password1) >= 8:
            data = {'success': False,  'error_msg': 'Password must be 8 characters or more.'}
            return HttpResponseBadRequest(json.dumps(data), 'application/json')

        if not bool(re.search(r'\d', password1)) or not bool(re.search(r'[a-zA-Z]', password1)):
            data = {'success': False,  'error_msg': 'Invalid password.'}
            return HttpResponseBadRequest(json.dumps(data), 'application/json')

        current_user.password = helper.create_password(password1)
        current_user.reset_link = ''
        current_user.reset_date = 0
        current_user.save()
    else:
        data = {'success': False,  'error_msg': 'Both passwords do not match.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    return JsonResponse({'success': True}, safe=False)


@user_permission('boss_only')
def register_employee(request):
    helper.check_req_data(['username', 'email', 'password', 'first_name', 'last_name', 'type', 'store'], request.POST)

    username = request.POST['username'].strip().lower()
    email = request.POST['email'].strip().lower()
    password = request.POST['password']
    first_name = request.POST['first_name']
    last_name = request.POST['last_name']
    user_type = request.POST['type']
    store = Store.objects.get(id=request.POST['store'])
    boss = get_boss(request.user)

    # Check first name
    if not len(first_name):
        print username
        data = {'success': False,  'error_msg': 'Must have a first name.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check last name
    if not len(last_name):
        print username
        data = {'success': False,  'error_msg': 'Must have a last name.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check username
    if len(username) <= 2 or len(username) >= 16:
        print username
        data = {'success': False,  'error_msg': 'Username must be between 3 to 15 characters.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check Email
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        data = {'success': False,  'error_msg': 'Invalid email.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check if valid password: Must be 8 or more characters and contain a combo of letters and numbers
    if not len(password) >= 8:
        data = {'success': False,  'error_msg': 'Password must be 8 characters or more.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    if not bool(re.search(r'\d', password)) or not bool(re.search(r'[a-zA-Z]', password)):
        data = {'success': False,  'error_msg': 'Invalid password.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check if email exist in the database
    if User.objects.filter(username=username).exists():
        data = {'success': False,  'error_msg': 'Username exists.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check if email exist in the database
    if User.objects.filter(email=email).exists():
        data = {'success': False,  'error_msg': 'Email exists.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    employee = Employee.objects.create(boss=boss, type=user_type, store=store)
    User.objects.create(
        username=username,
        email=email,
        password=helper.create_password(password),
        first_name=first_name,
        last_name=last_name,
        employee=employee
    )

    employees = Employee.objects.filter(boss=boss, store=store).order_by('-type')
    employees_dict = {}
    store = model_to_dict(store)

    for current_employee in employees:
            employee_user = User.objects.get(employee_id=current_employee.id)
            employee_id = current_employee.id
            employees_dict[employee_id] = {'first_name': employee_user.first_name, 'last_name': employee_user.last_name,
            'type': current_employee.type, 'username': employee_user.username, 'email': employee_user.email,
            'id': employee_id}

    store['employees'] = employees_dict

    return render_json({'store': store, 'success': True})


@user_permission('boss_only')
def edit_employee(request):
    helper.check_req_data(['username', 'email', 'password', 'first_name', 'last_name', 'type', 'store', 'employee'], request.POST)

    username = request.POST['username'].strip().lower()
    email = request.POST['email'].strip().lower()
    password = request.POST['password']
    first_name = request.POST['first_name']
    last_name = request.POST['last_name']
    user_type = request.POST['type']
    store = Store.objects.get(id=request.POST['store'])
    employee = Employee.objects.get(id=request.POST['employee'])
    boss = get_boss(request.user)

    # Check first name
    if not len(first_name):
        print username
        data = {'success': False,  'error_msg': 'Must have a first name.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check last name
    if not len(last_name):
        print username
        data = {'success': False,  'error_msg': 'Must have a last name.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check username
    if len(username) <= 2 or len(username) >= 16:
        print username
        data = {'success': False,  'error_msg': 'Username must be between 3 to 15 characters.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check Email
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        data = {'success': False,  'error_msg': 'Invalid email.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check if valid password: Must be 8 or more characters and contain a combo of letters and numbers
    if not len(password) >= 8:
        data = {'success': False,  'error_msg': 'Password must be 8 characters or more.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    if not bool(re.search(r'\d', password)) or not bool(re.search(r'[a-zA-Z]', password)):
        data = {'success': False,  'error_msg': 'Invalid password.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check if email exist in the database
    if User.objects.filter(username=username).exists():
        data = {'success': False,  'error_msg': 'Username exists.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check if email exist in the database
    if User.objects.filter(email=email).exists():
        data = {'success': False,  'error_msg': 'Email exists.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    employee.type = user_type
    employee.save()

    user = User.objects.get(employee=employee)
    user.username = username
    user.email = email
    user.password = helper.create_password(password)
    user.first_name = first_name
    user.last_name = last_name
    user.save()

    employees = Employee.objects.filter(boss=boss, store=store).order_by('-type')
    employees_dict = {}
    store = model_to_dict(store)

    for current_employee in employees:
            employee_user = User.objects.get(employee_id=current_employee.id)
            employee_id = current_employee.id
            employees_dict[employee_id] = {'first_name': employee_user.first_name, 'last_name': employee_user.last_name,
            'type': current_employee.type, 'username': employee_user.username, 'email': employee_user.email,
            'id': employee_id}

    store['employees'] = employees_dict

    return render_json({'store': store, 'success': True})


@user_permission('boss_only')
@data_required(['employee', 'store'], 'POST')
def delete_employee(request):
    employee = Employee.objects.get(id=request.POST['employee'])
    user = User.objects.get(employee=employee)
    store = Store.objects.get(id=request.POST['store'])
    boss = get_boss(request.user)

    employee.delete()
    user.delete()

    employees = Employee.objects.filter(boss=boss, store=store).order_by('-type')
    employees_dict = {}
    store = model_to_dict(store)

    for current_employee in employees:
            employee_user = User.objects.get(employee_id=current_employee.id)
            employee_id = current_employee.id
            employees_dict[employee_id] = {'first_name': employee_user.first_name, 'last_name': employee_user.last_name,
            'type': current_employee.type, 'username': employee_user.username, 'email': employee_user.email,
            'id': employee_id}

    store['employees'] = employees_dict

    return render_json({'store': store, 'success': True})