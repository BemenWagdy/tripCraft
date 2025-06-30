'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useFormContext } from 'react-hook-form';
import debounce from 'lodash.debounce';

type Opt = { label: string; value: string };

export default function DestinationField() {
  const { setValue, watch } = useFormContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(false);
  
  const currentValue = watch('destination') || '';

  const lookup = debounce(async (q: string) => {
    if (!q) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`/api/cities?q=${encodeURIComponent(q)}`);
      const data = await r.json();
      setOptions(data);
    } catch (error) {
      console.error('City lookup failed:', error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, 300);

  const handleSelect = (selectedValue: string) => {
    setValue('destination', selectedValue, { shouldValidate: true });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {currentValue || "Start typing a city..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder="Search cities..."
            value={query}
            onValueChange={(value) => {
              setQuery(value);
              lookup(value);
            }}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading..." : "No cities found."}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentValue === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}