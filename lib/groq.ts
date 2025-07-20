import Groq from 'groq-sdk';

// Initialize Groq client with proper error handling
export const groq = new Groq({ 
  apiKey: process.env.GROQ_API_KEY || ''
});

export const GROQ_MODEL = 'llama3-70b-8192';