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
from django.conf import settings
from django.core.files.storage import default_storage
from django.utils.text import get_valid_filename
from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from django.http import FileResponse
from io import BytesIO
from io import StringIO
import csv
import os

from .serializers import (
    RegisterSerializer, UserProfileSerializer, UserProfileUpdateSerializer,
    UserBasicUpdateSerializer, AddressSerializer,
    ProductSerializer, ProductListSerializer,
    CartSerializer, CartItemSerializer,
    CheckoutSerializer, OrderSerializer,
    BrandSerializer, CategorySerializer, ProductAdminWriteSerializer,
)
from .models import UserProfile, UserAddress, Product, Cart, CartItem, Order, Brand, Category, SalesReport, AuditReport, AdminAuditLog
from .services import adjust_stock_on_paid, revert_stock_on_void, log_admin_action


# AUTH
class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class CustomTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Rol en JWT: 'admin' si el usuario tiene profile.is_admin True o es staff/superuser
        is_admin_flag = False
        try:
            prof = getattr(user, 'profile', None)
            if prof is not None and getattr(prof, 'is_admin', False):
                is_admin_flag = True
        except Exception:
            is_admin_flag = False
        if not is_admin_flag and (getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False)):
            is_admin_flag = True
        token['roles'] = ['admin'] if is_admin_flag else ['buyer']
        return token

    def validate(self, attrs):
        username = attrs.get(self.username_field)
        password = attrs.get('password')
        user = None
        if username and password:
            from django.contrib.auth import authenticate
            from django.contrib.auth.models import User
            from django.db.models import Q
            try:
                candidate = User.objects.filter(
                    Q(username__iexact=username) | Q(email__iexact=username) | Q(profile__phone__iexact=username)
                ).select_related('profile').first()
            except Exception:
                candidate = None
            if candidate is not None:
                username = candidate.username
            user = authenticate(username=username, password=password)
        if user is None:
            raise exceptions.AuthenticationFailed('Credenciales inválidas')
        data = super().validate({self.username_field: user.username, 'password': password})
        return data


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenSerializer


# PERFIL & DIRECCIONES (UC3)
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


# VerificaciÃ³n (envÃ­o de cÃ³digo y validaciÃ³n)
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
                    subject='PercyStore: CÃ³digo de verificaciÃ³n',
                    message=f'Tu cÃ³digo es {code}',
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@percystore.local'),
                    recipient_list=[email],
                    fail_silently=False,
                )
            except Exception as e:
                # Si falla el correo, en DEBUG devolvemos el código para pruebas; en prod informamos el error
                if getattr(settings, 'DEBUG', False):
                    return Response({'ok': True, 'dev_only_code': code, 'warning': str(e)})
                return Response({'ok': False, 'detail': 'No se pudo enviar el correo. Revisa la configuración SMTP.'}, status=500)
            return Response({'ok': True})
        elif channel in ('sms','whatsapp') and phone:
            sid = os.environ.get('TWILIO_ACCOUNT_SID')
            token = os.environ.get('TWILIO_AUTH_TOKEN')
            from_sms = os.environ.get('TWILIO_FROM_SMS')  # e.g. +1XXXXXXXXXX
            from_wa = os.environ.get('TWILIO_FROM_WHATSAPP')  # e.g. whatsapp:+1XXXXXXXXXX
            if not (sid and token and ((channel == 'sms' and from_sms) or (channel == 'whatsapp' and from_wa))):
                # Fallback: intenta cargar .env explícitamente si el server no lo cargó
                try:
                    from django.conf import settings as dj_settings
                    from dotenv import load_dotenv  # type: ignore
                    import os as _os
                    load_dotenv(_os.path.join(dj_settings.BASE_DIR, '.env'))
                    sid = _os.environ.get('TWILIO_ACCOUNT_SID') or sid
                    token = _os.environ.get('TWILIO_AUTH_TOKEN') or token
                    from_sms = _os.environ.get('TWILIO_FROM_SMS') or from_sms
                    from_wa = _os.environ.get('TWILIO_FROM_WHATSAPP') or from_wa
                except Exception:
                    pass
            ready = bool(sid and token and ((channel == 'sms' and from_sms) or (channel == 'whatsapp' and from_wa)))
            if ready:
                try:
                    from twilio.rest import Client  # type: ignore
                    client = Client(sid, token)
                    if channel == 'sms':
                        client.messages.create(body=f'PercyStore cÃ³digo: {code}', from_=from_sms, to=phone)
                    else:
                        to = phone if phone.startswith('whatsapp:') else f'whatsapp:{phone}'
                        client.messages.create(body=f'PercyStore cÃ³digo: {code}', from_=from_wa, to=to)
                    cache.set(f"verify:tel:{phone}", code, timeout=600)
                    return Response({'ok': True})
                except Exception as e:
                    cache.set(f"verify:tel:{phone}", code, timeout=600)
                    return Response({'ok': True, 'dev_only_code': code, 'warning': str(e)})
            # Fallback simulaciÃ³n
            cache.set(f"verify:tel:{phone}", code, timeout=600)
            payload = {'ok': True, 'dev_only_code': code}
            try:
                if settings.DEBUG:
                    payload.update({'twilio_ready': ready, 'has_sid': bool(sid), 'has_token': bool(token), 'has_from_sms': bool(from_sms), 'has_from_wa': bool(from_wa), 'channel': channel})
            except Exception:
                pass
            return Response(payload)
        return Response({'ok': False, 'detail': 'ParÃ¡metros invÃ¡lidos'}, status=400)


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
        return Response({'ok': False, 'detail': 'CÃ³digo invÃ¡lido'}, status=400)


