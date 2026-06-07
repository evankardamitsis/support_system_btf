export const BTF_WEBSITE_URL = 'https://belowthefold.gr'

export const LEGAL_LINKS = {
  privacy: { href: '/legal/privacy', label: 'Privacy' },
  terms: { href: '/legal/terms', label: 'Terms' },
} as const

export function copyrightYear() {
  return new Date().getFullYear()
}
