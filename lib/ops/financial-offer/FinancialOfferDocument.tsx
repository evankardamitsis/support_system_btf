import { Document, Image as PdfImage, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { BTF_OFFER_LOGO_SRC, BTF_OFFER_SIGNATURE_SRC } from './assets'
import {
  computeFinancialOffer,
  formatOfferCurrency,
  formatOfferDocumentDate,
} from './calculate'
import type { CompanyProfileData, FinancialOfferInput } from './types'

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#171717',
    lineHeight: 1.35,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 10,
  },
  logo: {
    width: 156,
    height: 20,
    objectFit: 'contain',
    objectPosition: 'left',
  },
  contactBlock: {
    textAlign: 'right',
    fontSize: 8,
    color: '#171717',
    lineHeight: 1.4,
  },
  contactName: {
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  headerRule: {
    height: 2.5,
    backgroundColor: '#171717',
    marginBottom: 14,
  },
  title: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    textDecoration: 'underline',
    marginBottom: 4,
  },
  recipient: {
    fontSize: 10,
    marginBottom: 12,
  },
  table: {
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#bdbdbd',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e6e6e6',
    borderBottomWidth: 1,
    borderBottomColor: '#bdbdbd',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d8d8d8',
  },
  tableRowLast: {
    flexDirection: 'row',
  },
  colWork: {
    flex: 2,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  colCost: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    textAlign: 'right',
  },
  headerText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: '#171717',
    borderBottomWidth: 2,
    borderBottomColor: '#171717',
  },
  totalLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  totalValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  hostingRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#bdbdbd',
    marginBottom: 8,
  },
  hostingLabel: {
    flex: 2,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: '#e6e6e6',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  hostingValue: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    textAlign: 'right',
    fontSize: 9,
  },
  vatFootnote: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 7.5,
    color: '#555',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    textDecoration: 'underline',
    marginBottom: 4,
    marginTop: 2,
  },
  bullet: {
    marginBottom: 2,
    paddingLeft: 2,
    fontSize: 8.5,
  },
  ibanTable: {
    marginTop: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#bdbdbd',
  },
  ibanHeader: {
    flexDirection: 'row',
    backgroundColor: '#e6e6e6',
    borderBottomWidth: 1,
    borderBottomColor: '#bdbdbd',
  },
  ibanRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d8d8d8',
  },
  ibanRowLast: {
    flexDirection: 'row',
  },
  colBank: { flex: 1.1, paddingVertical: 4, paddingHorizontal: 6 },
  colIban: { flex: 2, paddingVertical: 4, paddingHorizontal: 6, fontSize: 8 },
  colSwift: { flex: 0.9, paddingVertical: 4, paddingHorizontal: 6, fontSize: 8 },
  acceptance: {
    marginTop: 2,
  },
  acceptanceTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    textDecoration: 'underline',
    marginBottom: 8,
  },
  signRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  signCol: {
    flex: 1,
  },
  signHeading: {
    fontSize: 8.5,
    marginBottom: 10,
    color: '#171717',
  },
  signCaption: {
    fontSize: 7.5,
    color: '#555',
    marginBottom: 2,
  },
  signLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#888',
    marginBottom: 4,
    height: 1,
  },
  signDateValue: {
    fontSize: 8.5,
    color: '#171717',
    marginBottom: 8,
  },
  signImage: {
    width: 110,
    height: 28,
    objectFit: 'contain',
    objectPosition: 'left',
    marginTop: 0,
    marginBottom: 0,
  },
  costHeaderSub: {
    fontSize: 6.5,
    fontFamily: 'Helvetica',
    textTransform: 'none',
    letterSpacing: 0,
    marginTop: 1,
  },
})

