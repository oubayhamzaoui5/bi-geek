/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // ✅ Prevent SSR errors related to `canvas` in pdfjs-dist
      config.resolve.alias = { ...config.resolve.alias, canvas: false }
    config.resolve.fallback = { ...config.resolve.fallback, canvas: false }
    return config
  },
}

export default nextConfig
