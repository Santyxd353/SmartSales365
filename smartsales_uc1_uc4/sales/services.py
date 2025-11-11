# sales/services.py
from django.db import transaction
from django.utils.timezone import now, localtime
from django.forms.models import model_to_dict
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth
from datetime import date, datetime, timedelta
import io
from decimal import Decimal
import random
from functools import lru_cache
from typing import Optional, Tuple

import unicodedata
from dateutil.relativedelta import relativedelta  # type: ignore

try:
    import pandas as pd  # type: ignore
except Exception:
    pd = None
try:
    from sklearn.ensemble import RandomForestRegressor  # type: ignore
except Exception:
    RandomForestRegressor = None
try:
    import joblib  # type: ignore
except Exception:
    joblib = None


KEYWORD_BUCKETS = {
    'aire': ['aire', 'ac', 'acond', 'clima', 'btu', 'calor', 'split', 'temperatura', 'frio', 'caliente'],
    'tv': ['tv', 'tele', 'televisor', 'pantalla', 'smart tv', 'oled', 'qled'],
    'consola': ['consol', 'consola', 'consolas', 'ps5', 'ps4', 'playstation', 'xbox', 'nintendo', 'gaming', 'videojuego', 'switch'],
    'refrigerador': ['refriger', 'refrigerador', 'refrigeradores', 'heladera', 'fridge', 'no frost', 'freezer', 'frigobar', 'frigorifico'],
    'lavadora': ['lavadora', 'lavasecadora', 'lavado', 'secadora', 'ropa', 'laundry'],
    'sonido': ['sonido', 'audio', 'soundbar', 'parlante', 'barra', 'speaker'],
    'electro': ['microondas', 'licuadora', 'freidora', 'horno', 'electro', 'cocina', 'hogar'],
}

CATEGORY_HINTS = {
    'aire': ['climat', 'aire'],
    'tv': ['tele', 'pantalla', 'tv'],
    'consola': ['consol'],
    'refrigerador': ['refriger', 'heladera'],
    'lavadora': ['lav'],
    'sonido': ['audio', 'sonido'],
    'electro': ['electro', 'cocina'],
}


def detect_keyword_key(prompt: Optional[str]) -> Optional[str]:
    import re

    text = _normalize_text(prompt or '').lower()
    words = set(re.findall(r'[a-z0-9]+', text))
    for key, tokens in KEYWORD_BUCKETS.items():
        for token in tokens:
            norm_token = _normalize_text(token).lower().strip()
            if not norm_token:
                continue
            if ' ' in norm_token:
                if norm_token in text:
                    return key
            else:
                if norm_token in words:
                    return key
    return None


@lru_cache(maxsize=32)
def _category_lookup(keyword_key: Optional[str]) -> Tuple[Tuple[int, ...], Optional[str]]:
    if not keyword_key:
        return tuple(), None
    from .models import Category
    hints = CATEGORY_HINTS.get(keyword_key, [])
    if not hints:
        return tuple(), None
    q = Q()
    for hint in hints:
        q |= Q(name__icontains=hint)
    cats = list(Category.objects.filter(q))
    if not cats:
        return tuple(), None
    ids = tuple(cat.id for cat in cats)
    return ids, cats[0].name

def _normalize_text(value: str) -> str:
    return unicodedata.normalize('NFKD', value or '').encode('ascii', 'ignore').decode('ascii')

