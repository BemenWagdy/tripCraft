import { z } from 'zod';

export const itinerarySchema = z.object({
  section: z.enum(['meta', 'days', 'extras']),
  data: z.any()
});

export const metaSchema = z.object({
  intro: z.string(),
  visa: z.object({
    required: z.boolean(),
    type: z.string().optional(),
    applicationMethod: z.string().optional(),
    processingTime: z.string().optional(),
    fee: z.string().optional(),
    validityPeriod: z.string().optional(),
    appointmentWarning: z.string().optional(),
    additionalRequirements: z.array(z.string()).optional()
  }),
  currency: z.object({
    destinationCode: z.string(),
    homeToDestination: z.string(),
    destinationToHome: z.string(),
    cashCulture: z.string().optional(),
    tippingNorms: z.string().optional(),
    atmAvailability: z.string().optional(),
    cardAcceptance: z.string().optional()
  }),
  beforeYouGo: z.array(z.string()),
  practicalInfo: z.object({
    powerPlugType: z.string().optional(),
    powerVoltage: z.string().optional(),
    simCardOptions: z.array(z.string()).optional(),
    emergencyNumbers: z.record(z.string()).optional(),
    commonScams: z.array(z.string()).optional(),
    safetyApps: z.array(z.string()).optional(),
    healthRequirements: z.array(z.string()).optional()
  }).optional(),
  cultureTips: z.array(z.string()),
  averages: z.object({
    hostel: z.number(),
    midHotel: z.number(),
    highEnd: z.number()
  }),
  weather: z.string()
});

export const daySchema = z.object({
  date: z.string(),
  title: z.string(),
  cost: z.string().optional(),
  steps: z.array(z.object({
    time: z.string().optional(),
    text: z.string(),
    mode: z.string().optional(),
    cost: z.string().optional()
  }))
});

export const extrasSchema = z.object({
  foodList: z.array(z.object({
    name: z.string(),
    note: z.string().optional(),
    price: z.string().optional(),
    rating: z.number(),
    source: z.string()
  })),
  tips: z.string(),
  totalCost: z.string().optional()
});

export type MetaBlock = z.infer<typeof metaSchema>;
export type Day = z.infer<typeof daySchema>;
export type ExtrasBlock = z.infer<typeof extrasSchema>;
export type Section = 'meta' | 'days' | 'extras';