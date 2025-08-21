from django.core.management.base import BaseCommand
from django.db import transaction
from appointments.models import Exam, ExamPreparation

class Command(BaseCommand):
    help = '검사별 준비사항 데이터 생성'

    def handle(self, *args, **options):
        preparations_data = {
            # CT 검사
            'ct_scan': [
                {
                    'type': 'fasting',
                    'title': '검사 4시간 전부터 금식',
                    'description': '조영제 사용 시 부작용 예방을 위해 검사 4시간 전부터 음식물 섭취를 중단해주세요. 물은 검사 2시간 전까지 가능합니다.',
                    'is_required': True
                },
                {
                    'type': 'documents',
                    'title': '이전 CT/MRI 결과지 지참',
                    'description': '과거 CT나 MRI 검사를 받으신 적이 있다면 결과지와 CD를 가져와주세요.',
                    'is_required': False
                },
                {
                    'type': 'clothing',
                    'title': '금속 제거',
                    'description': '검사 시 모든 금속 물질(액세서리, 벨트, 동전 등)을 제거해야 합니다.',
                    'is_required': True
                }
            ],
            'CT001': [
                {
                    'type': 'fasting',
                    'title': '검사 6시간 전부터 금식',
                    'description': '복부 CT 검사를 위해 6시간 전부터 금식이 필요합니다. 약물 복용이 필요한 경우 소량의 물과 함께 복용하세요.',
                    'is_required': True
                },
                {
                    'type': 'medication',
                    'title': '당뇨약 복용 중단',
                    'description': '메트포르민 계열 당뇨약은 검사 48시간 전부터 중단해주세요. 의료진과 상담 필수입니다.',
                    'is_required': True
                },
                {
                    'type': 'documents',
                    'title': '신장 기능 검사 결과',
                    'description': '최근 3개월 이내 신장 기능 검사 결과가 있다면 지참해주세요.',
                    'is_required': False
                }
            ],
            
            # MRI 검사
            'mri_scan': [
                {
                    'type': 'clothing',
                    'title': '모든 금속 제거 필수',
                    'description': '강력한 자기장으로 인해 모든 금속(액세서리, 시계, 헤어핀, 의치, 보청기 등)을 제거해야 합니다.',
                    'is_required': True
                },
                {
                    'type': 'general',
                    'title': '심장박동기/인공와우 확인',
                    'description': '심장박동기, 인공와우, 금속 임플란트가 있으신 경우 반드시 사전에 알려주세요.',
                    'is_required': True
                },
                {
                    'type': 'documents',
                    'title': '수술 이력 확인서',
                    'description': '과거 수술로 인한 금속 삽입물이 있다면 관련 서류를 지참해주세요.',
                    'is_required': False
                }
            ],
            'MRI001': [
                {
                    'type': 'fasting',
                    'title': '검사 2시간 전부터 금식',
                    'description': '뇌 MRI 검사 시 조영제 사용 가능성이 있으므로 2시간 전부터 금식해주세요.',
                    'is_required': False
                },
                {
                    'type': 'clothing',
                    'title': '화장품 제거',
                    'description': '일부 화장품에는 금속 성분이 포함되어 있으므로 검사 전 제거해주세요.',
                    'is_required': True
                },
                {
                    'type': 'general',
                    'title': '폐쇄공포증 확인',
                    'description': '좁은 공간에 대한 공포가 있으시면 미리 의료진에게 알려주세요.',
                    'is_required': False
                }
            ],
            
            # X-ray 검사
            'xray': [
                {
                    'type': 'clothing',
                    'title': '상의 탈의',
                    'description': '흉부 X-ray 촬영 시 상의를 탈의하고 검사복으로 갈아입으셔야 합니다.',
                    'is_required': True
                },
                {
                    'type': 'general',
                    'title': '임신 가능성 확인',
                    'description': '임신 가능성이 있으신 경우 반드시 검사 전에 알려주세요.',
                    'is_required': True
                }
            ],
            'exam_002': [
                {
                    'type': 'clothing',
                    'title': '금속 제거',
                    'description': '목걸이, 귀걸이 등 촬영 부위의 금속 물질을 제거해주세요.',
                    'is_required': True
                }
            ],
            'XRAY001': [
                {
                    'type': 'clothing',
                    'title': '상의 탈의 및 검사복 착용',
                    'description': '정확한 흉부 촬영을 위해 상의를 벗고 검사복을 착용합니다.',
                    'is_required': True
                },
                {
                    'type': 'general',
                    'title': '심호흡 연습',
                    'description': '촬영 시 깊게 숨을 들이마시고 참아야 하므로 미리 연습해주세요.',
                    'is_required': False
                }
            ],
            
            # 위내시경
            'GASTRO01': [
                {
                    'type': 'fasting',
                    'title': '검사 전날 저녁 7시 이후 금식',
                    'description': '위 내부를 정확히 관찰하기 위해 전날 저녁 7시 이후부터 아무것도 드시지 마세요. 물도 자정 이후 금지입니다.',
                    'is_required': True
                },
                {
                    'type': 'medication',
                    'title': '아스피린 등 항혈전제 중단',
                    'description': '아스피린, 와파린 등 혈액응고를 방해하는 약물은 의사 지시에 따라 중단하세요.',
                    'is_required': True
                },
                {
                    'type': 'general',
                    'title': '수면내시경 시 보호자 동반',
                    'description': '수면내시경을 받으시는 경우 검사 후 보호자와 함께 귀가하셔야 합니다.',
                    'is_required': True
                },
                {
                    'type': 'clothing',
                    'title': '편안한 복장',
                    'description': '검사 시 편안함을 위해 헐렁한 옷을 착용해주세요.',
                    'is_required': False
                }
            ],
            
            # 심전도 검사
            'exam_003': [
                {
                    'type': 'general',
                    'title': '카페인 섭취 제한',
                    'description': '검사 2시간 전부터 커피, 차, 에너지 드링크 등 카페인 섭취를 피해주세요.',
                    'is_required': True
                },
                {
                    'type': 'clothing',
                    'title': '상의 탈의 가능한 복장',
                    'description': '전극 부착을 위해 상의를 쉽게 벗을 수 있는 옷을 입어주세요.',
                    'is_required': True
                }
            ],
            'EKG001': [
                {
                    'type': 'general',
                    'title': '운동 제한',
                    'description': '검사 30분 전부터 격렬한 운동을 피하고 안정을 취해주세요.',
                    'is_required': True
                },
                {
                    'type': 'medication',
                    'title': '심장약 복용 확인',
                    'description': '현재 복용 중인 심장 관련 약물 목록을 지참해주세요.',
                    'is_required': False
                }
            ],
            
            # 초음파 검사
            'ultrasound': [
                {
                    'type': 'fasting',
                    'title': '검사 8시간 전부터 금식',
                    'description': '복부 초음파의 경우 8시간 금식이 필요합니다. 담낭과 췌장을 잘 보기 위함입니다.',
                    'is_required': True
                },
                {
                    'type': 'general',
                    'title': '검사 부위 노출 준비',
                    'description': '검사 부위를 쉽게 노출할 수 있는 옷을 착용해주세요.',
                    'is_required': False
                }
            ],
            'USG001': [
                {
                    'type': 'fasting',
                    'title': '검사 6시간 전부터 금식',
                    'description': '복부 초음파 검사를 위해 6시간 전부터 음식물 섭취를 중단해주세요.',
                    'is_required': True
                },
                {
                    'type': 'bladder',
                    'title': '방광 충만 상태 유지',
                    'description': '골반 초음파가 포함된 경우 검사 1시간 전 물 500ml를 마시고 소변을 참아주세요.',
                    'is_required': False
                }
            ],
            
            # 혈액검사
            'exam_001': [
                {
                    'type': 'fasting',
                    'title': '검사 8시간 전부터 금식',
                    'description': '정확한 혈당 및 지질 검사를 위해 8시간 이상 금식이 필요합니다.',
                    'is_required': True
                },
                {
                    'type': 'general',
                    'title': '충분한 수분 섭취',
                    'description': '검사 전날 충분한 수분을 섭취하면 채혈이 수월합니다.',
                    'is_required': False
                }
            ],
            'blood-test': [
                {
                    'type': 'fasting',
                    'title': '검사 8-12시간 전 금식',
                    'description': '공복 혈당 검사가 포함되어 있으므로 8-12시간 금식해주세요. 물은 가능합니다.',
                    'is_required': True
                }
            ],
            'blood_test': [
                {
                    'type': 'fasting',
                    'title': '검사 전날 밤 10시 이후 금식',
                    'description': '정확한 검사를 위해 전날 밤 10시 이후 음식물 섭취를 중단해주세요.',
                    'is_required': True
                },
                {
                    'type': 'clothing',
                    'title': '팔 노출이 쉬운 옷',
                    'description': '채혈을 위해 소매를 쉽게 걷을 수 있는 옷을 착용해주세요.',
                    'is_required': False
                }
            ],
            'BLOOD01': [
                {
                    'type': 'fasting',
                    'title': '검사 8시간 전부터 금식',
                    'description': '기본 혈액검사를 위해 8시간 금식이 필요합니다.',
                    'is_required': True
                },
                {
                    'type': 'medication',
                    'title': '복용 약물 확인',
                    'description': '현재 복용 중인 모든 약물(비타민, 영양제 포함)을 알려주세요.',
                    'is_required': False
                }
            ],
            
            # 골밀도 검사
            'BONEDEXA': [
                {
                    'type': 'clothing',
                    'title': '금속 제거',
                    'description': '정확한 측정을 위해 벨트, 단추, 지퍼 등 금속이 있는 옷은 피해주세요.',
                    'is_required': True
                },
                {
                    'type': 'medication',
                    'title': '칼슘제 복용 중단',
                    'description': '검사 24시간 전부터 칼슘 보충제 복용을 중단해주세요.',
                    'is_required': False
                }
            ],
            
            # 소변검사
            'URINE01': [
                {
                    'type': 'general',
                    'title': '중간뇨 채취',
                    'description': '처음 나오는 소변은 버리고 중간 부분의 소변을 채취해주세요.',
                    'is_required': True
                },
                {
                    'type': 'general',
                    'title': '아침 첫 소변 권장',
                    'description': '가능하면 아침 첫 소변으로 검사하는 것이 정확합니다.',
                    'is_required': False
                }
            ],
            
            # 코로나 PCR
            'COVIDPCR': [
                {
                    'type': 'general',
                    'title': '검사 30분 전 양치 금지',
                    'description': '정확한 검사를 위해 검사 30분 전부터 양치질, 가글을 하지 마세요.',
                    'is_required': True
                },
                {
                    'type': 'general',
                    'title': '마스크 착용',
                    'description': '대기 중에는 반드시 마스크를 착용해주세요.',
                    'is_required': True
                }
            ],
            
            # 기본 검사/진료
            'basic_checkup': [
                {
                    'type': 'documents',
                    'title': '건강검진 문진표 작성',
                    'description': '정확한 건강 평가를 위해 문진표를 미리 작성해 오시면 좋습니다.',
                    'is_required': False
                },
                {
                    'type': 'general',
                    'title': '복용 약물 목록',
                    'description': '현재 복용 중인 모든 약물과 건강보조식품 목록을 준비해주세요.',
                    'is_required': True
                }
            ],
            
            # 내과 진료
            'internal-medicine': [
                {
                    'type': 'documents',
                    'title': '증상 기록',
                    'description': '언제부터 어떤 증상이 있었는지 메모해 오시면 진료에 도움이 됩니다.',
                    'is_required': False
                },
                {
                    'type': 'medication',
                    'title': '복용약 지참',
                    'description': '현재 복용 중인 약이 있다면 약봉투나 처방전을 가져오세요.',
                    'is_required': False
                }
            ],
            'internal_med': [
                {
                    'type': 'documents',
                    'title': '이전 검사 결과',
                    'description': '최근 받으신 검사 결과가 있다면 지참해주세요.',
                    'is_required': False
                },
                {
                    'type': 'general',
                    'title': '가족력 확인',
                    'description': '가족 중 유전 질환이나 만성 질환이 있는지 확인해 오세요.',
                    'is_required': False
                }
            ]
        }

        with transaction.atomic():
            created_count = 0
            updated_count = 0
            
            for exam_id, preps in preparations_data.items():
                try:
                    exam = Exam.objects.get(exam_id=exam_id)
                    
                    # 기존 준비사항 삭제
                    deleted = exam.preparations.all().delete()
                    if deleted[0] > 0:
                        self.stdout.write(f"  - {exam.title}: 기존 준비사항 {deleted[0]}개 삭제")
                    
                    # 새 준비사항 생성
                    for prep_data in preps:
                        ExamPreparation.objects.create(
                            exam=exam,
                            **prep_data
                        )
                        created_count += 1
                    
                    self.stdout.write(
                        self.style.SUCCESS(f"✓ {exam.title} ({exam_id}): {len(preps)}개 준비사항 생성")
                    )
                    
                except Exam.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f"✗ 검사 ID '{exam_id}'를 찾을 수 없습니다.")
                    )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n총 {created_count}개의 검사 준비사항이 생성되었습니다."
                )
            )