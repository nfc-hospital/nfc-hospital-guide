#!/usr/bin/env python3
import os
from dotenv import load_dotenv
from openai import OpenAI

# .env 파일 로드
load_dotenv()

# API 키 확인
api_key = os.getenv('OPENAI_API_KEY')
print(f"API Key (first 10 chars): {api_key[:10] if api_key else 'NOT FOUND'}...")

if api_key:
    try:
        # OpenAI 클라이언트 초기화
        client = OpenAI(api_key=api_key)
        print("✅ OpenAI client created successfully")
        
        # 간단한 테스트
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "user", "content": "Say 'Hello'"}
            ],
            max_tokens=10
        )
        
        print(f"✅ API Test successful: {response.choices[0].message.content}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
else:
    print("❌ No API key found")