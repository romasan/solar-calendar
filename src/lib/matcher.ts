import type { Metric } from '../types';
import type { DayResult } from './astronomy';

/** Порог, при котором разницу считаем «точным совпадением». */
export const EXACT_EPSILON_SEC = 1.0;

export interface DayMatch {
  dateISO: string;
  /** Значение показателя на найденной дате, в секундах (дробные). */
  valueSec: number;
  /** Разница «найденное − сегодня» в секундах, со знаком. */
  diffSec: number;
  absDiffSec: number;
  /** Смещение относительно сегодня в днях (отрицательное — прошлое). */
  dayOffset: number;
  /** Истина, если |diff| ≤ точности алгоритма. */
  exact: boolean;
}

export interface MetricResult {
  metric: Metric;
  /** Ложно, когда сегодня нет восхода/заката (полярные условия) — сравнивать нечего. */
  applicable: boolean;
  todayValueSec: number | null;
  toleranceSec: number;
  /** Все подходящие даты (кроме сегодня) в пределах допуска, в хронологическом порядке. */
  matches: DayMatch[];
  hasExactMatch: boolean;
  /** Ближайшая по модулю разницы дата (когда точных/допустимых совпадений нет). */
  closest: DayMatch | null;
  /** Ближайшая подходящая дата до сегодня и после сегодня (в пределах допуска). */
  closestBefore: DayMatch | null;
  closestAfter: DayMatch | null;
}

function valueFor(day: DayResult, metric: Metric): number | null {
  if (metric === 'sunrise') return day.sunriseSec;
  if (metric === 'sunset') return day.sunsetSec;
  return day.dayLengthSec;
}

/**
 * Найти даты года, на которых значение показателя совпадает с сегодняшним
 * (в пределах допуска) или максимально близко к нему.
 *
 * Сравнение идёт в секундах с дробной частью, сегодня исключается из списка.
 */
export function findMatches(
  days: DayResult[],
  todayIndex: number,
  metric: Metric,
  toleranceSec: number,
): MetricResult {
  const today = days[todayIndex];
  const todayValue = valueFor(today, metric);
  const applicable = todayValue !== null;

  const candidates: DayMatch[] = [];

  if (applicable && todayValue !== null) {
    for (let i = 0; i < days.length; i += 1) {
      if (i === todayIndex) continue;
      const v = valueFor(days[i], metric);
      if (v === null) continue;
      const diff = v - todayValue;
      candidates.push({
        dateISO: days[i].dateISO,
        valueSec: v,
        diffSec: diff,
        absDiffSec: Math.abs(diff),
        dayOffset: i - todayIndex,
        exact: Math.abs(diff) <= EXACT_EPSILON_SEC,
      });
    }
  }

  const matches = candidates
    .filter((c) => c.absDiffSec <= toleranceSec)
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  let closest: DayMatch | null = null;
  if (candidates.length > 0) {
    closest = candidates.reduce((best, c) => (c.absDiffSec < best.absDiffSec ? c : best));
  }

  let closestBefore: DayMatch | null = null;
  let closestAfter: DayMatch | null = null;
  for (const m of matches) {
    if (m.dayOffset < 0) {
      if (!closestBefore || m.dayOffset > closestBefore.dayOffset) closestBefore = m;
    } else if (m.dayOffset > 0) {
      if (!closestAfter || m.dayOffset < closestAfter.dayOffset) closestAfter = m;
    }
  }

  const hasExactMatch = matches.some((m) => m.exact);

  return {
    metric,
    applicable,
    todayValueSec: todayValue,
    toleranceSec,
    matches,
    hasExactMatch,
    closest,
    closestBefore,
    closestAfter,
  };
}

/** Поиск по всем трём показателям сразу. */
export function findAllMatches(
  days: DayResult[],
  todayIndex: number,
  toleranceSec: number,
): Record<Metric, MetricResult> {
  return {
    sunrise: findMatches(days, todayIndex, 'sunrise', toleranceSec),
    sunset: findMatches(days, todayIndex, 'sunset', toleranceSec),
    daylength: findMatches(days, todayIndex, 'daylength', toleranceSec),
  };
}
