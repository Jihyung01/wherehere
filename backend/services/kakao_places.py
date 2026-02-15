# -*- coding: utf-8 -*-
"""
Kakao Local API 통합 서비스
장소 검색, 자동 수집, AI 분석
"""

import httpx
import asyncio
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import json

from core.config import settings
from services.narrative_generator import generate_narrative


class KakaoPlacesService:
    """
    Kakao Local API를 사용한 장소 검색 및 수집
    """
    
    BASE_URL = "https://dapi.kakao.com/v2/local/search"
    
    def __init__(self):
        self.api_key = settings.KAKAO_API_KEY
        self.headers = {
            "Authorization": f"KakaoAK {self.api_key}"
        }
    
    async def search_places(
        self,
        query: str,
        x: Optional[float] = None,  # 경도
        y: Optional[float] = None,  # 위도
        radius: int = 5000,  # 미터
        category_group_code: Optional[str] = None,
        page: int = 1,
        size: int = 15
    ) -> Dict:
        """
        Kakao Local API로 장소 검색
        
        category_group_code:
        - MT1: 대형마트
        - CS2: 편의점
        - PS3: 어린이집, 유치원
        - SC4: 학교
        - AC5: 학원
        - PK6: 주차장
        - OL7: 주유소, 충전소
        - SW8: 지하철역
        - BK9: 은행
        - CT1: 문화시설
        - AG2: 중개업소
        - PO3: 공공기관
        - AT4: 관광명소
        - AD5: 숙박
        - FD6: 음식점
        - CE7: 카페
        - HP8: 병원
        - PM9: 약국
        """
        
        url = f"{self.BASE_URL}/keyword.json"
        
        params = {
            "query": query,
            "page": page,
            "size": size,
        }
        
        if x and y:
            params["x"] = x
            params["y"] = y
            params["radius"] = radius
            params["sort"] = "distance"
        else:
            params["sort"] = "accuracy"
        
        if category_group_code:
            params["category_group_code"] = category_group_code
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
    
    async def search_by_category(
        self,
        x: float,
        y: float,
        category_group_code: str,
        radius: int = 5000,
        page: int = 1,
        size: int = 15
    ) -> Dict:
        """
        카테고리로 장소 검색
        """
        
        url = f"{self.BASE_URL}/category.json"
        
        params = {
            "category_group_code": category_group_code,
            "x": x,
            "y": y,
            "radius": radius,
            "page": page,
            "size": size,
            "sort": "distance"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
    
    def map_to_our_schema(self, kakao_place: Dict) -> Dict:
        """
        Kakao API 응답을 우리 스키마로 변환
        """
        
        # 카테고리 매핑
        category_name = kakao_place.get("category_name", "")
        category = self._extract_main_category(category_name)
        
        return {
            "external_id": kakao_place["id"],
            "external_source": "kakao",
            "name": kakao_place["place_name"],
            "category": category,
            "location": {
                "type": "Point",
                "coordinates": [
                    float(kakao_place["x"]),  # 경도
                    float(kakao_place["y"])   # 위도
                ]
            },
            "address": kakao_place.get("address_name", ""),
            "road_address": kakao_place.get("road_address_name", ""),
            "phone": kakao_place.get("phone", ""),
            "place_url": kakao_place.get("place_url", ""),
            "kakao_category": category_name,
            "distance_meters": int(kakao_place.get("distance", 0)) if kakao_place.get("distance") else None,
        }
    
    def _extract_main_category(self, category_name: str) -> str:
        """
        Kakao 카테고리에서 메인 카테고리 추출
        예: "음식점 > 카페 > 디저트카페" -> "카페"
        """
        
        categories = category_name.split(" > ")
        
        # 매핑 규칙
        if "카페" in category_name:
            return "카페"
        elif "음식점" in categories:
            return "맛집"
        elif "문화시설" in categories or "박물관" in category_name or "미술관" in category_name:
            return "갤러리"
        elif "공원" in category_name:
            return "공원"
        elif "관광명소" in categories:
            return "관광지"
        elif "술집" in category_name or "바" in category_name:
            return "바"
        elif "서점" in category_name:
            return "북카페"
        else:
            return categories[0] if categories else "기타"


class PlaceCollector:
    """
    자동 장소 수집 시스템
    """
    
    def __init__(self, db):
        self.kakao = KakaoPlacesService()
        self.db = db
    
    async def collect_places_by_region(
        self,
        region_name: str,
        center_lat: float,
        center_lng: float,
        categories: List[str]
    ):
        """
        특정 지역의 장소들을 수집
        
        Args:
            region_name: 지역명 (예: "강남구")
            center_lat: 중심 위도
            center_lng: 중심 경도
            categories: 수집할 카테고리 리스트
        """
        
        print(f"🔍 {region_name} 장소 수집 시작...")
        
        collected_count = 0
        
        for category in categories:
            print(f"  📂 카테고리: {category}")
            
            # Kakao API 검색
            query = f"{region_name} {category}"
            result = await self.kakao.search_places(
                query=query,
                x=center_lng,
                y=center_lat,
                radius=5000,
                size=15
            )
            
            places = result.get("documents", [])
            
            for kakao_place in places:
                try:
                    # 스키마 변환
                    place_data = self.kakao.map_to_our_schema(kakao_place)
                    
                    # 이미 존재하는지 확인
                    existing = await self.db.get_place_by_external_id(
                        place_data["external_id"],
                        "kakao"
                    )
                    
                    if existing:
                        print(f"    ⏭️  이미 존재: {place_data['name']}")
                        continue
                    
                    # AI로 vibe_tags 생성
                    vibe_tags = await self._generate_vibe_tags(place_data)
                    place_data["vibe_tags"] = vibe_tags
                    
                    # 기본값 설정
                    place_data["average_rating"] = 4.0
                    place_data["typical_crowd_level"] = "medium"
                    place_data["estimated_cost"] = self._estimate_cost(place_data["category"])
                    place_data["is_hidden_gem"] = False  # 나중에 리뷰 수 기반으로 판단
                    
                    # DB 저장
                    await self.db.insert_place(place_data)
                    
                    collected_count += 1
                    print(f"    ✅ 추가: {place_data['name']} ({', '.join(vibe_tags)})")
                    
                    # API 호출 제한 방지
                    await asyncio.sleep(0.5)
                
                except Exception as e:
                    print(f"    ❌ 오류: {kakao_place.get('place_name', 'Unknown')} - {e}")
                    continue
        
        print(f"✨ {region_name} 수집 완료: {collected_count}개 장소 추가\n")
        
        return collected_count
    
    async def _generate_vibe_tags(self, place_data: Dict) -> List[str]:
        """
        AI로 장소의 vibe_tags 생성
        """
        
        from anthropic import Anthropic
        
        try:
            client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            
            prompt = f"""
장소: {place_data['name']}
카테고리: {place_data['category']}
주소: {place_data['address']}

이 장소의 분위기를 나타내는 영어 태그 3-5개를 생성하세요.

사용 가능한 태그:
- cozy (아늑한)
- trendy (트렌디한)
- peaceful (평화로운)
- artistic (예술적인)
- vintage (빈티지)
- modern (현대적인)
- hidden (숨겨진)
- social (사교적인)
- quiet (조용한)
- vibrant (활기찬)
- romantic (로맨틱한)
- hipster (힙스터)
- traditional (전통적인)
- luxurious (고급스러운)
- casual (캐주얼한)

출력 형식: ["tag1", "tag2", "tag3"]
"""
            
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=100,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            tags_text = response.content[0].text.strip()
            tags = json.loads(tags_text)
            
            return tags[:5]  # 최대 5개
        
        except Exception as e:
            print(f"    ⚠️  AI vibe_tags 생성 실패, 기본값 사용: {e}")
            
            # 카테고리 기반 기본 태그
            default_tags = {
                "카페": ["cozy", "trendy", "social"],
                "맛집": ["vibrant", "social", "casual"],
                "갤러리": ["artistic", "peaceful", "modern"],
                "공원": ["peaceful", "natural", "quiet"],
                "바": ["social", "vibrant", "trendy"],
                "북카페": ["cozy", "quiet", "artistic"],
            }
            
            return default_tags.get(place_data["category"], ["trendy", "social", "casual"])
    
    def _estimate_cost(self, category: str) -> int:
        """
        카테고리 기반 예상 비용
        """
        
        cost_map = {
            "카페": 8000,
            "맛집": 15000,
            "갤러리": 5000,
            "공원": 0,
            "바": 20000,
            "북카페": 10000,
            "관광지": 10000,
        }
        
        return cost_map.get(category, 10000)
    
    async def daily_update(self):
        """
        매일 자동 실행: 신규 장소 추가, 폐업 체크
        """
        
        print("🔄 일일 장소 업데이트 시작...")
        
        # 서울 주요 지역
        regions = [
            {"name": "강남구", "lat": 37.4979, "lng": 127.0276},
            {"name": "마포구", "lat": 37.5663, "lng": 126.9019},
            {"name": "종로구", "lat": 37.5735, "lng": 126.9788},
            {"name": "성동구", "lat": 37.5633, "lng": 127.0371},
            {"name": "용산구", "lat": 37.5384, "lng": 126.9654},
        ]
        
        categories = ["카페", "맛집", "갤러리", "공원", "바", "북카페"]
        
        total_collected = 0
        
        for region in regions:
            count = await self.collect_places_by_region(
                region_name=region["name"],
                center_lat=region["lat"],
                center_lng=region["lng"],
                categories=categories
            )
            total_collected += count
            
            # API 호출 제한 방지
            await asyncio.sleep(2)
        
        print(f"✅ 일일 업데이트 완료: 총 {total_collected}개 장소 추가")
        
        return total_collected


# 서울 주요 지역 좌표
SEOUL_REGIONS = {
    "강남구": {"lat": 37.4979, "lng": 127.0276, "keywords": ["강남역", "신사동", "청담동", "압구정"]},
    "서초구": {"lat": 37.4837, "lng": 127.0324, "keywords": ["서초동", "반포동", "방배동"]},
    "송파구": {"lat": 37.5145, "lng": 127.1059, "keywords": ["잠실", "석촌동", "송파동"]},
    "강동구": {"lat": 37.5301, "lng": 127.1238, "keywords": ["천호동", "길동", "둔촌동"]},
    
    "마포구": {"lat": 37.5663, "lng": 126.9019, "keywords": ["홍대", "연남동", "합정", "상수"]},
    "서대문구": {"lat": 37.5791, "lng": 126.9368, "keywords": ["신촌", "이대", "연희동"]},
    "은평구": {"lat": 37.6027, "lng": 126.9292, "keywords": ["은평구청", "불광동", "응암동"]},
    
    "종로구": {"lat": 37.5735, "lng": 126.9788, "keywords": ["종로", "삼청동", "인사동", "북촌"]},
    "중구": {"lat": 37.5641, "lng": 126.9979, "keywords": ["명동", "을지로", "충무로", "남산"]},
    "용산구": {"lat": 37.5384, "lng": 126.9654, "keywords": ["이태원", "한남동", "용산역"]},
    
    "성동구": {"lat": 37.5633, "lng": 127.0371, "keywords": ["성수동", "왕십리", "금호동"]},
    "광진구": {"lat": 37.5384, "lng": 127.0822, "keywords": ["건대", "구의동", "광장동"]},
    "동대문구": {"lat": 37.5744, "lng": 127.0395, "keywords": ["회기동", "청량리", "이문동"]},
    
    "성북구": {"lat": 37.5894, "lng": 127.0167, "keywords": ["성북동", "정릉동", "길음동"]},
    "강북구": {"lat": 37.6398, "lng": 127.0256, "keywords": ["수유동", "미아동"]},
    "도봉구": {"lat": 37.6688, "lng": 127.0471, "keywords": ["쌍문동", "방학동"]},
    "노원구": {"lat": 37.6542, "lng": 127.0568, "keywords": ["노원역", "상계동", "중계동"]},
    
    "영등포구": {"lat": 37.5264, "lng": 126.8963, "keywords": ["여의도", "영등포", "당산"]},
    "동작구": {"lat": 37.5124, "lng": 126.9393, "keywords": ["사당", "흑석동", "노량진"]},
    "관악구": {"lat": 37.4784, "lng": 126.9516, "keywords": ["신림동", "봉천동"]},
    "구로구": {"lat": 37.4954, "lng": 126.8874, "keywords": ["구로디지털", "신도림", "개봉동"]},
    "금천구": {"lat": 37.4563, "lng": 126.8955, "keywords": ["가산디지털", "독산동"]},
    "양천구": {"lat": 37.5170, "lng": 126.8664, "keywords": ["목동", "신정동"]},
    "강서구": {"lat": 37.5509, "lng": 126.8495, "keywords": ["화곡동", "등촌동", "발산동"]},
}