def _serialize_value(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    return value

def _serialize_json(obj):
    if isinstance(obj, dict):
        return {k: _serialize_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize_json(v) for v in obj]
    return _serialize_value(obj)

def _safe_model_to_dict(obj):
    try:
        return _serialize_json(model_to_dict(obj))
    except Exception:
        return {}


def _synthetic_training_rows(scope='total'):
    """
    Devuelve filas sintéticas para entrenar el modelo cuando aún no hay ventas reales.
    Genera 12 meses de datos con una tendencia creciente ligera y ruido.
    """
    from django.utils.timezone import now as tz_now
    from .models import Category

    today = tz_now().date().replace(day=1)
    rows = []
    base_categories = list(Category.objects.all()[:4]) if scope == 'category' else []
    if scope == 'category' and not base_categories:
        # al menos una categoría genérica
        class _Tmp:
            id = 0
            name = 'General'
        base_categories = [_Tmp()]

    for idx in range(12):
        dt = today - relativedelta(months=11 - idx)
        base_total = 1500 + idx * 80
        seasonal = 1 + 0.15 * (1 if idx in (5, 10) else 0)  # picos en mitad de año
        noise = random.uniform(-120, 120)
        if scope == 'category':
            for cat in base_categories:
                mult = 1 + ((cat.id or 1) % 3) * 0.1
                rows.append({
                    'period': datetime(dt.year, dt.month, 1),
                    'product__category_id': cat.id or 0,
                    'total': max(300.0, (base_total * seasonal * mult) + noise)
                })
        else:
            rows.append({
                'period': datetime(dt.year, dt.month, 1),
                'total': max(500.0, (base_total * seasonal) + noise)
            })
    return rows


def fallback_aggregate_rows(group='monthly', category_id=None):
    """
    Genera datos sintéticos agregados para dashboards cuando no hay ventas reales.
    """
    rows = []
    if group == 'monthly':
        for row in _synthetic_training_rows('total'):
            rows.append({
                'period': row['period'].strftime('%Y-%m-%d'),
                'total': float(row['total'])
            })
        return rows

    if group == 'category':
        synthetic = _synthetic_training_rows('category')
        from .models import Category  # local import
        cat_ids = {r.get('product__category_id') for r in synthetic}
        cat_map = {c.id: c.name for c in Category.objects.filter(id__in=[cid for cid in cat_ids if cid])}
        for idx, row in enumerate(synthetic):
            cid = row.get('product__category_id') or 0
            if category_id and cid != int(category_id):
                continue
            rows.append({
                'product__category_id': cid,
                'product__category__name': cat_map.get(cid, 'General'),
                'total': float(row['total']),
                'quantity': int(max(5, (row['total'] // 100) - idx))
            })
        if not rows and category_id:
            rows.append({
                'product__category_id': int(category_id),
                'product__category__name': cat_map.get(int(category_id), 'General'),
                'total': 1500.0,
                'quantity': 20
            })
        return rows

    if group == 'product':
        from .models import Product
        products = list(Product.objects.filter(is_active=True).order_by('-stock', '-price')[:5])
        base = 2500
        for idx, product in enumerate(products):
            rows.append({
                'product_id': product.id,
                'product__name': product.name,
                'total': float(max(300, base - idx * 200 + (product.stock or 0) * 25)),
                'quantity': int(max(1, (product.stock or 2) / 2))
            })
        if not rows:
            rows.append({
                'product_id': 0,
                'product__name': 'Producto destacado',
                'total': 2000.0,
                'quantity': 15
            })
        return rows

    return []


MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']


def _month_label(dt):
    return f"{MONTH_NAMES[dt.month-1].capitalize()} {dt.year}"


def _prediction_summary(prompt, keyword_key=None):
    category_ids, category_name = _category_lookup(keyword_key)
    qs = build_sales_queryset(
        category_ids=list(category_ids) if category_ids else None,
        keyword_key=None if category_ids else keyword_key,
    )
    hist = list(qs.annotate(period=TruncMonth('order__created_at')).values('period').annotate(total=Sum('line_total')).order_by('period'))
    if not hist:
        base_category = category_ids[0] if category_ids else None
        fallback = fallback_aggregate_rows('monthly', category_id=base_category)
        hist = [{'period': row['period'], 'total': row['total']} for row in fallback]
    from datetime import datetime as _dt
    parsed = []
    for row in hist[-6:]:
        period = row['period']
        if hasattr(period, 'year'):
            dt = period
        else:
            dt = _dt.strptime(str(period)[:10], '%Y-%m-%d')
        parsed.append({'period': dt, 'total': float(row['total'])})
    if not parsed:
        parsed.append({'period': _dt.utcnow(), 'total': 1200.0})
    last = parsed[-1]
    peak = max(parsed, key=lambda x: x['total'])
    avg = sum(item['total'] for item in parsed) / len(parsed)
    next_dt = last['period'] + relativedelta(months=1)
    forecast = max(400.0, last['total'] * 1.05 + 100)
    context_map = {
        'aire': 'El calor de primavera y verano suele disparar la demanda de aires.',
        'consola': 'La campaña navideña y los bonos incentivan la compra de consolas.',
        'tv': 'Eventos deportivos y cierre de año elevan las ventas de televisores.',
        'refrigerador': 'Las familias renuevan línea blanca previo a las fiestas.',
        'lavadora': 'Los planes de hogar priorizan equipos eficientes en temporada de lluvias.',
    }
    cat_label = (category_name or keyword_key or 'ventas totales')
    trend = 'al alza' if last['total'] >= avg else 'estable'
    summary = f"Para {_month_label(next_dt)} proyectamos alrededor de Bs. {forecast:.0f} en {cat_label}."
    if keyword_key in context_map:
        summary += f" {context_map[keyword_key]}"
    summary += f" La tendencia reciente luce {trend}."
    insights = [
        f"Mejor mes reciente: {_month_label(peak['period'])} (Bs. {peak['total']:.0f})",
        f"Promedio últimos meses: Bs. {avg:.0f}",
    ]
    return {
        'question': prompt,
        'summary': summary,
        'insights': insights,
        'recommendations': []
    }


def adjust_stock_on_paid(order, approved_by=None):
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
        updates = ['status']
        if not order.paid_at:
            order.paid_at = now()
            updates.append('paid_at')
        if approved_by is not None:
            order.approved_by = approved_by
            updates.append('approved_by')
        order.save(update_fields=list(dict.fromkeys(updates)))

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


# ----------------------------
# Utilidades de reportes y ML
# ----------------------------

def _last_day_of_month(y: int, m: int) -> date:
    if m == 12:
        return date(y, 12, 31)
    from datetime import timedelta
    return (date(y, m+1, 1) - timedelta(days=1))


def parse_prompt_to_spec(prompt: str):
    """Parser basado en reglas para prompts en español."""
    import re

    raw = prompt or ''
    normalized = _normalize_text(raw).lower()
    fmt = 'screen'
    if 'pdf' in normalized:
        fmt = 'pdf'
    elif 'excel' in normalized or 'xlsx' in normalized:
        fmt = 'excel'

    group_by = None
    if 'producto' in normalized:
        group_by = 'product'
    elif 'cliente' in normalized:
        group_by = 'customer'
    elif 'categor' in normalized:
        group_by = 'category'
    elif 'mes' in normalized or 'mensual' in normalized:
        group_by = 'monthly'

    start = end = None
    explicit_range = False
    today = date.today()

    def _set_range(s: date, e: date):
        nonlocal start, end, explicit_range
        start, end = s, e
        explicit_range = True

    m = re.search(r'(\d{2}/\d{2}/\d{4}).*?(\d{2}/\d{2}/\d{4})', normalized)
    if m:
        try:
            s = datetime.strptime(m.group(1), '%d/%m/%Y').date()
            e = datetime.strptime(m.group(2), '%d/%m/%Y').date()
            _set_range(s, e)
        except Exception:
            pass

    if start is None and 'hoy' in normalized:
        _set_range(today, today)
    elif start is None and 'ayer' in normalized:
        yday = today - timedelta(days=1)
        _set_range(yday, yday)
    elif start is None and ('esta semana' in normalized or 'semana actual' in normalized):
        monday = today - timedelta(days=today.weekday())
        _set_range(monday, today)
    elif start is None and ('semana pasada' in normalized or 'ultima semana' in normalized):
        last_sunday = today - timedelta(days=today.weekday() + 1)
        last_monday = last_sunday - timedelta(days=6)
        _set_range(last_monday, last_sunday)
    elif start is None and ('este mes' in normalized or 'mes actual' in normalized):
        first = today.replace(day=1)
        _set_range(first, today)
    elif start is None and ('mes pasado' in normalized or 'ultimo mes' in normalized):
        prev = today - relativedelta(months=1)
        first = prev.replace(day=1)
        _set_range(first, _last_day_of_month(prev.year, prev.month))
    elif start is None and ('este ano' in normalized or 'este año' in raw.lower()):
        first = date(today.year, 1, 1)
        _set_range(first, today)
    elif start is None and ('ano pasado' in normalized or 'año pasado' in raw.lower()):
        year = today.year - 1
        _set_range(date(year, 1, 1), date(year, 12, 31))
    elif start is None and ('ultimo trimestre' in normalized or 'trimestre pasado' in normalized):
        current_q = ((today.month - 1) // 3) + 1
        prev_q = current_q - 1 or 4
        year = today.year if current_q > 1 else today.year - 1
        start_month = (prev_q - 1) * 3 + 1
        end_month = start_month + 2
        _set_range(date(year, start_month, 1), _last_day_of_month(year, end_month))
    elif start is None and ('este trimestre' in normalized or 'trimestre actual' in normalized):
        current_q = ((today.month - 1) // 3) + 1
        start_month = (current_q - 1) * 3 + 1
        _set_range(date(today.year, start_month, 1), today)

    if start is None:
        window = re.search(r'ultim[oa]s?\s+(\d+)\s+dias', normalized)
        if window:
            try:
                span = max(1, int(window.group(1)))
                _set_range(today - timedelta(days=span-1), today)
            except Exception:
                pass

    months = {
        'enero':1,'febrero':2,'marzo':3,'abril':4,'mayo':5,'junio':6,
        'julio':7,'agosto':8,'septiembre':9,'setiembre':9,'octubre':10,'noviembre':11,'diciembre':12
    }
    if start is None:
        for name, num in months.items():
            if name in normalized:
                y = today.year
                first = date(y, num, 1)
                _set_range(first, _last_day_of_month(y, num))
                break

    if start is None:
        year_match = re.search(r'(20\d{2})', normalized)
        if year_match:
            y = int(year_match.group(1))
            _set_range(date(y, 1, 1), date(y, 12, 31))

    if start is not None and end is None:
        end = start

    keyword_key = detect_keyword_key(raw)
    category_ids, category_label = _category_lookup(keyword_key)

    return {
        'start': start,
        'end': end,
        'group_by': group_by or 'product',
        'format': fmt,
        'keyword_key': keyword_key,
        'category_ids': list(category_ids),
        'category_label': category_label,
        'explicit_range': explicit_range or bool(start and end),
    }

def build_sales_queryset(start=None, end=None, category_ids=None, keyword_key=None):
    from .models import OrderItem
    qs = OrderItem.objects.select_related('order','product','product__brand','product__category','order__user')
    if start:
        qs = qs.filter(order__created_at__date__gte=start)
    if end:
        qs = qs.filter(order__created_at__date__lte=end)
    if category_ids:
        qs = qs.filter(product__category_id__in=category_ids)
    elif keyword_key:
        terms = KEYWORD_BUCKETS.get(keyword_key, [])
        if terms:
            q = Q()
            for term in terms:
                q |= Q(product__name__icontains=term) | Q(product__description__icontains=term)
            if q:
                qs = qs.filter(q)
    qs = qs.filter(order__status__in=['PAID','DELIVERED','SHIPPED'])
    return qs


def aggregate_sales(qs, group_by='product'):
    if group_by == 'product':
        return list(qs.values('product_id','product__name').annotate(quantity=Sum('qty'), total=Sum('line_total')).order_by('-total'))
    if group_by == 'customer':
        from django.db.models import Min, Max
        return list(qs.values('order__user_id','order__user__first_name','order__user__last_name').annotate(
            quantity=Sum('qty'), total=Sum('line_total'), orders=Count('order', distinct=True),
            first_purchase=Min('order__created_at'), last_purchase=Max('order__created_at')
        ).order_by('-total'))
    if group_by == 'category':
        return list(qs.values('product__category_id','product__category__name').annotate(quantity=Sum('qty'), total=Sum('line_total')).order_by('-total'))
    if group_by == 'monthly':
        return list(qs.annotate(period=TruncMonth('order__created_at')).values('period').annotate(total=Sum('line_total')).order_by('period'))
    return list(qs.values('id'))


def export_to_pdf(rows, title='Reporte de Ventas') -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    W, H = A4
    # fuentes con acentos
    font='Helvetica'; font_bold='Helvetica-Bold'
    try:
        pdfmetrics.registerFont(TTFont('Arial','C\\Windows\\Fonts\\arial.ttf'))
        pdfmetrics.registerFont(TTFont('Arial-Bold','C\\Windows\\Fonts\\arialbd.ttf'))
        font='Arial'; font_bold='Arial-Bold'
    except Exception:
        pass
    y = H - 20*mm
    c.setFont(font_bold, 14)
    c.drawString(20*mm, y, title); y -= 10*mm
    c.setFont(font, 10)
    for r in rows:
        line = ", ".join([f"{k}: {v}" for k, v in r.items()])
        c.drawString(20*mm, y, line)
        y -= 6*mm
        if y < 30*mm:
            c.showPage(); y = H - 20*mm; c.setFont(font, 10)
    c.showPage(); c.save(); buf.seek(0)
    return buf.read()


def export_to_excel(rows, title='Reporte') -> bytes:
    try:
        import openpyxl  # type: ignore
    except Exception:
        return b''
    wb = openpyxl.Workbook()
    ws = wb.active; ws.title = 'Reporte'
    if rows:
        headers = list(rows[0].keys())
        ws.append(headers)
        for r in rows:
            ws.append([r.get(h) for h in headers])
    out = io.BytesIO(); wb.save(out); out.seek(0)
    return out.read()


def _model_path(scope='total'):
    from django.conf import settings
    from pathlib import Path
    media = getattr(settings, 'MEDIA_ROOT', Path('.'))
    p = Path(media) / 'ml'
    p.mkdir(parents=True, exist_ok=True)
    return str(p / f'model_{scope}.pkl')


def train_rf(scope='total'):
    if pd is None or RandomForestRegressor is None or joblib is None:
        raise RuntimeError('Faltan dependencias ML (pandas, scikit-learn, joblib)')
    from .models import OrderItem
    qs = OrderItem.objects.filter(order__status__in=['PAID','DELIVERED','SHIPPED']).annotate(period=TruncMonth('order__created_at'))
    if scope == 'category':
        agg = qs.values('period','product__category_id').annotate(total=Sum('line_total')).order_by('period')
    else:
        agg = qs.values('period').annotate(total=Sum('line_total')).order_by('period')
    rows = list(agg)
    if not rows:
        rows = _synthetic_training_rows(scope=scope)
    df = pd.DataFrame(rows)
    df['year'] = pd.to_datetime(df['period']).dt.year
    df['month'] = pd.to_datetime(df['period']).dt.month
    X = df[['year','month']].copy()
    if scope == 'category':
        X['category_id'] = df['product__category_id'].fillna(0)
    y = df['total']
    model = RandomForestRegressor(n_estimators=150, random_state=42)
    model.fit(X, y)
    joblib.dump(model, _model_path(scope))
    return {'rows': int(len(df)), 'features': list(X.columns)}


def predict_rf(months=6, scope='total', category_id=None):
    if pd is None or joblib is None:
        raise RuntimeError('Faltan dependencias ML (pandas, joblib)')
    try:
        model = joblib.load(_model_path(scope))
    except Exception:
        train_rf(scope=scope)
        model = joblib.load(_model_path(scope))
    from django.utils.timezone import now as tz_now
    base = tz_now().date().replace(day=1)
    periods = []
    for i in range(1, int(months)+1):
        m = base.month + i
        y = base.year + (m-1)//12
        mo = ((m-1)%12)+1
        periods.append({'year': y, 'month': mo})
    import pandas as pd2  # local alias
    df = pd2.DataFrame(periods)
    if scope == 'category':
        df['category_id'] = int(category_id or 0)
    preds = model.predict(df)
    out = []
    for i, r in enumerate(periods):
        out.append({'period': f"{r['year']}-{r['month']:02d}-01", 'predicted_total': float(preds[i])})
    return out


def answer_product_question(prompt: str):
    """
    Recomendador ligero basado en reglas para consultas en lenguaje natural.
    Devuelve coincidencias de productos o un resumen de tendencia.
    """
    from .models import Product

    prompt = (prompt or '').strip()
    if not prompt:
        raise ValueError('prompt requerido')

    normalized = _normalize_text(prompt)
    text = normalized.lower()
    keyword_key = detect_keyword_key(prompt)
    prediction_intent = any(word in text for word in ['prediccion', 'pronostico', 'proyeccion']) or ('ventas' in text and 'mes' in text)
    if prediction_intent:
        return _prediction_summary(prompt, keyword_key)

    greeting_words = ('hola', 'buenas', 'saludos', 'hey')
    if any(word in text for word in greeting_words) and not keyword_key:
        return {
            'question': prompt,
            'summary': 'Hola, estoy listo para ayudarte con predicciones o recomendaciones. Pregunta por un producto, categoria o escenario.',
            'insights': ['Ejemplo: "prediccion de ventas de aires en noviembre"', 'Ejemplo: "que consolas recomiendas"'],
            'recommendations': []
        }

    general_intent = any(
        phrase in text
        for phrase in [
            'recomienda', 'recomendacion', 'recomiendas', 'que tienes', 'que hay',
            'catalogo', 'productos', 'top', 'sugerencia', 'ayuda', 'ideas'
        ]
    )
    value_focus = any(word in text for word in ['calidad precio', 'relacion calidad', 'barato', 'economico'])
    premium_focus = any(word in text for word in ['gama alta', 'premium', 'alto rendimiento'])
    small_space = any(word in text for word in ['pequeno', 'compact', 'departamento', 'oficina'])
    energy_focus = any(word in text for word in ['ahorro', 'eficiencia', 'consumo', 'inverter'])

    if not keyword_key and not any([value_focus, premium_focus, small_space, energy_focus]) and not general_intent:
        return {
            'question': prompt,
            'summary': 'Necesito un poco mas de contexto. Indica la categoria o el tipo de producto que buscas.',
            'insights': ['Ejemplo: "mejor televisor calidad precio"', 'Ejemplo: "recomienda un aire para oficina"'],
            'recommendations': []
        }

    products = Product.objects.filter(is_active=True, stock__gt=0).select_related('category', 'brand')
    category_ids, _cat_label = _category_lookup(keyword_key)
    if category_ids:
        products = products.filter(category_id__in=category_ids)
    elif keyword_key:
        q = Q()
        for term in KEYWORD_BUCKETS.get(keyword_key, []):
            q |= Q(name__icontains=term) | Q(description__icontains=term)
        if q:
            products = products.filter(q)
    if general_intent and not keyword_key:
        featured = products.filter(is_featured=True)
        if featured.exists():
            products = featured
        products = products.order_by('-is_featured', '-stock', '-updated_at')

    if not products.exists():
        return _prediction_summary(prompt, keyword_key)

    recommendations = []
    for product in products:
        base_text = " ".join(filter(None, [
            product.name or '',
            product.description or '',
            product.category.name if product.category else '',
            product.brand.name if product.brand else '',
        ])).lower()
        score = 0.1
        reasons = []

        if keyword_key and any(term in base_text for term in KEYWORD_BUCKETS.get(keyword_key, [])):
            score += 3
            reasons.append(f"Coincide con la categoria {keyword_key}")

        price = float(product.get_final_price() or product.price or 0)
        if value_focus:
            score += max(0, 4 - (price / 1000))
            reasons.append('Buena relacion precio/prestaciones')
        if premium_focus and price > 2500:
            score += 2
            reasons.append('Producto de gama alta')
        if small_space and 'compact' in base_text:
            score += 2
            reasons.append('Formato compacto para espacios reducidos')
        if energy_focus and any(term in base_text for term in ['eficiencia', 'ahorro', 'inverter']):
            score += 2
            reasons.append('Incluye atributos de eficiencia energetica')

        if (product.warranty_months or 0) >= 24:
            score += 0.5
        score += min(product.stock or 0, 20) * 0.02

        recommendations.append({
            'product': product,
            'score': score,
            'price': price,
            'reasons': reasons,
        })

    recommendations.sort(key=lambda x: (x['score'], -x['price']), reverse=True)
    filtered = recommendations
    if keyword_key:
        filtered = []
        needle = f"categoria {keyword_key}"
        for rec in recommendations:
            if any(needle in reason for reason in rec['reasons']):
                filtered.append(rec)
        if not filtered:
            return {
                'question': prompt,
                'summary': f'No tenemos {keyword_key}s disponibles en inventario en este momento.',
                'insights': ['Seguimos monitoreando stock y tendencias para avisarte cuando lleguen.'],
                'recommendations': []
            }
    top = filtered[:3] if filtered else []

    if not top:
        narrative = _prediction_summary(prompt, keyword_key)
        if not narrative['summary']:
            narrative['summary'] = 'Aun no hay productos disponibles para recomendar.'
        return narrative

    summary_parts = []
    if top:
        lead = top[0]
        lead_reason = lead['reasons'][0] if lead['reasons'] else 'mantiene buen balance precio/prestaciones'
        summary_parts.append(f"Te sugiero comenzar con {lead['product'].name} (Bs. {lead['price']:.2f}) porque {lead_reason.lower()}.")
        if len(top) > 1:
            otros = ", ".join(item['product'].name for item in top[1:])
            summary_parts.append(f"Tambien puedes evaluar: {otros}.")
    if keyword_key == 'aire':
        summary_parts.append('Los aires sugeridos priorizan eficiencia y bajo consumo.')
    if keyword_key == 'consola':
        summary_parts.append('Aprovecha bundles y garantias extendidas para gaming.')
    if keyword_key == 'tv':
        summary_parts.append('Las televisiones destacadas equilibran calidad de imagen y precio.')
    if value_focus:
        summary_parts.append('Ordenados segun la mejor relacion valor/precio.')
    if premium_focus:
        summary_parts.append('Inclui opciones de gama alta con garantias amplias.')
    if not keyword_key:
        summary_parts.append('Estas opciones destacan por disponibilidad y confianza del catalogo.')
    if not summary_parts:
        summary_parts.append('Seleccione los productos mas cercanos a tu consulta considerando stock y garantias.')

    seasonal_insights = []
    if keyword_key == 'aire':
        seasonal_insights.append('La demanda de aires crece entre octubre y febrero por el calor.')
    if keyword_key == 'consola':
        seasonal_insights.append('Las fiestas de fin de ano impulsan las ventas de consolas y gaming.')
    if keyword_key == 'tv':
        seasonal_insights.append('Eventos deportivos y fin de ano elevan el interes por televisores 4K.')
    if keyword_key == 'refrigerador':
        seasonal_insights.append('Las familias renuevan refrigeradores previo a las fiestas y temporadas calurosas.')
    if keyword_key == 'lavadora':
        seasonal_insights.append('Las lavadoras con funciones eco ayudan en epocas de lluvia y alta humedad.')
    if keyword_key == 'electro':
        seasonal_insights.append('Los pequeños electrodomesticos dinamizan cocina rapida y saludable.')
    if not keyword_key:
        seasonal_insights.append('Te muestro productos destacados segun stock actual y garantia.')

    formatted = []
    for item in top:
        product = item['product']
        formatted.append({
            'id': product.id,
            'name': product.name,
            'price': item['price'],
            'stock': product.stock,
            'category': product.category.name if product.category else '',
            'brand': product.brand.name if product.brand else '',
            'warranty_months': product.warranty_months,
            'reason': '; '.join(item['reasons']) or 'Producto destacado del catalogo',
            'image_url': product.image_url,
        })

    return {
        'question': prompt,
        'summary': ' '.join(summary_parts),
        'insights': seasonal_insights,
        'recommendations': formatted,
    }
