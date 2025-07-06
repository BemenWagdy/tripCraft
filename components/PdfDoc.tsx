/* components/PdfDoc.tsx */
import React from 'react';
import {
  Document, Page, View, Text, StyleSheet, Image, Link
} from '@react-pdf/renderer';
import { toDataURL } from '@/lib/qr';

const c = { blue: '#2563eb', gray: '#6b7280', dark: '#111827', green: '#059669', red: '#dc2626' };

const st = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 40, color: c.dark },
  h1:   { fontSize: 26, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  h2:   { fontSize: 16, fontFamily: 'Helvetica-Bold', marginTop: 16, marginBottom: 4 },
  h3:   { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 8, marginBottom: 2 },
  p:    { marginVertical: 2, lineHeight: 1.35 },
  bullet:{ flexDirection: 'row', marginVertical: 1 },
  dot:  { width: 5, height: 5, borderRadius: 2.5, marginTop: 4, marginRight: 4, backgroundColor: c.blue },
  tblHd:{ flexDirection: 'row', backgroundColor: c.blue, color: '#fff', padding: 4, fontFamily: 'Helvetica-Bold' },
  tblRow:{ flexDirection: 'row', borderBottom: 1, borderColor: '#eee', paddingVertical: 2 },
  cellL:{ width: '60%' }, 
  cellR:{ width: '40%', textAlign: 'right' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 1 },
  stepText: { flex: 1, marginRight: 8 },
  qrCode: { width: 40, height: 40, marginLeft: 8 },
  infoBox: { backgroundColor: '#f9fafb', padding: 8, marginVertical: 4, borderRadius: 4 },
  warningBox: { backgroundColor: '#fef3c7', padding: 8, marginVertical: 4, borderRadius: 4, borderLeft: 3, borderColor: '#f59e0b' },
  visaBox: { backgroundColor: '#ecfdf5', padding: 8, marginVertical: 4, borderRadius: 4, borderLeft: 3, borderColor: c.green },
  emergencyBox: { backgroundColor: '#fef2f2', padding: 8, marginVertical: 4, borderRadius: 4, borderLeft: 3, borderColor: c.red }
});

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <View style={st.bullet}><View style={st.dot} /><Text style={st.p}>{children}</Text></View>
);

interface StructuredData {
  destination: string;
  dateRange: string;
  intro: string;
  visa: {
    required?: boolean;
    type?: string;
    applicationMethod?: string;
    processingTime?: string;
    fee?: string;
    validityPeriod?: string;
    appointmentWarning?: string;
    additionalRequirements?: string[];
  };
  currency: {
    destinationCode: string;
    lastUpdated?: string;
    homeToDestination: string;
    destinationToHome: string;
    cashCulture?: string;
    tippingNorms?: string;
    atmAvailability?: string;
    cardAcceptance?: string;
  };
  accommodation: {
    hostel: {
      avgPrice: number;
      examples: Array<{
        name: string;
        price: number;
        url?: string;
      }>;
    };
    mid: {
      avgPrice: number;
      examples: Array<{
        name: string;
        price: number;
        url?: string;
      }>;
    };
    high: {
      avgPrice: number;
      examples: Array<{
        name: string;
        price: number;
        url?: string;
      }>;
    };
  };
  weather: string;
  cultureTips: string[];
  foodList: Array<{
    name: string;
    note?: string;
    rating: number;
    source: string;
  }>;
  practicalInfo?: {
    powerPlugType?: string;
    powerVoltage?: string;
    simCardOptions?: string[];
    emergencyNumbers?: {
      [key: string]: string;
    };
    commonScams?: string[];
    safetyApps?: string[];
    healthRequirements?: string[];
  };
  tips: string;
  beforeYouGo: string[];
  days: Array<{
    date: string;
    title: string;
    cost?: string;
    steps: Array<{
      time?: string;
      text: string;
      mode?: string;
      cost?: string;
      mapLink?: string;
    }>;
  }>;
  totalCost?: string;
  footer?: {
    disclaimers: string;
  };
}