# CATÃLOGO (UC4) con bÃºsqueda y filtros
class ProductListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ProductListSerializer

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True)

        # ParÃ¡metros
        q           = self.request.query_params.get('q')
        brand       = self.request.query_params.get('brand')
        brand_id    = self.request.query_params.get('brand_id')
        category    = self.request.query_params.get('category')
        category_id = self.request.query_params.get('category_id')
        min_price   = self.request.query_params.get('min')
        max_price   = self.request.query_params.get('max')
        in_stock    = self.request.query_params.get('in_stock')
        sort        = self.request.query_params.get('sort')  # price_asc | price_desc | newest

        if q:
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(description__icontains=q) |
                Q(color__icontains=q) |
                Q(size__icontains=q)
            )

        if brand:
            qs = qs.filter(brand__name__iexact=brand)
        if brand_id:
            qs = qs.filter(brand_id=brand_id)

        if category:
            qs = qs.filter(category__name__iexact=category)
        if category_id:
            qs = qs.filter(category_id=category_id)

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

        if in_stock and str(in_stock).lower() in ('1','true','yes','si','sÃ­'):
            qs = qs.filter(stock__gt=0)

        if sort == 'price_asc':
            qs = qs.order_by('price', 'name')
        elif sort == 'price_desc':
            qs = qs.order_by('-price', 'name')
        elif sort == 'newest':
            qs = qs.order_by('-created_at')
        else:
            qs = qs.order_by('name')

        return qs


class ProductDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ProductSerializer
    queryset = Product.objects.filter(is_active=True)


# Cat\u00e1logos adjuntos
class BrandListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = BrandSerializer
    queryset = Brand.objects.all().order_by('name')


class CategoryListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CategorySerializer
    queryset = Category.objects.all().order_by('name')


# Admin de productos
class AdminProductListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = ProductAdminWriteSerializer

    def get_queryset(self):
        qs = Product.objects.all()
        q = self.request.query_params.get('q')
        brand = self.request.query_params.get('brand')
        category = self.request.query_params.get('category')
        active = self.request.query_params.get('active')

        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))
        if brand:
            qs = qs.filter(brand__name__iexact=brand)
        if category:
            qs = qs.filter(category__name__iexact=category)
        if active is not None:
            s = str(active).lower()
            if s in ('1','true','yes','si','s\u00ed'):
                qs = qs.filter(is_active=True)
            elif s in ('0','false','no'):
                qs = qs.filter(is_active=False)
        return qs.order_by('-updated_at')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def perform_create(self, serializer):
        obj = serializer.save()
        try:
            log_admin_action(self.request.user, 'CREATE', 'Product', obj.id, None, obj)
        except Exception:
            pass


class AdminProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = ProductAdminWriteSerializer
    queryset = Product.objects.all()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def perform_update(self, serializer):
        before = self.get_object()
        obj = serializer.save()
        try:
            log_admin_action(self.request.user, 'UPDATE', 'Product', obj.id, before, obj)
        except Exception:
            pass

    def perform_destroy(self, instance):
        before = instance
        obj_id = instance.id
        instance.delete()
        try:
            log_admin_action(self.request.user, 'DELETE', 'Product', obj_id, before, None)
        except Exception:
            pass


