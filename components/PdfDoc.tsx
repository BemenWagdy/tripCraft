/* components/PdfDoc.tsx */
import React from 'react';
import {
  Document, Page, View, Text, StyleSheet, Image
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
    required: boolean;
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
    homeToDestination: string;
    destinationToHome: string;
    cashCulture?: string;
    tippingNorms?: string;
    atmAvailability?: string;
    cardAcceptance?: string;
  };
  averages: { hostel: number; midHotel: number; highEnd: number };
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
    simCardOptions?: string[];
    emergencyNumbers?: {
      police?: string;
      medical?: string;
      fire?: string;
      tourist?: string;
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
}

export default function PdfDoc({ data }: { data: StructuredData }) {
  const {
    destination, dateRange, intro, visa, currency,
    averages, weather, cultureTips, foodList, practicalInfo, tips, beforeYouGo, days, totalCost
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
        <View style={visa.required ? st.warningBox : st.visaBox}>
          <Text style={{ ...st.p, fontFamily: 'Helvetica-Bold' }}>
            Status: {visa.required ? 'Visa Required' : 'Visa Not Required'}
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
          {currency.cashCulture && <Text style={st.p}>Payment culture: {currency.cashCulture}</Text>}
          {currency.tippingNorms && <Text style={st.p}>Tipping: {currency.tippingNorms}</Text>}
          {currency.atmAvailability && <Text style={st.p}>ATMs: {currency.atmAvailability}</Text>}
          {currency.cardAcceptance && <Text style={st.p}>Cards: {currency.cardAcceptance}</Text>}
        </View>

        {/* Practical Information */}
        {practicalInfo && (
          <>
            <Text style={st.h2}>Practical Information</Text>
            
            {practicalInfo.powerPlugType && (
              <View style={st.infoBox}>
                <Text style={st.h3}>Power & Electronics</Text>
                <Text style={st.p}>{practicalInfo.powerPlugType}</Text>
              </View>
            )}

            {practicalInfo.emergencyNumbers && (
              <View style={st.emergencyBox}>
                <Text style={st.h3}>Emergency Numbers</Text>
                {practicalInfo.emergencyNumbers.police && (
                  <Text style={st.p}>Police: {practicalInfo.emergencyNumbers.police}</Text>
                )}
                {practicalInfo.emergencyNumbers.medical && (
                  <Text style={st.p}>Medical: {practicalInfo.emergencyNumbers.medical}</Text>
                )}
                {practicalInfo.emergencyNumbers.fire && (
                  <Text style={st.p}>Fire: {practicalInfo.emergencyNumbers.fire}</Text>
                )}
                {practicalInfo.emergencyNumbers.tourist && (
                  <Text style={st.p}>Tourist: {practicalInfo.emergencyNumbers.tourist}</Text>
                )}
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