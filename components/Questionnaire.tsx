'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import {
  Form, FormField, FormItem, FormLabel, FormMessage,
  FormControl, FormDescription,
} from '@/components/FormPrimitives';

import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, MapPin, Calendar as CalendarIcon, Users, DollarSign, Heart, Utensils, Home, Car, Gift, Eye, AlertTriangle, Globe } from 'lucide-react';
import DestinationField from './DestinationField';
import { DateRangeField } from './DateRangeField';
import { countries } from '@/lib/countries';

import clsx from 'clsx';
import { useState } from 'react';
import Result from './Result';
import { appendError } from '@/lib/logger';

/*───────────────────────────────────────────────
  1.  Zod schema
───────────────────────────────────────────────*/
export const questionnaireSchema = z.object({
  destination: z.string().min(2, 'Pick a city'),
  dateRange: z.object({ 
    from: z.date(), 
    to: z.date() 
  }).refine(data => data.to > data.from, {
    message: "End date must be after start date"
  }),
  groupType: z.enum(['Solo','Couple','Family','Friends','Business','Seniors']),
  budgetPerDay: z.number().min(25).max(1000),
  travelVibe: z.enum(['Relaxation','Balanced','Adventure']),
  interests: z.array(z.string()).min(1, 'Select at least one interest'),
  dietary: z.enum(['None','Halal','Vegetarian','Vegan','Gluten-Free','Kosher']),
  accommodation: z.enum(['Hostel','Budget','Boutique','Luxury','Resort','Apartment']),
  transportPref: z.enum(['Public Transit','Rental Car','Private Driver','Walk/Bike']),
  occasion: z.enum(['None','Honeymoon','Anniversary','Birthday','Graduation']),
  country: z.string().min(2, 'Select your country'),
  mustSee: z.string().optional(),
  avoid: z.string().optional(),
});

export type QuestionnaireValues = z.infer<typeof questionnaireSchema>;

/* small helper for chip-buttons */
const chipClass = (selected: boolean) =>
  clsx(
    'rounded-lg border px-4 py-2 text-sm transition cursor-pointer',
    selected ? 'bg-blue-500 text-white border-blue-500' : 'bg-white hover:bg-blue-50 border-gray-200'
  );

