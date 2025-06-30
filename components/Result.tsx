'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, MapPin, Calendar } from 'lucide-react';
import dynamic from 'next/dynamic';
import { appendError } from '@/lib/logger';

// Dynamically import PDF components to avoid SSR issues
const PdfDoc = dynamic(() => import('./PdfDoc'), { ssr: false });

interface ResultProps {
  itinerary: string;
  destination: string;
  onBack: () => void;
}

// Helper function to parse markdown itinerary into structured data for the new PDF format
function parseItineraryForPdf(markdown: string, destination: string) {
  const lines = markdown.split('\n').map(line => line.trim()).filter(Boolean);
  
  let intro = '';
  const days: Array<{
    date: string;
    title: string;
    items: Array<{ text: string; cost?: string }>;
    dailyTotal?: string;
  }> = [];
  
  let currentDay: any = null;
  let foundFirstDay = false;
  
  for (const line of lines) {
    // Skip the main title
    if (line.startsWith('# ')) {
      continue;
    }
    
    // Day headers (## Day 1: ... or ## Day 1 - ...)
    if (line.match(/^##\s*Day\s+\d+/i)) {
      if (currentDay) {
        days.push(currentDay);
      }
      
      // Extract day title and generate date
      const dayTitle = line.replace(/^##\s*Day\s+\d+[:\-\s]*/, '').trim();
      const dayNumber = days.length + 1;
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + dayNumber - 1);
      
      currentDay = {
        date: baseDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        title: dayTitle || 'Exploration',
        items: [],
      };
      foundFirstDay = true;
      continue;
    }
    
    // Budget lines - extract daily totals
    if (currentDay && (line.includes('Budget:') || line.includes('Total:') || line.includes('Estimated:'))) {
      const budgetMatch = line.match(/\$[\d,]+/);
      if (budgetMatch) {
        currentDay.dailyTotal = budgetMatch[0];
      }
      continue;
    }
    
    // Bullet points and activities
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (currentDay) {
        const text = line.replace(/^[*-]\s*/, '');
        const costMatch = text.match(/\$[\d,]+/);
        
        currentDay.items.push({
          text: text.replace(/\s*\$[\d,]+\s*/, ''), // Remove cost from text
          cost: costMatch ? costMatch[0] : undefined
        });
      }
      continue;
    }
    
    // Time-based activities (Morning:, Afternoon:, etc.)
    if (currentDay && line.match(/^(Morning|Afternoon|Evening|Night):/i)) {
      currentDay.items.push({
        text: line
      });
      continue;
    }
    
    // Regular paragraphs
    if (!foundFirstDay && line.length > 20) {
      intro += (intro ? ' ' : '') + line;
    } else if (currentDay && line.length > 10 && !line.includes('##')) {
      currentDay.items.push({
        text: line
      });
    }
  }
  
  // Add the last day
  if (currentDay) {
    days.push(currentDay);
  }
  
  // Fallback if no days were parsed
  if (days.length === 0) {
    const fallbackItems = lines
      .filter(line => !line.startsWith('#') && line.length > 10)
      .slice(0, 8)
      .map(text => ({ text }));
      
    days.push({
      date: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      title: 'Your Adventure',
      items: fallbackItems
    });
  }
  
  return {
    intro: intro || `Welcome to your personalized ${destination} adventure! This itinerary has been crafted specifically for your preferences and travel style.`,
    days
  };
}

const Result: React.FC<ResultProps> = ({ itinerary, destination, onBack }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

  const handleExportPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      
      // Parse the markdown itinerary into the new structured format
      const parsed = parseItineraryForPdf(itinerary, destination);
      
      // Create PDF data structure for the new component
      const pdfData = {
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
        intro: parsed.intro,
        days: parsed.days,
        traveller: 'Solo Traveller',
        grandTotal: undefined // Could be calculated from daily totals if needed
      };
      
      // Dynamically import pdf function to avoid SSR issues
      const { pdf } = await import('@react-pdf/renderer');
      const { default: PdfDocComponent } = await import('./PdfDoc');
      
      const doc = React.createElement(PdfDocComponent, pdfData);
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

  // Convert markdown to JSX for display
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
      } else if (trimmed.includes('**') && trimmed.includes('**')) {
        // Handle bold text
        const parts = trimmed.split('**');
        return (
          <p key={index} className="mb-3 text-gray-700 leading-relaxed">
            {parts.map((part, partIndex) => (
              partIndex % 2 === 1 ? 
                <strong key={partIndex} className="font-medium text-gray-900">{part}</strong> : 
                part
            ))}
          </p>
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
                disabled={isGeneratingPdf}
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
            {renderMarkdown(itinerary)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Result;