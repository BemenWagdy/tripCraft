'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Plane, MapPin, Utensils, Wallet, Heart, Loader2 } from 'lucide-react';
import Result from './Result';
import { appendError } from '@/lib/logger';

interface FormData {
  destination: string;
  foodStyle: string;
  travelStyle: string;
  interests: string[];
  dailyBudget: number;
  duration: number;
}

const Questionnaire: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    destination: '',
    foodStyle: 'street',
    travelStyle: 'mid',
    interests: [],
    dailyBudget: 150,
    duration: 5
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [itinerary, setItinerary] = useState<string | null>(null);

  const interestOptions = [
    'History & Culture',
    'Adventure Sports',
    'Nature & Wildlife',
    'Art & Museums',
    'Nightlife',
    'Shopping',
    'Photography',
    'Local Experiences',
    'Beaches',
    'Architecture'
  ];

  const handleInterestChange = (interest: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, interest]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        interests: prev.interests.filter(i => i !== interest)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.destination.trim()) {
      alert('Please enter a destination');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      setItinerary(data.markdown);
    } catch (err) {
      appendError(err, 'questionnaire-submit');
      setItinerary(`# Error Generating Itinerary

We encountered an issue generating your itinerary. Please try again later.

## Sample Itinerary for ${formData.destination}

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
    return <Result itinerary={itinerary} destination={formData.destination} onBack={handleBack} />;
  }

  return (
    <div className="max-w-2xl mx-auto">
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
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Destination */}
            <div className="space-y-3">
              <Label htmlFor="destination" className="text-lg font-medium flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Where would you like to go?
              </Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                placeholder="e.g., Tokyo, Japan"
                className="text-lg p-4"
                required
              />
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <Label className="text-lg font-medium">Trip Duration: {formData.duration} days</Label>
              <Slider
                value={[formData.duration]}
                onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value[0] }))}
                max={14}
                min={2}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>2 days</span>
                <span>14 days</span>
              </div>
            </div>

            {/* Food Style */}
            <div className="space-y-4">
              <Label className="text-lg font-medium flex items-center gap-2">
                <Utensils className="h-5 w-5 text-primary" />
                Food Preferences
              </Label>
              <RadioGroup
                value={formData.foodStyle}
                onValueChange={(value) => setFormData(prev => ({ ...prev, foodStyle: value }))}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-gray-50">
                  <RadioGroupItem value="halal" id="halal" />
                  <Label htmlFor="halal" className="cursor-pointer">Halal Options</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-gray-50">
                  <RadioGroupItem value="street" id="street" />
                  <Label htmlFor="street" className="cursor-pointer">Street Food</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-gray-50">
                  <RadioGroupItem value="fine" id="fine" />
                  <Label htmlFor="fine" className="cursor-pointer">Fine Dining</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Travel Style */}
            <div className="space-y-4">
              <Label className="text-lg font-medium flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Travel Style
              </Label>
              <RadioGroup
                value={formData.travelStyle}
                onValueChange={(value) => setFormData(prev => ({ ...prev, travelStyle: value }))}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-gray-50">
                  <RadioGroupItem value="budget" id="budget" />
                  <Label htmlFor="budget" className="cursor-pointer">Budget Explorer</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-gray-50">
                  <RadioGroupItem value="mid" id="mid" />
                  <Label htmlFor="mid" className="cursor-pointer">Comfortable</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-gray-50">
                  <RadioGroupItem value="luxury" id="luxury" />
                  <Label htmlFor="luxury" className="cursor-pointer">Luxury</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Daily Budget */}
            <div className="space-y-3">
              <Label className="text-lg font-medium">Daily Budget: ${formData.dailyBudget}</Label>
              <Slider
                value={[formData.dailyBudget]}
                onValueChange={(value) => setFormData(prev => ({ ...prev, dailyBudget: value[0] }))}
                max={400}
                min={50}
                step={25}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>$50</span>
                <span>$400</span>
              </div>
            </div>

            {/* Interests */}
            <div className="space-y-4">
              <Label className="text-lg font-medium flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                What interests you?
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {interestOptions.map((interest) => (
                  <div key={interest} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50">
                    <Checkbox
                      id={interest}
                      checked={formData.interests.includes(interest)}
                      onCheckedChange={(checked) => handleInterestChange(interest, !!checked)}
                    />
                    <Label htmlFor={interest} className="text-sm cursor-pointer">
                      {interest}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-4 text-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Crafting Your Adventure...
                </>
              ) : (
                'Generate My Itinerary'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Questionnaire;