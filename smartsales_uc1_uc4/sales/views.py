from rest_framework import generics, permissions, exceptions
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db import transaction
from django.db.models import Q
from rest_framework.views import APIView
from django.core.cache import cache
from django.core.mail import send_mail
from random import randint


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


# --- Verificación (envío de código y verificación) ---
class SendVerificationCodeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        channel = request.data.get('channel', 'email')  # email | sms | whatsapp
        email = request.data.get('email')
        phone = request.data.get('phone')
        code = f"{randint(0,999999):06d}"
        if channel == 'email' and email:
            cache.set(f"verify:email:{email}", code, timeout=600)
            try:
                send_mail(
                    subject='PercyStore: Código de verificación',
                    message=f'Tu código es {code}',
                    from_email='no-reply@percystore.local',
                    recipient_list=[email],
                    fail_silently=True,
                )
            except Exception:
                pass
            return Response({'ok': True})
        elif channel in ('sms','whatsapp') and phone:
            # Simulación: guardamos el código y lo devolvemos en dev
            cache.set(f"verify:tel:{phone}", code, timeout=600)
            return Response({'ok': True, 'dev_only_code': code})
        return Response({'ok': False, 'detail': 'Parámetros inválidos'}, status=400)


class VerifyCodeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        channel = request.data.get('channel', 'email')
        email = request.data.get('email')
        phone = request.data.get('phone')
        code = request.data.get('code')
        if channel == 'email' and email and code:
            saved = cache.get(f"verify:email:{email}")
            if saved and saved == code:
                cache.delete(f"verify:email:{email}")
                return Response({'ok': True})
        if channel in ('sms','whatsapp') and phone and code:
            saved = cache.get(f"verify:tel:{phone}")
            if saved and saved == code:
                cache.delete(f"verify:tel:{phone}")
                return Response({'ok': True})
        return Response({'ok': False, 'detail': 'Código inválido'}, status=400)


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
# CATÁLOGO (UC4) con búsqueda y filtros
# ───────────────────────────
class ProductListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ProductListSerializer

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True)

        # Parámetros
        q         = self.request.query_params.get('q')
        brand     = self.request.query_params.get('brand')        # nombre exacto (p.ej. "Samsung")
        brand_id  = self.request.query_params.get('brand_id')     # id numérico (opcional)
        category  = self.request.query_params.get('category')     # nombre exacto (p.ej. "Consolas")
        category_id = self.request.query_params.get('category_id')# id numérico (opcional)
        min_price = self.request.query_params.get('min')
        max_price = self.request.query_params.get('max')
        in_stock  = self.request.query_params.get('in_stock')     # "1","true","yes","si"
        sort      = self.request.query_params.get('sort')         # price_asc | price_desc | newest

        # Búsqueda libre en varios campos
        if q:
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(description__icontains=q) |
                Q(color__icontains=q) |
                Q(size__icontains=q)
            )

        # Filtros por marca (nombre o id)
        if brand:
            qs = qs.filter(brand__name__iexact=brand)
        if brand_id:
            qs = qs.filter(brand_id=brand_id)

        # Filtros por categoría (nombre o id)
        if category:
            qs = qs.filter(category__name__iexact=category)
        if category_id:
            qs = qs.filter(category_id=category_id)

        # Rango de precio
        if min_price:
            try:
                qs = qs.filter(price__gte=float(min_price))
            except ValueError:
                pass
        if max_price:
            try:
                qs = qs.filter(price__lte=float(max_price))
            except ValueError:
                pass

        # Solo en stock
        if in_stock and in_stock.lower() in ('1', 'true', 'yes', 'si'):
            qs = qs.filter(stock__gt=0)

        # Orden
        if sort == 'price_asc':
            qs = qs.order_by('price', 'name')
        elif sort == 'price_desc':
            qs = qs.order_by('-price', 'name')
        elif sort == 'newest':
            qs = qs.order_by('-created_at')
        else:
            qs = qs.order_by('name')

        return qs

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

# sales/views.py (agregar imports)
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from django.db import transaction
from django.http import FileResponse
from io import BytesIO

from .models import Order
from .serializers import OrderSerializer
from .services import adjust_stock_on_paid, revert_stock_on_void

