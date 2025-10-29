from django.contrib import admin
from .models import Brand, Category, Product, UserAddress, UserProfile
admin.site.register(Brand)
admin.site.register(Category)
admin.site.register(Product)
admin.site.register(UserAddress)
admin.site.register(UserProfile)