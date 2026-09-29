import {
  Document,
  Font,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
} from '@react-pdf/renderer';
import type { SettlementExportModel } from './exportModel';

export const PDF_FONT_FAMILY = 'Noto Sans';
export const PDF_FONT_SOURCE = new URL('./assets/NotoSans.ttf', import.meta.url).href;
export const PDF_THEME = 'light' as const;
export const PDF_THEME_COLORS = {
  background: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  headingBorder: '#cbd5e1',
  rowBorder: '#e2e8f0',
  paid: '#047857',
  unpaid: '#b45309',
  footer: '#94a3b8',
  icon: '#64748b',
} as const;

Font.register({ family: PDF_FONT_FAMILY, src: PDF_FONT_SOURCE });

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 9,
    color: PDF_THEME_COLORS.text,
    backgroundColor: PDF_THEME_COLORS.background,
  },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  metadata: { fontSize: 9, color: PDF_THEME_COLORS.muted, marginBottom: 18 },
  section: { marginBottom: 16 },
  heading: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 7,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: PDF_THEME_COLORS.headingBorder,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_THEME_COLORS.rowBorder,
  },
  cell: { flexGrow: 1, flexBasis: 0, paddingRight: 6 },
  amount: { width: 88, textAlign: 'right' },
  label: { color: PDF_THEME_COLORS.muted, fontSize: 8 },
  icon: { marginRight: 6 },
  paid: { color: PDF_THEME_COLORS.paid, width: 42, textAlign: 'right' },
  unpaid: { color: PDF_THEME_COLORS.unpaid, width: 42, textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 32,
    right: 32,
    textAlign: 'right',
    color: PDF_THEME_COLORS.footer,
    fontSize: 8,
  },
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      {children}
    </View>
  );
}

export function createSettlementPdfDocument(model: SettlementExportModel) {
  return (
    <Document title={`${model.eventName} settlement`}>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>{model.eventName}</Text>
        <Text style={styles.metadata}>Settlement export · {model.exportedAt}</Text>

        <Section title="Participants">
          {model.participants.map((participant, index) => (
            <View key={`${participant.name}-${index}`} style={styles.row} wrap={false}>
              <Text>{participant.name}</Text>
            </View>
          ))}
        </Section>

        <Section title="Expenses">
          {model.expenses.map((expense, index) => (
            <View key={`${expense.concept}-${index}`} style={styles.row} wrap={false}>
              <View style={styles.cell}>
                <Text>{expense.concept}</Text>
                <Text style={styles.label}>
                  {expense.category} · Paid by {expense.payer}
                </Text>
              </View>
              <Text style={styles.amount}>{expense.amount}</Text>
            </View>
          ))}
        </Section>

        <Section title="Balances">
          {model.balances.map((balance, index) => (
            <View key={`${balance.participant}-${index}`} style={styles.row} wrap={false}>
              <Text style={styles.cell}>{balance.participant}</Text>
              <View style={styles.cell}>
                <Text style={styles.label}>Paid / consumed</Text>
                <Text>
                  {balance.paid} / {balance.consumed}
                </Text>
              </View>
              <Text style={styles.amount}>{balance.net}</Text>
            </View>
          ))}
        </Section>

        <Section title="Spending by category">
          {model.categories.map((category) => (
            <View key={category.category} style={styles.row} wrap={false}>
              <Svg
                width={12}
                height={12}
                viewBox={`0 0 ${category.icon.width} ${category.icon.height}`}
                style={styles.icon}
              >
                {category.icon.paths.map((d, index) => (
                  <Path
                    key={`${category.category}-${index}`}
                    d={d}
                    fill={PDF_THEME_COLORS.icon}
                  />
                ))}
              </Svg>
              <Text style={styles.cell}>{category.label}</Text>
              <Text style={styles.amount}>{category.amount}</Text>
            </View>
          ))}
        </Section>

        <Section title="Transfers">
          {model.transfers.map((transfer, index) => (
            <View
              key={`${transfer.from}-${transfer.to}-${index}`}
              style={styles.row}
              wrap={false}
            >
              <Text style={styles.cell}>
                {transfer.from} → {transfer.to}
              </Text>
              <Text style={styles.amount}>{transfer.amount}</Text>
              <Text style={transfer.status === 'Paid' ? styles.paid : styles.unpaid}>
                {transfer.status}
              </Text>
            </View>
          ))}
        </Section>
        <Text
          fixed
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
