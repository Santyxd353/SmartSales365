from rest_framework import generics, permissions, exceptions
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db import transaction

from .serializers import (
    RegisterSerializer, UserProfileSerializer, UserProfileUpdateSerializer,
    UserBasicUpdateSerializer, AddressSerializer,
    ProductSerializer, ProductListSerializer,
    CartSerializer, CartItemSerializer,
    CheckoutSerializer, OrderSerializer
)
from .models import UserProfile, UserAddress, Product, Cart, CartItem


# ───────────────────────────
# AUTH
# ───────────────────────────
class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class CustomTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['roles'] = ['admin'] if hasattr(user, 'profile') and user.profile.is_admin else ['buyer']
        return token


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenSerializer


# ───────────────────────────
# PERFIL & DIRECCIONES (UC3)
# ───────────────────────────
class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = request.user.profile
        return Response(UserProfileSerializer(profile).data)

    def put(self, request):
        profile = request.user.profile
        basic = UserBasicUpdateSerializer(request.user, data={
            'first_name': request.data.get('first_name', ''),
            'last_name': request.data.get('last_name', '')
        }, partial=True)
        prof = UserProfileUpdateSerializer(profile, data=request.data, partial=True)
        basic.is_valid(raise_exception=True); basic.save()
        prof.is_valid(raise_exception=True); prof.save()
        return Response(UserProfileSerializer(profile).data)


class AddressListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AddressSerializer

    def get_queryset(self):
        return UserAddress.objects.filter(user=self.request.user).order_by('-is_default', 'id')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AddressSerializer

    def get_queryset(self):
        return UserAddress.objects.filter(user=self.request.user)


# ───────────────────────────
# CATÁLOGO (UC4)
# ───────────────────────────
class ProductListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ProductListSerializer

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True)
        q = self.request.query_params.get('q')
        cat = self.request.query_params.get('category_id')
        if q:
            qs = qs.filter(name__icontains=q)
        if cat:
            qs = qs.filter(category_id=cat)
        return qs.order_by('name')


class ProductDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ProductSerializer
    queryset = Product.objects.filter(is_active=True)


# ───────────────────────────
# CARRITO (UC5)
# ───────────────────────────
def _get_or_create_active_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user, status='ACTIVE')
    return cart


class CartView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CartSerializer

    def get_object(self):
        return _get_or_create_active_cart(self.request.user)


class CartAddItemView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CartItemSerializer

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        cart = _get_or_create_active_cart(request.user)
        product_id = request.data.get('product_id')
        qty = int(request.data.get('qty', 1))
        if qty <= 0:
            raise exceptions.ValidationError("La cantidad debe ser mayor a 0.")

        try:
            product = Product.objects.get(pk=product_id, is_active=True)
        except Product.DoesNotExist:
            raise exceptions.NotFound("Producto no encontrado o inactivo.")

        if qty > product.stock:
            raise exceptions.ValidationError("Stock insuficiente.")

        item, created = CartItem.objects.get_or_create(
            cart=cart, product=product,
            defaults={'qty': qty, 'price_snapshot': product.price}
        )
        if not created:
            new_qty = item.qty + qty
            if new_qty > product.stock:
                raise exceptions.ValidationError("Stock insuficiente para la cantidad total.")
            item.qty = new_qty
            item.price_snapshot = product.price
            item.save()

        return Response(CartSerializer(cart).data)


class CartItemUpdateView(generics.UpdateAPIView, generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CartItemSerializer
    lookup_url_kwarg = 'item_id'

    def get_queryset(self):
        cart = _get_or_create_active_cart(self.request.user)
        return CartItem.objects.filter(cart=cart)

    @transaction.atomic
    def put(self, request, *args, **kwargs):
        item = self.get_object()
        qty = int(request.data.get('qty', 1))
        if qty <= 0:
            cart = item.cart
            item.delete()
            return Response(CartSerializer(cart).data)
        if qty > item.product.stock:
            raise exceptions.ValidationError("Stock insuficiente.")
        item.qty = qty
        item.price_snapshot = item.product.price
        item.save()
        return Response(CartSerializer(item.cart).data)

    def delete(self, request, *args, **kwargs):
        item = self.get_object()
        cart = item.cart
        item.delete()
        return Response(CartSerializer(cart).data)


# ───────────────────────────
# CHECKOUT (UC6)
# ───────────────────────────
class CheckoutView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CheckoutSerializer

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)
        order = ser.save()
        return Response({'order_id': order.id, 'transaction_number': order.transaction_number})
