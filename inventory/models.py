from django.db import models
from django.contrib.auth.models import AbstractBaseUser
from django_mysql.models import JSONField
import time


def get_utc_epoch_time():
    return int(round(time.time()))


def default_link_columns():
    return {"quantity": False, "price": False, "cost": False, 'name': False}


def default_transaction_filter():
    return ['ALL']


class Store(models.Model):
    name = models.CharField(max_length=100)
    tax = models.CharField(default='0.00', max_length=12)
    link_columns = JSONField(default=default_link_columns)
    include_columns = JSONField()
    columns = JSONField(default=list)
    picture_column = models.CharField(max_length=100, blank=True)
    inventory = JSONField()
    # settings
    order_by = models.CharField(max_length=100, default='none')
    reverse = models.BooleanField(default=False)
    transaction_filter = JSONField(default=default_transaction_filter)

    class Meta:
        db_table = "store"


class Business(models.Model):
    stores = models.ManyToManyField(Store)
    name = models.CharField(max_length=100)

    class Meta:
        db_table = "business"


class Settings(models.Model):
    start_time = models.IntegerField(default=0, blank=True)
    date_range = models.CharField(max_length=15, default='*')
    # RECEIPT SETTINGS
    ip_address = models.CharField(max_length=100, default='192.168.0.0')
    header = JSONField()
    footer = JSONField()

    class Meta:
        db_table = "settings"


class Boss(models.Model):
    settings = models.OneToOneField(Settings, on_delete=models.CASCADE)
    business = models.OneToOneField(Business, on_delete=models.CASCADE)

    class Meta:
        db_table = "boss"


class Employee(models.Model):
    boss = models.ForeignKey(Boss, default=None)
    type = models.CharField(choices=(('admin', 'admin'), ('employee', 'employee'), ('read', 'read')), max_length=255, default='read')
    store = models.ForeignKey(Store, default=None)

    class Meta:
        db_table = "employee"


class User(AbstractBaseUser):
    email = models.EmailField(max_length=255, unique=True, blank=True, null=True)
    username = models.CharField(max_length=15, unique=True)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    reset_link = models.CharField(default=None, null=True, max_length=255)
    reset_date = models.IntegerField(default=None, blank=True, null=True)
    is_staff = models.BooleanField(default=True)
    is_superuser = models.BooleanField(default=True)
    boss = models.OneToOneField(Boss, default=None, null=True, on_delete=models.CASCADE)
    employee = models.OneToOneField(Employee, default=None, null=True, on_delete=models.CASCADE)
    # password = models.CharField(max_length=255)
    # last_login = models.DateTimeField(default=timezone.now, blank=True)

    USERNAME_FIELD = 'username'

    def __unicode__(self):
        return self.email

    def get_short_name(self):
        return self.first_name

    def has_perm(self, perm, obj=None):
        return self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_superuser

    class Meta:
        db_table = "user"


class ItemLog(models.Model):
    user = models.ForeignKey(User, default=None)
    business = models.ForeignKey(Business, null=True, default=None)
    store = models.ForeignKey(Store, null=True, default=None)
    action = models.CharField(max_length=255, blank=True)
    operation = models.CharField(choices=(('Received', 'Received'), ('Damaged', 'Damaged'), ('Reset Cost', 'Reset Cost'), ('Reset Price', 'Reset Price')), max_length=255, default='Received')
    item_name = models.CharField(max_length=255, blank=True)
    change = models.CharField(max_length=255, blank=True)
    previous_value = models.CharField(max_length=255, blank=True)
    date = models.IntegerField(default=get_utc_epoch_time, blank=True)
    details = JSONField()

    class Meta:
        db_table = "item_log"


class Transaction(models.Model):
    boss = models.ForeignKey(Boss, default=None)
    seller = models.ForeignKey(User, default=None)
    store = models.ForeignKey(Store, null=True, default=None)
    items = JSONField()
    payment_type = models.CharField(choices=(('Cash', 'Cash'), ('American Express', 'American Express'), ('Discover', 'Discover'), ('MasterCard', 'MasterCard'), ('Visa', 'Visa')), max_length=255, default='Cash')
    tax = models.CharField(default='0.00', max_length=12)
    subtotal = models.CharField(max_length=255)
    memo = models.CharField(max_length=255, blank=True)
    date = models.IntegerField(default=get_utc_epoch_time, blank=True)

    def __unicode__(self):
        return self.seller.first_name + ': ' + str(self.subtotal)

    class Meta:
        db_table = "transaction"
