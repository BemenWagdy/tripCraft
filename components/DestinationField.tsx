'use client';

import { useState } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { useFormContext } from 'react-hook-form';
import debounce from 'lodash.debounce';

type Opt = { label: string; value: string };

export default function DestinationField() {
  const { setValue } = useFormContext();
  const [query, setQuery] = useState('');
  const [opts, setOpts] = useState<Opt[]>([]);
  const [load, setLoad] = useState(false);

  const lookup = debounce(async (q: string) => {
    if (!q) return setOpts([]);
    setLoad(true);
    try {
      const r = await fetch(`/api/cities?q=${encodeURIComponent(q)}`);
      const data = await r.json();
      setOpts(data);
    } catch (error) {
      console.error('City lookup failed:', error);
      setOpts([]);
    } finally {
      setLoad(false);
    }
  }, 300);

  return (
    <Combobox
      value={query}
      onInputChange={(v) => {
        setQuery(v);
        lookup(v);
      }}
      onValueChange={(v) => {
        setQuery(v);
        setValue('destination', v, { shouldValidate: true });
      }}
      options={opts}
      placeholder="Start typing a city…"
      isLoading={load}
      className="w-full"
    />
  );
}