from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from datetime import date
from dateutil.relativedelta import relativedelta  # pip install python-dateutil

from .models import (
    UserProfile, UserAddress, Brand, Category, Product,
    Cart, CartItem, Order, OrderItem,
    SalesReport, AuditReport, AdminAuditLog
)

# ───────────────────────────
# AUTH / PERFIL
# ───────────────────────────
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    full_name = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'full_name']
        extra_kwargs = {'username': {'required': False, 'allow_blank': True}}

    def create(self, validated_data):
        full_name = validated_data.pop('full_name', '')
        username = validated_data.get('username') or validated_data['email']
        password = validated_data.pop('password')
        validate_password(password)
        user = User.objects.create_user(
            username=username,
            email=validated_data.get('email'),
            password=password
        )
        parts = full_name.strip().split()
        if parts:
            user.first_name = parts[0]
            user.last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''
            user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['email', 'full_name', 'phone', 'birthdate', 'avatar_url', 'is_admin']

    def get_full_name(self, obj):
        fn = (obj.user.first_name + ' ' + obj.user.last_name).strip()
        return fn or obj.user.username


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['phone', 'birthdate', 'avatar_url']


class UserBasicUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name']

# ───────────────────────────
# CATÁLOGO
# ───────────────────────────
class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAddress
        fields = ['id', 'label', 'department', 'city', 'address_line', 'reference', 'lat', 'lng', 'is_default']


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']


class ProductSerializer(serializers.ModelSerializer):
    brand = BrandSerializer(read_only=True)
    category = CategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'color', 'size', 'price', 'stock',
            'image_url', 'warranty_months', 'is_active', 'brand', 'category'
        ]


class ProductListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'price', 'stock', 'image_url', 'warranty_months']


class ProductAdminWriteSerializer(serializers.ModelSerializer):
    brand_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    category_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    brand = BrandSerializer(read_only=True)
    category = CategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'color', 'size', 'price', 'stock',
            'image_url', 'warranty_months', 'is_active',
            'brand', 'category', 'brand_id', 'category_id'
        ]

    def create(self, validated_data):
        brand_id = validated_data.pop('brand_id', None)
        category_id = validated_data.pop('category_id', None)
        if brand_id:
            validated_data['brand_id'] = brand_id
        if category_id:
            validated_data['category_id'] = category_id
        # asignar creador si está en contexto
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        brand_id = validated_data.pop('brand_id', None)
        category_id = validated_data.pop('category_id', None)
        if brand_id is not None:
            instance.brand_id = brand_id
        if category_id is not None:
            instance.category_id = category_id
        return super().update(instance, validated_data)


class AdminUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField(read_only=True)
    is_admin = serializers.BooleanField(source='profile.is_admin', required=False)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'is_staff', 'is_superuser', 'is_admin', 'password']
        read_only_fields = ['is_superuser']

    def get_full_name(self, obj):
        fn = (obj.first_name + ' ' + obj.last_name).strip()
        return fn or obj.username

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {}) if 'profile' in validated_data else {}
        is_admin = profile_data.get('is_admin', False)
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        # profile exists via signal
        user.profile.is_admin = bool(is_admin)
        user.profile.save(update_fields=['is_admin'])
        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {}) if 'profile' in validated_data else {}
        is_admin = profile_data.get('is_admin', None)
        password = validated_data.pop('password', None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if password:
            instance.set_password(password)
        instance.save()
        if is_admin is not None:
            instance.profile.is_admin = bool(is_admin)
            instance.profile.save(update_fields=['is_admin'])
        return instance


class SalesReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesReport
        fields = ['id', 'created_by', 'created_at', 'filters', 'pdf_file']


class AuditReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditReport
        fields = ['id', 'created_by', 'created_at', 'filters', 'pdf_file']

# ───────────────────────────
# CARRITO
# ───────────────────────────
class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    image_url = serializers.CharField(source='product.image_url', read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_name', 'image_url', 'qty', 'price_snapshot', 'cart']
        read_only_fields = ['cart', 'product_name', 'image_url', 'price_snapshot']


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'status', 'currency', 'items', 'total', 'created_at']

    def get_total(self, obj):
        return sum([i.qty * i.price_snapshot for i in obj.items.all()])

# ───────────────────────────
# PEDIDOS / CHECKOUT
# ───────────────────────────
class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = '__all__'


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = '__all__'


class CheckoutSerializer(serializers.Serializer):
    shipping_address_id = serializers.IntegerField(required=False)
    billing_address_id = serializers.IntegerField(required=False)

    def validate(self, attrs):
        user = self.context['request'].user
        cart = Cart.objects.filter(user=user, status='ACTIVE').first()
        if not cart or cart.items.count() == 0:
            raise serializers.ValidationError("El carrito está vacío.")
        # valida stock
        for it in cart.items.select_related('product'):
            if it.qty > it.product.stock:
                raise serializers.ValidationError(f"Stock insuficiente para {it.product.name}.")
        return attrs

    def _gen_trx(self, user):
        from django.utils.timezone import now  # import local para evitar problemas en import circular
        return f"TRX-{now().strftime('%Y%m%d')}-{user.id}-{int(now().timestamp())}"

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['request'].user
        cart = Cart.objects.select_for_update().get(user=user, status='ACTIVE')
        ship_id = validated_data.get('shipping_address_id')
        bill_id = validated_data.get('billing_address_id')

        shipping = UserAddress.objects.filter(user=user, id=ship_id).first() if ship_id else None
        billing = UserAddress.objects.filter(user=user, id=bill_id).first() if bill_id else None

        subtotal = sum([i.qty * i.price_snapshot for i in cart.items.all()])
        discount_total = 0
        tax_total = 0
        shipping_total = 0
        grand_total = subtotal - discount_total + tax_total + shipping_total

        order = Order.objects.create(
            user=user,
            status='PENDING',
            transaction_number=self._gen_trx(user),
            transaction_status='VALID',
            subtotal=subtotal, discount_total=discount_total,
            tax_total=tax_total, shipping_total=shipping_total, grand_total=grand_total,
            shipping_address=shipping, billing_address=billing
        )

        # Items snapshot (no descontamos stock todavía)
        today = date.today()
        for it in cart.items.select_related('product'):
            wmonths = it.product.warranty_months or 0
            wexp = (today + relativedelta(months=wmonths)) if wmonths > 0 else None
            OrderItem.objects.create(
                order=order, product=it.product,
                name_snapshot=it.product.name,
                color_snapshot=it.product.color, size_snapshot=it.product.size,
                warranty_months_snapshot=wmonths, warranty_expires_at=wexp,
                qty=it.qty, unit_price=it.price_snapshot, tax_rate=0, discount=0,
                line_total=it.qty * it.price_snapshot
            )

        # cerrar carrito
        cart.status = 'CONVERTED'
        cart.save()

        return order
