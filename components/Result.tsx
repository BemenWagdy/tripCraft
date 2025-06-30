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

const Result: React.FC<ResultProps> = ({ itinerary, destination, onBack }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

  const handleExportPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      
      // Dynamically import pdf function to avoid SSR issues
      const { pdf } = await import('@react-pdf/renderer');
      const { default: PdfDocComponent } = await import('./PdfDoc');
      
      const doc = React.createElement(PdfDocComponent, { markdown: itinerary, destination });
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