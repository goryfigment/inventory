import json
from django.core.exceptions import PermissionDenied


def login_required(function):
    def wrap(request, *args, **kwargs):
        if request.user.is_authenticated():
            return function(request, *args, **kwargs)
        else:
            print 'User not login'
            raise PermissionDenied('User not login.')
    wrap.__doc__ = function.__doc__
    wrap.__name__ = function.__name__
    return wrap


def user_permission(permission_type):
    def decorator(function):
        def wrap(request, *args, **kwargs):
            current_user = request.user
            if not current_user.boss:
                employee_type = current_user.employee.type
                print employee_type
                if permission_type == 'boss_only':
                    if employee_type == 'admin':
                        return function(request, *args, **kwargs)
                    else:
                        raise PermissionDenied('Does not have permission: ' + permission_type)
                if permission_type == 'operation':
                    if employee_type == 'employee':
                        return function(request, *args, **kwargs)
                    else:
                        raise PermissionDenied('Does not have permission: ' + permission_type)
                elif permission_type == 'transaction':
                    if current_user.boss or employee_type == 'employee':
                        return function(request, *args, **kwargs)
                    else:
                        raise PermissionDenied('Does not have permission: ' + permission_type)
                else:
                    raise PermissionDenied('Permission does not exist')
            else:
                return function(request, *args, **kwargs)
        wrap.__doc__ = function.__doc__
        wrap.__name__ = function.__name__
        return wrap
    return decorator

# def user_permission(permission_type):
#     def decorator(function):
#         def wrap(request, *args, **kwargs):
#             current_user = request.user
#             if not current_user.boss:
#                 current_permission = current_user.employee.permission
#                 if permission_type == 'boss_only':
#                     if current_user.boss:
#                         return function(request, *args, **kwargs)
#                     else:
#                         raise PermissionDenied('Does not have permission: ' + permission_type)
#                 elif permission_type == 'add_column':
#                     if current_permission.add_column:
#                         return function(request, *args, **kwargs)
#                     else:
#                         print 'Does not have permission: ' + permission_type
#                         raise PermissionDenied('Does not have permission: ' + permission_type)
#                 elif permission_type == 'edit_column':
#                     if current_permission.edit_column:
#                         return function(request, *args, **kwargs)
#                     else:
#                         raise PermissionDenied('Does not have permission: ' + permission_type)
#                 elif permission_type == 'delete_column':
#                     if current_permission.delete_column:
#                         return function(request, *args, **kwargs)
#                     else:
#                         raise PermissionDenied('Does not have permission: ' + permission_type)
#                 elif permission_type == 'add_row':
#                     if current_permission.add_item:
#                         return function(request, *args, **kwargs)
#                     else:
#                         raise PermissionDenied('Does not have permission: ' + permission_type)
#                 elif permission_type == 'edit_row':
#                     if current_permission.edit_item:
#                         return function(request, *args, **kwargs)
#                     else:
#                         raise PermissionDenied('Does not have permission: ' + permission_type)
#                 elif permission_type == 'delete_row':
#                     if current_permission.delete_item:
#                         return function(request, *args, **kwargs)
#                     else:
#                         raise PermissionDenied('Does not have permission: ' + permission_type)
#                 elif permission_type == 'import_file':
#                     if current_permission.import_file:
#                         return function(request, *args, **kwargs)
#                     else:
#                         raise PermissionDenied('Does not have permission: ' + permission_type)
#                 elif permission_type == 'export_file':
#                     if current_permission.export_file:
#                         return function(request, *args, **kwargs)
#                     else:
#                         raise PermissionDenied('Does not have permission: ' + permission_type)
#                 elif permission_type == 'drop_table':
#                     if current_permission.drop_table:
#                         return function(request, *args, **kwargs)
#                     else:
#                         raise PermissionDenied('Does not have permission: ' + permission_type)
#                 elif permission_type == 'receive':
#                     if current_permission.receive:
#                         return function(request, *args, **kwargs)
#                     else:
#                         raise PermissionDenied('Does not have permission: ' + permission_type)
#                 elif permission_type == 'damage':
#                     if current_permission.damage:
#                         return function(request, *args, **kwargs)
#                     else:
#                         raise PermissionDenied('Does not have permission: ' + permission_type)
#                 elif permission_type == 'reset_cost':
#                     if current_permission.reset_cost:
#                         return function(request, *args, **kwargs)
#                     else:
#                         raise PermissionDenied('Does not have permission: ' + permission_type)
#                 elif permission_type == 'reset_price':
#                     if current_permission.reset_price:
#                         return function(request, *args, **kwargs)
#                     else:
#                         raise PermissionDenied('Does not have permission: ' + permission_type)
#                 elif permission_type == 'create_transaction':
#                     if current_permission.create_transaction:
#                         return function(request, *args, **kwargs)
#                     else:
#                         raise PermissionDenied('Does not have permission: ' + permission_type)
#                 elif permission_type == 'edit_transaction_settings':
#                     if current_permission.edit_transaction_settings:
#                         return function(request, *args, **kwargs)
#                     else:
#                         raise PermissionDenied('Does not have permission: ' + permission_type)
#                 elif permission_type == 'create_user':
#                     if current_permission.create_user:
#                         return function(request, *args, **kwargs)
#                     else:
#                         raise PermissionDenied('Does not have permission: ' + permission_type)
#                 elif permission_type == 'create_user_type':
#                     if current_permission.create_user_type:
#                         return function(request, *args, **kwargs)
#                     else:
#                         raise PermissionDenied('Does not have permission: ' + permission_type)
#                 elif permission_type == 'edit_permissions':
#                     if current_permission.edit_permissions:
#                         return function(request, *args, **kwargs)
#                     else:
#                         raise PermissionDenied('Does not have permission: ' + permission_type)
#                 elif permission_type == 'delete_user_type':
#                     if current_permission.delete_user_type:
#                         return function(request, *args, **kwargs)
#                     else:
#                         raise PermissionDenied('Does not have permission: ' + permission_type)
#                 else:
#                     raise PermissionDenied('Permission does not exist')
#             else:
#                 return function(request, *args, **kwargs)
#
#         wrap.__doc__ = function.__doc__
#         wrap.__name__ = function.__name__
#         return wrap
#     return decorator


def data_required(required_data, request_type):
    def decorator(function):
        def wrap(request, *args, **kwargs):
            if request_type == "POST":
                request.POST = request.POST.dict()
                query_request = request.POST
            elif request_type == "GET":
                request.GET = request.GET.dict()
                query_request = request.GET
            elif request_type == "FILES":
                query_request = request.FILES
            else:
                query_request = json.loads(request.body)
                request.BODY = query_request

            for data in required_data:
                if data not in query_request:

                    if request_type == 'FILES':
                        if data in request.POST:
                            continue

                    print data + ' does not exist!'
                    raise PermissionDenied(data + ' does not exist!')
            return function(request, *args, **kwargs)
        wrap.__doc__ = function.__doc__
        wrap.__name__ = function.__name__
        return wrap
    return decorator
