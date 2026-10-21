/**
 * Демонстрационный запуск расчётов без браузера.
 * Запуск: npx vite-node scripts/smoke.ts
 */
import { DateTime } from 'luxon';
import { computeDaysForYear, findTodayIndex } from '../src/lib/astronomy';
import { findAllMatches } from '../src/lib/matcher';
import {
  formatDayOffset,
  formatDiff,
  formatDuration,
  formatFullDateRu,
  formatTimeOfDay,
} from '../src/lib/format';

const CITY = { name: 'Москва', lat: 55.75204, lng: 37.61781, tz: 'Europe/Moscow' };
const TOL = 60;

const now = DateTime.now().setZone(CITY.tz);
const todayISO = now.toISODate() as string;
const year = now.year;

console.log(`Город: ${CITY.name} (${CITY.tz})`);
console.log(`Сегодня: ${formatFullDateRu(todayISO)}`);
console.log(`Год: ${year}`);

const days = computeDaysForYear(CITY.lat, CITY.lng, CITY.tz, year);
const idx = findTodayIndex(days, todayISO);
const today = days[idx];

console.log('\n=== Сегодня ===');
console.log(`Восход: ${today.sunriseSec !== null ? formatTimeOfDay(today.sunriseSec) : 'не происходит'}`);
console.log(`Закат:  ${today.sunsetSec !== null ? formatTimeOfDay(today.sunsetSec) : 'не происходит'}`);
console.log(`День:   ${formatDuration(today.dayLengthSec)}`);

const res = findAllMatches(days, idx, TOL);
const labels: Record<string, string> = {
  sunset: 'Закат в то же время',
  sunrise: 'Восход в то же время',
  daylength: 'Та же продолжительность дня',
};

for (const m of ['sunset', 'sunrise', 'daylength']) {
  const r = res[m];
  console.log(`\n=== ${labels[m]} ===`);
  if (!r.applicable) {
    console.log('  (неприменимо)');
    continue;
  }
  const todayLabel =
    m === 'daylength' ? formatDuration(r.todayValueSec as number) : formatTimeOfDay(r.todayValueSec as number);
  console.log(`  Сегодня: ${todayLabel}`);

  if (r.matches.length > 0) {
    for (const mm of r.matches) {
      const v = m === 'daylength' ? formatDuration(mm.valueSec) : formatTimeOfDay(mm.valueSec);
      console.log(
        `  ${formatFullDateRu(mm.dateISO)} — ${v} (${formatDiff(mm.diffSec)}, ${formatDayOffset(mm.dayOffset)})${
          mm.exact ? ' [точно]' : ''
        }`,
      );
    }
  } else if (r.closest) {
    const v = m === 'daylength' ? formatDuration(r.closest.valueSec) : formatTimeOfDay(r.closest.valueSec);
    console.log(
      `  ближайшая: ${formatFullDateRu(r.closest.dateISO)} — ${v} (${formatDiff(r.closest.diffSec)}, ${formatDayOffset(
        r.closest.dayOffset,
      )})`,
    );
  }
}
