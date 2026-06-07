import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const require = createRequire(import.meta.url)
const pkg = require('../package.json')

const DEFAULT_TAG = `v${pkg.version}`
const MANUAL_DMG_NAME = 'BTF-Support-mac.dmg'
const DIST_DIR = path.join('dist', 'desktop')

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
   Permissions: Contents → Read AND write

B) Classic PAT with repo scope

C) Manual upload via github.com/.../releases/new`)
}

async function getOrCreateRelease({ repo, token, tag }) {
  try {
    return await githubJson(
      `https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`,
      token
    )
  } catch (error) {
    if (!String(error.message).startsWith('404')) {
      if (String(error.message).includes('403')) printGithubTokenHelp('read release')
      throw error
    }

    try {
      return await githubJson(`https://api.github.com/repos/${repo}/releases`, token, {
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
}

async function uploadGithubAsset({ repo, token, release, assetName, filePath }) {
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

  return JSON.parse(await uploadRes.text())
}

function collectDesktopArtifacts() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`Build output not found: ${DIST_DIR}`)
    console.error('Run: npm run desktop:dist')
    process.exit(1)
  }

  const ymlPath = path.join(DIST_DIR, 'latest-mac.yml')
  if (!fs.existsSync(ymlPath)) {
    console.error('Missing latest-mac.yml — run: npm run desktop:dist')
    process.exit(1)
  }

  const yml = fs.readFileSync(ymlPath, 'utf8')
  const artifactNames = new Set(['latest-mac.yml'])

  for (const match of yml.matchAll(/^  - url: (.+)$/gm)) {
    artifactNames.add(match[1].trim())
  }

  const pathMatch = yml.match(/^path: (.+)$/m)
  if (pathMatch) artifactNames.add(pathMatch[1].trim())

  const uploads = []
  for (const name of artifactNames) {
    const filePath = name === 'latest-mac.yml' ? ymlPath : path.join(DIST_DIR, name)
    if (!fs.existsSync(filePath)) {
      console.error(`Missing build artifact: ${name}`)
      process.exit(1)
    }

    uploads.push({ assetName: name, filePath })

    if (name !== 'latest-mac.yml') {
      const blockmapPath = `${filePath}.blockmap`
      if (fs.existsSync(blockmapPath)) {
        uploads.push({ assetName: `${name}.blockmap`, filePath: blockmapPath })
      }
    }
  }

  const dmg = uploads.find(
    (item) => item.assetName.endsWith('.dmg') && !item.assetName.endsWith('.blockmap')
  )
  if (dmg) {
    uploads.push({ assetName: MANUAL_DMG_NAME, filePath: dmg.filePath })
  }

  if (!uploads.some((item) => item.assetName.endsWith('.zip'))) {
    console.error('latest-mac.yml has no zip artifact — auto-update will not work.')
    process.exit(1)
  }

  return uploads
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
    console.error('Set GITHUB_DESKTOP_REPO and GITHUB_DESKTOP_TOKEN in .env.local')
    process.exit(1)
  }

  const tag = process.env.GITHUB_DESKTOP_RELEASE_TAG?.trim() || DEFAULT_TAG
  if (tag !== DEFAULT_TAG) {
    console.warn(`Note: uploading v${pkg.version} artifacts to release tag ${tag}`)
    console.warn(`Set GITHUB_DESKTOP_RELEASE_TAG=${DEFAULT_TAG} unless intentional.`)
  }
  const uploads = collectDesktopArtifacts()

  try {
    let release = await getOrCreateRelease({ repo: githubRepo, token: githubToken, tag })

    for (const upload of uploads) {
      const sizeMb = (fs.statSync(upload.filePath).size / 1024 / 1024).toFixed(1)
      await uploadGithubAsset({
        repo: githubRepo,
        token: githubToken,
        release,
        assetName: upload.assetName,
        filePath: upload.filePath,
      })
      console.log(`Uploaded ${upload.assetName} (${sizeMb} MB)`)
      release = await githubJson(
        `https://api.github.com/repos/${githubRepo}/releases/tags/${encodeURIComponent(tag)}`,
        githubToken
      )
    }
  } catch (error) {
    console.error('GitHub upload failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }

  const manualDmg = uploads.find((item) => item.assetName === MANUAL_DMG_NAME)
  if (manualDmg) {
    const release = await githubJson(
      `https://api.github.com/repos/${githubRepo}/releases/tags/${encodeURIComponent(tag)}`,
      githubToken
    )
    const asset = release.assets?.find((item) => item.name === MANUAL_DMG_NAME)
    if (asset?.id) {
      console.log(`Optional: GITHUB_DESKTOP_ASSET_ID=${asset.id}`)
    }
  }

  console.log(`Published ${tag} for auto-update + manual install`)
  console.log('Set NEXT_PUBLIC_MACOS_DESKTOP_VERSION on Vercel, redeploy /admin/desktop')
  process.exit(0)
}

if (r2Ready) {
  const uploads = collectDesktopArtifacts()
  const dmg = uploads.find((item) => item.assetName === MANUAL_DMG_NAME) || uploads.find((item) => item.assetName.endsWith('.dmg'))

  if (!dmg) {
    console.error('No DMG found in dist/desktop')
    process.exit(1)
  }

  const accountId = process.env.R2_ACCOUNT_ID.trim()
  const accessKeyId = process.env.R2_ACCESS_KEY_ID.trim()
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY.trim()
  const bucket = process.env.R2_BUCKET_NAME.trim()
  const objectKey = process.env.R2_DESKTOP_OBJECT_KEY?.trim() || MANUAL_DMG_NAME
  const file = fs.readFileSync(dmg.filePath)

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

  console.log(`Uploaded ${objectKey} to R2 (${(file.length / 1024 / 1024).toFixed(1)} MB)`)
  process.exit(0)
}

console.error(`Configure GitHub Releases in .env.local:

GITHUB_DESKTOP_REPO=evankardamitsis/support_system_btf
GITHUB_DESKTOP_TOKEN=github_pat_…`)
process.exit(1)
