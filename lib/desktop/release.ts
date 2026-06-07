export const MACOS_DESKTOP_RELEASE_FILE = 'BTF-Support-mac.dmg'
export const MACOS_DESKTOP_RELEASE_BUCKET = 'desktop-releases'

export function getMacosDesktopVersion() {
  return process.env.NEXT_PUBLIC_MACOS_DESKTOP_VERSION?.trim() || '0.1.1'
}

export function getMacosDesktopDownloadUrl() {
  return process.env.NEXT_PUBLIC_MACOS_DESKTOP_DOWNLOAD_URL?.trim() || null
}
