import type { Attachment } from 'stream-chat'

export type GiphyImageRendition = {
  url: string
  width: string
  height: string
}

export type GiphyResult = {
  id: string
  title: string
  images: Record<string, GiphyImageRendition | undefined>
}

export function getGiphyApiKey() {
  return process.env.GIPHY_API_KEY?.trim() ?? process.env.NEXT_PUBLIC_GIPHY_API_KEY?.trim() ?? ''
}

export function giphyResultToStreamAttachment(gif: GiphyResult): Attachment {
  const thumb =
    gif.images.fixed_height_downsampled?.url ||
    gif.images.fixed_height?.url ||
    gif.images.original?.url ||
    ''

  return {
    type: 'giphy',
    title: gif.title || 'GIF',
    thumb_url: thumb,
    giphy: gif.images as NonNullable<Attachment['giphy']>,
  }
}
