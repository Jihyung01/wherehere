# 🔧 Railway 빌드 에러 해결

## 현재 문제
```
pip: command not found
"pip install -r requirements.txt" did not complete successfully
```

Railway가 Python 환경을 제대로 감지하지 못하고 있습니다.

---

## ✅ 해결 방법

### 1. Settings 탭으로 이동
상단 메뉴: Deployments | Variables | Metrics | **Settings** ← 클릭

### 2. 아래로 스크롤해서 "Deploy" 섹션 찾기

### 3. Start Command 설정
**Custom Start Command** 입력란에:
```
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### 4. 저장 (자동 저장됨)

### 5. 재배포
Deployments 탭으로 돌아가면 자동으로 새 배포 시작

---

## 대안: Procfile 사용

Settings에서 Start Command를 설정해도 안 되면, Procfile이 이미 있으므로 Railway가 자동으로 감지해야 합니다.

현재 `backend/Procfile`:
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

---

## 추가 확인사항

### Settings에서 확인할 것:

1. **Root Directory**: `/backend` ✅
2. **Build Command**: (비워두기 - 자동 감지)
3. **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. **Watch Paths**: (비워두기)

---

## 만약 여전히 안 되면

### Python 버전 명시
Settings → Build → Custom Build Command:
```
pip install -r requirements.txt
```

---

**지금: Settings → Deploy → Start Command 설정!** 🚀
