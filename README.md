# TripCraft - AI-Powered Travel Itinerary Generator

TripCraft is a beautiful, modern web application that creates personalized travel itineraries using AI. Simply answer a few questions about your travel preferences, and our AI will generate a detailed itinerary that you can export as a professional PDF.

## Features

- 🤖 **AI-Powered**: Uses Groq's Llama-3-70B model for intelligent itinerary generation
- 📋 **Smart Questionnaire**: Collects travel preferences including destination, budget, interests, and travel style
- 📱 **Responsive Design**: Beautiful UI that works perfectly on all devices
- 📄 **PDF Export**: Professional-quality PDF generation with branded design
- 🔍 **Error Logging**: Comprehensive error tracking for reliability
- ⚡ **Fast**: Built with Next.js for optimal performance

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment:**
   ```bash
   cp .env.example .env.local
   # Add your GROQ_API_KEY to .env.local
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Visit [http://localhost:3000](http://localhost:3000)

## Environment Variables

- `GROQ_API_KEY`: Your Groq API key for AI-powered itinerary generation

## Tech Stack

- **Framework**: Next.js 13.5.1
- **Styling**: Tailwind CSS + shadcn/ui
- **AI**: Groq SDK with Llama-3-70B
- **PDF Generation**: @react-pdf/renderer
- **Icons**: Lucide React
- **TypeScript**: Full type safety

## Project Structure

```
├── app/
│   ├── api/ai/route.ts      # Groq AI integration
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main page
├── components/
│   ├── Questionnaire.tsx    # Travel preferences form
│   ├── Result.tsx           # Itinerary display
│   └── PdfDoc.tsx           # PDF document template
└── lib/
    ├── groq.ts              # Groq client setup
    └── logger.ts            # Error logging utility
```

## How It Works

1. **Questionnaire**: Users answer questions about their travel preferences
2. **AI Processing**: Groq's Llama-3-70B generates a personalized itinerary
3. **Display**: The itinerary is beautifully rendered with markdown formatting
4. **Export**: Users can download a professional PDF of their itinerary

## Error Handling

All errors are logged to `.error-log.txt` during development, with fallback responses to ensure the app remains functional even when the AI service is unavailable.

## License

MIT License - see LICENSE file for details.