/*───────────────────────────────────────────────
  2.  Component
───────────────────────────────────────────────*/
export default function Questionnaire() {
  const [isLoading, setIsLoading] = useState(false);
  const [itinerary, setItinerary] = useState<string | null>(null);

  const methods = useForm<QuestionnaireValues>({
    resolver: zodResolver(questionnaireSchema),
    defaultValues: {
      destination: '',
      dateRange: { 
        from: new Date(), 
        to: new Date(Date.now() + 7 * 86_400_000) // 7 days from now
      },
      groupType: 'Solo',
      budgetPerDay: 100,
      travelVibe: 'Balanced',
      interests: ['Culture'],
      dietary: 'None',
      accommodation: 'Boutique',
      transportPref: 'Public Transit',
      occasion: 'None',
      country: '',
      mustSee: '',
      avoid: '',
    },
  });

  const onSubmit = async (values: QuestionnaireValues) => {
    setIsLoading(true);
    
    try {
      // Calculate duration
      const duration = Math.ceil((values.dateRange.to.getTime() - values.dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      
      // Transform data for the API
      const formData = {
        destination: values.destination,
        country: values.country,
        foodStyle: values.dietary.toLowerCase(),
        travelStyle: values.travelVibe.toLowerCase(),
        interests: values.interests,
        dailyBudget: values.budgetPerDay,
        duration: duration,
        groupType: values.groupType,
        accommodation: values.accommodation,
        transportPref: values.transportPref,
        occasion: values.occasion,
        mustSee: values.mustSee,
        avoid: values.avoid,
        dateRange: {
          from: values.dateRange.from.toISOString(),
          to: values.dateRange.to.toISOString()
        },
      };

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        // 7. Empty-body bug fix - read response only once
        let errorData;
        if (!response.bodyUsed) {
          try {
            errorData = await response.json();
          } catch {
            errorData = { error: 'Failed to generate itinerary' };
          }
        } else {
          throw new Error('Empty response body');
        }
        throw new Error(errorData.error || 'Failed to generate itinerary');
      }

      // Read response only once
      let data;
      if (!response.bodyUsed) {
        data = await response.json();
      } else {
        throw new Error('Empty response body');
      }
      
      setItinerary(JSON.stringify(data));
    } catch (err) {
      appendError(err, 'questionnaire-submit');
      setItinerary(`# Error Generating Itinerary

We encountered an issue generating your itinerary. Please try again later.

## Sample Itinerary for ${values.destination}

### Day 1: Arrival
- Check into accommodation
- Explore local area
- Welcome dinner

### Day 2: Main Attractions  
- Visit popular landmarks
- Cultural experiences
- Local cuisine tasting

### Day 3: Adventure Day
- Outdoor activities
- Hidden gems exploration
- Sunset viewing

*This is a fallback itinerary due to technical issues.*`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setItinerary(null);
  };

  if (itinerary) {
    return <Result itinerary={itinerary} destination={methods.getValues('destination')} onBack={handleBack} />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-3">
            <Plane className="h-8 w-8" />
            TripCraft
          </CardTitle>
          <p className="text-center text-blue-100 mt-2">
            Your AI-powered travel companion
          </p>
        </CardHeader>
        <CardContent className="p-8">
          <Form {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Destination */}
              <FormField
                control={methods.control}
                name="destination"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-500" />
                      Destination city
                    </FormLabel>
                    <FormControl>
                      <DestinationField />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date range */}
              <FormField
                control={methods.control}
                name="dateRange"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-blue-500" />
                      Travel dates
                    </FormLabel>
                    <FormControl>
                      <DateRangeField form={methods} name="dateRange" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Group type */}
              <FormField
                control={methods.control}
                name="groupType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      Travelling as
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-wrap gap-3"
                      >
                        {['Solo','Couple','Family','Friends','Business','Seniors'].map((opt) => (
                          <div key={opt} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50">
                            <RadioGroupItem value={opt} id={opt} />
                            <FormLabel htmlFor={opt} className="cursor-pointer font-normal">
                              {opt}
                            </FormLabel>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Budget slider */}
              <FormField
                control={methods.control}
                name="budgetPerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-blue-500" />
                      Daily budget (USD)
                    </FormLabel>
                    <FormControl>
                      <Slider
                        min={25} max={1000} step={25}
                        value={[field.value]}
                        onValueChange={(v) => field.onChange(v[0])}
                        className="w-full"
                      />
                    </FormControl>
                    <FormDescription className="text-right font-medium text-lg">
                      ${field.value}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Country/Nationality */}
              <FormField
                control={methods.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium flex items-center gap-2">
                      <Globe className="h-5 w-5 text-blue-500" />
                      Your nationality / passport
                    </FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose your country…" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {countries.map(country => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Travel vibe */}
              <FormField
                control={methods.control}
                name="travelVibe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium flex items-center gap-2">
                      <Heart className="h-5 w-5 text-blue-500" />
                      Trip vibe
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex gap-3"
                      >
                        {['Relaxation','Balanced','Adventure'].map((opt) => (
                          <div key={opt} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50">
                            <RadioGroupItem value={opt} id={`vibe-${opt}`} />
                            <FormLabel htmlFor={`vibe-${opt}`} className="cursor-pointer font-normal">
                              {opt}
                            </FormLabel>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Interests chips */}
              <FormField
                control={methods.control}
                name="interests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium">Main interests</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {['Culture','Nature','Beaches','Nightlife','Foodie','Shopping','Wellness','Photography','Festivals','Sports'].map((opt) => {
                          const selected = field.value.includes(opt);
                          return (
                            <button
                              type="button"
                              key={opt}
                              onClick={() =>
                                field.onChange(
                                  selected
                                    ? field.value.filter((v) => v !== opt)
                                    : [...field.value, opt]
                                )
                              }
                              className={chipClass(selected)}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dietary */}
              <FormField
                control={methods.control}
                name="dietary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium flex items-center gap-2">
                      <Utensils className="h-5 w-5 text-blue-500" />
                      Dietary preference
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-wrap gap-3"
                      >
                        {['None','Halal','Vegetarian','Vegan','Gluten-Free','Kosher'].map((opt) => (
                          <div key={opt} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50">
                            <RadioGroupItem value={opt} id={`dietary-${opt}`} />
                            <FormLabel htmlFor={`dietary-${opt}`} className="cursor-pointer font-normal">
                              {opt}
                            </FormLabel>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Accommodation */}
              <FormField
                control={methods.control}
                name="accommodation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium flex items-center gap-2">
                      <Home className="h-5 w-5 text-blue-500" />
                      Preferred stay
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-wrap gap-3"
                      >
                        {['Hostel','Budget','Boutique','Luxury','Resort','Apartment'].map((opt) => (
                          <div key={opt} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50">
                            <RadioGroupItem value={opt} id={`accommodation-${opt}`} />
                            <FormLabel htmlFor={`accommodation-${opt}`} className="cursor-pointer font-normal">
                              {opt}
                            </FormLabel>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Transport */}
              <FormField
                control={methods.control}
                name="transportPref"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium flex items-center gap-2">
                      <Car className="h-5 w-5 text-blue-500" />
                      Getting around
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-col gap-2"
                      >
                        {['Public Transit','Rental Car','Private Driver','Walk/Bike'].map((opt) => (
                          <div key={opt} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50">
                            <RadioGroupItem value={opt} id={`transport-${opt}`} />
                            <FormLabel htmlFor={`transport-${opt}`} className="cursor-pointer font-normal">
                              {opt}
                            </FormLabel>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Occasion */}
              <FormField
                control={methods.control}
                name="occasion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium flex items-center gap-2">
                      <Gift className="h-5 w-5 text-blue-500" />
                      Special occasion?
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-wrap gap-3"
                      >
                        {['None','Honeymoon','Anniversary','Birthday','Graduation'].map((opt) => (
                          <div key={opt} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50">
                            <RadioGroupItem value={opt} id={`occasion-${opt}`} />
                            <FormLabel htmlFor={`occasion-${opt}`} className="cursor-pointer font-normal">
                              {opt}
                            </FormLabel>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Must-see / Avoid */}
              <FormField
                control={methods.control}
                name="mustSee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium flex items-center gap-2">
                      <Eye className="h-5 w-5 text-blue-500" />
                      Must-see spots (optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={3} 
                        placeholder="e.g. Pyramids, jazz bar, local markets" 
                        {...field} 
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={methods.control}
                name="avoid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-blue-500" />
                      Things to avoid (optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={3} 
                        placeholder="e.g. long hikes, spicy food, crowded places" 
                        {...field} 
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit */}
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-4 text-lg"
              >
                {isLoading ? 'Crafting Your Adventure...' : 'Generate My Itinerary'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}