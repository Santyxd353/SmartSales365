from django.urls import path
from .views import (
    RegisterView, LoginView, MeView,
    AddressListCreateView, AddressDetailView,
    ProductListView, ProductDetailView, CartView, CartAddItemView, CartItemUpdateView, CheckoutView,
    OrderMineList, OrderByTransaction, OrderMarkPaid, OrderVoid, OrderReceiptPDF,
    SendVerificationCodeView, VerifyCodeView,
    UploadAvatarView,
    BrandListView, CategoryListView,
    AdminProductListCreateView, AdminProductDetailView, AdminProductAdjustStockView,
    AdminUserListCreateView, AdminUserDetailView,
    ChangeEmailView, ChangePhoneView,
    AdminSalesReportList, AdminSalesReportCreate, AdminSalesReportDownload, AdminSalesReportExportCSV,
    AdminAuditReportList, AdminAuditReportCreate, AdminAuditReportDownload,
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('auth/register', RegisterView.as_view(), name='auth-register'),
    path('auth/login', LoginView.as_view(), name='auth-login'),
    path('auth/refresh', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/send-code', SendVerificationCodeView.as_view(), name='auth-send-code'),
    path('auth/verify-code', VerifyCodeView.as_view(), name='auth-verify-code'),
    path('auth/upload-avatar', UploadAvatarView.as_view(), name='auth-upload-avatar'),
    path('me', MeView.as_view(), name='me'),
    path('me/change-email', ChangeEmailView.as_view(), name='me-change-email'),
    path('me/change-phone', ChangePhoneView.as_view(), name='me-change-phone'),
    path('me/addresses', AddressListCreateView.as_view(), name='addresses'),
    path('me/addresses/<int:pk>', AddressDetailView.as_view(), name='address-detail'),
    path('brands', BrandListView.as_view(), name='brands-list'),
    path('categories', CategoryListView.as_view(), name='categories-list'),
    path('products', ProductListView.as_view(), name='products-list'),
    path('products/<int:pk>', ProductDetailView.as_view(), name='products-detail'),
    # Admin productos
    path('admin/products', AdminProductListCreateView.as_view(), name='admin-products-list-create'),
    path('admin/products/<int:pk>', AdminProductDetailView.as_view(), name='admin-products-detail'),
    path('admin/products/<int:pk>/adjust-stock', AdminProductAdjustStockView.as_view(), name='admin-products-adjust-stock'),
    # Admin usuarios
    path('admin/users', AdminUserListCreateView.as_view(), name='admin-users'),
    path('admin/users/<int:pk>', AdminUserDetailView.as_view(), name='admin-users-detail'),
    # Reportes ventas
    path('admin/reports/sales', AdminSalesReportList.as_view(), name='admin-sales-reports'),
    path('admin/reports/sales/generate', AdminSalesReportCreate.as_view(), name='admin-sales-generate'),
    path('admin/reports/sales/<int:pk>/download', AdminSalesReportDownload.as_view(), name='admin-sales-download'),
    path('admin/reports/sales/export-csv', AdminSalesReportExportCSV.as_view(), name='admin-sales-export-csv'),
    # Reportes auditoría
    path('admin/reports/audit', AdminAuditReportList.as_view(), name='admin-audit-reports'),
    path('admin/reports/audit/generate', AdminAuditReportCreate.as_view(), name='admin-audit-generate'),
    path('admin/reports/audit/<int:pk>/download', AdminAuditReportDownload.as_view(), name='admin-audit-download'),
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
