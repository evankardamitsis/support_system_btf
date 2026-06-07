import fs from 'node:fs'
import path from 'node:path'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const DEFAULT_ASSET_NAME = 'BTF-Support-mac.dmg'
const DEFAULT_TAG = 'v0.1.0'

const inputPath =
  process.argv[2] ||
  path.join('dist', 'desktop', 'BTF Support-0.1.0-arm64.dmg')

if (!fs.existsSync(inputPath)) {
  console.error(`DMG not found: ${inputPath}`)
  console.error('Run: npm run desktop:dist')
  process.exit(1)
}

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function githubJson(url, token, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { ...githubHeaders(token), ...init.headers },
  })

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    const message = data?.message || text || res.statusText
    throw new Error(`${res.status} ${message}`)
  }

  return data
}

function printGithubTokenHelp(step) {
  console.error(`
GitHub denied "${step}" (403). Your token can read the repo but cannot create releases.

Fix — pick one:

A) Fine-grained PAT (recommended)
   github.com/settings/tokens → edit token
   Repository access: support_system_btf
   Permissions: Contents → Read AND write (Read-only is not enough)
   Regenerate, update GITHUB_DESKTOP_TOKEN in .env.local

B) Classic PAT
   github.com/settings/tokens → Generate new token (classic)
   Scope: repo (or public_repo for public repos)
   Use as GITHUB_DESKTOP_TOKEN

C) Manual upload (no write token needed)
   github.com/evankardamitsis/support_system_btf/releases/new
   Tag v0.1.0 → attach DMG as BTF-Support-mac.dmg
   Vercel only needs a Read token for downloads`)
}

async function uploadToGithubRelease({
  repo,
  token,
  tag,
  assetName,
  filePath,
}) {
  let release = null

  try {
    release = await githubJson(
      `https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`,
      token
    )
  } catch (error) {
    if (!String(error.message).startsWith('404')) {
      if (String(error.message).includes('403')) printGithubTokenHelp('read release')
      throw error
    }

    try {
      release = await githubJson(`https://api.github.com/repos/${repo}/releases`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag_name: tag,
          name: `BTF Support macOS ${tag}`,
          body: 'Staff macOS desktop app.',
        }),
      })
    } catch (createError) {
      if (String(createError.message).includes('403')) printGithubTokenHelp('create release')
      throw createError
    }
  }

  const existing = release.assets?.find((asset) => asset.name === assetName)
  if (existing) {
    await githubJson(
      `https://api.github.com/repos/${repo}/releases/assets/${existing.id}`,
      token,
      { method: 'DELETE' }
    )
  }

  const file = fs.readFileSync(filePath)
  const uploadUrl = `https://uploads.github.com/repos/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(assetName)}`

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      ...githubHeaders(token),
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(file.length),
    },
    body: file,
  })

  if (!uploadRes.ok) {
    const detail = await uploadRes.text()
    throw new Error(`${uploadRes.status} ${detail}`)
  }
}

const r2Ready = Boolean(
  process.env.R2_ACCOUNT_ID?.trim() &&
    process.env.R2_ACCESS_KEY_ID?.trim() &&
    process.env.R2_SECRET_ACCESS_KEY?.trim() &&
    process.env.R2_BUCKET_NAME?.trim()
)

const githubRepo = process.env.GITHUB_DESKTOP_REPO?.trim()
const githubToken = process.env.GITHUB_DESKTOP_TOKEN?.trim()

if (githubRepo) {
  if (!githubToken) {
    console.error(`GITHUB_DESKTOP_REPO is set but GITHUB_DESKTOP_TOKEN is missing.

Create a fine-grained PAT at github.com/settings/tokens:
  Repository: support_system_btf
  Permissions: Contents → Read and write

Add to .env.local:
  GITHUB_DESKTOP_TOKEN=github_pat_…`)
    process.exit(1)
  }

  const tag = process.env.GITHUB_DESKTOP_RELEASE_TAG?.trim() || DEFAULT_TAG
  const assetName = process.env.GITHUB_DESKTOP_ASSET_NAME?.trim() || DEFAULT_ASSET_NAME
  const sizeMb = (fs.statSync(inputPath).size / 1024 / 1024).toFixed(1)

  try {
    await uploadToGithubRelease({
      repo: githubRepo,
      token: githubToken,
      tag,
      assetName,
      filePath: inputPath,
    })
  } catch (error) {
    console.error('GitHub upload failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }

  console.log(`Uploaded ${assetName} to GitHub release ${tag} (${sizeMb} MB)`)
  console.log('Add the same GITHUB_* vars to Vercel (Production), redeploy, then test /admin/desktop')
  process.exit(0)
}

if (r2Ready) {
  const accountId = process.env.R2_ACCOUNT_ID.trim()
  const accessKeyId = process.env.R2_ACCESS_KEY_ID.trim()
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY.trim()
  const bucket = process.env.R2_BUCKET_NAME.trim()
  const objectKey = process.env.R2_DESKTOP_OBJECT_KEY?.trim() || DEFAULT_ASSET_NAME
  const file = fs.readFileSync(inputPath)

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: file,
        ContentType: 'application/x-apple-diskimage',
        ContentLength: file.length,
      })
    )
  } catch (error) {
    console.error('Upload failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }

  console.log(`Uploaded ${objectKey} to R2 bucket "${bucket}" (${(file.length / 1024 / 1024).toFixed(1)} MB)`)
  console.log('Add the R2_* vars to Vercel (Production), redeploy, then test /admin/desktop')
  process.exit(0)
}

console.error(`No upload target configured. Add to .env.local:

GitHub Releases (free):
  GITHUB_DESKTOP_REPO=evankardamitsis/support_system_btf
  GITHUB_DESKTOP_TOKEN=github_pat_…  (Contents: Read and write)`)
process.exit(1)
