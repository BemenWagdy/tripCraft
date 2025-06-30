'use client';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

/* brand styles */
const styles = StyleSheet.create({
  page:   { padding: 40, fontSize: 11, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title:  { fontSize: 18, fontWeight: 'bold', color: '#2563eb' },
  tag:    { fontSize: 10, color: '#888' },
  h2:     { fontSize: 14, fontWeight: 'bold', marginTop: 12, marginBottom: 6, color: '#1e40af' },
  p:      { marginBottom: 4, lineHeight: 1.4 },
  bullet: { flexDirection: 'row', gap: 4, marginBottom: 2 },
  dot:    { fontSize: 10, marginRight: 4, color: '#f97316' },
  footer: { marginTop: 24, borderTop: 1, paddingTop: 8, fontSize: 9, color: '#888', textAlign: 'center' },
});

function stripMd(line: string) {
  return line
    .replace(/^#+\s*/, '')
    .replace(/^[-*•]\s+/, '')
    .replace(/[*`_~]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export default function PdfDoc({ markdown }: { markdown: string }) {
  const raw = markdown.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>TripCraft Itinerary</Text>
          <Text style={styles.tag}>tripcraft.ai</Text>
        </View>

        {raw.map((ln, i) =>
          /^day\s+\d/i.test(ln) ? (
            <Text key={i} style={styles.h2}>{stripMd(ln)}</Text>
          ) : /^[-*•]\s+/.test(ln) ? (
            <View key={i} style={styles.bullet}>
              <Text style={styles.dot}>•</Text>
              <Text style={[styles.p, { flex: 1 }]}>{stripMd(ln)}</Text>
            </View>
          ) : (
            <Text key={i} style={styles.p}>{stripMd(ln)}</Text>
          )
        )}

        <Text style={styles.footer}>
          Generated with Groq Llama-3 • © {new Date().getFullYear()} TripCraft
        </Text>
      </Page>
    </Document>
  );
}