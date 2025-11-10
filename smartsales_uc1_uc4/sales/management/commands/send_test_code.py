from django.core.management.base import BaseCommand, CommandError
from django.core.cache import cache
from django.conf import settings
from django.core.mail import send_mail
from random import randint
import os


class Command(BaseCommand):
    help = "Envía un código de verificación de prueba por email/SMS/WhatsApp"

    def add_arguments(self, parser):
        parser.add_argument('--channel', choices=['email','sms','whatsapp'], required=True)
        parser.add_argument('--to', required=True, help="Correo o teléfono con código de país (E.164) p.ej. +59170000000")

    def handle(self, *args, **opts):
        channel = opts['channel']
        to = opts['to']
        code = f"{randint(0,999999):06d}"

        if channel == 'email':
            cache.set(f"verify:email:{to}", code, timeout=600)
            send_mail(
                subject='PercyStore: Código de verificación',
                message=f'Tu código es {code}',
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@percystore.local'),
                recipient_list=[to],
                fail_silently=False,
            )
            self.stdout.write(self.style.SUCCESS(f'Enviado email a {to}. Código {code}'))
            return

        # SMS / WhatsApp via Twilio
        sid = os.environ.get('TWILIO_ACCOUNT_SID')
        token = os.environ.get('TWILIO_AUTH_TOKEN')
        from_sms = os.environ.get('TWILIO_FROM_SMS')
        from_wa = os.environ.get('TWILIO_FROM_WHATSAPP')
        if not sid or not token:
            cache.set(f"verify:tel:{to}", code, timeout=600)
            self.stdout.write(self.style.WARNING(f'Sin credenciales Twilio; fallback DEV. Código {code}'))
            return
        try:
            from twilio.rest import Client  # type: ignore
            client = Client(sid, token)
            if channel == 'sms':
                if not from_sms:
                    raise CommandError('TWILIO_FROM_SMS no configurado')
                client.messages.create(body=f'PercyStore código: {code}', from_=from_sms, to=to)
            else:
                if not from_wa:
                    raise CommandError('TWILIO_FROM_WHATSAPP no configurado')
                to_wa = to if to.startswith('whatsapp:') else f'whatsapp:{to}'
                client.messages.create(body=f'PercyStore código: {code}', from_=from_wa, to=to_wa)
            cache.set(f"verify:tel:{to}", code, timeout=600)
            self.stdout.write(self.style.SUCCESS(f'Enviado {channel.upper()} a {to}. Código {code}'))
        except Exception as e:
            cache.set(f"verify:tel:{to}", code, timeout=600)
            self.stdout.write(self.style.WARNING(f'Fallo envío Twilio: {e}. Fallback DEV. Código {code}'))

