import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer', 'stream-chat', '@stream-io/node-sdk'],
  transpilePackages: ['stream-chat-react', '@stream-io/video-react-sdk'],
};

export default nextConfig;
