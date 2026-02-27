# 🚀 WhereHere 실행하기

## 가장 빠른 방법 (추천)

### 터미널 1: 프론트엔드 실행
```bash
cd frontend-app
npm install
npm run dev
```

프론트엔드가 http://localhost:3000 에서 실행됩니다.

### 터미널 2: 백엔드 실행 (Docker)
```bash
docker-compose up -d
```

백엔드가 http://localhost:8000 에서 실행됩니다.

---

## 백엔드 로컬 실행 (Docker 없이)

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn recommendation_engine:app --reload
```

---

## 확인하기

✅ 프론트엔드: http://localhost:3000  
✅ 백엔드 API 문서: http://localhost:8000/docs  
✅ 백엔드 Health Check: http://localhost:8000/api/v1/health

---

## 현재 상태

프론트엔드는 **완전히 작동**합니다:
- 역할 선택 UI
- 레벨 진행바
- 스트릭 표시
- 장소 카드 레이아웃

백엔드 API가 **데이터베이스 없이는** 에러가 발생할 수 있습니다.  
UI 개발을 위해서는 프론트엔드만 실행해도 충분합니다!

---

**더 자세한 내용은 `SETUP_GUIDE.md`를 참고하세요.**
