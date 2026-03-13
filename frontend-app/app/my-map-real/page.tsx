"use client";

import { MyMapScreen } from "@/components/screens/MyMapScreen";

/** 단독 URL /my-map-real 진입 시 (기존 링크 호환). 앱 내에서는 프로필 → 지도 탭으로 동일 UI 제공 */
export default function MyMapRealPage() {
  return <MyMapScreen />;
}
