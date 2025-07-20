import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TripCraft - AI-Powered Travel Itineraries',
  description: 'Create personalized travel itineraries with AI. Plan your perfect trip with TripCraft.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}