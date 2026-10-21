import { useEffect, useMemo, useState } from 'react';
import type { City, Metric } from '../types';
import type { DayResult } from '../lib/astronomy';
import { computeDaysForYear, findTodayIndex, localToday } from '../lib/astronomy';
import { findAllMatches } from '../lib/matcher';
import type { MetricResult } from '../lib/matcher';
import { getCachedDays, setCachedDays } from '../lib/cache';

export interface SolarData {
  year: number;
  todayISO: string;
  todayIndex: number;
  days: DayResult[];
  today: DayResult;
}

export function useSolarCalendar(city: City | null, toleranceSec: number) {
  const [data, setData] = useState<SolarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!city) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    // Откладываем тяжёлый расчёт, чтобы интерфейс успел отрисовать спиннер.
    const timer = setTimeout(() => {
      try {
        const { todayISO, year } = localToday(city.timezone);
        let days = getCachedDays(city.latitude, city.longitude, city.timezone, year);
        if (!days) {
          days = computeDaysForYear(city.latitude, city.longitude, city.timezone, year);
          setCachedDays(city.latitude, city.longitude, city.timezone, year, days);
        }
        const todayIndex = findTodayIndex(days, todayISO);
        if (cancelled) return;
        if (todayIndex < 0) {
          setError('Не удалось определить сегодняшнюю дату в выбранном часовом поясе.');
          setData(null);
          return;
        }
        setData({ year, todayISO, todayIndex, days, today: days[todayIndex] });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Не удалось выполнить расчёт.');
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 20);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [city]);

  const metricResults = useMemo<Record<Metric, MetricResult> | null>(() => {
    if (!data) return null;
    return findAllMatches(data.days, data.todayIndex, toleranceSec);
  }, [data, toleranceSec]);

  return { data, metricResults, loading, error };
}
