from django.core.management.base import BaseCommand
from django.db import transaction
from sales.models import Brand, Category, Product

DATA = {
    "brands": ["LG", "Samsung", "Sony"],
    "categories": ["Televisores", "Audio", "Consolas"],
    "products": [
        dict(name='TV 50" 4K', brand='LG', category='Televisores',
             description='Televisor UHD 4K', color='Negro', size='50"', price=2999.00, stock=12,
             image_url='https://picsum.photos/seed/tv50/600/400', warranty_months=12),
        dict(name='TV 65" 4K', brand='Samsung', category='Televisores',
             description='Televisor UHD 4K', color='Negro', size='65"', price=4599.00, stock=10,
             image_url='https://picsum.photos/seed/tv65/600/400', warranty_months=12),
        dict(name='Barra de Sonido 2.1', brand='Samsung', category='Audio',
             description='Barra con subwoofer', color='Negro', size='Único', price=899.00, stock=20,
             image_url='https://picsum.photos/seed/soundbar/600/400', warranty_months=12),
        dict(name='Minicomponente 400W', brand='Sony', category='Audio',
             description='Equipo de sonido 2.0 400W', color='Negro', size='Único', price=1499.00, stock=8,
             image_url='https://picsum.photos/seed/audio400/600/400', warranty_months=12),
        dict(name='PS5 Slim 825GB', brand='Sony', category='Consolas',
             description='Consola PlayStation 5', color='Blanco', size='Único', price=5200.00, stock=8,
             image_url='https://picsum.photos/seed/ps5/600/400', warranty_months=12),
        dict(name='Nintendo Switch OLED 64GB', brand='Sony', category='Consolas',
             description='Consola Nintendo Switch OLED', color='Blanco', size='Único', price=3100.00, stock=15,
             image_url='https://picsum.photos/seed/switch/600/400', warranty_months=12),
    ],
}

class Command(BaseCommand):
    help = "Carga marcas, categorías y productos de ejemplo para pruebas (UC4)."

    @transaction.atomic
    def handle(self, *args, **kwargs):
        brands = {name: Brand.objects.get_or_create(name=name)[0] for name in DATA["brands"]}
        cats = {name: Category.objects.get_or_create(name=name)[0] for name in DATA["categories"]}

        created = 0
        for p in DATA["products"]:
            brand = brands[p.pop("brand")]
            cat = cats[p.pop("category")]
            obj, was_created = Product.objects.get_or_create(
                name=p["name"],
                defaults={**p, "brand": brand, "category": cat, "is_active": True}
            )
            created += 1 if was_created else 0

        self.stdout.write(self.style.SUCCESS(f"Seed ok. Productos nuevos: {created}"))