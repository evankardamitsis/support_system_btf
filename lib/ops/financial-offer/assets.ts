import fs from 'fs'
import path from 'path'

function loadAssetDataUri(filename: string): string {
  const filePath = path.join(process.cwd(), 'lib/ops/financial-offer/assets', filename)
  const base64 = fs.readFileSync(filePath).toString('base64')
  return `data:image/png;base64,${base64}`
}

export const BTF_OFFER_LOGO_SRC = loadAssetDataUri('btf-logo.png')
export const BTF_OFFER_SIGNATURE_SRC = loadAssetDataUri('btf_signature.png')
