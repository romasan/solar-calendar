import assert from 'node:assert/strict';
import test from 'node:test';
import {
	calculateDailySun,
	calculateYear,
	calendarDateKeys,
	formatDuration,
	formatTimeOfDay,
	findMatches,
	getLocalNoonUtc,
	localDateKey,
} from '../src/calculations';

const london = { latitude: 51.5072, longitude: -0.1276, timeZone: 'Europe/London' };
const sydney = { latitude: -33.8688, longitude: 151.2093, timeZone: 'Australia/Sydney' };

test('matches known London sunrise and sunset around the summer solstice', () => {
	const day = calculateDailySun('2026-06-21', london);
	assert.equal(day.status, 'normal');
	assert.ok(typeof day.sunriseSeconds === 'number');
	assert.ok(typeof day.sunsetSeconds === 'number');
	assert.ok(day.sunriseSeconds >= 4 * 3600 + 42 * 60 && day.sunriseSeconds < 4 * 3600 + 44 * 60);
	assert.ok(day.sunsetSeconds >= 21 * 3600 + 20 * 60 && day.sunsetSeconds < 21 * 3600 + 23 * 60);
	assert.ok(Math.abs((day.daylightSeconds || 0) - (16 * 3600 + 38 * 60 + 29)) < 120);
});

test('calculates a longer summer day in the Southern Hemisphere in December', () => {
	const summer = calculateDailySun('2026-12-21', sydney);
	const winter = calculateDailySun('2026-06-21', sydney);
	assert.ok(typeof summer.daylightSeconds === 'number');
	assert.ok(typeof winter.daylightSeconds === 'number');
	assert.ok(summer.daylightSeconds > winter.daylightSeconds);
});

test('uses local dates across the daylight-saving transition', () => {
	const before = getLocalNoonUtc('2026-03-28', london.timeZone);
	const after = getLocalNoonUtc('2026-03-29', london.timeZone);
	assert.equal(after - before, 23 * 60 * 60 * 1000);
	assert.equal(calculateDailySun('2026-03-29', london).date, '2026-03-29');
});

test('uses the selected city local date even when it differs from UTC date', () => {
	assert.equal(localDateKey(new Date('2026-01-01T01:00:00Z'), 'America/Los_Angeles'), '2025-12-31');
});

test('enumerates every day in leap and regular years', () => {
	assert.equal(calendarDateKeys(2024).length, 366);
	assert.equal(calendarDateKeys(2025).length, 365);
});

test('returns closest matches on either side at year boundaries', () => {
	const firstDays = [
		{ date: '2026-01-01', sunriseSeconds: 3600 },
		{ date: '2026-01-02', sunriseSeconds: 3700 },
	];
	const lastDays = [
		{ date: '2026-12-30', sunriseSeconds: 3500 },
		{ date: '2026-12-31', sunriseSeconds: 3900 },
	];
	const first = findMatches(firstDays, '2026-01-01', 'sunriseSeconds', 0);
	const last = findMatches(lastDays, '2026-12-31', 'sunriseSeconds', 0);
	assert.deepEqual(first.dates.map(({ date }) => date), ['2026-01-02']);
	assert.deepEqual(last.dates.map(({ date }) => date), ['2026-12-30']);
});

test('reports nearest dates when no candidate is inside the tolerance', () => {
	const days = [
		{ date: '2026-01-01', sunsetSeconds: 10_000 },
		{ date: '2026-01-02', sunsetSeconds: 10_030 },
		{ date: '2026-01-03', sunsetSeconds: 10_200 },
	];
	const result = findMatches(days, '2026-01-02', 'sunsetSeconds', 0);
	assert.equal(result.withinTolerance, false);
	assert.deepEqual(result.dates.map(({ date }) => date), ['2026-01-01', '2026-01-03']);
});

test('returns every date within practical tolerance, not only the first one', () => {
	const days = [
		{ date: '2026-01-01', daylightSeconds: 36_000 },
		{ date: '2026-01-02', daylightSeconds: 36_020 },
		{ date: '2026-01-03', daylightSeconds: 36_000 },
		{ date: '2026-01-04', daylightSeconds: 36_081 },
	];
	const result = findMatches(days, '2026-01-02', 'daylightSeconds', 60);
	assert.equal(result.withinTolerance, true);
	assert.deepEqual(result.dates.map(({ date }) => date), ['2026-01-01', '2026-01-03']);
});

test('supports exact mode and formats duration without minute-only rounding', () => {
	const days = [
		{ date: '2026-01-01', sunsetSeconds: 10_000 },
		{ date: '2026-01-02', sunsetSeconds: 10_000 },
	];
	const result = findMatches(days, '2026-01-01', 'sunsetSeconds', 0);
	assert.equal(result.exact, true);
	assert.equal(formatDuration(34_842), '9 ч 40 мин 42 с');
	assert.equal(formatTimeOfDay(86_407.6), '00:00:08');
});

test('calculates current-year metrics and excludes today from its results', () => {
	const year = calculateYear({ ...london, name: 'London', country: 'United Kingdom' }, '2026-06-21');
	assert.equal(year.days.length, 365);
	assert.equal(year.today?.date, '2026-06-21');
	for (const metric of Object.values(year.matches)) {
		assert.ok(metric.dates.every(({ date }) => date !== year.today?.date));
	}
});

test('reports polar day and polar night when the Sun does not cross the horizon', () => {
	const tromso = { latitude: 69.6492, longitude: 18.9553, timeZone: 'Europe/Oslo' };
	assert.equal(calculateDailySun('2026-06-21', tromso).status, 'polar-day');
	assert.equal(calculateDailySun('2026-12-21', tromso).status, 'polar-night');
});
