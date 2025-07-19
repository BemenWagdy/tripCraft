export interface Step {
  time?: string;
  text: string;
  mode?: string;
  cost?: string;
  mapLink?: string;
}

export interface FormValues {
  destination: string;
  dateRange: { from: Date; to: Date };
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
  beforeYouGo?: string[];
  visa?: {
    required?: boolean;
    type?: string;
    applicationMethod?: string;
    processingTime?: string;
    fee?: string;
    validityPeriod?: string;
    appointmentWarning?: string;
    additionalRequirements?: string[];
  };
  currency?: {
    destinationCode?: string;
    homeToDestination?: string;
    destinationToHome?: string;
    cashCulture?: string;
    tippingNorms?: string;
    atmAvailability?: string;
    cardAcceptance?: string;
  };
  averages?: { hostel?: string; midHotel?: string; highEnd?: string };
  weather: string;
  cultureTips?: string[];
  foodList?: Array<{
    name: string;
    note?: string;
    rating: number;
    source: string;
  }>;
  tips?: string;
  practicalInfo?: {
    powerPlugType?: string;
    simCardOptions?: string[];
    emergencyNumbers?: {
      police?: string;
      medical?: string;
      fire?: string;
      tourist?: string;
    };
    commonScams?: string[];
    safetyApps?: string[];
    healthRequirements?: string[];
  };
  days: Array<{
    date: string;
    title: string;
    cost?: string;
    steps: Step[];
  }>;
  totalCost?: string;
}