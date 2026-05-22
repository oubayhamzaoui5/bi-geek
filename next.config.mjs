import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const pbUrl = new URL(process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL || "http://127.0.0.1:8090")

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: pbUrl.protocol.replace(":", ""),
        hostname: pbUrl.hostname,
        port: pbUrl.port,
        pathname: "/api/files/**",
      },
    ],
  },
}

export default nextConfig
