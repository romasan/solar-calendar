import { DateTime } from 'luxon';
import * as SunCalc from 'suncalc';

/**
 * Стандартное определение восхода/заката: верхний край солнечного диска,
 * высота центра Солнца ≈ −0,833° относительно идеального горизонта.
 * SunCalc использует именно эту величину для `sunrise`/`sunset` по умолчанию.
 */
const HORIZON_DEG = -0.833;
const SECONDS_PER_DAY = 86400;

export type SunState = 'normal' | 'polar-day' | 'polar-night';

/** Результат расчёта для одной местной календарной даты. */
export interface DayResult {
  /** Местная календарная дата в часовом поясе города, ISO `yyyy-MM-dd`. */
  dateISO: string;
  /** Секунды от местной полуночи (дробные, миллисекунды сохраняются). `null`, если восхода нет. */
  sunriseSec: number | null;
  /** Секунды от местной полуночи. `null`, если заката нет. */
  sunsetSec: number | null;
  /** Длительность светового дня в секундах. 86400 — полярный день, 0 — полярная ночь. */
  dayLengthSec: number;
  state: SunState;
}

/**
 * Местное «настенное» время суток в секундах (HH*3600 + MM*60 + SS + мс).
 * Используем поля часов, а не разность с полуночью: в дни перехода на
 * летнее/зимнее время «прошедшие с полуночи» секунды не совпадают
 * с показаниями настенных часов (час пропускается или повторяется).
 */
function localSecondsOfDay(date: Date, tz: string): number {
  const dt = DateTime.fromJSDate(date, { zone: tz });
  return dt.hour * 3600 + dt.minute * 60 + dt.second + dt.millisecond / 1000;
}

/**
 * Рассчитать восход, закат и длительность светового дня для одной
 * местной календарной даты в заданном часовом поясе.
 *
 * В качестве опорного момента берётся местный полдень даты, что гарантирует
 * попадание восхода и заката на эту же гражданскую дату.
 */
export function computeDay(lat: number, lng: number, tz: string, dateISO: string): DayResult {
  const localNoon = DateTime.fromISO(`${dateISO}T12:00:00`, { zone: tz });
  if (!localNoon.isValid) {
    throw new Error(`Некорректная дата или часовой пояс: ${dateISO} ${tz}`);
  }
  const noonJS = localNoon.toJSDate();

  const times = SunCalc.getTimes(noonJS, lat, lng);
  const sunriseInvalid = !Number.isFinite(times.sunrise.getTime());
  const sunsetInvalid = !Number.isFinite(times.sunset.getTime());

  let sunriseSec: number | null = null;
  let sunsetSec: number | null = null;
  let state: SunState = 'normal';

  if (sunriseInvalid || sunsetInvalid) {
    // Полярный день или полярная ночь: классифицируем по высоте Солнца в полдень.
    const pos = SunCalc.getPosition(noonJS, lat, lng);
    const altDeg = (pos.altitude * 180) / Math.PI;
    state = altDeg >= HORIZON_DEG ? 'polar-day' : 'polar-night';
  } else {
    sunriseSec = localSecondsOfDay(times.sunrise, tz);
    sunsetSec = localSecondsOfDay(times.sunset, tz);
  }

  let dayLengthSec: number;
  if (state === 'polar-day') {
    dayLengthSec = SECONDS_PER_DAY;
  } else if (state === 'polar-night') {
    dayLengthSec = 0;
  } else {
    // Без округления: сохраняем миллисекундную точность.
    dayLengthSec = (times.sunset.getTime() - times.sunrise.getTime()) / 1000;
  }

  return { dateISO, sunriseSec, sunsetSec, dayLengthSec, state };
}

/**
 * Рассчитать все календарные даты заданного года (по местному времени города).
 * Корректно обрабатывает високосные годы (366 дней).
 */
export function computeDaysForYear(lat: number, lng: number, tz: string, year: number): DayResult[] {
  const start = DateTime.fromObject({ year, month: 1, day: 1 }, { zone: tz });
  if (!start.isValid) {
    throw new Error(`Некорректный часовой пояс: ${tz}`);
  }
  const total = start.daysInYear ?? 365;
  const days: DayResult[] = [];
  for (let i = 0; i < total; i += 1) {
    const d = start.plus({ days: i });
    days.push(computeDay(lat, lng, tz, d.toISODate() as string));
  }
  return days;
}

/** Индекс «сегодня» в массиве дней года. −1, если дата не входит в год. */
export function findTodayIndex(days: DayResult[], todayISO: string): number {
  return days.findIndex((d) => d.dateISO === todayISO);
}

/** Местная дата «сегодня» и текущий календарный год в часовом поясе города. */
export function localToday(tz: string): { todayISO: string; year: number } {
  const now = DateTime.now().setZone(tz);
  return { todayISO: now.toISODate() as string, year: now.year };
}
