"""inventory URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.11/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf.urls import url
from django.contrib import admin
from inventory.controllers import site, account_handler, store, inventory_handler, transaction

urlpatterns = [
    url(r'^$', site.home, name='home'),
    url(r'^admin/', admin.site.urls),
    url(r'^register/$', site.register, name='register_page'),
    url(r'^login/$', site.login, name='login_page'),
    url(r'^forgot_password/$', site.forgot_password, name='forgot_password'),
    url(r'^inventory/$', site.inventory, name='inventory_page'),
    url(r'^transaction/$', site.transaction, name='transaction_page'),
    url(r'^overview/$', site.overview, name='overview_page'),
    url(r'^employee/$', site.employee, name='employee_page'),

    # Account Handler
    url(r'^account/register/$', account_handler.register, name='register'),
    url(r'^account/login/$', account_handler.user_login, name='login'),
    # url(r'^account/settings/$', account_handler.settings, name='settings'),
    # url(r'^account/save_settings/$', account_handler.save_settings, name='save_settings'),
    url(r'^account/reset_password/$', account_handler.reset_password, name='reset_password'),
    url(r'^account/change_password/$', account_handler.change_password, name='change_password'),
    url(r'^logout/$', account_handler.user_logout, name='logout'),

    # Store
    url(r'^store/create_store/$', store.create_store, name='create_store'),
    url(r'^store/edit_store/$', store.edit_store, name='edit_store'),
    url(r'^store/delete_store/$', store.delete_store, name='delete_store'),

    # Inventory
    url(r'^inventory/add_column/$', inventory_handler.add_column, name='add_column'),
    url(r'^inventory/add_row/$', inventory_handler.add_row, name='add_row'),
    url(r'^inventory/edit_column/$', inventory_handler.edit_column, name='edit_column'),
    url(r'^inventory/edit_row/$', inventory_handler.edit_row, name='edit_item'),
    url(r'^inventory/delete_column/$', inventory_handler.delete_column, name='delete_column'),
    url(r'^inventory/delete_row/$', inventory_handler.delete_row, name='delete_item'),
    url(r'^inventory/read_excel/$', inventory_handler.read_excel, name='read_excel'),
    url(r'^inventory/import_submit/$', inventory_handler.import_submit, name='import_submit'),
    url(r'^inventory/export_submit/$', inventory_handler.export_submit, name='export_submit'),
    url(r'^inventory/drop_table/$', inventory_handler.drop_table, name='drop_table'),

    # Inventory Operation
    url(r'^inventory/received/$', inventory_handler.received, name='received'),
    url(r'^inventory/damaged/$', inventory_handler.damaged, name='damaged'),
    url(r'^inventory/reset_cost/$', inventory_handler.reset_cost, name='reset_cost'),
    url(r'^inventory/reset_price/$', inventory_handler.reset_price, name='reset_price'),

    # Transaction
    url(r'^transaction/link_columns/$', transaction.linked_columns, name='link_columns'),
    url(r'^transaction/search/$', transaction.inventory_search, name='inventory_search'),
    url(r'^transaction/create/$', transaction.create_transaction, name='create_transaction'),
    url(r'^transaction/print_receipt/$', transaction.print_receipt, name='print_receipt'),
    url(r'^transaction/save_receipt/$', transaction.save_receipt_settings, name='save_receipt'),

    # Employee
    url(r'^employee/register/$', account_handler.register_employee, name='register_employee'),
    url(r'^employee/edit/$', account_handler.edit_employee, name='edit_employee'),
    url(r'^employee/delete/$', account_handler.delete_employee, name='delete_employee'),
]
