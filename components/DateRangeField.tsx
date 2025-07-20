'use client';

import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { UseFormReturn, FieldValues, FieldPath } from 'react-hook-form';
import { DateRange, Matcher } from 'react-day-picker';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props<T extends FieldValues> = {
  form: UseFormReturn<T>;
  name: FieldPath<T>;
  label?: string;
};

export function DateRangeField<T extends FieldValues>({
  form,
  name,
  label = 'Date range',
}: Props<T>) {
  const value = form.watch(name) as DateRange | undefined;
  const pretty =
    value?.from && value?.to
      ? `${format(value.from, 'yyyy-MM-dd')} → ${format(value.to, 'yyyy-MM-dd')}`
      : 'Pick dates';

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value?.from && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {pretty}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={value as DateRange | undefined}
            defaultMonth={value?.from}
            onSelect={(rng) => {
              // react-day-picker returns undefined when the user clears the range.
              // Our RHF field expects a DateRange, so fall back to an empty object.
              if (rng) {
                form.setValue(name, rng as DateRange, { shouldValidate: true })
              } else {
                form.setValue(name, { from: undefined, to: undefined } as DateRange, {
                  shouldValidate: true,
                })
              }
            }}
            disabled={(date) => date < new Date()}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}