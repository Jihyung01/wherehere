"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";

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

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/api/v1';

// API Functions
async function fetchUserVisits(userId: string): Promise<Visit[]> {
  try {
    console.log('🔄 방문 기록 조회 중...', userId);
    const response = await fetch(`${API_BASE}/visits/${userId}`);
    if (!response.ok) {
      console.error('❌ API 에러:', response.status);
      throw new Error("Failed to fetch visits");
    }
    const data = await response.json();
    console.log('✅ 방문 기록 응답:', {
      total_count: data.total_count,
      visits_count: data.visits?.length || 0,
      sample: data.visits?.[0]
    });
    return data.visits || [];
  } catch (error) {
    console.error("Error fetching visits:", error);
    return [];
  }
}

async function fetchPatternAnalysis(userId: string) {
  try {
    const response = await fetch(`${API_BASE}/ai/pattern/analyze`, {
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
  const [tab, setTab] = useState("map");
  const [selectedVisit, setSelectedVisit] = useState<string | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [pattern, setPattern] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [kakaoLoaded, setKakaoLoaded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  const userId = "user-demo-001";

  // Load theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('isDarkMode');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'true');
    }
  }, []);

  // Load data
  useEffect(() => {
    loadData();
    // 자동 새로고침 제거 (토큰 절약)
  }, []);

  // Init Kakao Map
  useEffect(() => {
    if (kakaoLoaded && visits.length > 0 && mapContainerRef.current && tab === 'map') {
      initKakaoMap();
    }
  }, [kakaoLoaded, visits, tab, isDarkMode]);

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

  const initKakaoMap = () => {
    if (!window.kakao?.maps || !mapContainerRef.current) return;

    const centerLat = visits.reduce((sum, v) => sum + (v.latitude || 37.5665), 0) / visits.length;
    const centerLon = visits.reduce((sum, v) => sum + (v.longitude || 126.9780), 0) / visits.length;

    const map = new window.kakao.maps.Map(mapContainerRef.current, {
      center: new window.kakao.maps.LatLng(centerLat, centerLon),
      level: 5
    });
    mapRef.current = map;

    visits.forEach((visit) => {
      const markerPosition = new window.kakao.maps.LatLng(
        visit.latitude || 37.5665,
        visit.longitude || 126.9780
      );
      
      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
        map: map,
        title: visit.place_name
      });

      const infowindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:10px;min-width:150px;background:${isDarkMode ? '#0D1117' : '#FFF'};color:${isDarkMode ? '#fff' : '#1F2937'};border-radius:8px;border:1px solid #E8740C;"><div style="font-weight:700;margin-bottom:4px;">${visit.place_name}</div><div style="font-size:11px;color:${isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280'};">${visit.category}</div><div style="font-size:11px;color:#E8740C;margin-top:4px;">+${visit.xp_earned} XP</div></div>`
      });

      window.kakao.maps.event.addListener(marker, 'click', () => {
        infowindow.open(map, marker);
        setSelectedVisit(visit.id);
      });
    });

    if (visits.length > 1) {
      const path = visits.map(v => new window.kakao.maps.LatLng(v.latitude || 37.5665, v.longitude || 126.9780));
      const polyline = new window.kakao.maps.Polyline({
        path: path,
        strokeWeight: 3,
        strokeColor: '#E8740C',
        strokeOpacity: 0.7,
        strokeStyle: 'dashed'
      });
      polyline.setMap(map);
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

  const stats = pattern?.stats || { total_visits: 0, unique_places: 0, total_xp: 0 };
  const analysis = pattern?.analysis || {};
  const selectedData = visits.find(v => v.id === selectedVisit);

  const categoryStats = visits.reduce((acc: any, v) => {
    const cat = v.category || "기타";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const categoryStatsArray = Object.entries(categoryStats).map(([name, count]: [string, any]) => ({
    name, count,
    pct: Math.round((count / visits.length) * 100),
    color: ["#E8740C", "#8B5CF6", "#2D9F5D", "#E84393", "#D4A017", "#3B82F6"][Object.keys(categoryStats).indexOf(name) % 6]
  }));

  const tabs = [
    { id: "map", label: "지도", icon: "🗺️" },
    { id: "stats", label: "통계", icon: "📊" },
    { id: "style", label: "스타일", icon: "🎨" },
  ];

  return (
    <>
      <Script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=160238a590f3d2957230d764fb745322&autoload=false" strategy="afterInteractive"
        onLoad={() => { window.kakao?.maps?.load(() => setKakaoLoaded(true)); }} />
      
      <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif', position: "relative", overflow: "hidden" }}>
        
        {/* Header */}
        <div style={{ background: isDarkMode ? "linear-gradient(160deg, #0D1117 0%, #161B22 50%, #1A1D24 100%)" : "linear-gradient(160deg, #F9FAFB 0%, #FFF 50%, #F3F4F6 100%)", padding: "52px 20px 20px", borderBottom: `1px solid ${borderColor}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: isDarkMode ? "rgba(255,255,255,0.4)" : "#9CA3AF", letterSpacing: 2, fontWeight: 600, marginBottom: 4 }}>MY EXPLORATION</div>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>나의 지도</h1>
            </div>
            <div style={{ background: isDarkMode ? "linear-gradient(135deg, #E8740C20, #E8740C10)" : "linear-gradient(135deg, #FEF3C7, #FDE68A)", border: "1px solid #E8740C40", borderRadius: 12, padding: "8px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#E8740C" }}>{visits.length}</div>
              <div style={{ fontSize: 9, color: isDarkMode ? "rgba(255,255,255,0.5)" : "#78350F" }}>총 방문</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { label: "총 방문", value: `${stats.total_visits}곳`, sub: "이번 달" },
              { label: "탐험 반경", value: `${analysis.exploration_radius_km || 0}km`, sub: "평균 거리" },
              { label: "총 XP", value: `${stats.total_xp}`, sub: `+${stats.total_xp}` },
            ].map((s, i) => (
              <div key={i} style={{ background: cardBg, borderRadius: 12, padding: "12px 10px", textAlign: "center", border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: 9, color: isDarkMode ? "rgba(255,255,255,0.4)" : "#9CA3AF", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{s.value}</div>
                <div style={{ fontSize: 9, color: "#E8740C", marginTop: 2 }}>{s.sub}</div>
              </div>
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

          {/* MAP TAB */}
          {tab === "map" && (
            <div>
              {visits.length > 0 ? (
                <>
                  <div ref={mapContainerRef} style={{ width: "100%", height: 280, borderRadius: 16, border: `1px solid ${borderColor}`, marginBottom: 16, overflow: "hidden", boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.05)' }} />

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

                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: isDarkMode ? "rgba(255,255,255,0.8)" : "#374151" }}>최근 방문</div>
                  {visits.slice(0, 5).map((v, i) => (
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
                  ))}
                </>
              ) : (
                <div style={{ width: "100%", height: 280, borderRadius: 16, background: cardBg, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${borderColor}` }}>
                  <div style={{ textAlign: "center", color: isDarkMode ? "rgba(255,255,255,0.4)" : "#9CA3AF" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
                    <div style={{ fontSize: 14 }}>아직 방문 기록이 없어요</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>첫 탐험을 시작해보세요!</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STATS TAB */}
          {tab === "stats" && (
            <div>
              {categoryStatsArray.length > 0 && (
                <div style={{ background: cardBg, borderRadius: 16, padding: 20, marginBottom: 16, border: `1px solid ${borderColor}`, boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>카테고리 분포</div>
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
                  { label: "평균 체류", value: visits.length > 0 ? `${Math.round(visits.reduce((s, v) => s + v.duration_minutes, 0) / visits.length)}분` : "0분", icon: "⏱️", accent: "#3B82F6" },
                  { label: "평균 비용", value: visits.length > 0 ? `${Math.round(visits.reduce((s, v) => s + (v.spent_amount || 0), 0) / visits.length / 1000)}천원` : "0원", icon: "💰", accent: "#2D9F5D" },
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
