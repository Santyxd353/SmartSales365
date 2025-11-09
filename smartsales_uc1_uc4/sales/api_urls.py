from django.urls import path
from .views import (
    RegisterView, LoginView, MeView,
    AddressListCreateView, AddressDetailView,
    ProductListView, ProductDetailView, CartView, CartAddItemView, CartItemUpdateView, CheckoutView,
    OrderMineList, OrderByTransaction, OrderMarkPaid, OrderVoid, OrderReceiptPDF,
    SendVerificationCodeView, VerifyCodeView,
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('auth/register', RegisterView.as_view(), name='auth-register'),
    path('auth/login', LoginView.as_view(), name='auth-login'),
    path('auth/refresh', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/send-code', SendVerificationCodeView.as_view(), name='auth-send-code'),
    path('auth/verify-code', VerifyCodeView.as_view(), name='auth-verify-code'),
    path('me', MeView.as_view(), name='me'),
    path('me/addresses', AddressListCreateView.as_view(), name='addresses'),
    path('me/addresses/<int:pk>', AddressDetailView.as_view(), name='address-detail'),
    path('products', ProductListView.as_view(), name='products-list'),
    path('products/<int:pk>', ProductDetailView.as_view(), name='products-detail'),
    path('cart', CartView.as_view(), name='cart-get'),
    path('cart/add', CartAddItemView.as_view(), name='cart-add'),
    path('cart/items/<int:item_id>', CartItemUpdateView.as_view(), name='cart-item'),
    path('checkout', CheckoutView.as_view(), name='checkout'),
    path('orders/mine/', OrderMineList.as_view(), name='orders-mine'),
    path('orders/by-transaction/<str:transaction_number>/', OrderByTransaction.as_view(), name='orders-by-trx'),
    path('orders/<int:pk>/mark-paid/', OrderMarkPaid.as_view(), name='orders-mark-paid'),
    path('orders/<int:pk>/void/', OrderVoid.as_view(), name='orders-void'),
    path('orders/<int:pk>/receipt.pdf', OrderReceiptPDF.as_view(), name='orders-receipt'),
]
