#!/usr/bin/env node

/**
 * Django REST Framework API에서 TypeScript 타입을 자동 생성하는 스크립트
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, '..', 'backend', 'nfc_hospital_system');
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend-pwa');
const SCHEMA_FILE = path.join(BACKEND_DIR, 'openapi-schema.yml');
const TYPES_DIR = path.join(FRONTEND_DIR, 'src', 'types');
const API_TYPES_FILE = path.join(TYPES_DIR, 'api.ts');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createDirectoryIfNotExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`✅ Created directory: ${dirPath}`, 'green');
  }
}

async function generateTypes() {
  try {
    log('\n🚀 Starting API type generation...', 'cyan');
    
    // 1. types 디렉토리 생성
    createDirectoryIfNotExists(TYPES_DIR);
    
    // 2. Django에서 OpenAPI 스키마 생성
    log('\n📋 Generating OpenAPI schema from Django...', 'yellow');
    process.chdir(BACKEND_DIR);
    
    try {
      execSync('python manage.py spectacular --file openapi-schema.yml --validate', {
        stdio: 'inherit'
      });
      log('✅ OpenAPI schema generated successfully', 'green');
    } catch (error) {
      log('❌ Failed to generate OpenAPI schema', 'red');
      log('Make sure Django server is configured properly', 'yellow');
      process.exit(1);
    }
    
    // 3. OpenAPI 스키마를 TypeScript 타입으로 변환
    log('\n🔄 Converting OpenAPI schema to TypeScript types...', 'yellow');
    
    try {
      execSync(`npx openapi-typescript ${SCHEMA_FILE} -o ${API_TYPES_FILE}`, {
        stdio: 'inherit'
      });
      log('✅ TypeScript types generated successfully', 'green');
    } catch (error) {
      log('❌ Failed to convert to TypeScript types', 'red');
      process.exit(1);
    }
    
    // 4. 추가 유틸리티 타입 생성
    log('\n📝 Creating utility types...', 'yellow');
    
    const utilityTypes = `
// 유틸리티 타입들
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

// API 에러 타입
export class ApiError extends Error {
  constructor(
    public status: number,
    public data: any,
    message?: string
  ) {
    super(message || 'API Error');
  }
}
`;
    
    const utilityTypesFile = path.join(TYPES_DIR, 'utils.ts');
    fs.writeFileSync(utilityTypesFile, utilityTypes);
    log('✅ Utility types created', 'green');
    
    // 5. API hooks 생성
    log('\n🪝 Creating API hooks...', 'yellow');
    
    const apiHooks = `
import { useState, useEffect } from 'react';
import axios from 'axios';
import { ApiResponse, ApiError } from './utils';

// 기본 API 클라이언트 설정
const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 토큰 인터셉터
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = \`Bearer \${token}\`;
  }
  return config;
});

// 응답 인터셉터
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 처리
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 범용 API Hook
export function useApi<T>(
  url: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    enabled?: boolean;
  }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (options?.enabled === false) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient({
          url,
          method: options?.method || 'GET',
          data: options?.data,
        });
        setData(response.data);
      } catch (err: any) {
        setError(
          new ApiError(
            err.response?.status || 500,
            err.response?.data,
            err.message
          )
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url, options?.method, JSON.stringify(options?.data)]);

  return { data, loading, error, refetch: () => {} };
}

export { apiClient };
`;
    
    const apiHooksFile = path.join(TYPES_DIR, 'hooks.ts');
    fs.writeFileSync(apiHooksFile, apiHooks);
    log('✅ API hooks created', 'green');
    
    // 6. index 파일 생성
    const indexContent = `
export * from './api';
export * from './utils';
export * from './hooks';
`;
    
    const indexFile = path.join(TYPES_DIR, 'index.ts');
    fs.writeFileSync(indexFile, indexContent);
    
    log('\n✨ Type generation completed successfully!', 'green');
    log(`\n📁 Generated files:`, 'cyan');
    log(`   - ${API_TYPES_FILE}`, 'bright');
    log(`   - ${utilityTypesFile}`, 'bright');
    log(`   - ${apiHooksFile}`, 'bright');
    log(`   - ${indexFile}`, 'bright');
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 스크립트 실행
generateTypes();