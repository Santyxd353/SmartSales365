from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0004_product_feature_sale'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='payment_due_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='payment_method',
            field=models.CharField(blank=True, max_length=10, null=True, choices=[('QR', 'QR'), ('CASH', 'CASH')]),
        ),
        migrations.CreateModel(
            name='PaymentTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('provider', models.CharField(choices=[('stripe', 'stripe')], max_length=20)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('currency', models.CharField(default='BOB', max_length=8)),
                ('status', models.CharField(default='CREATED', max_length=20)),
                ('external_id', models.CharField(blank=True, max_length=120, null=True)),
                ('metadata', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payments', to='sales.order')),
            ],
        ),
    ]

