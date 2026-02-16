"use client";

import { useState, useEffect, useRef } from "react";

// ─── Mock Data ───────────────────────────────────
const VISIT_DATA = [
  { id: 1, name: "연남동 책방 카페", category: "북카페", date: "2월 14일", time: "14:30", duration: 85, lat: 37.5656, lon: 126.9254, xp: 150, mood: "호기심", vibe: ["cozy","quiet"], cost: 8000, rating: 4.8, color: "#E8740C" },
  { id: 2, name: "빈티지 레코드 카페", category: "카페", date: "2월 13일", time: "15:00", duration: 60, lat: 37.5563, lon: 126.9240, xp: 120, mood: "행복", vibe: ["vintage","music"], cost: 7000, rating: 4.7, color: "#8B5CF6" },
  { id: 3, name: "한남동 숨은 정원", category: "공원", date: "2월 12일", time: "11:00", duration: 45, lat: 37.5347, lon: 127.0023, xp: 100, mood: "평온", vibe: ["peaceful","nature"], cost: 0, rating: 4.9, color: "#2D9F5D" },
  { id: 4, name: "성수 공장 카페", category: "카페", date: "2월 11일", time: "16:30", duration: 70, lat: 37.5445, lon: 127.0557, xp: 130, mood: "활기찬", vibe: ["industrial","modern"], cost: 12000, rating: 4.6, color: "#E84393" },
  { id: 5, name: "삼청동 갤러리 카페", category: "갤러리", date: "2월 10일", time: "13:00", duration: 90, lat: 37.5858, lon: 126.9823, xp: 200, mood: "영감", vibe: ["artistic","elegant"], cost: 13000, rating: 4.6, color: "#D4A017" },
  { id: 6, name: "을지로 루프탑 바", category: "이색장소", date: "2월 9일", time: "18:30", duration: 120, lat: 37.5665, lon: 126.9910, xp: 180, mood: "설렘", vibe: ["trendy","scenic"], cost: 35000, rating: 4.7, color: "#E8740C" },
  { id: 7, name: "한옥 티하우스", category: "북카페", date: "2월 8일", time: "10:30", duration: 65, lat: 37.5826, lon: 126.9849, xp: 140, mood: "평온", vibe: ["traditional","zen"], cost: 9000, rating: 4.7, color: "#2D9F5D" },
  { id: 8, name: "아트 스트리트 벽화골목", category: "이색장소", date: "2월 7일", time: "15:00", duration: 40, lat: 37.5547, lon: 126.9198, xp: 110, mood: "호기심", vibe: ["artistic","colorful"], cost: 0, rating: 4.4, color: "#8B5CF6" },
];

const STYLE_REPORT = {
  type: "감성 큐레이터",
  emoji: "🎨",
  description: "조용한 공간에서 영감을 찾는 감성 큐레이터. 트렌디한 곳보다 숨겨진 보석 같은 장소를 선호하며, 카페와 갤러리에서 자신만의 시간을 보내는 것을 좋아합니다.",
  patterns: {
    preferred_category: "카페/북카페",
    preferred_category_pct: 62,
    preferred_time: "오후 2-5시",
    avg_duration: 72,
    avg_budget: 12000,
    favorite_vibes: ["cozy", "artistic", "quiet"],
    exploration_radius: 4.8,
  },
  recommendations: [
    { name: "이태원 루프탑 서점", match: 94, reason: "갤러리+카페 조합, 당신의 최적 패턴" },
    { name: "서촌 독립서점", match: 91, reason: "조용한 분위기, 평균 체류 시간 일치" },
    { name: "성수 복합문화공간", match: 87, reason: "예술+커피, 새로운 영감 충전" },
  ],
  funFacts: [
    "주로 토요일 오후에 탐험합니다",
    "카페에서 평균 1시간 12분을 보냅니다",
    "히든 스팟 발견율 상위 8%",
    "7일 연속 스트릭 달성 중 🔥",
  ],
};

const CATEGORY_STATS = [
  { name: "카페", count: 12, pct: 38, color: "#E8740C" },
  { name: "갤러리", count: 5, pct: 16, color: "#8B5CF6" },
  { name: "공원", count: 4, pct: 13, color: "#2D9F5D" },
  { name: "이색장소", count: 5, pct: 16, color: "#E84393" },
  { name: "북카페", count: 3, pct: 10, color: "#D4A017" },
  { name: "맛집", count: 2, pct: 7, color: "#3B82F6" },
];

