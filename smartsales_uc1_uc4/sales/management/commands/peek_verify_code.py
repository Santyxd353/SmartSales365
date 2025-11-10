from django.core.management.base import BaseCommand
from django.core.cache import cache


class Command(BaseCommand):
    help = "Muestra el código de verificación cacheado para email/teléfono (uso en DEV)."

    def add_arguments(self, parser):
        parser.add_argument('--email', help='Correo destino')
        parser.add_argument('--phone', help='Teléfono en formato E.164 (p.ej. +59170000000)')

    def handle(self, *args, **opts):
        email = opts.get('email')
        phone = opts.get('phone')
        if email:
            key = f"verify:email:{email}"
        elif phone:
            key = f"verify:tel:{phone}"
        else:
            self.stdout.write(self.style.ERROR('Debe proporcionar --email o --phone'))
            return
        code = cache.get(key)
        if code:
            self.stdout.write(self.style.SUCCESS(f"Código: {code}"))
        else:
            self.stdout.write(self.style.WARNING('No hay código en caché para ese destino'))

