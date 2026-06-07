import { unstable_cache } from 'next/cache'
import { getMacosDesktopVersion } from '@/lib/desktop/release'

type GithubReleaseAsset = {
  id: number
  name: string
}

function getGithubToken() {
  return process.env.GITHUB_DESKTOP_TOKEN?.trim()
}

export function getGithubRepo() {
  return process.env.GITHUB_DESKTOP_REPO?.trim()
}

export function isGithubReleaseConfigured() {
  return Boolean(getGithubToken() && getGithubRepo())
}

export function getGithubReleaseTag() {
  return (
    process.env.GITHUB_DESKTOP_RELEASE_TAG?.trim() ||
    `v${getMacosDesktopVersion()}`
  )
}

export function getGithubAssetName() {
  return process.env.GITHUB_DESKTOP_ASSET_NAME?.trim() || 'BTF-Support-mac.dmg'
}

function getGithubAssetIdFromEnv() {
  const raw = process.env.GITHUB_DESKTOP_ASSET_ID?.trim()
  if (!raw) return null
  const id = Number(raw)
  return Number.isFinite(id) && id > 0 ? id : null
}

function githubHeaders(token: string, accept = 'application/vnd.github+json') {
  return {
    Authorization: `Bearer ${token}`,
    Accept: accept,
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function fetchReleaseAsset(): Promise<GithubReleaseAsset | null> {
  const envAssetId = getGithubAssetIdFromEnv()
  const assetName = getGithubAssetName()
  if (envAssetId) {
    return { id: envAssetId, name: assetName }
  }

  const token = getGithubToken()
  const repo = getGithubRepo()
  if (!token || !repo) return null

  const tag = getGithubReleaseTag()

  const releaseRes = await fetch(
    `https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`,
    { headers: githubHeaders(token) }
  )

  if (!releaseRes.ok) return null

  const release = (await releaseRes.json()) as {
    assets?: GithubReleaseAsset[]
  }

  return release.assets?.find((asset) => asset.name === assetName) ?? null
}

async function getReleaseAsset(): Promise<GithubReleaseAsset | null> {
  const repo = getGithubRepo()
  const tag = getGithubReleaseTag()
  const assetName = getGithubAssetName()

  if (!repo) return null

  if (getGithubAssetIdFromEnv()) {
    return fetchReleaseAsset()
  }

  const cached = unstable_cache(fetchReleaseAsset, ['github-desktop-asset', repo, tag, assetName], {
    revalidate: 300,
  })

  return cached()
}

export async function isGithubDesktopReleasePublished() {
  const asset = await getReleaseAsset()
  return Boolean(asset)
}

export async function createGithubDesktopDownloadUrl() {
  const token = getGithubToken()
  const repo = getGithubRepo()
  const asset = await getReleaseAsset()
  if (!token || !repo || !asset) return null

  const res = await fetch(
    `https://api.github.com/repos/${repo}/releases/assets/${asset.id}`,
    {
      redirect: 'manual',
      headers: githubHeaders(token, 'application/octet-stream'),
    }
  )

  if (res.status === 302 || res.status === 307) {
    return res.headers.get('location')
  }

  return null
}
