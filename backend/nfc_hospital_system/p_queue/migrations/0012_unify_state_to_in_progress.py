from django.db import migrations

def unify_state_names(apps, schema_editor):
    """ongoing → in_progress 일괄 변환"""
    
    # Queue 모델
    Queue = apps.get_model('p_queue', 'Queue')
    updated = Queue.objects.filter(state='ongoing').update(state='in_progress')
    print(f"✅ Queue: {updated}개 레코드 변환 (ongoing → in_progress)")
    
    # PatientState 모델
    PatientState = apps.get_model('p_queue', 'PatientState')
    updated = PatientState.objects.filter(current_state='ONGOING').update(
        current_state='IN_PROGRESS'
    )
    print(f"✅ PatientState: {updated}개 레코드 변환 (ONGOING → IN_PROGRESS)")
    
    # QueueStatusLog
    QueueStatusLog = apps.get_model('p_queue', 'QueueStatusLog')
    QueueStatusLog.objects.filter(previous_state='ongoing').update(
        previous_state='in_progress'
    )
    QueueStatusLog.objects.filter(new_state='ongoing').update(
        new_state='in_progress'
    )

def reverse_unify_state_names(apps, schema_editor):
    Queue = apps.get_model('p_queue', 'Queue')
    Queue.objects.filter(state='in_progress').update(state='ongoing')

    PatientState = apps.get_model('p_queue', 'PatientState')
    PatientState.objects.filter(current_state='IN_PROGRESS').update(
        current_state='ONGOING'
    )

    QueueStatusLog = apps.get_model('p_queue', 'QueueStatusLog')
    QueueStatusLog.objects.filter(previous_state='in_progress').update(
        previous_state='ongoing'
    )
    QueueStatusLog.objects.filter(new_state='in_progress').update(
        new_state='ongoing'
    )

class Migration(migrations.Migration):
    dependencies = [
        ('p_queue', '0011_unify_state_naming'),  
    ]
    
    operations = [
        migrations.RunPython(unify_state_names, reverse_unify_state_names),
    ]
