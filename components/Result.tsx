'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, MapPin, Calendar, Shield, CreditCard, Phone, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { appendError } from '@/lib/logger';
import QRCodeRenderer from './QRCodeRenderer';
import { generateMapLink } from '@/lib/qr';

// Dynamically import PDF components to avoid SSR issues
const PdfDoc = dynamic(() => import('./PdfDoc'), { ssr: false });

interface ResultProps {
  itinerary: string;
  destination: string;
  onBack: () => void;
}

const Result: React.FC<ResultProps> = ({ itinerary, destination, onBack }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);
  const [structuredData, setStructuredData] = React.useState<any>(null);

  // Parse the JSON response when component mounts
  React.useEffect(() => {
    // Check if the itinerary string starts with '{' to determine if it's JSON
    if (itinerary.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(itinerary);
        
        // Add map links to each step
        const enhancedData = {
          ...parsed,
          destination: destination,
          dateRange: new Date().toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          }) + ' – ' + new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          }),
          days: parsed.days?.map((day: any) => ({
            ...day,
            steps: day.steps?.map((step: any) => ({
              ...step,
              mapLink: generateMapLink(`${step.text} ${destination}`)
            }))
          }))
        };
        
        setStructuredData(enhancedData);
      } catch (err) {
        // Only log parsing errors for content that looks like JSON
        console.error('Failed to parse JSON itinerary:', err);
        setStructuredData(null);
      }
    } else {
      // Content is not JSON (likely markdown or HTML), set to null without error
      setStructuredData(null);
    }
  }, [itinerary, destination]);

  const handleExportPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      
      if (!structuredData) {
        throw new Error('No structured data available for PDF generation');
      }
      
      // Dynamically import pdf function to avoid SSR issues
      const { pdf } = await import('@react-pdf/renderer');
      const { default: PdfDocComponent } = await import('./PdfDoc');
      
      const doc = React.createElement(PdfDocComponent, { data: structuredData });
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${destination.toLowerCase().replace(/\s+/g, '-')}-itinerary.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      appendError(err, 'pdf-export');
      console.error('PDF generation failed:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Render structured data as HTML
  const renderStructuredContent = (data: any) => {
    if (!data) return null;

    return (
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-2">
            <MapPin className="h-8 w-8" />
            {data.destination}
          </h1>
          <p className="text-gray-600 mb-4">{data.dateRange}</p>
          <p className="text-gray-700 leading-relaxed">{data.intro}</p>
        </div>

        {/* Before You Go */}
        {data.beforeYouGo && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Before You Go
            </h2>
            <ul className="space-y-2">
              {data.beforeYouGo.map((item: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Visa Information */}
        {data.visa && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
              <Shield className="h-5 w-5 text-green-500" />
              Visa Requirements
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Status:</span>
                {data.visa.required !== undefined ? (
                  <span className={`px-2 py-1 rounded text-sm ${data.visa.required ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                    {data.visa.required ? 'Visa Required' : 'Visa Not Required'}
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded text-sm bg-gray-100 text-gray-800">Status Unknown</span>
                )}
              </div>
              
              {data.visa.type && (
                <div><span className="font-semibold">Type:</span> {data.visa.type}</div>
              )}
              
              {data.visa.applicationMethod && (
                <div><span className="font-semibold">Apply via:</span> {data.visa.applicationMethod}</div>
              )}
              
              {data.visa.processingTime && (
                <div><span className="font-semibold">Processing time:</span> {data.visa.processingTime}</div>
              )}
              
              {data.visa.fee && (
                <div><span className="font-semibold">Fee:</span> {data.visa.fee}</div>
              )}
              
              {data.visa.validityPeriod && (
                <div><span className="font-semibold">Validity:</span> {data.visa.validityPeriod}</div>
              )}
              
              {data.visa.appointmentWarning && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 mt-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="font-semibold text-yellow-800">Important:</span>
                  </div>
                  <p className="text-yellow-700 mt-1">{data.visa.appointmentWarning}</p>
                </div>
              )}
              
              {data.visa.additionalRequirements && data.visa.additionalRequirements.length > 0 && (
                <div>
                  <span className="font-semibold">Required documents:</span>
                  <ul className="mt-2 space-y-1">
                    {data.visa.additionalRequirements.map((req: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 ml-4">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                        <span className="text-gray-700">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Currency & Payments */}
        {data.currency && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
              <CreditCard className="h-5 w-5 text-green-500" />
              Currency & Payments
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              {data.currency.homeToDestination && (
                <div><span className="font-semibold">Exchange rate:</span> {data.currency.homeToDestination}</div>
              )}
              {data.currency.destinationToHome && (
                <div><span className="font-semibold">Reverse rate:</span> {data.currency.destinationToHome}</div>
              )}
              {data.currency.cashCulture && (
                <div><span className="font-semibold">Payment culture:</span> {data.currency.cashCulture}</div>
              )}
              {data.currency.tippingNorms && (
                <div><span className="font-semibold">Tipping:</span> {data.currency.tippingNorms}</div>
              )}
              {data.currency.atmAvailability && (
                <div><span className="font-semibold">ATMs:</span> {data.currency.atmAvailability}</div>
              )}
              {data.currency.cardAcceptance && (
                <div><span className="font-semibold">Card acceptance:</span> {data.currency.cardAcceptance}</div>
              )}
            </div>
          </div>
        )}

        {/* Practical Information */}
        {data.practicalInfo && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
              <Phone className="h-5 w-5 text-purple-500" />
              Practical Information
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              
              {data.practicalInfo.powerPlugType && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Power & Electronics</h3>
                  <p className="text-gray-700">{data.practicalInfo.powerPlugType}</p>
                </div>
              )}

              {data.practicalInfo.emergencyNumbers && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Emergency Numbers</h3>
                  <div className="space-y-1 text-sm">
                    {data.practicalInfo.emergencyNumbers.police && (
                      <div><span className="font-medium">Police:</span> {data.practicalInfo.emergencyNumbers.police}</div>
                    )}
                    {data.practicalInfo.emergencyNumbers.medical && (
                      <div><span className="font-medium">Medical:</span> {data.practicalInfo.emergencyNumbers.medical}</div>
                    )}
                    {data.practicalInfo.emergencyNumbers.fire && (
                      <div><span className="font-medium">Fire:</span> {data.practicalInfo.emergencyNumbers.fire}</div>
                    )}
                    {data.practicalInfo.emergencyNumbers.tourist && (
                      <div><span className="font-medium">Tourist:</span> {data.practicalInfo.emergencyNumbers.tourist}</div>
                    )}
                  </div>
                </div>
              )}

              {data.practicalInfo.simCardOptions && data.practicalInfo.simCardOptions.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">SIM Card Options</h3>
                  <ul className="space-y-1">
                    {data.practicalInfo.simCardOptions.map((option: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></span>
                        <span className="text-gray-700 text-sm">{option}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.practicalInfo.commonScams && data.practicalInfo.commonScams.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-red-800">Common Scams to Avoid</h3>
                  <ul className="space-y-1">
                    {data.practicalInfo.commonScams.map((scam: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 text-red-500 mt-1 flex-shrink-0" />
                        <span className="text-red-700 text-sm">{scam}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.practicalInfo.safetyApps && data.practicalInfo.safetyApps.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Recommended Safety Apps</h3>
                  <ul className="space-y-1">
                    {data.practicalInfo.safetyApps.map((app: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                        <span className="text-gray-700 text-sm">{app}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.practicalInfo.healthRequirements && data.practicalInfo.healthRequirements.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-blue-800">Health Requirements</h3>
                  <ul className="space-y-1">
                    {data.practicalInfo.healthRequirements.map((req: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                        <span className="text-blue-700 text-sm">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Accommodation */}
        {data.averages && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
              Average Accommodation
            </h2>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <div className="bg-blue-500 text-white p-3 flex justify-between font-semibold">
                <span>Type</span>
                <span>Price / night</span>
              </div>
              <div className="divide-y divide-gray-200">
                {data.averages.hostel && (
                  <div className="p-3 flex justify-between">
                    <span>Hostel</span>
                    <span className="font-medium">${data.averages.hostel}</span>
                  </div>
                )}
                {data.averages.midHotel && (
                  <div className="p-3 flex justify-between">
                    <span>Mid-range hotel</span>
                    <span className="font-medium">${data.averages.midHotel}</span>
                  </div>
                )}
                {data.averages.highEnd && (
                  <div className="p-3 flex justify-between">
                    <span>High-end hotel</span>
                    <span className="font-medium">${data.averages.highEnd}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Culture Tips */}
        {data.cultureTips && data.cultureTips.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
              Culture Tips
            </h2>
            <ul className="space-y-2">
              {data.cultureTips.map((tip: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Food List */}
        {data.foodList && data.foodList.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
              Must-Try Food
            </h2>
            <div className="grid gap-3">
              {data.foodList.map((food: any, index: number) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-gray-800">{food.name}</h3>
                    <div className="text-sm text-gray-600">
                      ⭐ {food.rating} ({food.source})
                    </div>
                  </div>
                  {food.note && (
                    <p className="text-gray-600 text-sm">{food.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        {data.tips && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
              Tips & Tricks
            </h2>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-700">{data.tips}</p>
            </div>
          </div>
        )}

        {/* Daily Itinerary */}
        {data.days && data.days.map((day: any, index: number) => (
          <div key={index}>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
              <Calendar className="h-5 w-5 text-primary" />
              Day {index + 1} – {day.title} ({day.date})
            </h2>
            <ul className="space-y-3 mb-4">
              {day.steps && day.steps.map((step: any, stepIndex: number) => (
                <li key={stepIndex} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <span className="text-gray-700">
                      {step.time && <strong>{step.time} – </strong>}
                      {step.text}
                      {step.mode && <span className="text-gray-500"> ({step.mode})</span>}
                      {step.cost && <span className="font-medium text-green-600"> · {step.cost}</span>}
                    </span>
                  </div>
                  {step.mapLink && (
                    <QRCodeRenderer 
                      text={step.mapLink} 
                      size={48} 
                      className="ml-2"
                    />
                  )}
                </li>
              ))}
            </ul>
            {day.cost && (
              <div className="bg-gray-100 p-3 rounded-lg flex justify-between items-center">
                <span className="font-semibold">Estimated day total</span>
                <span className="font-bold text-lg">{day.cost}</span>
              </div>
            )}
          </div>
        ))}

        {/* Grand Total */}
        {data.totalCost && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Grand Total</h2>
            <p className="text-2xl font-bold text-blue-600">{data.totalCost}</p>
          </div>
        )}
      </div>
    );
  };

  // Fallback markdown renderer for non-structured responses
  const renderMarkdown = (content: string) => {
    return content.split('\n').map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return <br key={index} />;

      if (trimmed.startsWith('# ')) {
        return (
          <h1 key={index} className="text-3xl font-bold text-primary mb-6 flex items-center gap-2">
            <MapPin className="h-8 w-8" />
            {trimmed.replace('# ', '')}
          </h1>
        );
      } else if (trimmed.startsWith('## ')) {
        return (
          <h2 key={index} className="text-xl font-semibold text-gray-800 mt-8 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
            <Calendar className="h-5 w-5 text-primary" />
            {trimmed.replace('## ', '')}
          </h2>
        );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <li key={index} className="ml-6 mb-2 text-gray-700 leading-relaxed">
            {trimmed.replace(/^[*-] /, '')}
          </li>
        );
      } else {
        return (
          <p key={index} className="mb-3 text-gray-700 leading-relaxed">
            {trimmed}
          </p>
        );
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex justify-between items-start">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Your Personalized Itinerary
            </CardTitle>
            <div className="flex gap-3">
              <Button 
                onClick={handleExportPdf} 
                disabled={isGeneratingPdf || !structuredData}
                className="bg-primary hover:bg-primary/90 text-white px-6"
              >
                <Download className="h-4 w-4 mr-2" />
                {isGeneratingPdf ? 'Generating...' : 'Export PDF'}
              </Button>
              <Button 
                variant="outline" 
                onClick={onBack}
                className="px-6"
              >
                Create New
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="prose prose-lg max-w-none">
            {structuredData ? renderStructuredContent(structuredData) : renderMarkdown(itinerary)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Result;