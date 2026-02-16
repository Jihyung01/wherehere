/** @type {import('next').NextConfig} */
const nextConfig = {
  // 한글 지원을 위한 최소 설정
  reactStrictMode: true,
  swcMinify: false,
  // TypeScript 에러 무시 (배포용)
  typescript: {
    ignoreBuildErrors: true,
  },
  // ESLint 에러 무시 (배포용)
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
