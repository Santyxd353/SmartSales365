from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0003_adminauditlog_auditreport_salesreport'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='is_featured',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='product',
            name='sale_price',
            field=models.DecimalField(blank=True, null=True, max_digits=12, decimal_places=2),
        ),
        migrations.AddField(
            model_name='product',
            name='discount_percent',
            field=models.DecimalField(blank=True, null=True, max_digits=5, decimal_places=2),
        ),
    ]

