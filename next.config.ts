import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'commons.wikimedia.org' },
    ],
  },
  // Next.js 15.3+ blocks cross-origin requests to the dev server's internal
  // asset routes (/_next/*, HMR, fonts…) by default. When the app is opened
  // from anything other than the exact origin the dev server reports
  // (e.g. LAN IP, Codespaces / preview URL, ngrok tunnel), the browser
  // silently drops fonts and client chunks and the page renders broken even
  // though the network tab shows 200s. Whitelist the common dev hostnames
  // so `next dev` works from phones, tablets and cloud IDEs out of the box.
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '*.local',
    '*.localhost',
    // RFC1918 LAN ranges — phones/tablets on the same Wi-Fi
    '10.*.*.*',
    '172.16.*.*',
    '172.17.*.*',
    '172.18.*.*',
    '172.19.*.*',
    '172.20.*.*',
    '172.21.*.*',
    '172.22.*.*',
    '172.23.*.*',
    '172.24.*.*',
    '172.25.*.*',
    '172.26.*.*',
    '172.27.*.*',
    '172.28.*.*',
    '172.29.*.*',
    '172.30.*.*',
    '172.31.*.*',
    '192.168.*.*',
    // Cloud IDE / tunnel preview hosts
    '*.ngrok.io',
    '*.ngrok-free.app',
    '*.trycloudflare.com',
    '*.loca.lt',
    '*.webcontainer.io',
    '*.csb.app',
    '*.codesandbox.io',
    '*.github.dev',
    '*.app.github.dev',
    '*.gitpod.io',
    '*.vercel.app',
  ],
};

export default nextConfig;
