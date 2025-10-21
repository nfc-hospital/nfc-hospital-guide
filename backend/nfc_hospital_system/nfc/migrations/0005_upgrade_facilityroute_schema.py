# Generated migration to upgrade FacilityRoute schema
# Adds route_id and new fields while maintaining backward compatibility

from django.db import migrations, models
import django.db.models.deletion
import uuid
from django.conf import settings


def generate_route_data(apps, schema_editor):
    """
    Populate new fields with data from existing rows
    - Generate UUIDs for route_id
    - Copy facility_name to route_name
    - Set default values for new fields
    """
    FacilityRoute = apps.get_model('nfc', 'FacilityRoute')

    for route in FacilityRoute.objects.all():
        # Generate unique route_id
        route.route_id = uuid.uuid4()

        # Copy facility_name to route_name (or generate default)
        if route.facility_name:
            route.route_name = route.facility_name
        else:
            route.route_name = f"route_{route.id}_legacy"

        # Save with new fields
        route.save(update_fields=['route_id', 'route_name'])


class Migration(migrations.Migration):

    dependencies = [
        ('nfc', '0004_facilityroute'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Add route_id as a unique UUID field (not primary key to avoid complexity)
        # NOTE: NO default here - will be populated by RunPython to avoid duplicate values
        migrations.AddField(
            model_name='facilityroute',
            name='route_id',
            field=models.UUIDField(
                null=True,  # Temporarily nullable - populated by RunPython
                blank=True,
                editable=False,
                verbose_name='경로 ID'
            ),
        ),

        # Add route_name field
        migrations.AddField(
            model_name='facilityroute',
            name='route_name',
            field=models.CharField(
                max_length=200,
                null=True,  # Temporarily nullable
                blank=True,
                verbose_name='경로 이름'
            ),
        ),

        # Make facility_name nullable for backward compatibility
        migrations.AlterField(
            model_name='facilityroute',
            name='facility_name',
            field=models.CharField(
                max_length=100,
                null=True,
                blank=True,
                verbose_name='시설명 (구 버전)'
            ),
        ),

        # Add route_data field
        migrations.AddField(
            model_name='facilityroute',
            name='route_data',
            field=models.JSONField(
                default=dict,
                blank=True,
                verbose_name='경로 데이터'
            ),
        ),

        # Add route_type field
        migrations.AddField(
            model_name='facilityroute',
            name='route_type',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('facility', '시설 경로'),
                    ('demo', '시연용 경로'),
                ],
                default='facility',
                verbose_name='경로 타입'
            ),
        ),

        # Add start_facility field
        migrations.AddField(
            model_name='facilityroute',
            name='start_facility',
            field=models.CharField(
                max_length=200,
                blank=True,
                default='',
                verbose_name='출발 시설'
            ),
        ),

        # Add end_facility field
        migrations.AddField(
            model_name='facilityroute',
            name='end_facility',
            field=models.CharField(
                max_length=200,
                blank=True,
                default='',
                verbose_name='도착 시설'
            ),
        ),

        # Add is_active field
        migrations.AddField(
            model_name='facilityroute',
            name='is_active',
            field=models.BooleanField(
                default=True,
                verbose_name='활성 상태'
            ),
        ),

        # Update created_by to add related_name (field already exists from 0004)
        migrations.AlterField(
            model_name='facilityroute',
            name='created_by',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='created_routes',
                to=settings.AUTH_USER_MODEL,
                verbose_name='생성자'
            ),
        ),

        # Populate route_id and route_name for existing rows
        migrations.RunPython(
            generate_route_data,
            reverse_code=migrations.RunPython.noop
        ),

        # Make route_id non-nullable and unique after populating
        # NOTE: Still no default - existing rows already have UUIDs from RunPython
        migrations.AlterField(
            model_name='facilityroute',
            name='route_id',
            field=models.UUIDField(
                unique=True,
                editable=False,
                verbose_name='경로 ID',
                db_index=True
            ),
        ),

        # Make route_name unique and non-nullable after populating
        migrations.AlterField(
            model_name='facilityroute',
            name='route_name',
            field=models.CharField(
                max_length=200,
                unique=True,
                verbose_name='경로 이름'
            ),
        ),

        # Add database indexes
        migrations.AddIndex(
            model_name='facilityroute',
            index=models.Index(fields=['route_name'], name='facility_ro_route_n_idx'),
        ),
        migrations.AddIndex(
            model_name='facilityroute',
            index=models.Index(fields=['route_type'], name='facility_ro_route_t_idx'),
        ),
        migrations.AddIndex(
            model_name='facilityroute',
            index=models.Index(fields=['is_active'], name='facility_ro_is_acti_idx'),
        ),
    ]
