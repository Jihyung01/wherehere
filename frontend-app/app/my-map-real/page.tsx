"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useUser } from "@/hooks/useUser";

// Kakao Maps Type Declaration
declare global {
  interface Window {
    kakao: any;
  }
}

// Types
interface Visit {
  id: string;
  place_id: string;
  place_name: string;
  category: string;
  visited_at: string;
  duration_minutes: number;
  latitude: number;
  longitude: number;
  xp_earned: number;
  mood?: string;
  rating?: number;
  spent_amount?: number;
}

interface PatternAnalysis {
  dominant_style: string;
  favorite_categories: string[];
  preferred_time: string;
  avg_duration_minutes: number;
  exploration_radius_km: number;
}

interface Stats {
  total_visits: number;
  unique_places: number;
  total_xp: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** Haversine 거리 (km) */
function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** 방문 목록으로부터 실데이터 기반 통계 계산 (Nike Run Club 스타일) */
function computeStatsFromVisits(visits: Visit[]): {
  total_visits: number;
  unique_places: number;
  total_xp: number;
  cumulative_distance_km: number;
  exploration_radius_km: number;
  this_month_radius_km: number;
} {
  if (visits.length === 0) {
    return { total_visits: 0, unique_places: 0, total_xp: 0, cumulative_distance_km: 0, exploration_radius_km: 0, this_month_radius_km: 0 };
  }
  const total_xp = visits.reduce((s, v) => s + (v.xp_earned || 0), 0);
  const unique_places = new Set(visits.map((v) => v.place_id)).size;
  // 방문 시각 순 정렬 후 연속 구간 거리 합 = 누적 거리
  const sorted = [...visits].sort(
    (a, b) => new Date(a.visited_at).getTime() - new Date(b.visited_at).getTime()
  );
  let cumulative_distance_km = 0;
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    const lat1 = a.latitude ?? 37.5665;
    const lon1 = a.longitude ?? 126.978;
    const lat2 = b.latitude ?? 37.5665;
    const lon2 = b.longitude ?? 126.978;
    cumulative_distance_km += haversineKm(lat1, lon1, lat2, lon2);
  }
  // 탐험 반경: 모든 방문의 중심에서 가장 먼 방문까지 거리
  const centerLat = visits.reduce((s, v) => s + (v.latitude ?? 37.5665), 0) / visits.length;
  const centerLon = visits.reduce((s, v) => s + (v.longitude ?? 126.978), 0) / visits.length;
  let maxDistKm = 0;
  visits.forEach((v) => {
    const d = haversineKm(centerLat, centerLon, v.latitude ?? 37.5665, v.longitude ?? 126.978);
    if (d > maxDistKm) maxDistKm = d;
  });
  const now = new Date();
  const thisMonth = visits.filter((v) => {
    const d = new Date(v.visited_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  let this_month_radius_km = 0;
  if (thisMonth.length > 0) {
    const cLat = thisMonth.reduce((s, v) => s + (v.latitude ?? 37.5665), 0) / thisMonth.length;
    const cLon = thisMonth.reduce((s, v) => s + (v.longitude ?? 126.978), 0) / thisMonth.length;
    thisMonth.forEach((v) => {
      const d = haversineKm(cLat, cLon, v.latitude ?? 37.5665, v.longitude ?? 126.978);
      if (d > this_month_radius_km) this_month_radius_km = d;
    });
  }
  return {
    total_visits: visits.length,
    unique_places,
    total_xp,
    cumulative_distance_km: Math.round(cumulative_distance_km * 10) / 10,
    exploration_radius_km: Math.round(maxDistKm * 10) / 10,
    this_month_radius_km: Math.round(this_month_radius_km * 10) / 10,
  };
}

type TimeRange = "day" | "week" | "month" | "all";

function filterVisitsByRange(visits: Visit[], range: TimeRange): Visit[] {
  if (range === "all") return visits;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(todayStart);
  monthStart.setMonth(monthStart.getMonth() - 1);
  return visits.filter((v) => {
    const d = new Date(v.visited_at);
    if (range === "day") return d >= todayStart;
    if (range === "week") return d >= weekStart;
    if (range === "month") return d >= monthStart;
    return true;
  });
}

function getInsightFromVisits(visits: Visit[], range: TimeRange): string {
  if (visits.length === 0) {
    if (range === "day") return "오늘은 아직 방문 기록이 없어요. 첫 장소를 추천받아 보세요!";
    if (range === "week") return "이번 주에는 아직 방문이 없어요. 퀘스트를 완료하면 여기에 쌓여요.";
    if (range === "month") return "이번 달 탐험 기록을 쌓아보세요.";
    return "방문 기록을 쌓으면 AI가 당신의 패턴을 분석해드려요.";
  }
  const totalMin = visits.reduce((s, v) => s + v.duration_minutes, 0);
  const cats = visits.reduce((acc: Record<string, number>, v) => {
    const c = v.category || "기타";
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  const rangeLabel = range === "day" ? "오늘" : range === "week" ? "이번 주" : range === "month" ? "이번 달" : "전체";
  return `${rangeLabel} ${visits.length}곳을 방문했어요. 총 ${totalMin}분을 보내셨고, ${topCat} 비중이 높아요.`;
}

function getValueRedistributionTips(visits: Visit[], analysis: { favorite_categories?: string[] }): string[] {
  const tips: string[] = [];
  if (visits.length < 2) return ["더 다양한 장소를 방문하면 균형 잡힌 인사이트를 드릴 수 있어요."];
  const cats = visits.reduce((acc: Record<string, number>, v) => {
    const c = v.category || "기타";
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  const entries = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const topPct = entries[0] ? (entries[0][1] / visits.length) * 100 : 0;
  if (topPct > 60) {
    tips.push(`${entries[0][0]}에 집중하고 있어요. 공원·카페·맛집 등 다른 유형도 추천받아 보세요.`);
  }
  const hours = visits.map((v) => new Date(v.visited_at).getHours());
  const eveningCount = hours.filter((h) => h >= 17 && h < 21).length;
  const morningCount = hours.filter((h) => h >= 6 && h < 12).length;
  if (eveningCount < visits.length * 0.2 && visits.length >= 5) {
    tips.push("저녁 시간대 방문이 적어요. 야경·저녁 분위기 장소도 도전해보세요.");
  }
  if (morningCount < visits.length * 0.2 && visits.length >= 5) {
    tips.push("아침 시간 활용이 적어요. 브런치·조용한 카페 추천을 받아보세요.");
  }
  if (tips.length === 0) tips.push("다양한 시간대와 카테고리를 골고루 누리고 있어요. 좋은 균형이에요.");
  return tips;
}

// API Functions
async function fetchUserVisits(userId: string): Promise<Visit[]> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/visits/${userId}`);
    if (!response.ok) {
      console.error('[나의 지도] API 에러:', response.status);
      return [];
    }
    const data = await response.json();
    return data.visits || [];
  } catch (error) {
    console.error("[나의 지도] 조회 실패:", error);
    return [];
  }
}

async function fetchPatternAnalysis(userId: string) {
  try {
    const response = await fetch(`${API_BASE}/api/v1/ai/pattern/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, days: 90 })
    });
    if (!response.ok) throw new Error("Failed to fetch pattern");
    return await response.json();
  } catch (error) {
    console.error("Error fetching pattern:", error);
    return {
      analysis: {
        dominant_style: "탐험가",
        favorite_categories: [],
        preferred_time: "오후",
        avg_duration_minutes: 0,
        exploration_radius_km: 0
      },
      stats: { total_visits: 0, unique_places: 0, total_xp: 0 },
      ai_analysis: "데이터를 분석 중입니다..."
    };
  }
}

// Main Component
export default function MyMapReal() {
  const router = useRouter();
  const { user } = useUser();
  const [tab, setTab] = useState("map");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [selectedVisit, setSelectedVisit] = useState<string | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [pattern, setPattern] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [kakaoLoaded, setKakaoLoaded] = useState(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const userId = user?.id ?? "user-demo-001";

  const filteredVisits = useMemo(() => filterVisitsByRange(visits, timeRange), [visits, timeRange]);
  const computedStats = useMemo(() => computeStatsFromVisits(filteredVisits), [filteredVisits]);
  const periodInsight = useMemo(() => getInsightFromVisits(filteredVisits, timeRange), [filteredVisits, timeRange]);
  const valueTips = useMemo(() => getValueRedistributionTips(visits, pattern?.analysis || {}), [visits, pattern?.analysis]);

  // Load theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('isDarkMode');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'true');
    }
  }, []);

  // Load data when user id is available (실데이터 반영)
  useEffect(() => {
    loadData();
  }, [userId]);

  // 방문 추가 후 돌아왔을 때 통계 반영을 위해 포커스 시 재조회
  useEffect(() => {
    const onFocus = () => loadData();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [userId]);

  // 카카오맵 스크립트 로드 대기 (첫 로딩이 느리면 타임아웃으로 안내)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!kakaoLoaded) setMapLoadError('지도 로딩이 지연되고 있습니다. 배포 도메인이 카카오 개발자 콘솔 앱 키에 등록되어 있는지 확인해 주세요.');
    }, 15000);
    return () => clearTimeout(timeout);
  }, [kakaoLoaded]);

  // Init Kakao Map: 지도 탭일 때 표시. DOM 레이아웃 후 초기화 + relayout으로 그리기 보장
  useEffect(() => {
    if (!kakaoLoaded || !mapContainerRef.current || tab !== 'map') return;
    setMapLoadError(null);
    const t = setTimeout(() => {
      try {
        initKakaoMapWithVisits(filteredVisits);
        const m = mapRef.current;
        if (m && typeof m.relayout === 'function') {
          setTimeout(() => m.relayout(), 150);
        }
      } catch (e) {
        console.error('Kakao map init error:', e);
        setMapLoadError('지도를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
    }, 100);
    return () => clearTimeout(t);
  }, [kakaoLoaded, filteredVisits, tab, isDarkMode]);

  const loadData = async () => {
    setLoading(true);
    const [visitsData, patternData] = await Promise.all([
      fetchUserVisits(userId),
      fetchPatternAnalysis(userId)
    ]);
    setVisits(visitsData);
    setPattern(patternData);
    setLoading(false);
  };

  const initKakaoMapWithVisits = (visitsToShow: Visit[]) => {
    if (!window.kakao?.maps || !mapContainerRef.current) return;
    const el = mapContainerRef.current;
    if (!el || el.offsetWidth === 0 || el.offsetHeight === 0) return;
    while (el.firstChild) el.removeChild(el.firstChild);

    const hasVisits = visitsToShow.length > 0;
    const centerLat = hasVisits
      ? visitsToShow.reduce((sum, v) => sum + (v.latitude ?? 37.5665), 0) / visitsToShow.length
      : 37.5665;
    const centerLon = hasVisits
      ? visitsToShow.reduce((sum, v) => sum + (v.longitude ?? 126.978), 0) / visitsToShow.length
      : 126.978;

    const map = new window.kakao.maps.Map(mapContainerRef.current, {
      center: new window.kakao.maps.LatLng(centerLat, centerLon),
      level: hasVisits ? 6 : 8,
    });
    mapRef.current = map;

    if (hasVisits) {
      visitsToShow.forEach((visit) => {
        const markerPosition = new window.kakao.maps.LatLng(
          visit.latitude ?? 37.5665,
          visit.longitude ?? 126.978
        );
        const marker = new window.kakao.maps.Marker({
          position: markerPosition,
          map,
          title: visit.place_name,
        });
        const infowindow = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:10px;min-width:150px;background:${isDarkMode ? '#0D1117' : '#FFF'};color:${isDarkMode ? '#fff' : '#1F2937'};border-radius:8px;border:1px solid #E8740C;"><div style="font-weight:700;margin-bottom:4px;">${visit.place_name}</div><div style="font-size:11px;color:${isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280'};">${visit.category}</div><div style="font-size:11px;color:#E8740C;margin-top:4px;">+${visit.xp_earned} XP</div></div>`,
        });
        window.kakao.maps.event.addListener(marker, 'click', () => {
          infowindow.open(map, marker);
          setSelectedVisit(visit.id);
        });
      });

      const sortedByTime = [...visitsToShow].sort(
        (a, b) => new Date(a.visited_at).getTime() - new Date(b.visited_at).getTime()
      );
      if (sortedByTime.length > 1) {
        const path = sortedByTime.map(
          (v) => new window.kakao.maps.LatLng(v.latitude ?? 37.5665, v.longitude ?? 126.978)
        );
        const polyline = new window.kakao.maps.Polyline({
          path,
          strokeWeight: 4,
          strokeColor: '#E8740C',
          strokeOpacity: 0.85,
          strokeStyle: 'solid',
        });
        polyline.setMap(map);
      }
    }
  };

  const bgColor = isDarkMode ? '#0A0E14' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#1F2937';
  const cardBg = isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB';

  if (loading) {
    return (
      <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: bgColor, color: textColor, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>데이터를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  const analysis = pattern?.analysis || {};
  const selectedData = filteredVisits.find((v) => v.id === selectedVisit);
  const timeRangeLabels: { value: TimeRange; label: string }[] = [
    { value: "day", label: "오늘" },
    { value: "week", label: "이번 주" },
    { value: "month", label: "이번 달" },
    { value: "all", label: "전체" },
  ];

  const categoryStats = filteredVisits.reduce((acc: any, v) => {
    const cat = v.category || "기타";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const categoryStatsArray = Object.entries(categoryStats).map(([name, count]: [string, any]) => ({
    name, count,
    pct: filteredVisits.length > 0 ? Math.round((count / filteredVisits.length) * 100) : 0,
    color: ["#E8740C", "#8B5CF6", "#2D9F5D", "#E84393", "#D4A017", "#3B82F6"][Object.keys(categoryStats).indexOf(name) % 6]
  }));

  const tabs = [
    { id: "map", label: "지도", icon: "🗺️" },
    { id: "stats", label: "통계", icon: "📊" },
    { id: "style", label: "스타일", icon: "🎨" },
  ];

  return (
    <>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || '160238a590f3d2957230d764fb745322'}&autoload=false`}
        strategy="afterInteractive"
        onLoad={() => {
          if (window.kakao?.maps?.load) {
            window.kakao.maps.load(() => setKakaoLoaded(true));
          } else {
            setKakaoLoaded(true);
          }
        }}
        onError={() => setMapLoadError('지도 스크립트를 불러오지 못했습니다. 배포 도메인이 카카오맵 앱 키에 등록되어 있는지 확인해 주세요.')}
      />
      
      <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif', position: "relative", overflow: "hidden" }}>
        
        {/* Header */}
        <div style={{ background: isDarkMode ? "linear-gradient(160deg, #0D1117 0%, #161B22 50%, #1A1D24 100%)" : "linear-gradient(160deg, #F9FAFB 0%, #FFF 50%, #F3F4F6 100%)", padding: "52px 20px 20px", borderBottom: `1px solid ${borderColor}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: isDarkMode ? "rgba(255,255,255,0.4)" : "#9CA3AF", letterSpacing: 2, fontWeight: 600, marginBottom: 4 }}>MY EXPLORATION</div>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>나의 지도</h1>
            </div>
            <div style={{ background: isDarkMode ? "linear-gradient(135deg, #E8740C20, #E8740C10)" : "linear-gradient(135deg, #FEF3C7, #FDE68A)", border: "1px solid #E8740C40", borderRadius: 12, padding: "8px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#E8740C" }}>{computedStats.total_visits}</div>
              <div style={{ fontSize: 9, color: isDarkMode ? "rgba(255,255,255,0.5)" : "#78350F" }}>총 방문</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 16 }}>
            {[
              { label: "총 방문", value: `${computedStats.total_visits}곳`, sub: "고유 장소 " + computedStats.unique_places + "곳" },
              { label: "이번 달 탐험 반경", value: `${computedStats.this_month_radius_km}km`, sub: "전체 " + computedStats.exploration_radius_km + "km" },
              { label: "총 XP", value: `${computedStats.total_xp}`, sub: "+" + computedStats.total_xp },
            ].map((s, i) => (
              <div key={i} style={{ background: cardBg, borderRadius: 12, padding: "12px 10px", textAlign: "center", border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: 9, color: isDarkMode ? "rgba(255,255,255,0.4)" : "#9CA3AF", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{s.value}</div>
                <div style={{ fontSize: 9, color: "#E8740C", marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* 기간 선택: 하루/일주일/한달/전체 */}
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {timeRangeLabels.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTimeRange(value)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: timeRange === value ? "2px solid #E8740C" : `1px solid ${borderColor}`,
                  background: timeRange === value ? "rgba(232,116,12,0.12)" : cardBg,
                  color: timeRange === value ? "#E8740C" : isDarkMode ? "rgba(255,255,255,0.7)" : "#6B7280",
                  fontWeight: timeRange === value ? 700 : 500,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{ display: "flex", gap: 4, padding: "12px 20px", background: bgColor, borderBottom: `1px solid ${borderColor}`, position: "sticky", top: 0, zIndex: 10 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer", background: tab === t.id ? "rgba(232,116,12,0.15)" : "transparent", color: tab === t.id ? "#E8740C" : isDarkMode ? "rgba(255,255,255,0.4)" : "#9CA3AF", fontWeight: tab === t.id ? 700 : 500, fontSize: 12, transition: "all 0.2s ease", fontFamily: "inherit" }}>
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              <div style={{ marginTop: 2 }}>{t.label}</div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "16px 20px 100px" }}>

          {/* MAP TAB - 지도 항상 표시, Nike Run Club 스타일 누적거리/탐험반경 */}
          {tab === "map" && (
            <div>
              <div style={{ position: "relative", width: "100%", marginBottom: 16 }}>
                <div
                  ref={mapContainerRef}
                  style={{
                    width: "100%",
                    minHeight: 300,
                    height: 300,
                    borderRadius: 16,
                    border: `1px solid ${borderColor}`,
                    overflow: "hidden",
                    boxShadow: isDarkMode ? "none" : "0 2px 12px rgba(0,0,0,0.08)",
                    background: isDarkMode ? "#1a1d24" : "#e5e7eb",
                  }}
                />
                {!kakaoLoaded && !mapLoadError && (
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isDarkMode ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.9)", borderRadius: 16, color: isDarkMode ? "rgba(255,255,255,0.7)" : "#6b7280", fontSize: 14, pointerEvents: "none" }}>
                    지도 로딩 중...
                  </div>
                )}
                {mapLoadError && (
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, background: isDarkMode ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.98)", borderRadius: 16, color: isDarkMode ? "#fff" : "#374151", fontSize: 13, textAlign: "center", pointerEvents: "auto" }}>
                    <span style={{ marginBottom: 8 }}>⚠️</span>
                    <div style={{ marginBottom: 8 }}>{mapLoadError}</div>
                    <div style={{ fontSize: 11, opacity: 0.85 }}>배포 URL을 카카오 개발자 콘솔 → 앱 키 → Web → 사이트 도메인에 추가하면 해결됩니다.</div>
                  </div>
                )}
                {/* 안내: 주황 마커·선만 내 방문, 줌 아웃 시 보이는 다른 점은 카카오맵 기본 POI */}
                <div style={{ fontSize: 11, color: isDarkMode ? "rgba(255,255,255,0.5)" : "#9CA3AF", marginTop: 8, marginBottom: 4 }}>
                  주황색 마커와 선은 내 방문 기록입니다. 지도 위 다른 표시는 카카오맵 기본 정보입니다.
                </div>
                {/* Nike 스타일 누적거리/탐험반경 오버레이 */}
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    right: 12,
                    display: "flex",
                    gap: 10,
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      background: isDarkMode ? "rgba(10,14,20,0.92)" : "rgba(255,255,255,0.95)",
                      backdropFilter: "blur(12px)",
                      borderRadius: 14,
                      padding: "14px 12px",
                      border: `1px solid ${borderColor}`,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div style={{ fontSize: 10, color: isDarkMode ? "rgba(255,255,255,0.5)" : "#78716c", fontWeight: 600, marginBottom: 4 }}>누적 거리</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#E8740C", letterSpacing: "-0.5px" }}>{computedStats.cumulative_distance_km}<span style={{ fontSize: 14, fontWeight: 600, marginLeft: 2 }}>km</span></div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      background: isDarkMode ? "rgba(10,14,20,0.92)" : "rgba(255,255,255,0.95)",
                      backdropFilter: "blur(12px)",
                      borderRadius: 14,
                      padding: "14px 12px",
                      border: `1px solid ${borderColor}`,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div style={{ fontSize: 10, color: isDarkMode ? "rgba(255,255,255,0.5)" : "#78716c", fontWeight: 600, marginBottom: 4 }}>탐험 반경</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#0EA5E9", letterSpacing: "-0.5px" }}>{computedStats.exploration_radius_km}<span style={{ fontSize: 14, fontWeight: 600, marginLeft: 2 }}>km</span></div>
                  </div>
                </div>
                {filteredVisits.length === 0 && visits.length > 0 && (
                  <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, background: isDarkMode ? "rgba(10,14,20,0.9)" : "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderRadius: 12, padding: "12px 16px", border: `1px solid ${borderColor}`, textAlign: "center", pointerEvents: "none", fontSize: 12, color: isDarkMode ? "rgba(255,255,255,0.7)" : "#6B7280" }}>
                    선택한 기간({timeRangeLabels.find(t => t.value === timeRange)?.label})에 방문 기록이 없어요.
                  </div>
                )}
                {visits.length === 0 && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 12,
                      left: 12,
                      right: 12,
                      background: isDarkMode ? "rgba(10,14,20,0.95)" : "rgba(255,255,255,0.98)",
                      backdropFilter: "blur(12px)",
                      borderRadius: 12,
                      padding: "16px",
                      border: `1px solid ${borderColor}`,
                      textAlign: "center",
                      pointerEvents: "auto",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, color: isDarkMode ? "rgba(255,255,255,0.9)" : "#1c1917", marginBottom: 8 }}>
                      {user ? '방문 기록이 없어요' : '로그인이 필요해요'}
                    </div>
                    <div style={{ fontSize: 12, color: isDarkMode ? "rgba(255,255,255,0.5)" : "#78716c", lineHeight: 1.5, marginBottom: 12 }}>
                      {user ? (
                        <>
                          퀘스트를 완료하면 자동으로 기록됩니다.
                          <br />
                          <span style={{ fontSize: 11, opacity: 0.8 }}>
                            User ID: {userId.substring(0, 20)}...
                          </span>
                        </>
                      ) : (
                        '로그인하면 방문 기록을 저장할 수 있어요'
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push("/")}
                      style={{
                        padding: "10px 20px",
                        borderRadius: 10,
                        border: "none",
                        background: "linear-gradient(135deg, #E8740C, #F59E0B)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      첫 탐험 시작하기
                    </button>
                  </div>
                )}
              </div>

              {(visits.length > 0 || filteredVisits.length > 0) && (
                <>
                  {selectedData && (
                    <div style={{ background: isDarkMode ? "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))" : cardBg, borderRadius: 14, padding: 16, marginBottom: 16, border: `1px solid #E8740C30`, boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 10, color: "#E8740C", fontWeight: 600, marginBottom: 4 }}>{selectedData.category}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{selectedData.place_name}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: "#E8740C" }}>+{selectedData.xp_earned}</div>
                          <div style={{ fontSize: 9, color: isDarkMode ? "rgba(255,255,255,0.4)" : "#9CA3AF" }}>XP</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                        {[
                          { icon: "⏱️", text: `${selectedData.duration_minutes}분` },
                          { icon: "💰", text: selectedData.spent_amount ? `${(selectedData.spent_amount/1000).toFixed(0)}천원` : "무료" },
                          { icon: "⭐", text: selectedData.rating?.toString() || "-" },
                          { icon: "😊", text: selectedData.mood || "좋음" },
                        ].map((item, i) => (
                          <div key={i} style={{ fontSize: 11, color: isDarkMode ? "rgba(255,255,255,0.6)" : "#6B7280", display: "flex", gap: 4, alignItems: "center" }}>
                            <span style={{ fontSize: 12 }}>{item.icon}</span>{item.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: isDarkMode ? "rgba(255,255,255,0.8)" : "#374151" }}>최근 방문 {timeRange !== "all" && `(${timeRangeLabels.find(t => t.value === timeRange)?.label})`}</div>
                  {filteredVisits.length === 0 ? (
                    <div style={{ padding: "16px 0", color: isDarkMode ? "rgba(255,255,255,0.5)" : "#9CA3AF", fontSize: 12 }}>이 기간에 방문한 장소가 없어요.</div>
                  ) : (
                  filteredVisits.slice(0, 5).map((v, i) => (
                    <div key={v.id} onClick={() => setSelectedVisit(v.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${borderColor}`, cursor: "pointer", opacity: selectedVisit === v.id ? 1 : 0.7, transition: "opacity 0.2s" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: isDarkMode ? `linear-gradient(135deg, #E8740C30, #E8740C10)` : "linear-gradient(135deg, #FEF3C7, #FDE68A)", border: `1px solid #E8740C40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#E8740C" }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{v.place_name}</div>
                        <div style={{ fontSize: 10, color: isDarkMode ? "rgba(255,255,255,0.4)" : "#9CA3AF", marginTop: 2 }}>
                          {new Date(v.visited_at).toLocaleDateString('ko-KR')} · {v.duration_minutes}분 · {v.category}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#E8740C" }}>+{v.xp_earned}</div>
                    </div>
                  )))}
                </>
              )}
            </div>
          )}

          {/* STATS TAB */}
          {tab === "stats" && (
            <div>
              {/* AI 인사이트: 기간별 요약 + 서버 AI 분석 */}
              <div style={{ background: isDarkMode ? "linear-gradient(135deg, rgba(14,165,233,0.12), rgba(14,165,233,0.04))" : "linear-gradient(135deg, #ECFEFF, #CFFAFE)", borderRadius: 16, padding: 18, marginBottom: 16, border: "1px solid rgba(14,165,233,0.25)", boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 10, color: "#0EA5E9", fontWeight: 700, letterSpacing: 1.5, marginBottom: 8 }}>AI 인사이트</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: isDarkMode ? "rgba(255,255,255,0.95)" : "#0F172A", marginBottom: 8, lineHeight: 1.5 }}>{periodInsight}</div>
                {pattern?.ai_analysis && (
                  <div style={{ fontSize: 12, color: isDarkMode ? "rgba(255,255,255,0.65)" : "#475569", lineHeight: 1.6, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${borderColor}` }}>{pattern.ai_analysis}</div>
                )}
              </div>

              {/* 가치 재분배: 시간/카테고리 균형 제안 */}
              {valueTips.length > 0 && (
                <div style={{ background: isDarkMode ? "linear-gradient(135deg, rgba(232,116,12,0.1), rgba(232,116,12,0.04))" : "linear-gradient(135deg, #FFF7ED, #FFEDD5)", borderRadius: 16, padding: 18, marginBottom: 16, border: "1px solid rgba(232,116,12,0.25)", boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 10, color: "#E8740C", fontWeight: 700, letterSpacing: 1.5, marginBottom: 10 }}>가치 재분배 제안</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {valueTips.map((tip, i) => (
                      <div key={i} style={{ fontSize: 12, color: isDarkMode ? "rgba(255,255,255,0.8)" : "#374151", lineHeight: 1.5, padding: "10px 12px", background: isDarkMode ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.7)", borderRadius: 10, border: `1px solid ${borderColor}` }}>
                        {tip}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {categoryStatsArray.length > 0 && (
                <div style={{ background: cardBg, borderRadius: 16, padding: 20, marginBottom: 16, border: `1px solid ${borderColor}`, boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>카테고리 분포 {timeRange !== "all" && `(${timeRangeLabels.find(t => t.value === timeRange)?.label})`}</div>
                  <div>
                    {categoryStatsArray.map((c, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, fontSize: 11, color: isDarkMode ? "rgba(255,255,255,0.7)" : "#6B7280" }}>{c.name}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: isDarkMode ? "rgba(255,255,255,0.5)" : "#9CA3AF" }}>{c.count}회 ({c.pct}%)</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "평균 체류", value: filteredVisits.length > 0 ? `${Math.round(filteredVisits.reduce((s, v) => s + v.duration_minutes, 0) / filteredVisits.length)}분` : "0분", icon: "⏱️", accent: "#3B82F6" },
                  { label: "평균 비용", value: filteredVisits.length > 0 ? `${Math.round(filteredVisits.reduce((s, v) => s + (v.spent_amount || 0), 0) / filteredVisits.length / 1000)}천원` : "0원", icon: "💰", accent: "#2D9F5D" },
                  { label: "선호 시간", value: analysis.preferred_time || "오후", icon: "🕐", accent: "#8B5CF6" },
                  { label: "탐험 스타일", value: analysis.dominant_style || "초보", icon: "🎨", accent: "#E84393" },
                ].map((m, i) => (
                  <div key={i} style={{ background: cardBg, borderRadius: 14, padding: 16, border: `1px solid ${borderColor}`, boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: 16, marginBottom: 8 }}>{m.icon}</div>
                    <div style={{ fontSize: 9, color: isDarkMode ? "rgba(255,255,255,0.4)" : "#9CA3AF", marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: m.accent }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STYLE TAB */}
          {tab === "style" && (
            <div>
              <div style={{ background: isDarkMode ? "linear-gradient(160deg, #1A1D24, #0D1117)" : "linear-gradient(160deg, #FEF3C7, #FFF)", borderRadius: 20, padding: 24, marginBottom: 16, border: "1px solid rgba(232,116,12,0.15)", position: "relative", overflow: "hidden", boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(circle, #E8740C10, transparent)" }} />
                <div style={{ fontSize: 48, marginBottom: 8 }}>🎨</div>
                <div style={{ fontSize: 10, color: "#E8740C", fontWeight: 600, letterSpacing: 2, marginBottom: 4 }}>YOUR EXPLORATION STYLE</div>
                <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 12, background: "linear-gradient(90deg, #E8740C, #F59E0B)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{analysis.dominant_style || "탐험가"}</div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: isDarkMode ? "rgba(255,255,255,0.6)" : "#6B7280" }}>{pattern?.ai_analysis || "당신만의 탐험 스타일을 분석하고 있어요."}</div>
              </div>

              {/* 기간별 요약 인사이트 (스타일 탭) */}
              <div style={{ background: isDarkMode ? "linear-gradient(135deg, rgba(14,165,233,0.1), transparent)" : "linear-gradient(135deg, #ECFEFF, #F0F9FF)", borderRadius: 16, padding: 16, marginBottom: 16, border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: 10, color: "#0EA5E9", fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>이번 기간 요약</div>
                <div style={{ fontSize: 13, color: isDarkMode ? "rgba(255,255,255,0.85)" : "#334155", lineHeight: 1.5 }}>{periodInsight}</div>
              </div>

              {/* 가치 재분배 (스타일 탭) */}
              {valueTips.length > 0 && (
                <div style={{ background: isDarkMode ? "linear-gradient(135deg, rgba(232,116,12,0.08), transparent)" : "linear-gradient(135deg, #FFF7ED, #FFFBEB)", borderRadius: 16, padding: 16, marginBottom: 16, border: `1px solid ${borderColor}` }}>
                  <div style={{ fontSize: 10, color: "#E8740C", fontWeight: 700, letterSpacing: 1.5, marginBottom: 8 }}>가치 재분배 제안</div>
                  {valueTips.slice(0, 3).map((tip, i) => (
                    <div key={i} style={{ fontSize: 12, color: isDarkMode ? "rgba(255,255,255,0.75)" : "#475569", marginBottom: 6, paddingLeft: 12, borderLeft: "3px solid #E8740C" }}>{tip}</div>
                  ))}
                </div>
              )}

              {analysis.favorite_categories && analysis.favorite_categories.length > 0 && (
                <div style={{ background: cardBg, borderRadius: 16, padding: 20, border: `1px solid ${borderColor}`, boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>📊 선호 카테고리</div>
                  {analysis.favorite_categories.map((cat: string, i: number) => (
                    <div key={i} style={{ fontSize: 12, color: isDarkMode ? "rgba(255,255,255,0.7)" : "#6B7280", padding: "8px 0", display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ color: "#E8740C", fontSize: 14 }}>•</span>{cat}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Nav */}
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: isDarkMode ? "rgba(10,14,20,0.95)" : "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", borderTop: `1px solid ${borderColor}`, display: "flex", padding: "8px 0 24px", zIndex: 100, boxShadow: isDarkMode ? 'none' : '0 -2px 10px rgba(0,0,0,0.05)' }}>
          {[
            { icon: "🏠", label: "홈", path: "/" },
            { icon: "🗺️", label: "나의 지도", path: "/my-map-real", active: true },
            { icon: "💬", label: "소셜", path: "/" },
            { icon: "🎯", label: "챌린지", path: "/" },
            { icon: "👤", label: "프로필", path: "/" },
            { icon: "⚙️", label: "설정", path: "/" },
          ].map((n, i) => (
            <div key={i} onClick={() => router.push(n.path)} style={{ flex: 1, textAlign: "center", cursor: "pointer", opacity: n.active ? 1 : 0.7, transition: "opacity 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = n.active ? '1' : '0.7'}>
              <div style={{ fontSize: 20 }}>{n.icon}</div>
              <div style={{ fontSize: 9, marginTop: 2, color: n.active ? "#E8740C" : textColor, fontWeight: n.active ? 700 : 400 }}>{n.label}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
