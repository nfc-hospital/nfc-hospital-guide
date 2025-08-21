from django.core.management.base import BaseCommand
from django.db import transaction
from appointments.models import Exam, ExamPostCareInstruction

class Command(BaseCommand):
    help = '검사별 검사 후 주의사항 데이터 생성'

    def handle(self, *args, **options):
        post_care_data = {
            # CT 검사
            'ct_scan': [
                {
                    'type': 'hydration',
                    'title': '충분한 수분 섭취',
                    'description': '조영제 배출을 위해 검사 후 24시간 동안 평소보다 많은 물(2-3L)을 마셔주세요.',
                    'priority': 'high',
                    'duration_hours': 24,
                    'icon': '💧',
                    'is_critical': False
                },
                {
                    'type': 'symptoms',
                    'title': '알레르기 반응 관찰',
                    'description': '두드러기, 가려움, 호흡곤란 등의 증상이 나타나면 즉시 병원에 연락하세요.',
                    'priority': 'high',
                    'duration_hours': 48,
                    'icon': '⚠️',
                    'is_critical': True
                },
                {
                    'type': 'activity',
                    'title': '격렬한 운동 제한',
                    'description': '검사 후 24시간 동안은 격렬한 운동을 피하고 충분히 휴식하세요.',
                    'priority': 'medium',
                    'duration_hours': 24,
                    'icon': '🚫',
                    'is_critical': False
                }
            ],
            'CT001': [
                {
                    'type': 'medication',
                    'title': '당뇨약 복용 재개',
                    'description': '메트포르민 계열 당뇨약은 의료진 지시에 따라 48시간 후 복용을 재개하세요.',
                    'priority': 'high',
                    'duration_hours': 48,
                    'icon': '💊',
                    'is_critical': False
                },
                {
                    'type': 'diet',
                    'title': '정상 식사 가능',
                    'description': '검사 후 30분이 지나면 정상적인 식사가 가능합니다.',
                    'priority': 'low',
                    'duration_hours': 1,
                    'icon': '🍽️',
                    'is_critical': False
                }
            ],
            
            # MRI 검사
            'mri_scan': [
                {
                    'type': 'general',
                    'title': '정상 활동 가능',
                    'description': 'MRI 검사 후에는 특별한 제한 없이 정상적인 일상생활이 가능합니다.',
                    'priority': 'low',
                    'duration_hours': None,
                    'icon': '✅',
                    'is_critical': False
                },
                {
                    'type': 'symptoms',
                    'title': '어지러움 관찰',
                    'description': '조영제를 사용한 경우 어지러움이나 메스꺼움이 있을 수 있으니 주의하세요.',
                    'priority': 'medium',
                    'duration_hours': 4,
                    'icon': '😵',
                    'is_critical': False
                }
            ],
            'MRI001': [
                {
                    'type': 'hydration',
                    'title': '충분한 수분 섭취',
                    'description': '조영제 배출을 위해 검사 후 충분한 물을 마셔주세요.',
                    'priority': 'medium',
                    'duration_hours': 24,
                    'icon': '💧',
                    'is_critical': False
                }
            ],
            
            # X-ray 검사
            'xray': [
                {
                    'type': 'general',
                    'title': '정상 활동 즉시 가능',
                    'description': 'X-ray 검사 후에는 즉시 정상적인 활동이 가능합니다.',
                    'priority': 'low',
                    'duration_hours': None,
                    'icon': '✅',
                    'is_critical': False
                }
            ],
            'exam_002': [
                {
                    'type': 'general',
                    'title': '특별한 주의사항 없음',
                    'description': '흉부 X-ray 검사 후 특별한 주의사항은 없습니다.',
                    'priority': 'low',
                    'duration_hours': None,
                    'icon': '✅',
                    'is_critical': False
                }
            ],
            'XRAY001': [
                {
                    'type': 'general',
                    'title': '결과 확인 필요',
                    'description': '검사 결과는 담당 의사와 상담하여 확인하시기 바랍니다.',
                    'priority': 'medium',
                    'duration_hours': None,
                    'icon': '📋',
                    'is_critical': False
                }
            ],
            
            # 위내시경
            'GASTRO01': [
                {
                    'type': 'diet',
                    'title': '검사 후 2시간 금식',
                    'description': '마취로 인한 구토 방지를 위해 검사 후 2시간 동안은 음식 섭취를 금하세요.',
                    'priority': 'high',
                    'duration_hours': 2,
                    'icon': '🚫',
                    'is_critical': False
                },
                {
                    'type': 'symptoms',
                    'title': '출혈 증상 관찰',
                    'description': '토혈, 흑색변, 심한 복통이 있으면 즉시 병원에 연락하세요.',
                    'priority': 'high',
                    'duration_hours': 24,
                    'icon': '🩸',
                    'is_critical': True
                },
                {
                    'type': 'activity',
                    'title': '수면내시경 후 운전 금지',
                    'description': '수면내시경을 받으신 경우 당일 운전은 절대 금지입니다.',
                    'priority': 'high',
                    'duration_hours': 24,
                    'icon': '🚗',
                    'is_critical': True
                },
                {
                    'type': 'diet',
                    'title': '부드러운 음식 섭취',
                    'description': '검사 후 1-2일간은 죽, 미음 등 부드러운 음식을 드세요.',
                    'priority': 'medium',
                    'duration_hours': 48,
                    'icon': '🍚',
                    'is_critical': False
                }
            ],
            
            # 심전도 검사
            'exam_003': [
                {
                    'type': 'general',
                    'title': '전극 부착 부위 관리',
                    'description': '전극을 부착했던 부위에 가려움이나 발진이 생기면 알려주세요.',
                    'priority': 'low',
                    'duration_hours': 24,
                    'icon': '🔴',
                    'is_critical': False
                }
            ],
            'EKG001': [
                {
                    'type': 'followup',
                    'title': '결과 상담 필요',
                    'description': '심전도 검사 결과는 반드시 담당 의사와 상담하여 확인하세요.',
                    'priority': 'high',
                    'duration_hours': None,
                    'icon': '👨‍⚕️',
                    'is_critical': False
                }
            ],
            
            # 초음파 검사
            'ultrasound': [
                {
                    'type': 'diet',
                    'title': '정상 식사 가능',
                    'description': '초음파 검사 후 즉시 정상적인 식사가 가능합니다.',
                    'priority': 'low',
                    'duration_hours': None,
                    'icon': '🍽️',
                    'is_critical': False
                }
            ],
            'USG001': [
                {
                    'type': 'general',
                    'title': '젤 제거',
                    'description': '검사 부위에 남은 초음파 젤을 깨끗이 닦아내세요.',
                    'priority': 'low',
                    'duration_hours': None,
                    'icon': '🧽',
                    'is_critical': False
                }
            ],
            
            # 혈액검사
            'exam_001': [
                {
                    'type': 'wound_care',
                    'title': '채혈 부위 관리',
                    'description': '채혈 부위는 24시간 동안 물이 닿지 않게 하고, 출혈이나 부종이 생기면 알려주세요.',
                    'priority': 'medium',
                    'duration_hours': 24,
                    'icon': '🩹',
                    'is_critical': False
                },
                {
                    'type': 'activity',
                    'title': '채혈팔 무리하지 말기',
                    'description': '채혈한 팔로 무거운 물건을 들거나 격렬한 운동을 피하세요.',
                    'priority': 'medium',
                    'duration_hours': 4,
                    'icon': '💪',
                    'is_critical': False
                }
            ],
            'blood-test': [
                {
                    'type': 'diet',
                    'title': '정상 식사 가능',
                    'description': '채혈 후 즉시 정상적인 식사가 가능합니다.',
                    'priority': 'low',
                    'duration_hours': None,
                    'icon': '🍽️',
                    'is_critical': False
                }
            ],
            'blood_test': [
                {
                    'type': 'wound_care',
                    'title': '압박 지혈',
                    'description': '채혈 부위를 5-10분간 꾹 눌러 지혈하세요.',
                    'priority': 'high',
                    'duration_hours': 1,
                    'icon': '🤏',
                    'is_critical': False
                }
            ],
            'BLOOD01': [
                {
                    'type': 'hydration',
                    'title': '충분한 수분 섭취',
                    'description': '채혈 후 충분한 수분을 섭취하여 혈액량을 보충하세요.',
                    'priority': 'medium',
                    'duration_hours': 4,
                    'icon': '💧',
                    'is_critical': False
                }
            ],
            
            # 골밀도 검사
            'BONEDEXA': [
                {
                    'type': 'general',
                    'title': '특별한 주의사항 없음',
                    'description': '골밀도 검사 후 특별한 주의사항은 없습니다.',
                    'priority': 'low',
                    'duration_hours': None,
                    'icon': '✅',
                    'is_critical': False
                }
            ],
            
            # 소변검사
            'URINE01': [
                {
                    'type': 'general',
                    'title': '결과 확인',
                    'description': '소변검사 결과는 2-3일 후 확인 가능합니다.',
                    'priority': 'medium',
                    'duration_hours': None,
                    'icon': '📋',
                    'is_critical': False
                }
            ],
            
            # 코로나 PCR
            'COVIDPCR': [
                {
                    'type': 'symptoms',
                    'title': '결과 확인 전까지 마스크 착용',
                    'description': '검사 결과가 나올 때까지 마스크를 착용하고 타인과의 접촉을 최소화하세요.',
                    'priority': 'high',
                    'duration_hours': 48,
                    'icon': '😷',
                    'is_critical': False
                },
                {
                    'type': 'general',
                    'title': '결과 통보 대기',
                    'description': '검사 결과는 문자메시지로 통보됩니다. 양성인 경우 즉시 연락드립니다.',
                    'priority': 'medium',
                    'duration_hours': None,
                    'icon': '📱',
                    'is_critical': False
                }
            ],
            
            # 기본 검사/진료
            'basic_checkup': [
                {
                    'type': 'followup',
                    'title': '건강검진 결과 상담',
                    'description': '건강검진 결과는 1주일 후 확인 가능하며, 이상 소견이 있으면 추가 상담이 필요합니다.',
                    'priority': 'medium',
                    'duration_hours': None,
                    'icon': '📊',
                    'is_critical': False
                }
            ],
            
            # 내과 진료
            'internal-medicine': [
                {
                    'type': 'medication',
                    'title': '처방약 복용법 준수',
                    'description': '처방받은 약물은 정해진 시간에 정확한 용량으로 복용하세요.',
                    'priority': 'high',
                    'duration_hours': None,
                    'icon': '💊',
                    'is_critical': False
                },
                {
                    'type': 'followup',
                    'title': '증상 변화 관찰',
                    'description': '증상이 악화되거나 새로운 증상이 나타나면 즉시 병원에 연락하세요.',
                    'priority': 'high',
                    'duration_hours': None,
                    'icon': '👀',
                    'is_critical': True
                }
            ],
            'internal_med': [
                {
                    'type': 'rest',
                    'title': '충분한 휴식',
                    'description': '진료 후 충분한 휴식을 취하고 무리한 활동은 피하세요.',
                    'priority': 'medium',
                    'duration_hours': 24,
                    'icon': '😴',
                    'is_critical': False
                }
            ]
        }

        with transaction.atomic():
            created_count = 0
            
            for exam_id, instructions in post_care_data.items():
                try:
                    exam = Exam.objects.get(exam_id=exam_id)
                    
                    # 기존 검사 후 주의사항 삭제 (테이블이 존재하는 경우에만)
                    try:
                        deleted = exam.post_care_instructions.all().delete()
                        if deleted[0] > 0:
                            self.stdout.write(f"  - {exam.title}: 기존 검사 후 주의사항 {deleted[0]}개 삭제")
                    except Exception as e:
                        self.stdout.write(f"  - {exam.title}: 기존 데이터 삭제 건너뜀 ({str(e)})")
                    
                    # 새 검사 후 주의사항 생성
                    for instruction_data in instructions:
                        ExamPostCareInstruction.objects.create(
                            exam=exam,
                            **instruction_data
                        )
                        created_count += 1
                    
                    self.stdout.write(
                        self.style.SUCCESS(f"✓ {exam.title} ({exam_id}): {len(instructions)}개 검사 후 주의사항 생성")
                    )
                    
                except Exam.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f"✗ 검사 ID '{exam_id}'를 찾을 수 없습니다.")
                    )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n총 {created_count}개의 검사 후 주의사항이 생성되었습니다."
                )
            )