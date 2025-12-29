# Enhanced Kakao Client

Enhanced Kakao Talk Client with Phone/Email Login Support

## 📁 프로젝트 구조

```
enhanced-kakao-client/
├── src/
│   ├── client/           # 클라이언트 구현
│   │   └── EnhancedKakaoClient.ts
│   ├── protocol/         # 프로토콜 엔진
│   │   └── KakaoProtocolEngine.ts
│   ├── database/         # 데이터베이스 관리
│   │   └── DatabaseManager.ts
│   ├── command/          # 커맨드 처리
│   │   └── CommandHandler.ts
│   ├── utils/            # 유틸리티 함수
│   │   ├── DataCollector.ts
│   │   └── AntiDebug.ts
│   ├── types/            # 타입 정의
│   │   └── types.ts
│   ├── config.ts         # 설정
│   └── index.ts          # 메인 진입점
├── dist/                 # 컴파일된 출력
├── .env                  # 환경 변수 (생성 필요)
├── .env.example          # 환경 변수 예제
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 설치 및 설정

### 1. 의존성 설치

```bash
cd /workspace/uploads/loco
npm install
```

### 2. 환경 변수 설정

`.env.example` 파일을 `.env`로 복사하고 설정을 입력하세요:

```bash
cp .env.example .env
```

`.env` 파일을 열어서 다음 정보를 입력:

```env
# 방법 1: 전화번호로 로그인
KAKAO_PHONE=+821012345678
KAKAO_PASSWORD=your_password

# 방법 2: 이메일로 로그인 (전화번호 대신)
# KAKAO_EMAIL=your_email@example.com
# KAKAO_PASSWORD=your_password

# 관리자 ID (쉼표로 구분)
ADMIN_IDS=123456789,987654321

# 커맨드 접두사
COMMAND_PREFIX=!
```

### 3. 빌드

```bash
npm run build
```

### 4. 실행

```bash
# 프로덕션 모드
npm start

# 개발 모드 (자동 재시작)
npm run dev
```

## 📖 사용법

### 라이브러리로 사용

```typescript
import { EnhancedKakaoClient } from 'enhanced-kakao-client';

const client = new EnhancedKakaoClient();
await client.login();

// 클라이언트 사용
const collector = client.getDataCollector();
const talkClient = client.getClient();
```

### 독립 실행형 애플리케이션

```bash
# .env 파일 설정 후
npm start
```

## 🛠️ 개발

```bash
# 의존성 설치
npm install

# 빌드
npm run build

# 개발 모드 실행
npm run dev

# 린트 검사
npm run lint

# 빌드 결과물 삭제
npm run clean
```

## 📋 주요 기능

- ✅ 전화번호/이메일 로그인 지원
- ✅ 메시지 수집 및 처리
- ✅ 커맨드 핸들러
- ✅ 데이터베이스 관리
- ✅ 안티 디버그 보안
- ✅ 프로토콜 엔진
- ✅ 모듈화된 구조

## 🔧 설정 옵션

### 환경 변수

| 변수 | 설명 | 필수 | 기본값 |
|------|------|------|--------|
| `KAKAO_PHONE` | 카카오톡 전화번호 | ✅ (또는 EMAIL) | - |
| `KAKAO_EMAIL` | 카카오톡 이메일 | ✅ (또는 PHONE) | - |
| `KAKAO_PASSWORD` | 카카오톡 비밀번호 | ✅ | - |
| `DEVICE_UUID` | 디바이스 UUID | ❌ | 자동 생성 |
| `DEVICE_NAME` | 디바이스 이름 | ❌ | EnhancedKakaoClient |
| `CONTROL_SERVER_URL` | 제어 서버 URL | ❌ | http://localhost:3000/collect |
| `ADMIN_IDS` | 관리자 ID (쉼표 구분) | ❌ | - |
| `COMMAND_PREFIX` | 커맨드 접두사 | ❌ | ! |

## 📝 라이센스

MIT

## ⚠️ 주의사항

이 클라이언트는 교육 목적으로만 사용하세요. 카카오톡 서비스 약관을 준수하고, 남용하지 마세요.