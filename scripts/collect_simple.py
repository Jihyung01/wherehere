"""
WhereHere 장소 수집 스크립트 (Kakao Local API → Supabase places)
- 대상 지역: 서울, 부산, 분당(성남)
- 목표: ~1,000개 핫플레이스 (리뷰 많은 순 우선)
- 카테고리: 카페, 음식점, 술집/바, 문화시설, 공원, 베이커리, 브런치 등

사용법:
  1) 환경변수 설정 (터미널 or .env)
     - KAKAO_REST_API_KEY
     - SUPABASE_URL
     - SUPABASE_SERVICE_ROLE_KEY
  2) python scripts/collect_simple.py
"""

import os
import sys
import time
import requests
from datetime import datetime


# ─────────────────────────────────────────────
# 환경변수 로드 (.env 파일 지원)
# ─────────────────────────────────────────────
def load_env_file():
    """backend/.env 또는 .env 파일이 있으면 로드"""
    for env_path in ["backend/.env", ".env"]:
        if os.path.exists(env_path):
            # Windows 콘솔 인코딩(cp949) 문제를 피하기 위해 이모지 없이 출력
            print(f"[ENV] {env_path} 파일에서 환경변수 로드 중...")
            # Windows에서 저장된 UTF-8 BOM(.env)에 대비해 utf-8-sig 사용
            with open(env_path, "r", encoding="utf-8-sig") as f:
                for line in f:
                    # 디버그: 원본 라인 그대로 출력
                    # print(f"[DEBUG] raw line: {repr(line)}")
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    # 디버그: 어떤 키/값을 읽었는지 출력
                    print(f"[DEBUG] parsed line -> key={repr(key)}, val_prefix={repr(val[:5])}")
                    if key and val:
                        os.environ[key] = val
            break


load_env_file()

