# sales/services.py
from django.db import transaction
from django.utils.timezone import now

def adjust_stock_on_paid(order):
    """
    Descuenta stock cuando la orden pasa a PAID.
    """
    from .models import Product  # import local para evitar ciclos
    with transaction.atomic():
        for it in order.items.select_related('product'):
            p = it.product
            if p.stock < it.qty:
                raise ValueError(f"Stock insuficiente para {p.name}")
            p.stock -= it.qty
            p.save(update_fields=['stock'])
        order.status = 'PAID'
        order.paid_at = now()
        order.save(update_fields=['status', 'paid_at'])

def revert_stock_on_void(order):
    """
    Devuelve stock si la orden estaba pagada y se anula.
    """
    from .models import Product
    with transaction.atomic():
        if order.status == 'PAID':
            for it in order.items.select_related('product'):
                p = it.product
                p.stock += it.qty
                p.save(update_fields=['stock'])
        order.status = 'CANCELLED'
        order.save(update_fields=['status'])
