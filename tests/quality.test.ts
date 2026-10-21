import { describe, expect, it } from 'vitest';
import { computeDaysForYear, findTodayIndex } from '../src/lib/astronomy';
import { findAllMatches } from '../src/lib/matcher';
import { formatDiff, formatDuration, formatTimeOfDay } from '../src/lib/format';

describe('Сквозной сценарий по всему году (реальные расчёты)', () => {
  it('Москва: полный год считается и даёт осмысленные результаты без падений', () => {
    const days = computeDaysForYear(55.75204, 37.61781, 'Europe/Moscow', 2026);
    const todayIndex = findTodayIndex(days, '2026-10-21');
    expect(todayIndex).toBeGreaterThanOrEqual(0);

    const res = findAllMatches(days, todayIndex, 60);
    for (const metric of ['sunrise', 'sunset', 'daylength'] as const) {
      const r = res[metric];
      expect(r.applicable).toBe(true);
      // Каждая найденная дата — в пределах допуска.
      for (const m of r.matches) {
        expect(m.absDiffSec).toBeLessThanOrEqual(60);
      }
      // Ближайшая дата определена, даже если нет совпадений в допуске.
      expect(r.closest).not.toBeNull();
    }
  });

  it('Начало года: у всех совпадений смещение неотрицательное (даты только в будущем)', () => {
    const days = computeDaysForYear(55.75204, 37.61781, 'Europe/Moscow', 2026);
    const todayIndex = findTodayIndex(days, '2026-01-01');
    expect(todayIndex).toBe(0);
    const res = findAllMatches(days, todayIndex, 120);
    for (const metric of ['sunrise', 'sunset', 'daylength'] as const) {
      for (const m of res[metric].matches) {
        expect(m.dayOffset).toBeGreaterThanOrEqual(0);
      }
      expect(res[metric].closestBefore).toBeNull();
    }
  });

  it('Конец года: у всех совпадений смещение неположительное (даты только в прошлом)', () => {
    const days = computeDaysForYear(55.75204, 37.61781, 'Europe/Moscow', 2026);
    const todayIndex = findTodayIndex(days, '2026-12-31');
    expect(todayIndex).toBe(days.length - 1);
    const res = findAllMatches(days, todayIndex, 120);
    for (const metric of ['sunrise', 'sunset', 'daylength'] as const) {
      for (const m of res[metric].matches) {
        expect(m.dayOffset).toBeLessThanOrEqual(0);
      }
      expect(res[metric].closestAfter).toBeNull();
    }
  });

  it('Полярный день (Тромсё): длительность дня 24 ч совпадает с другими полярными днями', () => {
    const days = computeDaysForYear(69.6492, 18.9553, 'Europe/Oslo', 2026);
    const todayIndex = findTodayIndex(days, '2026-06-15');
    const res = findAllMatches(days, todayIndex, 60);
    expect(days[todayIndex].state).toBe('polar-day');
    expect(res.daylength.applicable).toBe(true);
    expect(res.daylength.todayValueSec).toBe(86400);
    // Восход/закат в полярный день неприменимы.
    expect(res.sunrise.applicable).toBe(false);
    expect(res.sunset.applicable).toBe(false);
  });
});

describe('Форматирование', () => {
  it('Форматирует длительность дня', () => {
    expect(formatDuration(34842)).toBe('9 ч 40 мин 42 с');
    expect(formatDuration(0)).toBe('0 с');
    expect(formatDuration(86400)).toBe('24 ч 0 мин 0 с');
  });

  it('Форматирует время суток', () => {
    expect(formatTimeOfDay(25205)).toBe('07:00:05');
    expect(formatTimeOfDay(0)).toBe('00:00:00');
  });

  it('Форматирует разницу со знаком', () => {
    expect(formatDiff(24)).toBe('+24 с');
    expect(formatDiff(-18)).toBe('−18 с');
    expect(formatDiff(0)).toBe('0 с');
  });
});