class AdminProductAdjustStockView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            delta = int(request.data.get('amount'))
        except Exception:
            return Response({'detail': 'amount debe ser entero'}, status=400)
        product = get_object_or_404(Product, pk=pk)
        new_stock = (product.stock or 0) + delta
        if new_stock < 0:
            return Response({'detail': 'Stock no puede ser negativo'}, status=400)
        before = Product.objects.get(pk=product.pk)
        product.stock = new_stock
        product.save(update_fields=['stock'])
        try:
            log_admin_action(request.user, 'ADJUST_STOCK', 'Product', product.id, before, product)
        except Exception:
            pass
        return Response({'id': product.id, 'stock': product.stock})


# CARRITO (UC5)
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


# CHECKOUT (UC6)
class CheckoutView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CheckoutSerializer

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)
        order = ser.save()
        return Response({'order_id': order.id, 'transaction_number': order.transaction_number})


# UC13: Mis pedidos (cliente)
class OrderMineList(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-created_at')


# UC9: Buscar por transaction_number (admin)
class OrderByTransaction(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAdminUser]
    lookup_field = 'transaction_number'
    queryset = Order.objects.all()


# UC7a: Marcar como pagado
class OrderMarkPaid(APIView):
    permission_classes = [permissions.IsAdminUser]

    @transaction.atomic
    def post(self, request, pk):
        order = get_object_or_404(Order.objects.select_for_update(), pk=pk)
        if order.transaction_status == 'VOID':
            return Response({"detail": "La transacciÃ³n estÃ¡ anulada."}, status=400)
        if order.status == 'PAID':
            return Response({"detail": "La orden ya estÃ¡ pagada."}, status=400)

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


# UC7b: Anular/void transacciÃ³n (admin)
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
        obs = request.data.get("reason", "AnulaciÃ³n por administraciÃ³n")
        order.observation = (order.observation or "")
        order.observation = (order.observation + ("\n" if order.observation else "") + f"VOID: {obs}")
        order.save(update_fields=['transaction_status','voided_at','voided_by','observation','status'])
        return Response(OrderSerializer(order).data, status=200)


# UC8: Comprobante PDF
class OrderReceiptPDF(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        if (order.user_id != request.user.id) and (not request.user.is_staff):
            return Response({"detail":"No autorizado."}, status=403)

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
        c.drawString(20*mm, y, f"TransacciÃ³n: {order.transaction_number}"); y -= 6*mm
        c.drawString(20*mm, y, f"Fecha: {order.created_at.strftime('%Y-%m-%d %H:%M')}"); y -= 6*mm
        c.drawString(20*mm, y, f"Cliente: {order.user.get_full_name() or order.user.username}"); y -= 10*mm

        c.setFont("Helvetica-Bold", 10)
        c.drawString(20*mm, y, "Items"); y -= 6*mm
        c.setFont("Helvetica", 10)

        for it in order.items.all():
            line = f"{it.qty}x {it.name_snapshot}  @ {it.unit_price}  = {it.line_total}"
            c.drawString(22*mm, y, line); y -= 6*mm
            if it.warranty_expires_at:
                c.drawString(24*mm, y, f"GarantÃ­a hasta: {it.warranty_expires_at}"); y -= 5*mm
            if y < 30*mm:
                c.showPage(); y = H - 20*mm

        y -= 5*mm
        c.setFont("Helvetica-Bold", 11)
        c.drawString(20*mm, y, f"Subtotal: {order.subtotal}"); y -= 6*mm
        c.drawString(20*mm, y, f"EnvÃ­o: {order.shipping_total}  Descuento: {order.discount_total}  Impuestos: {order.tax_total}"); y -= 6*mm
        c.drawString(20*mm, y, f"TOTAL: {order.grand_total}"); y -= 10*mm

        c.setFont("Helvetica", 9)
        c.drawString(20*mm, y, f"Estado: {order.status}  | TransacciÃ³n: {order.transaction_status}"); y -= 6*mm
        c.drawString(20*mm, y, "Gracias por su compra. Conserve este comprobante para garantÃ­as.")

        c.showPage()
        c.save()
        buf.seek(0)
        return FileResponse(buf, as_attachment=False, filename=f"receipt_{order.transaction_number}.pdf", content_type='application/pdf')


# Upload avatar (dev)
class UploadAvatarView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Archivo no enviado'}, status=400)
        name = get_valid_filename(file.name)
        path = f"avatars/{randint(1000,9999)}_{name}"
        saved_path = default_storage.save(path, file)
        base = request.build_absolute_uri('/')[:-1]
        media_url = getattr(settings, 'MEDIA_URL', '/media/')
        url = f"{base}{media_url}{saved_path}"
        return Response({'url': url})


# ---------- ADMIN USERS ----------
class AdminUserListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = __import__('sales.serializers', fromlist=['AdminUserSerializer']).AdminUserSerializer  # lazy to avoid circular import hints
    queryset = User.objects.all().order_by('username')

    def perform_create(self, serializer):
        obj = serializer.save()
        try:
            log_admin_action(self.request.user, 'CREATE_USER', 'User', obj.id, None, obj)
        except Exception:
            pass


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = __import__('sales.serializers', fromlist=['AdminUserSerializer']).AdminUserSerializer
    queryset = User.objects.all()

    def perform_update(self, serializer):
        before = self.get_object()
        obj = serializer.save()
        try:
            log_admin_action(self.request.user, 'UPDATE_USER', 'User', obj.id, before, obj)
        except Exception:
            pass

    def perform_destroy(self, instance):
        before = instance
        obj_id = instance.id
        instance.delete()
        try:
            log_admin_action(self.request.user, 'DELETE_USER', 'User', obj_id, before, None)
        except Exception:
            pass


# ---------- PROFILE: CHANGE EMAIL/PHONE WITH VERIFICATION ----------
class ChangeEmailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')
        if not email or not code:
            return Response({'detail':'email y code requeridos'}, status=400)
        cached = cache.get(f"verify:email:{email}")
        if not cached or str(cached) != str(code):
            return Response({'detail':'CÃ³digo invÃ¡lido'}, status=400)
        before = User.objects.get(pk=request.user.pk)
        request.user.email = email
        request.user.save(update_fields=['email'])
        try:
            log_admin_action(request.user, 'CHANGE_EMAIL', 'User', request.user.id, before, request.user)
        except Exception:
            pass
        return Response({'ok': True})


class ChangePhoneView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        phone = request.data.get('phone')
        code = request.data.get('code')
        if not phone or not code:
            return Response({'detail':'phone y code requeridos'}, status=400)
        cached = cache.get(f"verify:tel:{phone}")
        if not cached or str(cached) != str(code):
            return Response({'detail':'CÃ³digo invÃ¡lido'}, status=400)
        before = request.user.profile
        prof = request.user.profile
        prof.phone = phone
        prof.save(update_fields=['phone'])
        try:
            log_admin_action(request.user, 'CHANGE_PHONE', 'UserProfile', prof.user_id, before, prof)
        except Exception:
            pass
        return Response({'ok': True})


# ---------- SALES REPORTS (persisted, not deletable) ----------
class AdminSalesReportList(generics.ListAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = __import__('sales.serializers', fromlist=['SalesReportSerializer']).SalesReportSerializer
    queryset = __import__('sales.models', fromlist=['SalesReport']).SalesReport.objects.all()


class AdminSalesReportCreate(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import mm
        from django.core.files.base import ContentFile
        import datetime
        SalesReport = __import__('sales.models', fromlist=['SalesReport']).SalesReport
        SalesReportSerializer = __import__('sales.serializers', fromlist=['SalesReportSerializer']).SalesReportSerializer

        f = {
            'date_from': request.data.get('date_from'),
            'date_to': request.data.get('date_to'),
            'brand': request.data.get('brand') or '',
            'category': request.data.get('category') or '',
            'min_price': request.data.get('min_price') or '',
            'max_price': request.data.get('max_price') or '',
        }

        qs_orders = Order.objects.filter(status='PAID').prefetch_related('items__product__brand', 'items__product__category')
        if f['date_from']:
            qs_orders = qs_orders.filter(created_at__date__gte=f['date_from'])
        if f['date_to']:
            qs_orders = qs_orders.filter(created_at__date__lte=f['date_to'])

        filtered_lines = []
        orders_set = set()
        for o in qs_orders:
            for it in o.items.all():
                p = it.product
                if f['brand'] and (not p.brand or p.brand.name.lower() != f['brand'].lower()):
                    continue
                if f['category'] and (not p.category or p.category.name.lower() != f['category'].lower()):
                    continue
                try:
                    if f['min_price'] and float(it.unit_price) < float(f['min_price']):
                        continue
                    if f['max_price'] and float(it.unit_price) > float(f['max_price']):
                        continue
                except Exception:
                    pass
                filtered_lines.append(it)
                orders_set.add(it.order_id)

        total = sum([float(l.line_total) for l in filtered_lines])
        cnt = len(filtered_lines)
        orders_count = len(orders_set) or 1
        avg_ticket = total / orders_count

        # Acumulados por marca y categorÃ­a y top productos
        brand_totals = {}
        category_totals = {}
        product_totals_qty = {}
        product_totals_amt = {}
        for it in filtered_lines:
            p = it.product
            b = (p.brand.name if p.brand else 'Sin marca')
            c = (p.category.name if p.category else 'Sin categorÃ­a')
            brand_totals[b] = brand_totals.get(b, 0.0) + float(it.line_total)
            category_totals[c] = category_totals.get(c, 0.0) + float(it.line_total)
            key = it.name_snapshot
            product_totals_qty[key] = product_totals_qty.get(key, 0) + int(it.qty)
            product_totals_amt[key] = product_totals_amt.get(key, 0.0) + float(it.line_total)
        top5_qty = sorted(product_totals_qty.items(), key=lambda x: x[1], reverse=True)[:5]
        top5_amt = sorted(product_totals_amt.items(), key=lambda x: x[1], reverse=True)[:5]

        buf = BytesIO(); c = canvas.Canvas(buf, pagesize=A4); W, H = A4
        y = H - 20*mm
        c.setFont("Helvetica-Bold", 14)
        c.drawString(20*mm, y, "PercyStore - Reporte de Ventas"); y -= 10*mm
        c.setFont("Helvetica", 10)
        c.drawString(20*mm, y, f"Intervalo: {f['date_from'] or '-'} a {f['date_to'] or '-'}"); y -= 6*mm
        c.drawString(20*mm, y, f"Filtros: brand={f['brand'] or '-'} category={f['category'] or '-'} min={f['min_price'] or '-'} max={f['max_price'] or '-'}"); y -= 8*mm
        c.drawString(20*mm, y, f"Ã“rdenes: {orders_count}  |  Ticket promedio: {avg_ticket:.2f}"); y -= 6*mm
        c.drawString(20*mm, y, f"LÃ­neas vendidas: {cnt}"); y -= 6*mm
        c.drawString(20*mm, y, f"Total vendido: {total:.2f}"); y -= 10*mm

        # Totales por marca
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20*mm, y, "Totales por Marca"); y -= 6*mm
        c.setFont("Helvetica", 9)
        for name, amt in sorted(brand_totals.items(), key=lambda x: x[1], reverse=True):
            c.drawString(22*mm, y, f"{name}: {amt:.2f}"); y -= 5*mm
            if y < 30*mm:
                c.showPage(); y = H - 20*mm
        y -= 4*mm

        # Totales por categorÃ­a
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20*mm, y, "Totales por CategorÃ­a"); y -= 6*mm
        c.setFont("Helvetica", 9)
        for name, amt in sorted(category_totals.items(), key=lambda x: x[1], reverse=True):
            c.drawString(22*mm, y, f"{name}: {amt:.2f}"); y -= 5*mm
            if y < 30*mm:
                c.showPage(); y = H - 20*mm
        y -= 4*mm

        # Top productos
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20*mm, y, "Top 5 productos por Unidades"); y -= 6*mm
        c.setFont("Helvetica", 9)
        for name, q in top5_qty:
            c.drawString(22*mm, y, f"{name}: {q} u."); y -= 5*mm
            if y < 30*mm:
                c.showPage(); y = H - 20*mm
        y -= 4*mm

        c.setFont("Helvetica-Bold", 10)
        c.drawString(20*mm, y, "Top 5 productos por Importe"); y -= 6*mm
        c.setFont("Helvetica", 9)
        for name, amt in top5_amt:
            c.drawString(22*mm, y, f"{name}: {amt:.2f}"); y -= 5*mm
            if y < 30*mm:
                c.showPage(); y = H - 20*mm
        y -= 6*mm
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20*mm, y, "Detalle"); y -= 6*mm
        c.setFont("Helvetica", 9)
        for it in filtered_lines[:200]:
            c.drawString(22*mm, y, f"{it.order_id} | {it.qty}x {it.name_snapshot} @ {it.unit_price} = {it.line_total}"); y -= 5*mm
            if y < 30*mm:
                c.showPage(); y = H - 20*mm
        c.showPage(); c.save(); buf.seek(0)

        filename = f"sales_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        rep = SalesReport(created_by=request.user, filters=f)
        rep.pdf_file.save(filename, ContentFile(buf.read()))
        rep.save()
        return Response(SalesReportSerializer(rep).data)


