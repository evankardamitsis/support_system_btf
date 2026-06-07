import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BUCKET_NAME?.trim()
  )
}

export function getR2ObjectKey() {
  return process.env.R2_DESKTOP_OBJECT_KEY?.trim() || 'BTF-Support-mac.dmg'
}

function createR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID!.trim()

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
    },
  })
}

export async function isR2DesktopReleasePublished() {
  if (!isR2Configured()) return false

  try {
    const client = createR2Client()
    await client.send(
      new HeadObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!.trim(),
        Key: getR2ObjectKey(),
      })
    )
    return true
  } catch {
    return false
  }
}

export async function createR2PresignedDownloadUrl(expiresIn = 60 * 60) {
  if (!isR2Configured()) return null

  const client = createR2Client()
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!.trim(),
    Key: getR2ObjectKey(),
  })

  return getSignedUrl(client, command, { expiresIn })
}
