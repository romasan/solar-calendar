import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { computeDay, computeDaysForYear, findTodayIndex } from '../src/lib/astronomy';

/**
 * Эталонные значения получены из сервиса sunrise-sunset.org
 * (тот же NOAA-алгоритм, высота центра Солнца −0,833°) и переведены
 * в местное время. Допуск ±120 с учитывает различие в точности
 * промежуточных вычислений между реализациями.
 */
const TOL = 120;

describe('Астрономические расчёты — сверка с эталоном', () => {
  it('Москва, летнее солнцестояние 2026-06-21', () => {
    const d = computeDay(55.75204, 37.61781, 'Europe/Moscow', '2026-06-21');
    expect(d.sunriseSec).toBeGreaterThan(13471 - TOL);
    expect(d.sunriseSec).toBeLessThan(13471 + TOL);
    expect(d.sunsetSec).toBeGreaterThan(76689 - TOL);
    expect(d.sunsetSec).toBeLessThan(76689 + TOL);
    expect(Math.abs(d.dayLengthSec - 63218)).toBeLessThan(TOL);
  });

  it('Москва, зимнее солнцестояние 2026-12-21', () => {
    const d = computeDay(55.75204, 37.61781, 'Europe/Moscow', '2026-12-21');
    expect(d.sunriseSec).toBeGreaterThan(32235 - TOL);
    expect(d.sunriseSec).toBeLessThan(32235 + TOL);
    expect(d.sunsetSec).toBeGreaterThan(57469 - TOL);
    expect(d.sunsetSec).toBeLessThan(57469 + TOL);
    expect(Math.abs(d.dayLengthSec - 25234)).toBeLessThan(TOL);
  });

  it('Сидней (Южное полушарие), 2026-06-21 (зима)', () => {
    const d = computeDay(-33.8688, 151.2093, 'Australia/Sydney', '2026-06-21');
    expect(d.sunriseSec).toBeGreaterThan(25195 - TOL);
    expect(d.sunriseSec).toBeLessThan(25195 + TOL);
    expect(d.sunsetSec).toBeGreaterThan(60832 - TOL);
    expect(d.sunsetSec).toBeLessThan(60832 + TOL);
    expect(Math.abs(d.dayLengthSec - 35637)).toBeLessThan(TOL);
  });

  it('Сидней (Южное полушарие), 2026-12-21 (лето, DST)', () => {
    const d = computeDay(-33.8688, 151.2093, 'Australia/Sydney', '2026-12-21');
    expect(d.sunriseSec).toBeGreaterThan(20440 - TOL);
    expect(d.sunriseSec).toBeLessThan(20440 + TOL);
    expect(d.sunsetSec).toBeGreaterThan(72322 - TOL);
    expect(d.sunsetSec).toBeLessThan(72322 + TOL);
    expect(Math.abs(d.dayLengthSec - 51882)).toBeLessThan(TOL);
  });
});

describe('Сезонность полушарий', () => {
  it('В Москве июньский день длиннее декабрьского', () => {
    const jun = computeDay(55.75204, 37.61781, 'Europe/Moscow', '2026-06-21');
    const dec = computeDay(55.75204, 37.61781, 'Europe/Moscow', '2026-12-21');
    expect(jun.dayLengthSec).toBeGreaterThan(dec.dayLengthSec);
  });

  it('В Сиднее декабрьский день длиннее июньского (зеркально)', () => {
    const jun = computeDay(-33.8688, 151.2093, 'Australia/Sydney', '2026-06-21');
    const dec = computeDay(-33.8688, 151.2093, 'Australia/Sydney', '2026-12-21');
    expect(dec.dayLengthSec).toBeGreaterThan(jun.dayLengthSec);
  });
});

describe('Средние широты — базовая корректность', () => {
  it('Восход раньше заката, значения в пределах суток', () => {
    const d = computeDay(55.75204, 37.61781, 'Europe/Moscow', '2026-03-20');
    expect(d.sunriseSec).not.toBeNull();
    expect(d.sunsetSec).not.toBeNull();
    expect(d.sunriseSec as number).toBeGreaterThan(0);
    expect(d.sunsetSec as number).toBeLessThan(86400);
    expect(d.sunsetSec as number).toBeGreaterThan(d.sunriseSec as number);
    expect(d.dayLengthSec).toBeGreaterThan(0);
    expect(d.dayLengthSec).toBeLessThan(86400);
  });
});

describe('Переход на летнее/зимнее время (Europe/Berlin)', () => {
  const off = (iso: string) => DateTime.fromISO(`${iso}T12:00:00`, { zone: 'Europe/Berlin' }).offset;

  it('Весной смещение меняется с +60 на +120 минут', () => {
    expect(off('2026-03-28')).toBe(60);
    expect(off('2026-03-30')).toBe(120);
  });

  it('Осенью смещение возвращается на +60 минут', () => {
    expect(off('2026-10-24')).toBe(120);
    expect(off('2026-10-26')).toBe(60);
  });

  it('Местное время восхода прыгает ~на час при переходе, но длительность дня остаётся непрерывной', () => {
    const d28 = computeDay(52.52, 13.405, 'Europe/Berlin', '2026-03-28');
    const d29 = computeDay(52.52, 13.405, 'Europe/Berlin', '2026-03-29');
    const d30 = computeDay(52.52, 13.405, 'Europe/Berlin', '2026-03-30');

    const jump = (d29.sunriseSec as number) - (d28.sunriseSec as number);
    const natural = (d30.sunriseSec as number) - (d29.sunriseSec as number);

    expect(jump).toBeGreaterThan(3000);
    expect(jump).toBeLessThan(4200);
    expect(Math.abs(natural)).toBeLessThan(600);

    // Длительность дня не должна скакать на час из-за смены пояса.
    expect(Math.abs(d30.dayLengthSec - d29.dayLengthSec)).toBeLessThan(600);
  });
});

describe('Високосный год', () => {
  it('2028 год содержит 366 дней и 29 февраля', () => {
    const days = computeDaysForYear(55.75204, 37.61781, 'Europe/Moscow', 2028);
    expect(days).toHaveLength(366);
    expect(days.map((d) => d.dateISO)).toContain('2028-02-29');
    expect(findTodayIndex(days, '2028-02-29')).toBe(59);
  });

  it('2026 год (невисокосный) содержит 365 дней и не содержит 29 февраля', () => {
    const days = computeDaysForYear(55.75204, 37.61781, 'Europe/Moscow', 2026);
    expect(days).toHaveLength(365);
    expect(days.map((d) => d.dateISO)).not.toContain('2026-02-29');
  });
});

describe('Полярный день и полярная ночь (Тромсё, 69,65° с.ш.)', () => {
  it('Полярный день: солнце не заходит', () => {
    const d = computeDay(69.6492, 18.9553, 'Europe/Oslo', '2026-06-15');
    expect(d.state).toBe('polar-day');
    expect(d.sunriseSec).toBeNull();
    expect(d.sunsetSec).toBeNull();
    expect(d.dayLengthSec).toBe(86400);
  });

  it('Полярная ночь: солнце не восходит', () => {
    const d = computeDay(69.6492, 18.9553, 'Europe/Oslo', '2026-12-15');
    expect(d.state).toBe('polar-night');
    expect(d.sunriseSec).toBeNull();
    expect(d.sunsetSec).toBeNull();
    expect(d.dayLengthSec).toBe(0);
  });
});