export default function PdfDoc({ data }: { data: StructuredData }) {
  const {
    destination, dateRange, intro, visa, currency,
    accommodation, weather, cultureTips, foodList, practicalInfo, tips, beforeYouGo, days, totalCost, footer
  } = data;

  return (
    <Document>
      <Page size="A4" style={st.page} wrap>

        {/* Header */}
        <Text style={st.h1}>{destination}</Text>
        <Text style={{ ...st.p, color: c.gray }}>{dateRange}</Text>
        <Text style={{ ...st.p, marginTop: 8 }}>{intro}</Text>

        {/* Before You Go */}
        <Text style={st.h2}>Before You Go</Text>
        {beforeYouGo.map((item, i) => (
          <Bullet key={i}>{item}</Bullet>
        ))}

        {/* Visa Information */}
        <Text style={st.h2}>Visa Requirements</Text>
        <View style={visa.required === true ? st.warningBox : (visa.required === false ? st.visaBox : st.infoBox)}>
          <Text style={{ ...st.p, fontFamily: 'Helvetica-Bold' }}>
            Status: {visa.required === true ? 'Visa Required' : (visa.required === false ? 'Visa Not Required' : 'Status Unknown')}
          </Text>
          {visa.type && <Text style={st.p}>Type: {visa.type}</Text>}
          {visa.applicationMethod && <Text style={st.p}>Apply via: {visa.applicationMethod}</Text>}
          {visa.processingTime && <Text style={st.p}>Processing time: {visa.processingTime}</Text>}
          {visa.fee && <Text style={st.p}>Fee: {visa.fee}</Text>}
          {visa.validityPeriod && <Text style={st.p}>Validity: {visa.validityPeriod}</Text>}
          {visa.appointmentWarning && (
            <Text style={{ ...st.p, color: '#f59e0b', fontFamily: 'Helvetica-Bold' }}>
              ⚠️ {visa.appointmentWarning}
            </Text>
          )}
          {visa.additionalRequirements && visa.additionalRequirements.length > 0 && (
            <View style={{ marginTop: 4 }}>
              <Text style={{ ...st.p, fontFamily: 'Helvetica-Bold' }}>Required documents:</Text>
              {visa.additionalRequirements.map((req, i) => (
                <Text key={i} style={{ ...st.p, marginLeft: 8 }}>• {req}</Text>
              ))}
            </View>
          )}
        </View>

        {/* Currency & Payments */}
        <Text style={st.h2}>Currency & Payments</Text>
        <View style={st.infoBox}>
          <Text style={st.p}>Exchange rate: {currency.homeToDestination}</Text>
          <Text style={st.p}>Reverse rate: {currency.destinationToHome}</Text>
          {currency.lastUpdated && <Text style={st.p}>Last updated: {currency.lastUpdated}</Text>}
          {currency.cashCulture && <Text style={st.p}>Payment culture: {currency.cashCulture}</Text>}
          {currency.tippingNorms && <Text style={st.p}>Tipping: {currency.tippingNorms}</Text>}
          {currency.atmAvailability && <Text style={st.p}>ATMs: {currency.atmAvailability}</Text>}
          {currency.cardAcceptance && <Text style={st.p}>Cards: {currency.cardAcceptance}</Text>}
        </View>

        {/* Practical Information */}
        {practicalInfo && (
          <>
            <Text style={st.h2}>Practical Information</Text>
            
            {(practicalInfo.powerPlugType || practicalInfo.powerVoltage) && (
              <View style={st.infoBox}>
                <Text style={st.h3}>Power & Electronics</Text>
                {practicalInfo.powerPlugType && <Text style={st.p}>{practicalInfo.powerPlugType}</Text>}
                {practicalInfo.powerVoltage && <Text style={st.p}>{practicalInfo.powerVoltage}</Text>}
              </View>
            )}

            {practicalInfo.emergencyNumbers && (
              <View style={st.emergencyBox}>
                <Text style={st.h3}>Emergency Numbers</Text>
                {Object.entries(practicalInfo.emergencyNumbers).map(([key, value]) => (
                  <Text key={key} style={st.p}>{key.charAt(0).toUpperCase() + key.slice(1)}: {value}</Text>
                ))}
              </View>
            )}

            {practicalInfo.simCardOptions && practicalInfo.simCardOptions.length > 0 && (
              <View style={st.infoBox}>
                <Text style={st.h3}>SIM Card Options</Text>
                {practicalInfo.simCardOptions.map((option, i) => (
                  <Text key={i} style={st.p}>• {option}</Text>
                ))}
              </View>
            )}

            {practicalInfo.commonScams && practicalInfo.commonScams.length > 0 && (
              <View style={st.warningBox}>
                <Text style={st.h3}>Common Scams to Avoid</Text>
                {practicalInfo.commonScams.map((scam, i) => (
                  <Text key={i} style={st.p}>⚠️ {scam}</Text>
                ))}
              </View>
            )}

            {practicalInfo.safetyApps && practicalInfo.safetyApps.length > 0 && (
              <View style={st.infoBox}>
                <Text style={st.h3}>Recommended Safety Apps</Text>
                {practicalInfo.safetyApps.map((app, i) => (
                  <Text key={i} style={st.p}>• {app}</Text>
                ))}
              </View>
            )}

            {practicalInfo.healthRequirements && practicalInfo.healthRequirements.length > 0 && (
              <View style={st.infoBox}>
                <Text style={st.h3}>Health Requirements</Text>
                {practicalInfo.healthRequirements.map((req, i) => (
                  <Text key={i} style={st.p}>• {req}</Text>
                ))}
              </View>
            )}
          </>
        )}

        {/* Weather */}
        <Text style={st.h2}>Weather</Text>
        <Text style={st.p}>{weather}</Text>

        {/* Accommodation */}
        <Text style={st.h2}>Average accommodation (per night)</Text>

        {(['hostel','mid','high'] as const).map((tier) => {
          const t = accommodation[tier];
          return (
            <View key={tier} style={{ marginBottom: 8 }}>
              <Text style={{ ...st.p, fontFamily: 'Helvetica-Bold' }}>
                {tier === 'mid' ? 'Mid-range hotel' : tier === 'high' ? 'High-end / boutique' : 'Hostel / budget'}
                {`  ·  €${t.avgPrice}`}
              </Text>
              {t.examples.map((ex, i) => (
                <View key={i} style={st.bullet}>
                  <View style={st.dot} />
                  <Text style={st.p}>
                    {ex.name} – €{ex.price}
                    {ex.url && `  `}
                    {ex.url && <Link src={ex.url}>[book]</Link>}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}

        {/* Culture Tips */}
        <Text style={st.h2}>Local culture</Text>
        {cultureTips.map((tip, i) => (
          <Bullet key={i}>{tip}</Bullet>
        ))}
        
        {/* Food */}
        <Text style={st.h2}>Must-try food</Text>
        {foodList.map((food, i) => (
          <Bullet key={i}>
            {food.name} - ⭐ {food.rating} ({food.source})
            {food.note && ` - ${food.note}`}
          </Bullet>
        ))}
        
        {/* Tips */}
        <Text style={st.h2}>Tips & tricks</Text>
        <Text style={st.p}>{tips}</Text>

        {/* Day-by-day */}
        {days.map((d, i) => (
          <View key={i} wrap>
            <Text style={st.h2}>Day {i + 1} – {d.title} ({d.date})</Text>
            {d.steps.map((s, idx) => (
              <StepWithQR key={idx} step={s} />
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

        {/* Footer */}
        {footer?.disclaimers && (
          <>
            <View style={{ borderTop: 1, borderColor: '#e5e7eb', marginTop: 12 }} />
            <Text
              style={{ ...st.p, fontSize: 8, marginTop: 4, color: '#6b7280' }}
              render={({ pageNumber, totalPages }) =>
                `${footer.disclaimers}  ·  Page ${pageNumber}/${totalPages}`
              }
            />
          </>
        )}
      </Page>
    </Document>
  );
}

// Component to handle async QR code generation
function StepWithQR({ step }: { step: any }) {
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (step.mapLink) {
      toDataURL(step.mapLink).then(setQrDataUrl);
    }
  }, [step.mapLink]);

  return (
    <View style={st.stepRow}>
      <View style={st.stepText}>
        <Text style={st.p}>
          {step.time && `${step.time} – `}{step.text}
          {step.mode && ` (${step.mode})`}
          {step.cost && ` · ${step.cost}`}
        </Text>
      </View>
      {qrDataUrl && (
        <Image
          src={qrDataUrl}
          style={st.qrCode}
        />
      )}
    </View>
  );
}