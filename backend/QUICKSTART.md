# WhereHere v2 백엔드 빠른 시작

## 설치 및 실행 (3분 내)

### 1. 이 폴더를 기존 backend 폴더에 덮어쓰기
```bash
# 기존 backend 폴더 백업 (안전을 위해)
mv backend backend_old

# 새 backend 폴더 사용
# (다운받은 wherehere-v2-backend 폴더를 backend로 이름 변경)
```

### 2. .env 파일에 API 키 입력
```bash
cd backend
# .env 파일 열어서 아래 3개 키 입력:
# ANTHROPIC_API_KEY=sk-ant-api03-...
# KAKAO_REST_API_KEY=160238a...
# OPENWEATHER_API_KEY=def94dbb...
```

### 3. 패키지 설치 & 서버 실행
```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

### 4. 확인
- http://localhost:8000 → API 정보
- http://localhost:8000/docs → Swagger 문서
- http://localhost:8000/health → 상태 확인

## API 엔드포인트

### 추천 (핵심!)
```
POST /api/v1/recommendations
{
  "role_type": "explorer",
  "user_level": 8,
  "current_location": {"latitude": 37.4979, "longitude": 127.0276}
}
```

### 역할 목록
```
GET /api/v1/recommendations/roles
```

### 날씨
```
GET /api/v1/recommendations/weather?lat=37.4979&lon=127.0276
```

### 퀘스트
```
POST /api/v1/quests/accept
POST /api/v1/quests/complete
GET /api/v1/quests/active/{user_id}
```

### 사용자
```
GET /api/v1/users/me
PATCH /api/v1/users/me
GET /api/v1/users/me/stats
```

## Mock vs Real 모드

- **DB 미연결**: 자동으로 Mock 데이터 사용 (서울 15개 장소)
- **DB 연결**: 실제 Supabase PostGIS 쿼리 사용
- 전환이 자동이라 코드 수정 불필요!
