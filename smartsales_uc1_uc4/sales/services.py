# sales/services.py
from django.db import transaction
from django.utils.timezone import now
from django.forms.models import model_to_dict

def _safe_model_to_dict(obj):
    try:
        return model_to_dict(obj)
    except Exception:
        return {}

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


def log_admin_action(user, action, model_name, object_id, before_obj=None, after_obj=None):
    from .models import AdminAuditLog
    AdminAuditLog.objects.create(
        user=user,
        action=action,
        model_name=model_name,
        object_id=str(object_id),
        before_data=_safe_model_to_dict(before_obj) if before_obj is not None else None,
        after_data=_safe_model_to_dict(after_obj) if after_obj is not None else None,
    )
