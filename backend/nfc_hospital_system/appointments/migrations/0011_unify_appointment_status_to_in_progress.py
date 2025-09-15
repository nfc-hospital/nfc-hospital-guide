from django.db import migrations

def unify_appointment_status(apps, schema_editor):
    """ongoing → in_progress 일괄 변환 (appointments 앱 전용)"""

    # Appointment 모델
    Appointment = apps.get_model('appointments', 'Appointment')
    updated = Appointment.objects.filter(status='ongoing').update(status='in_progress')
    print(f"✅ Appointment: {updated}개 레코드 변환 (ongoing → in_progress)")

    # AppointmentHistory 모델
    try:
        AppointmentHistory = apps.get_model('appointments', 'AppointmentHistory')
        history_updated = AppointmentHistory.objects.filter(action='ongoing').update(action='in_progress')
        print(f"✅ AppointmentHistory: {history_updated}개 레코드 변환 (ongoing → in_progress)")
    except LookupError:
        print("⚠️ AppointmentHistory 모델이 없습니다. 건너뜁니다.")


def reverse_appointment_status(apps, schema_editor):
    """롤백: in_progress → ongoing"""

    Appointment = apps.get_model('appointments', 'Appointment')
    updated = Appointment.objects.filter(status='in_progress').update(status='ongoing')
    print(f"↩️ Appointment: {updated}개 레코드 복구 (in_progress → ongoing)")

    try:
        AppointmentHistory = apps.get_model('appointments', 'AppointmentHistory')
        history_updated = AppointmentHistory.objects.filter(action='in_progress').update(action='ongoing')
        print(f"↩️ AppointmentHistory: {history_updated}개 레코드 복구 (in_progress → ongoing)")
    except LookupError:
        print("⚠️ AppointmentHistory 모델이 없습니다. 건너뜁니다.")


class Migration(migrations.Migration):
    dependencies = [
        ('appointments', '0010_remove_exam_exams_buildin_9b27e8_idx_and_more'),
    ]

    operations = [
        migrations.RunPython(unify_appointment_status, reverse_appointment_status),
    ]
