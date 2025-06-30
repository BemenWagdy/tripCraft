import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

// ---------- Styles ----------
const palette = {
  primary: '#2563eb',   // Tailwind blue-600
  text:    '#111827',   // Tailwind gray-900
  light:   '#6b7280',   // Tailwind gray-500
};

const styles = StyleSheet.create({
  /* shared */
  page:   { padding: 40, fontFamily: 'Helvetica', fontSize: 11, color: palette.text },
  h1:     { fontSize: 28, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  h2:     { fontSize: 20, fontFamily: 'Helvetica-Bold', margin: 12  },
  h3:     { fontSize: 14, fontFamily: 'Helvetica-Bold', marginTop: 8 },

  /* cover page */
  coverWrap: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  bar:   { height: 8, width: '100%', backgroundColor: palette.primary, marginBottom: 24 },
  subtitle: { fontSize: 14, color: palette.light, marginBottom: 4 },

  /* side strip (every content page) */
  side:  {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 32,
    backgroundColor: palette.primary,
  },
  sideText: {
    position: 'absolute',
    bottom: 24,
    left: -90,
    transformOrigin: 'top left',
    transform: 'rotate(-90deg)',
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },

  /* body text */
  p:     { marginVertical: 2, lineHeight: 1.35 },
  bullet:{ flexDirection: 'row', marginVertical: 1 },
  dot:   { width: 6, height: 6, borderRadius: 3, marginTop: 4, marginRight: 6, backgroundColor: palette.primary },
  col:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
});

// ---------- Helpers ----------
const Bullet = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.bullet}>
    <View style={styles.dot} />
    <Text style={styles.p}>{children}</Text>
  </View>
);

// ---------- Main component ----------
interface ItineraryDay {
  title: string;                     // "Day 1: Giza Pyramids"
  date?: string;                     // "Tue 30 Jun"
  entries: string[];                 // lines / bullets
  budget?: string;                   // optional total
}

interface PdfProps {
  traveller: string;                 // e.g. "Ali Hassan"
  destination: string;               // e.g. "Cairo, Egypt"
  dateRange: string;                 // e.g. "30 Jun – 14 Jul 2025"
  intro: string;                     // paragraph intro
  days: ItineraryDay[];              // parsed itinerary
}

export default function PdfDoc(props: PdfProps) {
  const { traveller, destination, dateRange, intro, days } = props;

  return (
    <Document title={`TripCraft – ${destination} itinerary`}>
      {/* COVER */}
      <Page size="A4" style={{ ...styles.page, padding: 0 }}>
        <View style={styles.bar} />
        <View style={styles.coverWrap}>
          <Text style={styles.h1}>{destination}</Text>
          <Text style={styles.subtitle}>{dateRange}</Text>
          <Text style={{ ...styles.subtitle, marginTop: 20 }}>
            Personalised for {traveller}
          </Text>
        </View>
      </Page>

      {/* CONTENT PAGES */}
      {days.map((d, i) => (
        <Page size="A4" key={i} style={styles.page}>
          {/* side strip */}
          <View style={styles.side} />
          <Text style={styles.sideText}>
            {traveller} · p.{i + 2}
          </Text>

          <Text style={styles.h2}>{d.title}</Text>
          {d.date && <Text style={{ ...styles.p, color: palette.light }}>{d.date}</Text>}
          {i === 0 && (
            <Text style={{ ...styles.p, marginVertical: 8 }}>{intro}</Text>
          )}

          {d.entries.map((line, idx) => (
            <Bullet key={idx}>{line}</Bullet>
          ))}

          {d.budget && (
            <View style={styles.col}>
              <Text style={styles.h3}>Daily budget</Text>
              <Text style={styles.h3}>{d.budget}</Text>
            </View>
          )}
        </Page>
      ))}
    </Document>
  );
}