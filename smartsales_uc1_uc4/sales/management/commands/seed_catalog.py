from django.core.management.base import BaseCommand
from django.db import transaction
from sales.models import Brand, Category, Product

DATA = {
    "brands": ["LG", "Samsung", "Sony", "Mabe", "Whirlpool", "Philips", "Xiaomi"],
    "categories": [
        "Televisores", "Audio", "Consolas",
        "Electrodomésticos", "Refrigeración", "Climatización", "Lavado & Secado"
    ],
    "products": [
        dict(name='TV 50" 4K', brand='LG', category='Televisores', description='Televisor UHD 4K', color='Negro', size='50"', price=2999.00, stock=12, image_url='https://picsum.photos/seed/tv50/600/400', warranty_months=12),
        dict(name='TV 65" 4K', brand='Samsung', category='Televisores', description='Televisor UHD 4K', color='Negro', size='65"', price=4599.00, stock=10, image_url='https://picsum.photos/seed/tv65/600/400', warranty_months=12),
        dict(name='Barra de Sonido 2.1', brand='Samsung', category='Audio', description='Barra con subwoofer', color='Negro', size='Único', price=899.00, stock=20, image_url='https://picsum.photos/seed/soundbar/600/400', warranty_months=12),
        dict(name='Minicomponente 400W', brand='Sony', category='Audio', description='Equipo de sonido 2.0 400W', color='Negro', size='Único', price=1499.00, stock=8, image_url='https://picsum.photos/seed/audio400/600/400', warranty_months=12),
        dict(name='PS5 Slim 825GB', brand='Sony', category='Consolas', description='Consola PlayStation 5', color='Blanco', size='Único', price=5200.00, stock=8, image_url='https://picsum.photos/seed/ps5/600/400', warranty_months=12),
        dict(name='Nintendo Switch OLED 64GB', brand='Sony', category='Consolas', description='Consola Nintendo Switch OLED', color='Blanco', size='Único', price=3100.00, stock=15, image_url='https://picsum.photos/seed/switch/600/400', warranty_months=12),

        # Electrodomésticos
        dict(name='Microondas 20L', brand='Mabe', category='Electrodomésticos', description='Microondas digital 700W', color='Blanco', size='20L', price=599.00, stock=25, image_url='https://picsum.photos/seed/microondas20/600/400', warranty_months=12),
        dict(name='Licuadora 1.5L', brand='Philips', category='Electrodomésticos', description='Vaso de vidrio, 2 velocidades', color='Negro', size='1.5L', price=249.00, stock=40, image_url='https://picsum.photos/seed/licuadora/600/400', warranty_months=12),
        dict(name='Freidora de aire 4L', brand='Xiaomi', category='Electrodomésticos', description='Freidora sin aceite 4 litros', color='Blanco', size='4L', price=399.00, stock=30, image_url='https://picsum.photos/seed/freidora/600/400', warranty_months=12),

        # Refrigeración
        dict(name='Refrigerador 310L No Frost', brand='Samsung', category='Refrigeración', description='No Frost, eficiencia A', color='Plata', size='310L', price=3499.00, stock=6, image_url='https://picsum.photos/seed/fridge310/600/400', warranty_months=24),

        # Climatización
        dict(name='Aire Acondicionado 12000 BTU', brand='LG', category='Climatización', description='Split Inverter Frío/Calor', color='Blanco', size='12000 BTU', price=2899.00, stock=7, image_url='https://picsum.photos/seed/ac12000/600/400', warranty_months=24),

        # Lavado & Secado
        dict(name='Lavadora 10kg Carga Frontal', brand='Whirlpool', category='Lavado & Secado', description='Eco wash, panel digital', color='Blanco', size='10kg', price=3199.00, stock=5, image_url='https://picsum.photos/seed/lavadora10/600/400', warranty_months=24),

        # Extras
        dict(name='TV 55" 4K QLED', brand='Samsung', category='Televisores', description='QLED 55 pulgadas', color='Negro', size='55"', price=3999.00, stock=9, image_url='https://picsum.photos/seed/tv55q/600/400', warranty_months=24),
        dict(name='Soundbar 3.1', brand='LG', category='Audio', description='Barra de sonido 3.1 con subwoofer', color='Negro', size='Único', price=1299.00, stock=12, image_url='https://picsum.photos/seed/soundbar31/600/400', warranty_months=12),
        dict(name='Heladera 380L No Frost', brand='Mabe', category='Refrigeración', description='380L No Frost', color='Plata', size='380L', price=3899.00, stock=4, image_url='https://picsum.photos/seed/fridge380/600/400', warranty_months=24),
        dict(name='Aire Acondicionado 18000 BTU', brand='Whirlpool', category='Climatización', description='Split 18000 BTU', color='Blanco', size='18000 BTU', price=3599.00, stock=5, image_url='https://picsum.photos/seed/ac18000/600/400', warranty_months=24),
        dict(name='Lavasecadora 10.5/7kg', brand='LG', category='Lavado & Secado', description='Lava 10.5kg / Seca 7kg', color='Blanco', size='10.5/7kg', price=4999.00, stock=3, image_url='https://picsum.photos/seed/lavasecadora/600/400', warranty_months=24),
        dict(name='Horno eléctrico 45L', brand='Philips', category='Electrodomésticos', description='Horno eléctrico 45 litros', color='Negro', size='45L', price=699.00, stock=14, image_url='https://picsum.photos/seed/horno45/600/400', warranty_months=12),
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

