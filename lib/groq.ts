import Groq from 'groq-sdk';

export const groq = new Groq({ 
  apiKey: process.env.GROQ_API_KEY! 
});

export const MODEL = 'llama3-70b-8192';
export const GROQ_MODEL = 'llama3-70b-8192'; // Keep for backward compatibility