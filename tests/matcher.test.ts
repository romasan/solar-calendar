import { describe, expect, it } from 'vitest';
import { EXACT_EPSILON_SEC, findMatches } from '../src/lib/matcher';
import type { DayResult } from '../src/lib/astronomy';

function day(
  dateISO: string,
  sunrise: number | null,
  sunset: number | null,
  dayLength: number,
  state: DayResult['state'] = 'normal',
): DayResult {
  return { dateISO, sunriseSec: sunrise, sunsetSec: sunset, dayLengthSec: dayLength, state };
}

describe('findMatches — базовые сценарии', () => {
  it('Исключает сегодня и находит точное совпадение + в пределах допуска, сортирует по дате', () => {
    const days = [
      day('2026-03-03', 25200, 64800, 39600), // восход 07:00:00 — совпадает с сегодня
      day('2026-03-04', 25200, 64820, 39620), // «сегодня»
      day('2026-03-05', 25260, 64800, 39540), // +60 с
    ];
    const r = findMatches(days, 1, 'sunrise', 60);
    expect(r.applicable).toBe(true);
    expect(r.todayValueSec).toBe(25200);
    expect(r.matches.map((m) => m.dateISO)).toEqual(['2026-03-03', '2026-03-05']);
    expect(r.matches.some((m) => m.dateISO === '2026-03-04')).toBe(false);
    expect(r.hasExactMatch).toBe(true);
  });

  it('Точное совпадение помечается флагом exact', () => {
    const days = [
      day('2026-01-02', 25000, 64800, 39800),
      day('2026-01-03', 25000, 64800, 39800), // сегодня
    ];
    const r = findMatches(days, 1, 'sunrise', 60);
    expect(r.matches).toHaveLength(1);
    expect(r.matches[0].exact).toBe(true);
    expect(Math.abs(r.matches[0].diffSec)).toBeLessThanOrEqual(EXACT_EPSILON_SEC);
  });

  it('Без совпадений в допуске возвращает ближайшую дату', () => {
    const days = [
      day('2026-04-01', 26000, 64800, 38800), // +800
      day('2026-04-02', 25200, 64800, 39600), // сегодня
      day('2026-04-03', 24900, 64800, 39900), // −300 → ближайшая
      day('2026-04-04', 24500, 64800, 40300), // −700
    ];
    const r = findMatches(days, 1, 'sunrise', 60);
    expect(r.matches).toHaveLength(0);
    expect(r.hasExactMatch).toBe(false);
    expect(r.closest?.dateISO).toBe('2026-04-03');
    expect(r.closest?.diffSec).toBeCloseTo(-300, 5);
  });

  it('Несколько совпадений в пределах допуска — возвращает все', () => {
    const days = [
      day('2026-05-01', 25050, 64800, 39750),
      day('2026-05-02', 25200, 64800, 39600), // сегодня
      day('2026-05-03', 25320, 64800, 39480),
      day('2026-05-04', 25000, 64800, 39800),
    ];
    const r = findMatches(days, 1, 'sunrise', 120);
    // 25050 (+150) не входит, 25320 (+120) входит, 25000 (−200) не входит
    expect(r.matches.map((m) => m.dateISO)).toEqual(['2026-05-03']);
    expect(r.matches[0].diffSec).toBeCloseTo(120, 5);
  });

  it('Разница со знаком: найденное позже/больше — положительная, раньше/меньше — отрицательная', () => {
    const days = [
      day('2026-06-01', 25300, 64800, 39500), // +100
      day('2026-06-02', 25200, 64800, 39600), // сегодня
      day('2026-06-03', 25100, 64800, 39700), // −100
    ];
    const r = findMatches(days, 1, 'sunrise', 200);
    const byDate = (iso: string) => r.matches.find((m) => m.dateISO === iso)!;
    expect(byDate('2026-06-01').diffSec).toBeGreaterThan(0);
    expect(byDate('2026-06-03').diffSec).toBeLessThan(0);
    expect(byDate('2026-06-01').dayOffset).toBe(-1);
    expect(byDate('2026-06-03').dayOffset).toBe(1);
  });
});

describe('findMatches — границы года', () => {
  it('В начале года нет дат до сегодня', () => {
    const days = [
      day('2026-01-01', 25000, 64800, 39800), // сегодня
      day('2026-01-02', 25000, 64800, 39800), // совпадение после
    ];
    const r = findMatches(days, 0, 'sunrise', 60);
    expect(r.matches.map((m) => m.dateISO)).toEqual(['2026-01-02']);
    expect(r.closestBefore).toBeNull();
    expect(r.closestAfter?.dateISO).toBe('2026-01-02');
  });

  it('В конце года нет дат после сегодня', () => {
    const days = [
      day('2026-12-30', 25000, 64800, 39800), // совпадение до
      day('2026-12-31', 25000, 64800, 39800), // сегодня
    ];
    const r = findMatches(days, 1, 'sunrise', 60);
    expect(r.matches.map((m) => m.dateISO)).toEqual(['2026-12-30']);
    expect(r.closestAfter).toBeNull();
    expect(r.closestBefore?.dateISO).toBe('2026-12-30');
  });
});

describe('findMatches — полярные условия', () => {
  it('Длительность дня сравнивается и в полярный день (86400 с)', () => {
    const days = [
      day('2026-06-01', null, null, 86400, 'polar-day'),
      day('2026-06-15', null, null, 86400, 'polar-day'), // сегодня
      day('2026-07-01', null, null, 86400, 'polar-day'),
    ];
    const r = findMatches(days, 1, 'daylength', 60);
    expect(r.applicable).toBe(true);
    expect(r.todayValueSec).toBe(86400);
    expect(r.matches.map((m) => m.dateISO)).toEqual(['2026-06-01', '2026-07-01']);
    expect(r.hasExactMatch).toBe(true);
  });

  it('Если сегодня восхода нет — показатель неприменим', () => {
    const days = [
      day('2026-12-01', null, null, 0, 'polar-night'),
      day('2026-12-15', null, null, 0, 'polar-night'), // сегодня
    ];
    const r = findMatches(days, 1, 'sunrise', 60);
    expect(r.applicable).toBe(false);
    expect(r.todayValueSec).toBeNull();
    expect(r.matches).toHaveLength(0);
  });
});