KAKAO_REST_API_KEY = os.environ.get("KAKAO_REST_API_KEY", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# 디버그용 출력: 실제 로드된 값 확인
# print(f"[DEBUG] KAKAO_REST_API_KEY after load: {repr(KAKAO_REST_API_KEY)}")

if not KAKAO_REST_API_KEY:
    print("[ERROR] KAKAO_REST_API_KEY가 설정되지 않았습니다.")
    sys.exit(1)
if not SUPABASE_URL:
    print("[ERROR] SUPABASE_URL이 설정되지 않았습니다.")
    sys.exit(1)
if not SUPABASE_SERVICE_ROLE_KEY:
    print("[ERROR] SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.")
    sys.exit(1)

print("[OK] 환경변수 로드 완료")


# ─────────────────────────────────────────────
# 수집 설정 (REAL_DATA_SCHEMA places 스키마와 호환)
# ─────────────────────────────────────────────

# 지역별 중심 좌표 + 검색 반경(m)
REGIONS = {
    # ── 서울 주요 핫플 권역 ──
    "서울 강남": {"lat": 37.4979, "lng": 127.0276, "radius": 3000},
    "서울 홍대": {"lat": 37.5563, "lng": 126.9220, "radius": 2500},
    "서울 이태원": {"lat": 37.5345, "lng": 126.9946, "radius": 2000},
    "서울 성수": {"lat": 37.5445, "lng": 127.0560, "radius": 2500},
    "서울 여의도": {"lat": 37.5219, "lng": 126.9245, "radius": 2500},
    "서울 종로": {"lat": 37.5700, "lng": 126.9920, "radius": 2500},
    "서울 잠실": {"lat": 37.5133, "lng": 127.1001, "radius": 3000},
    "서울 신촌": {"lat": 37.5597, "lng": 126.9422, "radius": 2000},
    "서울 압구정": {"lat": 37.5270, "lng": 127.0286, "radius": 2000},
    "서울 망원": {"lat": 37.5565, "lng": 126.9058, "radius": 2000},
    "서울 을지로": {"lat": 37.5660, "lng": 126.9910, "radius": 2000},
    "서울 연남동": {"lat": 37.5660, "lng": 126.9250, "radius": 1500},
    "서울 북촌": {"lat": 37.5828, "lng": 126.9850, "radius": 1500},

    # ── 부산 주요 핫플 권역 ──
    "부산 해운대": {"lat": 35.1587, "lng": 129.1604, "radius": 3000},
    "부산 광안리": {"lat": 35.1532, "lng": 129.1188, "radius": 2500},
    "부산 서면": {"lat": 35.1577, "lng": 129.0599, "radius": 2500},
    "부산 남포동": {"lat": 35.0977, "lng": 129.0324, "radius": 2500},
    "부산 전포동": {"lat": 35.1516, "lng": 129.0640, "radius": 2000},
    "부산 영도": {"lat": 35.0880, "lng": 129.0670, "radius": 2500},
    "부산 기장": {"lat": 35.2446, "lng": 129.2225, "radius": 3000},
    "부산 센텀시티": {"lat": 35.1696, "lng": 129.1316, "radius": 2500},
    "부산 송정": {"lat": 35.1788, "lng": 129.1998, "radius": 2000},
    "부산 다대포": {"lat": 35.0470, "lng": 128.9660, "radius": 2500},
    "부산 수영": {"lat": 35.1456, "lng": 129.1130, "radius": 2000},

    # ── 분당(성남) 주요 권역 ──
    "분당 서현": {"lat": 37.3849, "lng": 127.1234, "radius": 2500},
    "분당 정자": {"lat": 37.3661, "lng": 127.1085, "radius": 2500},
    "분당 판교": {"lat": 37.3500, "lng": 127.1100, "radius": 3000},
    "분당 야탑": {"lat": 37.4112, "lng": 127.1279, "radius": 2000},
    "분당 미금": {"lat": 37.3510, "lng": 127.1100, "radius": 2000},
}


# 카테고리별 검색 키워드 + 매핑
CATEGORIES = [
    {"keyword": "맛집", "primary": "음식점", "vibe": ["맛집", "인기"]},
    {"keyword": "카페", "primary": "카페", "vibe": ["감성", "힐링"]},
    {"keyword": "브런치 카페", "primary": "카페", "vibe": ["브런치", "데이트"]},
    {"keyword": "술집", "primary": "술집/바", "vibe": ["나이트라이프", "분위기"]},
    {"keyword": "와인바", "primary": "술집/바", "vibe": ["와인", "데이트"]},
    {"keyword": "베이커리", "primary": "베이커리", "vibe": ["디저트", "빵"]},
    {"keyword": "이색 맛집", "primary": "음식점", "vibe": ["특별한", "이색"]},
    {"keyword": "분위기 좋은 식당", "primary": "음식점", "vibe": ["분위기", "데이트"]},
    {"keyword": "핫플레이스", "primary": "기타", "vibe": ["핫플", "트렌디"]},
    {"keyword": "전시 갤러리", "primary": "문화시설", "vibe": ["예술", "감성"]},
    {"keyword": "공원 산책", "primary": "공원", "vibe": ["자연", "힐링"]},
    {"keyword": "루프탑", "primary": "카페", "vibe": ["루프탑", "뷰"]},
]

# Kakao API 최대 페이지: 1~45, 각 페이지 최대 15개
MAX_PAGES_PER_QUERY = 5  # 페이지 5개 × 15개 = 75개/쿼리 (API 부담 최소화)


# ─────────────────────────────────────────────
# Kakao Local API 검색
# ─────────────────────────────────────────────
KAKAO_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"


def search_kakao(query: str, lng: float, lat: float, radius: int, page: int = 1, size: int = 15):
    """Kakao Local API 키워드 검색"""
    headers = {"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"}
    params = {
        "query": query,
        "x": str(lng),
        "y": str(lat),
        "radius": radius,
        "page": page,
        "size": size,
        "sort": "accuracy",  # accuracy가 인기/관련도 순 (리뷰 많은 곳 우선)
    }
    try:
        resp = requests.get(KAKAO_SEARCH_URL, headers=headers, params=params, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        print(f"  ⚠️ Kakao API 오류: {e}")
        return None


def _default_price_and_tier(primary_category: str) -> tuple[int | None, str | None]:
    """카테고리별 대략적인 가격/티어 기본값"""
    if primary_category in ("공원",):
        return 0, "free"
    if primary_category in ("카페", "베이커리"):
        return 8000, "low"
    if primary_category in ("술집/바", "문화시설"):
        return 20000, "medium"
    if primary_category in ("음식점",):
        return 15000, "medium"
    return None, None


def kakao_to_place(doc: dict, category_info: dict) -> dict:
    """Kakao API 응답 document → REAL_DATA_SCHEMA places row 변환"""
    kakao_id = doc.get("id", "")
    place_id = f"kakao-{kakao_id}"

    # 카카오 카테고리 파싱 (예: "음식점 > 한식 > 삼겹살")
    cat_name = doc.get("category_name", "")
    cat_parts = [c.strip() for c in cat_name.split(">")]
    primary = category_info.get("primary", cat_parts[0] if cat_parts else "기타")
    secondary = cat_parts[1:] if len(cat_parts) > 1 else []

    avg_price, price_tier = _default_price_and_tier(primary)

    return {
        "id": place_id,
        "name": doc.get("place_name", ""),
        "address": doc.get("road_address_name", "") or doc.get("address_name", ""),
        "latitude": float(doc.get("y", 0)),
        "longitude": float(doc.get("x", 0)),
        "primary_category": primary,
        "secondary_categories": secondary,
        "vibe_tags": category_info.get("vibe", []),
        "description": f"{doc.get('place_name', '')} - {cat_name}",
        "average_rating": 0.0,
        "review_count": 0,
        "is_hidden_gem": False,
        "typical_crowd_level": "medium",
        "average_price": avg_price,
        "price_tier": price_tier,
        "is_active": True,
    }


# ─────────────────────────────────────────────
# Supabase REST로 upsert
# ─────────────────────────────────────────────
def upsert_places(places: list[dict]) -> int:
    """places 테이블에 batch upsert (on conflict id)"""
    if not places:
        return 0

    url = f"{SUPABASE_URL}/rest/v1/places"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",  # id 기준 upsert
    }

    batch_size = 200
    total_upserted = 0

    for i in range(0, len(places), batch_size):
        batch = places[i : i + batch_size]
        try:
            resp = requests.post(url, headers=headers, json=batch, timeout=30)
            if resp.status_code in (200, 201):
                total_upserted += len(batch)
            else:
                print(f"  ⚠️ Supabase upsert 오류 ({resp.status_code}): {resp.text[:200]}")
        except requests.RequestException as e:
            print(f"  ⚠️ Supabase 연결 오류: {e}")

    return total_upserted


# ─────────────────────────────────────────────
# 메인 수집 로직
# ─────────────────────────────────────────────
def collect_all():
    all_places: dict[str, dict] = {}  # id → place dict (중복 제거)
    total_api_calls = 0

    region_names = list(REGIONS.keys())
    total_combos = len(region_names) * len(CATEGORIES)

    print(f"\n[INFO] 수집 시작: {len(region_names)}개 지역 × {len(CATEGORIES)}개 카테고리 = {total_combos}개 조합")
    print(f"       목표: ~1,000개 핫플레이스 (중복 제거 후)\n")

    combo_idx = 0
    for region_name, region_info in REGIONS.items():
        lat = region_info["lat"]
        lng = region_info["lng"]
        radius = region_info["radius"]

        for cat in CATEGORIES:
            combo_idx += 1
            query = f"{region_name} {cat['keyword']}"
            region_count = 0

            for page in range(1, MAX_PAGES_PER_QUERY + 1):
                data = search_kakao(query, lng, lat, radius, page=page)
                total_api_calls += 1

                if not data or not data.get("documents"):
                    break

                docs = data["documents"]
                for doc in docs:
                    place = kakao_to_place(doc, cat)
                    if place["id"] not in all_places and place["latitude"] != 0:
                        all_places[place["id"]] = place
                        region_count += 1

                meta = data.get("meta", {})
                if meta.get("is_end", True):
                    break

                time.sleep(0.15)

            if region_count > 0:
                print(f"  [{combo_idx}/{total_combos}] {query}: +{region_count}개 (누적 {len(all_places)}개)")

        time.sleep(0.2)

    print(f"\n[INFO] 수집 완료: 총 {len(all_places)}개 (API 호출 {total_api_calls}회)")

    if all_places:
        places_list = list(all_places.values())
        print(f"\n[INFO] Supabase places 테이블에 저장 중... ({len(places_list)}개)")
        upserted = upsert_places(places_list)
        print(f"[OK] 저장 완료: {upserted}개 upsert 됨")
    else:
        print("[WARN] 수집된 장소가 없습니다. API 키와 네트워크를 확인해주세요.")


if __name__ == "__main__":
    print("=" * 55)
    print("  WhereHere 장소 수집기 (서울 · 부산 · 분당)")
    print(f"  실행 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 55)
    collect_all()
    print("\n🎉 완료!")