export function FinancialOfferDocument({
  offer,
  company,
}: {
  offer: FinancialOfferInput
  company: CompanyProfileData
}) {
  const { total, upfrontAmount, upfrontPercent } = computeFinancialOffer(offer)
  const excludeVat = offer.excludeVat === true
  const documentDate = formatOfferDocumentDate()

  return (
    <Document title={`Financial Offer - ${offer.clientName}`}>
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.headerRow}>
          <PdfImage src={BTF_OFFER_LOGO_SRC} style={styles.logo} />
          <View style={styles.contactBlock}>
            <Text style={styles.contactName}>{company.name}</Text>
            <Text>{company.address}</Text>
            <Text>m. {company.mobile}</Text>
            <Text>t. {company.phone}</Text>
            <Text>e. {company.email}</Text>
          </View>
        </View>

        <View style={styles.headerRule} />

        <Text style={styles.title}>Financial Offer</Text>
        <Text style={styles.recipient}>To {offer.clientName}</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colWork}>
              <Text style={styles.headerText}>Work</Text>
            </View>
            <View style={styles.colCost}>
              <Text style={styles.headerText}>Cost</Text>
              {excludeVat ? (
                <Text style={styles.costHeaderSub}>(excl. VAT 24%)</Text>
              ) : null}
            </View>
          </View>

          {offer.lineItems.map((item, index) => (
            <View
              key={`${item.work}-${index}`}
              style={
                index === offer.lineItems.length - 1 ? styles.tableRowLast : styles.tableRow
              }
            >
              <View style={styles.colWork}>
                <Text>{item.work}</Text>
              </View>
              <View style={styles.colCost}>
                <Text>{formatOfferCurrency(item.cost)}</Text>
              </View>
            </View>
          ))}

          <View style={styles.totalRow}>
            <View style={styles.colWork}>
              <Text style={styles.totalLabel}>Total</Text>
            </View>
            <View style={styles.colCost}>
              <Text style={styles.totalValue}>{formatOfferCurrency(total)}</Text>
            </View>
          </View>
        </View>

        {offer.hostingMaintenance ? (
          <View style={styles.hostingRow}>
            <Text style={styles.hostingLabel}>Hosting & Maintenance</Text>
            <Text style={styles.hostingValue}>{offer.hostingMaintenance}</Text>
          </View>
        ) : null}

        {excludeVat ? (
          <Text style={styles.vatFootnote}>
            The above costs do not include VAT (24%).
          </Text>
        ) : null}

        <Text style={styles.sectionTitle}>Payment Methods:</Text>
        <Text style={styles.bullet}>
          • To initiate the project, a minimum {upfrontPercent}% upfront payment (
          {formatOfferCurrency(upfrontAmount)}) is required.
        </Text>
        <Text style={styles.bullet}>
          • Payment of the outstanding balance upon final delivery of the project.
        </Text>

        <View style={styles.ibanTable}>
          <View style={styles.ibanHeader}>
            <View style={styles.colBank}>
              <Text style={styles.headerText}>Bank Name</Text>
            </View>
            <View style={styles.colIban}>
              <Text style={styles.headerText}>IBAN</Text>
            </View>
            <View style={styles.colSwift}>
              <Text style={styles.headerText}>Swift / BIC Code</Text>
            </View>
          </View>
          {offer.ibans.map((row, index) => (
            <View
              key={`${row.iban}-${index}`}
              style={index === offer.ibans.length - 1 ? styles.ibanRowLast : styles.ibanRow}
            >
              <View style={styles.colBank}>
                <Text>{row.bankName}</Text>
              </View>
              <View style={styles.colIban}>
                <Text>{row.iban}</Text>
              </View>
              <View style={styles.colSwift}>
                <Text>{row.swiftBic}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.acceptance}>
          <Text style={styles.acceptanceTitle}>Offer acceptance</Text>
          <View style={styles.signRow}>
            <View style={styles.signCol}>
              <Text style={styles.signHeading}>-The Company-</Text>
              <Text style={styles.signDateValue}>{documentDate}</Text>
              <PdfImage src={BTF_OFFER_SIGNATURE_SRC} style={styles.signImage} />
              <Text style={styles.signCaption}>Signature</Text>
            </View>
            <View style={styles.signCol}>
              <Text style={styles.signHeading}>-The Client-</Text>
              <View style={{ height: 28 }} />
              <Text style={styles.signCaption}>Signature</Text>
              <View style={styles.signLine} />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
