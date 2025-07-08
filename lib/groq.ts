import Groq from 'groq-sdk';

if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is required but not found in environment variables');
}

export const groq = new Groq({ 
  apiKey: process.env.GROQ_API_KEY! 
});

export const GROQ_MODEL = 'llama3-70b-8192';