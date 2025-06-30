/* components/PdfDoc.tsx */
import {
  Document, Page, View, Text, StyleSheet
} from '@react-pdf/renderer';

const c = { blue: '#2563eb', gray: '#6b7280', dark: '#111827' };

const st = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 40, color: c.dark },
  h1:   { fontSize: 26, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  h2:   { fontSize: 16, fontFamily: 'Helvetica-Bold', marginTop: 16, marginBottom: 4 },
  p:    { marginVertical: 2, lineHeight: 1.35 },
  bullet:{ flexDirection: 'row', marginVertical: 1 },
  dot:  { width: 5, height: 5, borderRadius: 2.5, marginTop: 4, marginRight: 4, backgroundColor: c.blue },
  tblHd:{ flexDirection: 'row', backgroundColor: c.blue, color: '#fff', padding: 4, fontFamily: 'Helvetica-Bold' },
  tblRow:{ flexDirection: 'row', borderBottom: 1, borderColor: '#eee', paddingVertical: 2 },
  cellL:{ width: '60%' }, 
  cellR:{ width: '40%', textAlign: 'right' },
});

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <View style={st.bullet}><View style={st.dot} /><Text style={st.p}>{children}</Text></View>
);

interface StructuredData {
  destination: string;
  dateRange: string;
  intro: string;
  visa: string;
  currency: { code: string; rateUsd: number };
  averages: { hostel: number; midHotel: number; highEnd: number };
  weather: string;
  culture: string;
  food: string;
  tips: string;
  days: Array<{
    date: string;
    title: string;
    cost?: string;
    steps: Array<{
      time?: string;
      text: string;
      mode?: string;
      cost?: string;
    }>;
  }>;
  totalCost?: string;
}

export default function PdfDoc({ data }: { data: StructuredData }) {
  const {
    destination, dateRange, intro, visa, currency,
    averages, weather, culture, food, tips, days, totalCost
  } = data;

  return (
    <Document>
      <Page size="A4" style={st.page} wrap>

        {/* Header */}
        <Text style={st.h1}>{destination}</Text>
        <Text style={{ ...st.p, color: c.gray }}>{dateRange}</Text>
        <Text style={{ ...st.p, marginTop: 8 }}>{intro}</Text>

        {/* Practical blocks */}
        <Text style={st.h2}>Before you go</Text>
        <Bullet>{visa}</Bullet>
        <Bullet>Currency: 1 {currency.code} ≈ ${currency.rateUsd.toFixed(2)} USD</Bullet>
        <Bullet>{weather}</Bullet>

        <Text style={st.h2}>Average accommodation</Text>
        <View style={st.tblHd}>
          <Text style={st.cellL}>Type</Text>
          <Text style={st.cellR}>Price / night</Text>
        </View>
        <View style={st.tblRow}>
          <Text style={st.cellL}>Hostel</Text>
          <Text style={st.cellR}>${averages.hostel}</Text>
        </View>
        <View style={st.tblRow}>
          <Text style={st.cellL}>Mid-range hotel</Text>
          <Text style={st.cellR}>${averages.midHotel}</Text>
        </View>
        <View style={st.tblRow}>
          <Text style={st.cellL}>High-end hotel</Text>
          <Text style={st.cellR}>${averages.highEnd}</Text>
        </View>

        <Text style={st.h2}>Local culture & food</Text>
        <Bullet>{culture}</Bullet>
        <Bullet>{food}</Bullet>
        
        <Text style={st.h2}>Tips & tricks</Text>
        <Bullet>{tips}</Bullet>

        {/* Day-by-day */}
        {days.map((d, i) => (
          <View key={i} wrap>
            <Text style={st.h2}>Day {i + 1} – {d.title} ({d.date})</Text>
            {d.steps.map((s, idx) => (
              <Bullet key={idx}>
                {s.time && `${s.time} – `}{s.text}
                {s.mode && ` (${s.mode})`}
                {s.cost && ` · ${s.cost}`}
              </Bullet>
            ))}
            {d.cost && (
              <View style={{ ...st.tblRow, backgroundColor: '#f9fafb' }}>
                <Text style={{ ...st.cellL, fontFamily: 'Helvetica-Bold' }}>Estimated day total</Text>
                <Text style={{ ...st.cellR, fontFamily: 'Helvetica-Bold' }}>{d.cost}</Text>
              </View>
            )}
          </View>
        ))}

        {/* Summary */}
        {totalCost && (
          <>
            <Text style={st.h2}>Grand total</Text>
            <Text style={{ ...st.p, fontFamily: 'Helvetica-Bold' }}>{totalCost}</Text>
          </>
        )}
      </Page>
    </Document>
  );
}