# ----- UC13: Mis pedidos (cliente) -----
class OrderMineList(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-created_at')

# ----- UC9: Buscar por transaction_number (admin/garantías) -----
class OrderByTransaction(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAdminUser]
    lookup_field = 'transaction_number'
    queryset = Order.objects.all()

# ----- UC7a: Marcar como pagado (efectivo / yape simulado) -----
class OrderMarkPaid(APIView):
    permission_classes = [permissions.IsAdminUser]

    @transaction.atomic
    def post(self, request, pk):
        order = get_object_or_404(Order.objects.select_for_update(), pk=pk)
        if order.transaction_status == 'VOID':
            return Response({"detail": "La transacción está anulada."}, status=400)
        if order.status == 'PAID':
            return Response({"detail": "La orden ya está pagada."}, status=400)

        try:
            adjust_stock_on_paid(order)
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)

        method = request.data.get("method", "cash")
        note = f"Pago confirmado ({method}) {now().strftime('%Y-%m-%d %H:%M')}"
        order.observation = (order.observation or "")
        order.observation = (order.observation + ("\n" if order.observation else "") + note)
        order.save(update_fields=['observation'])
        return Response(OrderSerializer(order).data, status=200)

# ----- UC7b: Anular/void transacción (admin) -----
class OrderVoid(APIView):
    permission_classes = [permissions.IsAdminUser]

    @transaction.atomic
    def post(self, request, pk):
        order = get_object_or_404(Order.objects.select_for_update(), pk=pk)
        if order.transaction_status == 'VOID':
            return Response({"detail": "Ya estaba anulada."}, status=400)
        revert_stock_on_void(order)
        order.transaction_status = 'VOID'
        order.voided_at = now()
        order.voided_by = request.user
        obs = request.data.get("reason", "Anulación por administración")
        order.observation = (order.observation or "")
        order.observation = (order.observation + ("\n" if order.observation else "") + f"VOID: {obs}")
        order.save(update_fields=['transaction_status','voided_at','voided_by','observation','status'])
        return Response(OrderSerializer(order).data, status=200)

# ----- UC8: Comprobante PDF -----
# Requiere: pip install reportlab
class OrderReceiptPDF(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        # el cliente solo puede ver su propio comprobante; admin puede ver cualquiera
        if (order.user_id != request.user.id) and (not request.user.is_staff):
            return Response({"detail":"No autorizado."}, status=403)

        # generar PDF en memoria
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import mm

        buf = BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        W, H = A4

        y = H - 20*mm
        c.setFont("Helvetica-Bold", 14)
        c.drawString(20*mm, y, "PercyStore - Comprobante de Compra"); y -= 10*mm

        c.setFont("Helvetica", 10)
        c.drawString(20*mm, y, f"Transacción: {order.transaction_number}"); y -= 6*mm
        c.drawString(20*mm, y, f"Fecha: {order.created_at.strftime('%Y-%m-%d %H:%M')}"); y -= 6*mm
        c.drawString(20*mm, y, f"Cliente: {order.user.get_full_name() or order.user.username}"); y -= 10*mm

        c.setFont("Helvetica-Bold", 10)
        c.drawString(20*mm, y, "Items"); y -= 6*mm
        c.setFont("Helvetica", 10)

        for it in order.items.all():
            line = f"{it.qty}x {it.name_snapshot}  @ {it.unit_price}  = {it.line_total}"
            c.drawString(22*mm, y, line); y -= 6*mm
            if it.warranty_expires_at:
                c.drawString(24*mm, y, f"Garantía hasta: {it.warranty_expires_at}"); y -= 5*mm
            if y < 30*mm:
                c.showPage(); y = H - 20*mm

        y -= 5*mm
        c.setFont("Helvetica-Bold", 11)
        c.drawString(20*mm, y, f"Subtotal: {order.subtotal}"); y -= 6*mm
        c.drawString(20*mm, y, f"Envío: {order.shipping_total}  Descuento: {order.discount_total}  Impuestos: {order.tax_total}"); y -= 6*mm
        c.drawString(20*mm, y, f"TOTAL: {order.grand_total}"); y -= 10*mm

        c.setFont("Helvetica", 9)
        c.drawString(20*mm, y, f"Estado: {order.status}  | Transacción: {order.transaction_status}"); y -= 6*mm
        c.drawString(20*mm, y, "Gracias por su compra. Conserve este comprobante para garantías.")

        c.showPage()
        c.save()
        buf.seek(0)
        return FileResponse(buf, as_attachment=False, filename=f"receipt_{order.transaction_number}.pdf", content_type='application/pdf')
