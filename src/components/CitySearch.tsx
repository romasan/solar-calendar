import { useEffect, useRef, useState } from 'react';
import type { City } from '../types';
import { searchCities, withTimeout } from '../lib/geocode';
import { countryFlag } from '../lib/format';
import { SearchIcon, PinIcon, Spinner } from './Icons';

interface Props {
  onSelect: (city: City) => void;
}

const DEBOUNCE_MS = 350;
const TIMEOUT_MS = 10000;

export function CitySearch({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setError(null);
      setOpen(false);
      return;
    }

    const { signal, cancel } = withTimeout(TIMEOUT_MS);
    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const found = await searchCities(query, signal);
        setResults(found);
        setActiveIndex(found.length ? 0 : -1);
        setOpen(true);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setResults([]);
        setError(e instanceof Error ? e.message : 'Ошибка поиска');
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      cancel();
    };
  }, [query]);

  // Закрытие списка по клику вне компонента.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function choose(city: City) {
    onSelect(city);
    setQuery('');
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) choose(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="search" ref={boxRef}>
      <div className="search-box">
        <SearchIcon className="search-icon" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="city-results"
          aria-activedescendant={activeIndex >= 0 ? `city-opt-${activeIndex}` : undefined}
          value={query}
          placeholder="Введите название города…"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {loading && <Spinner className="search-spinner" />}
      </div>

      {error && <p className="search-error" role="alert">{error}</p>}

      {open && results.length > 0 && (
        <ul className="search-results" id="city-results" role="listbox">
          {results.map((city, i) => (
            <li
              key={`${city.id}-${city.latitude}-${city.longitude}`}
              id={`city-opt-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={i === activeIndex ? 'search-result active' : 'search-result'}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(city);
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <PinIcon className="search-result-pin" />
              <span className="search-result-main">
                <span className="search-result-name">{city.name}</span>
                <span className="search-result-sub">
                  {[city.admin1, city.country].filter(Boolean).join(', ')}
                </span>
              </span>
              <span className="search-result-flag">{countryFlag(city.countryCode)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