const ACHIEVEMENTS = [
  { icon: "🗺️", name: "마포 탐험가", desc: "마포구 5곳 방문", unlocked: true },
  { icon: "☕", name: "카페 러버", desc: "카페 10곳 방문", unlocked: true },
  { icon: "🔥", name: "7일 스트릭", desc: "연속 7일 탐험", unlocked: true },
  { icon: "🌙", name: "야경 헌터", desc: "석양 이후 3곳 방문", unlocked: true },
  { icon: "🏔️", name: "강남 마스터", desc: "강남구 10곳 방문", unlocked: false, progress: 7 },
  { icon: "📸", name: "포토그래퍼", desc: "사진 50장 촬영", unlocked: false, progress: 34 },
];

const WEEKLY_DATA = [
  { day: "월", visits: 1 }, { day: "화", visits: 0 }, { day: "수", visits: 2 },
  { day: "목", visits: 1 }, { day: "금", visits: 1 }, { day: "토", visits: 3 },
  { day: "일", visits: 2 },
];

// ─── Components ──────────────────────────────────

function MapView({ visits, selectedVisit, onSelect }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const W = canvas.width = canvas.offsetWidth * 2;
    const H = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const w = W / 2, h = H / 2;

    // Normalize coords
    const lats = visits.map((v: any) => v.lat);
    const lons = visits.map((v: any) => v.lon);
    const minLat = Math.min(...lats) - 0.008, maxLat = Math.max(...lats) + 0.008;
    const minLon = Math.min(...lons) - 0.012, maxLon = Math.max(...lons) + 0.012;
    const toX = (lon: number) => ((lon - minLon) / (maxLon - minLon)) * (w - 60) + 30;
    const toY = (lat: number) => (1 - (lat - minLat) / (maxLat - minLat)) * (h - 60) + 30;

    // Background
    ctx.fillStyle = "#0D1117";
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < w; i += 30) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
    }
    for (let i = 0; i < h; i += 30) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
    }

    // Heatmap glow
    visits.forEach((v: any) => {
      const x = toX(v.lon), y = toY(v.lat);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 40);
      grad.addColorStop(0, v.color + "30");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(x - 40, y - 40, 80, 80);
    });

    // Path lines
    ctx.beginPath();
    ctx.strokeStyle = "rgba(232,116,12,0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    visits.forEach((v: any, i: number) => {
      const x = toX(v.lon), y = toY(v.lat);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Markers
    visits.forEach((v: any, i: number) => {
      const x = toX(v.lon), y = toY(v.lat);
      const isSelected = selectedVisit === v.id;
      const size = isSelected ? 10 : 7;

      // Outer ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.strokeStyle = v.color + "60";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Dot
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = v.color;
      ctx.fill();
      ctx.strokeStyle = "#0D1117";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Number
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${isSelected ? 9 : 7}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText((i + 1).toString(), x, y);

      // Label for selected
      if (isSelected) {
        const labelW = ctx.measureText(v.name).width + 16;
        ctx.fillStyle = "rgba(13,17,23,0.92)";
        roundRect(ctx, x - labelW / 2, y - 32, labelW, 20, 6);
        ctx.fill();
        ctx.strokeStyle = v.color + "80";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px sans-serif";
        ctx.fillText(v.name, x, y - 22);
      }
    });

    // Legend
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("서울 탐험 경로", 12, h - 10);

  }, [visits, selectedVisit]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const lats = visits.map((v: any) => v.lat);
    const lons = visits.map((v: any) => v.lon);
    const minLat = Math.min(...lats) - 0.008, maxLat = Math.max(...lats) + 0.008;
    const minLon = Math.min(...lons) - 0.012, maxLon = Math.max(...lons) + 0.012;
    const w = rect.width, h = rect.height;
    const toX = (lon: number) => ((lon - minLon) / (maxLon - minLon)) * (w - 60) + 30;
    const toY = (lat: number) => (1 - (lat - minLat) / (maxLat - minLat)) * (h - 60) + 30;
    
    for (const v of visits) {
      const vx = toX(v.lon), vy = toY(v.lat);
      if (Math.sqrt((x - vx) ** 2 + (y - vy) ** 2) < 20) {
        onSelect(v.id === selectedVisit ? null : v.id);
        return;
      }
    }
    onSelect(null);
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{ width: "100%", height: 280, borderRadius: 16, cursor: "pointer", display: "block" }}
    />
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function DonutChart({ data }: any) {
  const total = data.reduce((s: number, d: any) => s + d.count, 0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    canvas.width = 240; canvas.height = 240;
    const cx = 120, cy = 120, R = 90, r = 55;

    ctx.clearRect(0, 0, 240, 240);
    let angle = -Math.PI / 2;
    data.forEach((d: any) => {
      const slice = (d.count / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, angle, angle + slice);
      ctx.arc(cx, cy, r, angle + slice, angle, true);
      ctx.closePath();
      ctx.fillStyle = d.color;
      ctx.fill();
      angle += slice;
    });

    ctx.fillStyle = "#0F1419";
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(total.toString(), cx, cy - 6);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "11px sans-serif";
    ctx.fillText("방문", cx, cy + 14);
  }, [data, total]);

  return <canvas ref={canvasRef} style={{ width: 120, height: 120 }} />;
}

