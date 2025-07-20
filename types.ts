import { DateRange } from 'react-day-picker';

export interface Step {
  time?: string;
  text: string;
  mode?: string;
  cost?: string;
  mapLink?: string;
}

export interface FormValues {
  destination: string;
  dateRange: DateRange | undefined;
  groupType: string;
  budgetPerDay: number;
  travelVibe: string;
  interests: string[];
  dietary: string;
  accommodation: string;
  transportPref: string;
  occasion: string;
  mustSee?: string;
  avoid?: string;
  country: string;
}

export interface ItineraryData {
  intro: string;
  beforeYouGo: string[];
  visa: string;
  currency: { code: string; rateUsd: number };
  averages: { hostel: number; midHotel: number; highEnd: number };
  weather: string;
  cultureTips: string[];
  foodList: Array<{
    name: string;
    note?: string;
    rating: number;
    source: string;
  }>;
  tips: string;
  days: Array<{
    date: string;
    title: string;
    cost?: string;
    steps: Step[];
  }>;
  totalCost?: string;
}