from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.conf import settings
from decimal import Decimal

try:
    from django.db.models import JSONField  # Django >= 3.1
except Exception:  # pragma: no cover
    from django.contrib.postgres.fields import JSONField  # type: ignore

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# PERFIL Y DIRECCIONES
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=30, blank=True, null=True)
    birthdate = models.DateField(blank=True, null=True)
    avatar_url = models.URLField(blank=True, null=True)
    is_admin = models.BooleanField(default=False)

class UserAddress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    label = models.CharField(max_length=60)
    department = models.CharField(max_length=80)
    city = models.CharField(max_length=80)
    address_line = models.TextField()
    reference = models.TextField(blank=True, null=True)
    lat = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    is_default = models.BooleanField(default=False)

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# CATÃLOGO
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class Brand(models.Model):
    name = models.CharField(max_length=120, unique=True)

class Category(models.Model):
    name = models.CharField(max_length=120, unique=True)

class Product(models.Model):
    name = models.CharField(max_length=200)
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    color = models.CharField(max_length=60, blank=True, null=True)
    size = models.CharField(max_length=60, blank=True, null=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    stock = models.IntegerField(default=0)
    image_url = models.URLField(blank=True, null=True)
    warranty_months = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    # Destacados y ofertas
    is_featured = models.BooleanField(default=False)
    sale_price = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_products')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def get_final_price(self):
        try:
            if self.sale_price is not None:
                return self.sale_price
            if self.discount_percent is not None and Decimal(self.discount_percent) > 0:
                return (Decimal(self.price) * (Decimal('1') - Decimal(self.discount_percent) / Decimal('100'))).quantize(Decimal('0.01'))
            return self.price
        except Exception:
            return self.price

    @property
    def final_price(self):
        return self.get_final_price()

    @property
    def is_on_sale(self):
        try:
            return (self.sale_price is not None) or (self.discount_percent is not None and Decimal(self.discount_percent) > 0)
        except Exception:
            return False

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# CARRITO (UC5)
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class Cart(models.Model):
    STATUS_CHOICES = (('ACTIVE','ACTIVE'), ('CONVERTED','CONVERTED'), ('ABANDONED','ABANDONED'))
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='carts')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    currency = models.CharField(max_length=8, default='BOB')
    created_at = models.DateTimeField(auto_now_add=True)

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    qty = models.PositiveIntegerField()
    price_snapshot = models.DecimalField(max_digits=12, decimal_places=2)  # precio al momento de agregar

    class Meta:
        unique_together = ('cart', 'product')  # combinamos cantidades si repiten

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# PEDIDOS (UC6)
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class Order(models.Model):
    STATUS_CHOICES = (
        ('PENDING','PENDING'),
        ('PAID','PAID'),
        ('SHIPPED','SHIPPED'),
        ('DELIVERED','DELIVERED'),
        ('CANCELLED','CANCELLED'),
        ('REFUNDED','REFUNDED'),
    )
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    transaction_number = models.CharField(max_length=40, unique=True)
    transaction_status = models.CharField(max_length=10, default='VALID')  # VALID | VOID
    PAYMENT_METHODS = (
        ('QR', 'QR'),
        ('CASH', 'CASH'),
    )
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHODS, blank=True, null=True)
    payment_due_at = models.DateTimeField(blank=True, null=True)

    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    discount_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2)

    shipping_address = models.ForeignKey(UserAddress, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    billing_address = models.ForeignKey(UserAddress, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    observation = models.TextField(blank=True, null=True)
    customer_name = models.CharField(max_length=120, blank=True, null=True)
    customer_document = models.CharField(max_length=40, blank=True, null=True)
    customer_phone = models.CharField(max_length=32, blank=True, null=True)
    customer_warranty_note = models.CharField(max_length=160, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(blank=True, null=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    voided_at = models.DateTimeField(blank=True, null=True)
    voided_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)

    name_snapshot = models.CharField(max_length=200)
    sku_snapshot = models.CharField(max_length=80, blank=True, null=True)  # no se usa
    color_snapshot = models.CharField(max_length=60, blank=True, null=True)
    size_snapshot = models.CharField(max_length=60, blank=True, null=True)
    warranty_months_snapshot = models.IntegerField(default=0)
    warranty_expires_at = models.DateField(blank=True, null=True)

    qty = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

# ------------------------------
# ADMIN / AUDITORÃA / REPORTES
# ------------------------------

class AdminAuditLog(models.Model):
    ACTIONS = (
        ('CREATE', 'CREATE'),
        ('UPDATE', 'UPDATE'),
        ('DELETE', 'DELETE'),
        ('ADJUST_STOCK', 'ADJUST_STOCK'),
        ('CREATE_USER', 'CREATE_USER'),
        ('UPDATE_USER', 'UPDATE_USER'),
        ('DELETE_USER', 'DELETE_USER'),
        ('CHANGE_EMAIL', 'CHANGE_EMAIL'),
        ('CHANGE_PHONE', 'CHANGE_PHONE'),
    )
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='+')
    action = models.CharField(max_length=20, choices=ACTIONS)
    model_name = models.CharField(max_length=80)
    object_id = models.CharField(max_length=80)
    before_data = JSONField(blank=True, null=True)
    after_data = JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


def report_upload_path(instance, filename):
    return f"reports/{filename}"


class SalesReport(models.Model):
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    filters = JSONField()
    pdf_file = models.FileField(upload_to=report_upload_path)

    class Meta:
        ordering = ['-created_at']


class AuditReport(models.Model):
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    filters = JSONField()
    pdf_file = models.FileField(upload_to=report_upload_path)

    class Meta:
        ordering = ['-created_at']


class PaymentTransaction(models.Model):
    PROVIDERS = (
        ('stripe', 'stripe'),
        ('cucu', 'cucu'),
        ('mp', 'mp'),
        ('bnb', 'bnb'),
    )
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    provider = models.CharField(max_length=20, choices=PROVIDERS)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=8, default='BOB')
    status = models.CharField(max_length=20, default='CREATED')  # CREATED | PENDING | SUCCEEDED | FAILED | CANCELED
    external_id = models.CharField(max_length=120, blank=True, null=True)  # checkout_session_id / payment_intent
    metadata = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