function WeeklyChart({ data }: any) {
  const max = Math.max(...data.map((d: any) => d.visits), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80, padding: "0 4px" }}>
      {data.map((d: any, i: number) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{
            width: "100%", maxWidth: 28, height: Math.max(d.visits / max * 52, 4),
            background: d.visits > 0
              ? `linear-gradient(180deg, #E8740C, #E8740C${d.visits >= 2 ? '' : '80'})`
              : "rgba(255,255,255,0.08)",
            borderRadius: 4, transition: "height 0.4s ease",
          }} />
          <span style={{ fontSize: 10, color: d.visits > 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)" }}>
            {d.day}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ────────────────────────────────────

export default function WhereHereMyMap() {
  const [tab, setTab] = useState("map");
  const [selectedVisit, setSelectedVisit] = useState<number | null>(null);

  const totalXP = VISIT_DATA.reduce((s, v) => s + v.xp, 0);
  const totalCost = VISIT_DATA.reduce((s, v) => s + v.cost, 0);
  const totalDuration = VISIT_DATA.reduce((s, v) => s + v.duration, 0);
  const selectedData = VISIT_DATA.find(v => v.id === selectedVisit);

  const tabs = [
    { id: "map", label: "지도", icon: "🗺️" },
    { id: "stats", label: "통계", icon: "📊" },
    { id: "style", label: "스타일", icon: "🎨" },
    { id: "timeline", label: "타임라인", icon: "📅" },
  ];

  return (
    <div style={{
      maxWidth: 430, margin: "0 auto", minHeight: "100vh",
      background: "#0A0E14", color: "#fff",
      fontFamily: "'Pretendard', 'Noto Sans KR', -apple-system, sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;900&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(232,116,12,0.2); } 50% { box-shadow: 0 0 30px rgba(232,116,12,0.4); } }
        @keyframes countUp { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(160deg, #0D1117 0%, #161B22 50%, #1A1D24 100%)",
        padding: "52px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 2, fontWeight: 600, marginBottom: 4 }}>
              MY EXPLORATION
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>
              나의 지도
            </h1>
          </div>
          <div style={{
            background: "linear-gradient(135deg, #E8740C20, #E8740C10)",
            border: "1px solid #E8740C40",
            borderRadius: 12, padding: "8px 14px", textAlign: "center",
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#E8740C" }}>8</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>이번 주</div>
          </div>
        </div>

        {/* Summary Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[
            { label: "총 방문", value: `${VISIT_DATA.length}곳`, sub: "이번 달" },
            { label: "총 거리", value: "4.8km", sub: "탐험 반경" },
            { label: "총 XP", value: `${totalXP}`, sub: "+1,130" },
          ].map((s, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.03)", borderRadius: 12,
              padding: "12px 10px", textAlign: "center",
              border: "1px solid rgba(255,255,255,0.05)",
              animation: `fadeUp 0.4s ease ${i * 0.1}s both`,
            }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
              <div style={{ fontSize: 9, color: "#E8740C", marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{
        display: "flex", gap: 4, padding: "12px 20px",
        background: "#0D1117", borderBottom: "1px solid rgba(255,255,255,0.04)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer",
            background: tab === t.id ? "rgba(232,116,12,0.15)" : "transparent",
            color: tab === t.id ? "#E8740C" : "rgba(255,255,255,0.4)",
            fontWeight: tab === t.id ? 700 : 500, fontSize: 12,
            transition: "all 0.2s ease",
            fontFamily: "inherit",
          }}>
            <span style={{ fontSize: 14 }}>{t.icon}</span>
            <div style={{ marginTop: 2 }}>{t.label}</div>
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "16px 20px 100px" }}>

        {/* MAP TAB */}
        {tab === "map" && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            {/* Map */}
            <div style={{
              borderRadius: 16, overflow: "hidden", marginBottom: 16,
              border: "1px solid rgba(255,255,255,0.06)",
              animation: "glow 3s ease infinite",
            }}>
              <MapView visits={VISIT_DATA} selectedVisit={selectedVisit} onSelect={setSelectedVisit} />
            </div>

            {/* Selected Place Detail */}
            {selectedData && (
              <div style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                borderRadius: 14, padding: 16, marginBottom: 16,
                border: `1px solid ${selectedData.color}30`,
                animation: "fadeUp 0.25s ease",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 10, color: selectedData.color, fontWeight: 600, marginBottom: 4 }}>
                      {selectedData.category}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{selectedData.name}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {selectedData.vibe.map((v, i) => (
                        <span key={i} style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 20,
                          background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)",
                        }}>{v}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#E8740C", fontFamily: "'JetBrains Mono'" }}>
                      +{selectedData.xp}
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>XP</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                  {[
                    { icon: "⏱️", text: `${selectedData.duration}분` },
                    { icon: "💰", text: selectedData.cost > 0 ? `${(selectedData.cost/1000).toFixed(0)}천원` : "무료" },
                    { icon: "⭐", text: selectedData.rating.toString() },
                    { icon: "😊", text: selectedData.mood },
                  ].map((item, i) => (
                    <div key={i} style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ fontSize: 12 }}>{item.icon}</span>{item.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent visits list */}
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "rgba(255,255,255,0.8)" }}>
              최근 방문
            </div>
            {VISIT_DATA.slice(0, 4).map((v, i) => (
              <div key={v.id} onClick={() => { setSelectedVisit(v.id); }}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
                  cursor: "pointer", animation: `slideIn 0.3s ease ${i * 0.05}s both`,
                  opacity: selectedVisit === v.id ? 1 : 0.7,
                  transition: "opacity 0.2s",
                }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `linear-gradient(135deg, ${v.color}30, ${v.color}10)`,
                  border: `1px solid ${v.color}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800, color: v.color,
                  fontFamily: "'JetBrains Mono'",
                }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{v.name}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                    {v.date} {v.time} · {v.duration}분 · {v.category}
                  </div>
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: "#E8740C",
                  fontFamily: "'JetBrains Mono'",
                }}>+{v.xp}</div>
              </div>
            ))}
          </div>
        )}

        {/* STATS TAB */}
        {tab === "stats" && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            {/* Weekly Activity */}
            <div style={{
              background: "rgba(255,255,255,0.03)", borderRadius: 16,
              padding: 20, marginBottom: 16,
              border: "1px solid rgba(255,255,255,0.05)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>이번 주 활동</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>총 10회 방문</div>
              <WeeklyChart data={WEEKLY_DATA} />
            </div>

            {/* Category Distribution */}
            <div style={{
              background: "rgba(255,255,255,0.03)", borderRadius: 16,
              padding: 20, marginBottom: 16,
              border: "1px solid rgba(255,255,255,0.05)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>카테고리 분포</div>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <DonutChart data={CATEGORY_STATS} />
                <div style={{ flex: 1 }}>
                  {CATEGORY_STATS.map((c, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      marginBottom: 8, animation: `slideIn 0.3s ease ${i * 0.05}s both`,
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{c.name}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono'", color: "rgba(255,255,255,0.5)" }}>
                        {c.pct}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "평균 체류", value: `${Math.round(totalDuration / VISIT_DATA.length)}분`, icon: "⏱️", accent: "#3B82F6" },
                { label: "평균 비용", value: `${Math.round(totalCost / VISIT_DATA.length / 1000)}천원`, icon: "💰", accent: "#2D9F5D" },
                { label: "선호 시간", value: "오후 2-5시", icon: "🕐", accent: "#8B5CF6" },
                { label: "선호 요일", value: "토요일", icon: "📅", accent: "#E84393" },
              ].map((m, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.03)", borderRadius: 14,
                  padding: 16, border: "1px solid rgba(255,255,255,0.05)",
                  animation: `fadeUp 0.4s ease ${i * 0.08}s both`,
                }}>
                  <div style={{ fontSize: 16, marginBottom: 8 }}>{m.icon}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: m.accent }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Achievements */}
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🏆 뱃지 컬렉션</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {ACHIEVEMENTS.map((a, i) => (
                <div key={i} style={{
                  background: a.unlocked ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.015)",
                  borderRadius: 14, padding: 14, textAlign: "center",
                  border: a.unlocked ? "1px solid rgba(232,116,12,0.2)" : "1px solid rgba(255,255,255,0.04)",
                  opacity: a.unlocked ? 1 : 0.5,
                  animation: `fadeUp 0.3s ease ${i * 0.05}s both`,
                }}>
                  <div style={{ fontSize: 24, marginBottom: 6, filter: a.unlocked ? "none" : "grayscale(1)" }}>
                    {a.icon}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 2 }}>{a.name}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>
                    {a.unlocked ? "달성!" : `${a.progress || 0}/${a.desc.match(/\d+/)?.[0] || '?'}`}
                  </div>
                  {!a.unlocked && a.progress && (
                    <div style={{
                      height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2,
                      marginTop: 6, overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%", borderRadius: 2,
                        background: "#E8740C",
                        width: `${(a.progress / parseInt(a.desc.match(/\d+/)?.[0] || "1")) * 100}%`,
                      }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STYLE TAB */}
        {tab === "style" && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            {/* Style Card */}
            <div style={{
              background: "linear-gradient(160deg, #1A1D24, #0D1117)",
              borderRadius: 20, padding: 24, marginBottom: 16,
              border: "1px solid rgba(232,116,12,0.15)",
              position: "relative", overflow: "hidden",
            }}>
              {/* Background decoration */}
              <div style={{
                position: "absolute", top: -30, right: -30,
                width: 140, height: 140, borderRadius: "50%",
                background: "radial-gradient(circle, #E8740C10, transparent)",
              }} />
              <div style={{
                fontSize: 48, marginBottom: 8,
                animation: "countUp 0.5s ease both",
              }}>{STYLE_REPORT.emoji}</div>
              <div style={{
                fontSize: 10, color: "#E8740C", fontWeight: 600,
                letterSpacing: 2, marginBottom: 4,
              }}>YOUR EXPLORATION STYLE</div>
              <div style={{
                fontSize: 26, fontWeight: 900, marginBottom: 12,
                background: "linear-gradient(90deg, #fff, #E8740C)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>{STYLE_REPORT.type}</div>
              <div style={{
                fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.6)",
              }}>{STYLE_REPORT.description}</div>
            </div>

            {/* Pattern Insights */}
            <div style={{
              background: "rgba(255,255,255,0.03)", borderRadius: 16,
              padding: 20, marginBottom: 16,
              border: "1px solid rgba(255,255,255,0.05)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>📊 나의 패턴</div>
              {[
                { label: "선호 카테고리", value: STYLE_REPORT.patterns.preferred_category, bar: STYLE_REPORT.patterns.preferred_category_pct },
                { label: "선호 시간대", value: STYLE_REPORT.patterns.preferred_time, bar: 78 },
                { label: "평균 체류", value: `${STYLE_REPORT.patterns.avg_duration}분`, bar: 60 },
                { label: "탐험 반경", value: `${STYLE_REPORT.patterns.exploration_radius}km`, bar: 48 },
              ].map((p, i) => (
                <div key={i} style={{ marginBottom: 14, animation: `slideIn 0.3s ease ${i * 0.08}s both` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{p.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>{p.value}</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 2,
                      background: "linear-gradient(90deg, #E8740C, #D4A017)",
                      width: `${p.bar}%`, transition: "width 0.8s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* AI Recommendations */}
            <div style={{
              background: "rgba(255,255,255,0.03)", borderRadius: 16,
              padding: 20, marginBottom: 16,
              border: "1px solid rgba(255,255,255,0.05)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>🎯 AI 추천 장소</div>
              {STYLE_REPORT.recommendations.map((r, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 0",
                  borderBottom: i < STYLE_REPORT.recommendations.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  animation: `slideIn 0.3s ease ${i * 0.1}s both`,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `linear-gradient(135deg, #E8740C${30 - i * 8}, #E8740C${10 - i * 2})`,
                    border: "1px solid #E8740C30",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, fontWeight: 900, color: "#E8740C",
                    fontFamily: "'JetBrains Mono'",
                  }}>{r.match}%</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                      {r.reason}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Fun Facts */}
            <div style={{
              background: "linear-gradient(135deg, #E8740C10, #E8740C05)",
              borderRadius: 16, padding: 20,
              border: "1px solid #E8740C20",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>💡 재미있는 사실</div>
              {STYLE_REPORT.funFacts.map((f, i) => (
                <div key={i} style={{
                  fontSize: 12, color: "rgba(255,255,255,0.7)",
                  padding: "6px 0", display: "flex", gap: 8, alignItems: "center",
                  animation: `fadeUp 0.3s ease ${i * 0.1}s both`,
                }}>
                  <span style={{ color: "#E8740C", fontSize: 14 }}>•</span>
                  {f}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TIMELINE TAB */}
        {tab === "timeline" && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            {/* Period selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {["이번 주", "이번 달", "전체"].map((p, i) => (
                <button key={p} style={{
                  padding: "6px 14px", borderRadius: 20, border: "none",
                  background: i === 0 ? "#E8740C" : "rgba(255,255,255,0.06)",
                  color: i === 0 ? "#fff" : "rgba(255,255,255,0.5)",
                  fontSize: 11, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit",
                }}>{p}</button>
              ))}
            </div>

            {/* Timeline */}
            {VISIT_DATA.map((v, i) => (
              <div key={v.id} style={{
                display: "flex", gap: 16, marginBottom: 0,
                animation: `fadeUp 0.3s ease ${i * 0.06}s both`,
              }}>
                {/* Timeline line */}
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  width: 32, flexShrink: 0,
                }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: "50%",
                    background: v.color, border: "2px solid #0A0E14",
                    zIndex: 1, marginTop: 16,
                  }} />
                  {i < VISIT_DATA.length - 1 && (
                    <div style={{
                      width: 1, flex: 1,
                      background: `linear-gradient(180deg, ${v.color}40, rgba(255,255,255,0.04))`,
                    }} />
                  )}
                </div>

                {/* Content */}
                <div style={{
                  flex: 1, paddingBottom: 20,
                }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4, marginTop: 4 }}>
                    {v.date} · {v.time}
                  </div>
                  <div style={{
                    background: "rgba(255,255,255,0.03)", borderRadius: 14,
                    padding: 14, border: "1px solid rgba(255,255,255,0.05)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{v.name}</div>
                        <div style={{
                          fontSize: 10, color: v.color, fontWeight: 600, marginTop: 3,
                          display: "inline-block", padding: "1px 8px", borderRadius: 6,
                          background: `${v.color}15`,
                        }}>{v.category}</div>
                      </div>
                      <div style={{
                        fontSize: 14, fontWeight: 800, color: "#E8740C",
                        fontFamily: "'JetBrains Mono'",
                      }}>+{v.xp}</div>
                    </div>
                    <div style={{
                      display: "flex", gap: 10, marginTop: 10,
                      flexWrap: "wrap",
                    }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>⏱ {v.duration}분</span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
                        💰 {v.cost > 0 ? `${(v.cost/1000).toFixed(0)}천원` : "무료"}
                      </span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>⭐ {v.rating}</span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>😊 {v.mood}</span>
                    </div>
                    {/* Vibe tags */}
                    <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                      {v.vibe.map((tag, ti) => (
                        <span key={ti} style={{
                          fontSize: 9, padding: "2px 7px", borderRadius: 8,
                          background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)",
                        }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom Nav ── */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 430,
        background: "rgba(10,14,20,0.95)", backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", padding: "8px 0 24px",
      }}>
        {[
          { icon: "🏠", label: "홈", active: false },
          { icon: "🗺️", label: "나의 지도", active: true },
          { icon: "🧭", label: "탐험", active: false },
          { icon: "🤝", label: "소셜", active: false },
          { icon: "👤", label: "프로필", active: false },
        ].map((n, i) => (
          <div key={i} style={{
            flex: 1, textAlign: "center", cursor: "pointer",
            opacity: n.active ? 1 : 0.4,
          }}>
            <div style={{ fontSize: 20 }}>{n.icon}</div>
            <div style={{
              fontSize: 9, marginTop: 2,
              color: n.active ? "#E8740C" : "#fff",
              fontWeight: n.active ? 700 : 400,
            }}>{n.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