class AdminSalesReportDownload(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, pk):
        rep = get_object_or_404(__import__('sales.models', fromlist=['SalesReport']).SalesReport, pk=pk)
        return FileResponse(rep.pdf_file.open('rb'), as_attachment=False, filename=os.path.basename(rep.pdf_file.name), content_type='application/pdf')


class AdminAuditReportList(generics.ListAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = __import__('sales.serializers', fromlist=['AuditReportSerializer']).AuditReportSerializer
    queryset = __import__('sales.models', fromlist=['AuditReport']).AuditReport.objects.all()


class AdminAuditReportCreate(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import mm
        from django.core.files.base import ContentFile
        import datetime
        AuditReport = __import__('sales.models', fromlist=['AuditReport']).AuditReport
        AuditReportSerializer = __import__('sales.serializers', fromlist=['AuditReportSerializer']).AuditReportSerializer

        f = {
            'date_from': request.data.get('date_from'),
            'date_to': request.data.get('date_to'),
            'action': request.data.get('action') or '',
            'model': request.data.get('model') or '',
        }
        qs = AdminAuditLog.objects.all().select_related('user')
        if f['date_from']:
            qs = qs.filter(created_at__date__gte=f['date_from'])
        if f['date_to']:
            qs = qs.filter(created_at__date__lte=f['date_to'])
        if f['action']:
            qs = qs.filter(action=f['action'])
        if f['model']:
            qs = qs.filter(model_name__iexact=f['model'])
        logs = list(qs.order_by('-created_at')[:1000])

        buf = BytesIO(); c = canvas.Canvas(buf, pagesize=A4); W, H = A4
        y = H - 20*mm
        c.setFont("Helvetica-Bold", 14)
        c.drawString(20*mm, y, "PercyStore - AuditorÃ­a de Admin"); y -= 10*mm
        c.setFont("Helvetica", 10)
        c.drawString(20*mm, y, f"Intervalo: {f['date_from'] or '-'} a {f['date_to'] or '-'} | action={f['action'] or '-'} | model={f['model'] or '-'}"); y -= 8*mm
        c.setFont("Helvetica", 9)
        for log in logs:
            who = (log.user.get_username() if log.user else 'N/A')
            c.drawString(20*mm, y, f"{log.created_at.strftime('%Y-%m-%d %H:%M:%S')} | {who} | {log.action} {log.model_name}#{log.object_id}"); y -= 5*mm
            if y < 30*mm:
                c.showPage(); y = H - 20*mm
        c.showPage(); c.save(); buf.seek(0)

        filename = f"audit_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        rep = AuditReport(created_by=request.user, filters=f)
        rep.pdf_file.save(filename, ContentFile(buf.read()))
        rep.save()
        return Response(AuditReportSerializer(rep).data)


class AdminAuditReportDownload(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, pk):
        rep = get_object_or_404(__import__('sales.models', fromlist=['AuditReport']).AuditReport, pk=pk)
        return FileResponse(rep.pdf_file.open('rb'), as_attachment=False, filename=os.path.basename(rep.pdf_file.name), content_type='application/pdf')


# --- Export CSV de ventas (no persistente) ---
class AdminSalesReportExportCSV(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        import datetime
        f = {
            'date_from': request.data.get('date_from'),
            'date_to': request.data.get('date_to'),
            'brand': request.data.get('brand') or '',
            'category': request.data.get('category') or '',
            'min_price': request.data.get('min_price') or '',
            'max_price': request.data.get('max_price') or '',
        }

        qs_orders = Order.objects.filter(status='PAID').prefetch_related('items__product__brand', 'items__product__category')
        if f['date_from']:
            qs_orders = qs_orders.filter(created_at__date__gte=f['date_from'])
        if f['date_to']:
            qs_orders = qs_orders.filter(created_at__date__lte=f['date_to'])

        filtered_lines = []
        orders_set = set()
        for o in qs_orders:
            for it in o.items.all():
                p = it.product
                if f['brand'] and (not p.brand or p.brand.name.lower() != f['brand'].lower()):
                    continue
                if f['category'] and (not p.category or p.category.name.lower() != f['category'].lower()):
                    continue
                try:
                    if f['min_price'] and float(it.unit_price) < float(f['min_price']):
                        continue
                    if f['max_price'] and float(it.unit_price) > float(f['max_price']):
                        continue
                except Exception:
                    pass
                filtered_lines.append(it)
                orders_set.add(it.order_id)

        total = sum([float(l.line_total) for l in filtered_lines])
        orders_count = len(orders_set) or 1
        avg_ticket = total / orders_count

        brand_totals = {}
        category_totals = {}
        product_totals_qty = {}
        product_totals_amt = {}
        for it in filtered_lines:
            p = it.product
            b = (p.brand.name if p.brand else 'Sin marca')
            c = (p.category.name if p.category else 'Sin categorÃ­a')
            brand_totals[b] = brand_totals.get(b, 0.0) + float(it.line_total)
            category_totals[c] = category_totals.get(c, 0.0) + float(it.line_total)
            key = it.name_snapshot
            product_totals_qty[key] = product_totals_qty.get(key, 0) + int(it.qty)
            product_totals_amt[key] = product_totals_amt.get(key, 0.0) + float(it.line_total)
        top5_qty = sorted(product_totals_qty.items(), key=lambda x: x[1], reverse=True)[:5]
        top5_amt = sorted(product_totals_amt.items(), key=lambda x: x[1], reverse=True)[:5]

        # armar CSV (mÃºltiples secciones)
        sio = StringIO()
        w = csv.writer(sio)
        w.writerow(['Reporte de Ventas'])
        w.writerow(['Intervalo', f"{f['date_from'] or '-'} a {f['date_to'] or '-'}"])
        w.writerow(['Filtros', f"brand={f['brand'] or '-'} category={f['category'] or '-'} min={f['min_price'] or '-'} max={f['max_price'] or '-'}"])
        w.writerow([])
        w.writerow(['Ã“rdenes', orders_count])
        w.writerow(['Ticket promedio', f"{avg_ticket:.2f}"])
        w.writerow(['LÃ­neas vendidas', len(filtered_lines)])
        w.writerow(['Total vendido', f"{total:.2f}"])
        w.writerow([])

        w.writerow(['Totales por Marca'])
        w.writerow(['Marca','Importe'])
        for name, amt in sorted(brand_totals.items(), key=lambda x: x[1], reverse=True):
            w.writerow([name, f"{amt:.2f}"])
        w.writerow([])

        w.writerow(['Totales por CategorÃ­a'])
        w.writerow(['CategorÃ­a','Importe'])
        for name, amt in sorted(category_totals.items(), key=lambda x: x[1], reverse=True):
            w.writerow([name, f"{amt:.2f}"])
        w.writerow([])

        w.writerow(['Top 5 por Unidades'])
        w.writerow(['Producto','Unidades'])
        for name, q in top5_qty:
            w.writerow([name, q])
        w.writerow([])

        w.writerow(['Top 5 por Importe'])
        w.writerow(['Producto','Importe'])
        for name, amt in top5_amt:
            w.writerow([name, f"{amt:.2f}"])
        w.writerow([])

        # detalle lÃ­neas
        w.writerow(['Detalle de lÃ­neas'])
        w.writerow(['Orden','Producto','Qty','UnitPrice','LineTotal','Marca','CategorÃ­a','Fecha'])
        for it in filtered_lines:
            p = it.product
            b = (p.brand.name if p.brand else '')
            c = (p.category.name if p.category else '')
            w.writerow([it.order_id, it.name_snapshot, it.qty, f"{float(it.unit_price):.2f}", f"{float(it.line_total):.2f}", b, c, it.order.created_at.strftime('%Y-%m-%d %H:%M:%S')])

        filename = f"sales_export_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        sio.seek(0)
        resp = Response(sio.getvalue(), content_type='text/csv; charset=utf-8')
        resp['Content-Disposition'] = f'attachment; filename="{filename}"'
        return resp

