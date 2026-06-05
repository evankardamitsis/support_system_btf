import { renderToBuffer } from '@react-pdf/renderer'
import { FinancialOfferDocument } from './FinancialOfferDocument'
import type { CompanyProfileData, FinancialOfferInput } from './types'

export async function renderFinancialOfferPdf(
  offer: FinancialOfferInput,
  company: CompanyProfileData
): Promise<Buffer> {
  const buffer = await renderToBuffer(<FinancialOfferDocument offer={offer} company={company} />)
  return Buffer.from(buffer)
}
