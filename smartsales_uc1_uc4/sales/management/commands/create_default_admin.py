from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db import transaction


class Command(BaseCommand):
    help = "Crea el usuario admin:admin si no existe, y lo marca como staff/superuser."

    @transaction.atomic
    def handle(self, *args, **options):
        user, created = User.objects.get_or_create(username='admin', defaults={
            'email': 'admin@example.com',
            'is_staff': True,
            'is_superuser': True,
        })
        if created:
            user.set_password('admin')
            user.save()
            # asegurar perfil
            from sales.models import UserProfile
            prof, _ = UserProfile.objects.get_or_create(user=user)
            prof.is_admin = True
            prof.save(update_fields=['is_admin'])
            self.stdout.write(self.style.SUCCESS('Usuario admin creado (admin/admin).'))
        else:
            # asegurar flags
            changed = False
            if not user.is_staff:
                user.is_staff = True; changed = True
            if not user.is_superuser:
                user.is_superuser = True; changed = True
            if changed:
                user.save(update_fields=['is_staff','is_superuser'])
            from sales.models import UserProfile
            prof, _ = UserProfile.objects.get_or_create(user=user)
            if not prof.is_admin:
                prof.is_admin = True
                prof.save(update_fields=['is_admin'])
            self.stdout.write(self.style.WARNING('Usuario admin ya existía; flags verificados.'))
