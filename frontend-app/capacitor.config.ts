import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.vercel.wherehere_seven.twa',
  appName: 'WhereHere',
  // server.url 사용 시 앱은 Vercel URL을 로드하므로 webDir은 로컬 빌드/동기화용
  webDir: 'out',
  server: {
    // 앱 실행 시 Vercel 배포 URL 로드 → 웹 수정만 하면 앱 재설치 없이 반영
    url: 'https://wherehere-seven.vercel.app',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    // 백그라운드 위치 사용 시 Android 알림 문구
    BackgroundGeolocation: {
      backgroundMessage: 'WhereHere가 친구들과 위치를 공유하는 중입니다.',
      backgroundTitle: 'WhereHere',
    },
  },
}

export default config
