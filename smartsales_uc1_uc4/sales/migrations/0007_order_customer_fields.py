from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0006_order_approved_by_alter_paymenttransaction_provider'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='customer_document',
            field=models.CharField(blank=True, max_length=40, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='customer_name',
            field=models.CharField(blank=True, max_length=120, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='customer_phone',
            field=models.CharField(blank=True, max_length=32, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='customer_warranty_note',
            field=models.CharField(blank=True, max_length=160, null=True),
        ),
    ]
