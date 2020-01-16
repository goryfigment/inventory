from django.forms.models import model_to_dict
from django.http import JsonResponse, HttpResponseBadRequest
from inventory.models import Store
from inventory.decorators import login_required, user_permission, data_required
from inventory.modules.base import get_boss


@login_required
@user_permission('boss_only')
@data_required(['store_name'], 'POST')
def create_store(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    business = current_boss.business

    store_name = request.POST['store_name']

    if store_name == '':
        return HttpResponseBadRequest('This field is required.', 'application/json')

    user_stores = business.stores.all()

    for user_store in user_stores:
        if user_store.name == store_name:
            return HttpResponseBadRequest('Name already exist.', 'application/json')

    store = Store.objects.create(name=request.POST['store_name'])
    # ADD TO BUSINESS STORE LIST
    business.stores.add(store)

    return JsonResponse(model_to_dict(store), safe=False)


@login_required
@user_permission('boss_only')
@data_required(['id', 'store_name'], 'POST')
def edit_store(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    business = current_boss.business

    store_name = request.POST['store_name']

    if store_name == '':
        return HttpResponseBadRequest('This field is required.', 'application/json')

    user_stores = business.stores.all()

    for user_store in user_stores:
        if user_store.name == store_name:
            return HttpResponseBadRequest('Name already exist.', 'application/json')

    store = Store.objects.get(id=request.POST['id'])
    store.name = store_name
    store.save()

    return JsonResponse(model_to_dict(store), safe=False)


@login_required
@user_permission('boss_only')
@data_required(['id'], 'POST')
def delete_store(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    business = current_boss.business
    user_stores = business.stores.all()
    store_id = request.POST['id']

    store = Store.objects.get(id=store_id)

    # Check if boss owns the store
    if store not in user_stores:
        return HttpResponseBadRequest('Store does not exist.', 'application/json')

    store.delete()

    return JsonResponse({'id': store_id}, safe=False)
