import * as SunCalc from 'suncalc';

export type City = {
	name: string;
	country: string;
	admin1?: string;
	latitude: number;
	longitude: number;
	timeZone: string;
};

export type SolarDay = {
	date: string;
	status: 'normal' | 'polar-day' | 'polar-night' | 'unavailable';
	sunrise: Date | null;
	sunset: Date | null;
	sunriseSeconds: number | null;
	sunsetSeconds: number | null;
	daylightSeconds: number | null;
};

export type Match = {
	date: string;
	value: number;
	differenceSeconds: number;
	dayOffset: number;
};

export type MatchResult = {
	dates: Match[];
	withinTolerance: boolean;
	exact: boolean;
};

type MetricDay = {
	date: string;
	sunriseSeconds?: number | null;
	sunsetSeconds?: number | null;
	daylightSeconds?: number | null;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (timeZone: string, options: Intl.DateTimeFormatOptions) => {
	const key = `${timeZone}:${JSON.stringify(options)}`;
	let formatter = formatterCache.get(key);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat('en-CA', { ...options, timeZone });
		formatterCache.set(key, formatter);
	}
	return formatter;
};

const getParts = (date: Date, timeZone: string) => {
	const parts = getFormatter(timeZone, {
		year: 'numeric', month: '2-digit', day: '2-digit',
		hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
	}).formatToParts(date);
	const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
	return {
		year: Number(values.year),
		month: Number(values.month),
		day: Number(values.day),
		hour: Number(values.hour),
		minute: Number(values.minute),
		second: Number(values.second),
	};
};

export const localDateKey = (instant: Date, timeZone: string) => {
	const { year, month, day } = getParts(instant, timeZone);
	return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const parseDateKey = (dateKey: string) => {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
	if (!match) throw new Error(`Некорректная дата: ${dateKey}`);
	const [, year, month, day] = match;
	const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
	if (date.toISOString().slice(0, 10) !== dateKey) throw new Error(`Некорректная дата: ${dateKey}`);
	return date;
};

/** UTC timestamp for 12:00 in the requested IANA zone, including the date's DST offset. */
export const getLocalNoonUtc = (dateKey: string, timeZone: string) => {
	const date = parseDateKey(dateKey);
	const targetLocalNoon = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12);
	let guess = targetLocalNoon;

	for (let i = 0; i < 3; i++) {
		const parts = getParts(new Date(guess), timeZone);
		const representedAsUtc = Date.UTC(
			parts.year, parts.month - 1, parts.day,
			parts.hour, parts.minute, parts.second,
		);
		guess += targetLocalNoon - representedAsUtc;
	}

	return guess;
};

const getUtcOffsetMinutes = (instant: Date, timeZone: string) => {
	const parts = getParts(instant, timeZone);
	const representedAsUtc = Date.UTC(
		parts.year, parts.month - 1, parts.day,
		parts.hour, parts.minute, parts.second,
	);
	return Math.round((representedAsUtc - instant.getTime()) / 60_000);
};

const getSecondsOfLocalDay = (instant: Date, timeZone: string) => {
	const { hour, minute, second } = getParts(instant, timeZone);
	return hour * 3600 + minute * 60 + second + instant.getUTCMilliseconds() / 1000;
};

export const calculateDailySun = (dateKey: string, city: Pick<City, 'latitude' | 'longitude' | 'timeZone'>): SolarDay => {
	const localNoon = new Date(getLocalNoonUtc(dateKey, city.timeZone));
	const utcOffset = getUtcOffsetMinutes(localNoon, city.timeZone);
	const times = SunCalc.getTimes(localNoon, city.latitude, city.longitude, 0, utcOffset);
	const sunrise = times.sunrise;
	const sunset = times.sunset;

	if (!sunrise || !sunset) {
		return {
			date: dateKey,
			status: times.alwaysUp ? 'polar-day' : times.alwaysDown ? 'polar-night' : 'unavailable',
			sunrise: null,
			sunset: null,
			sunriseSeconds: null,
			sunsetSeconds: null,
			daylightSeconds: null,
		};
	}

	return {
		date: dateKey,
		status: 'normal',
		sunrise,
		sunset,
		sunriseSeconds: getSecondsOfLocalDay(sunrise, city.timeZone),
		sunsetSeconds: getSecondsOfLocalDay(sunset, city.timeZone),
		daylightSeconds: (sunset.getTime() - sunrise.getTime()) / 1000,
	};
};

const yearDaysCache = new Map<string, SolarDay[]>();

const calculateCalendarYear = (year: number, city: City) => {
	const key = `${year}:${city.latitude}:${city.longitude}:${city.timeZone}`;
	const cached = yearDaysCache.get(key);
	if (cached) return cached;
	const days = calendarDateKeys(year).map((date) => calculateDailySun(date, city));
	yearDaysCache.set(key, days);
	if (yearDaysCache.size > 8) yearDaysCache.delete(yearDaysCache.keys().next().value!);
	return days;
};

export const calendarDateKeys = (year: number) => {
	const result: string[] = [];
	const cursor = new Date(Date.UTC(year, 0, 1));
	while (cursor.getUTCFullYear() === year) {
		result.push(cursor.toISOString().slice(0, 10));
		cursor.setUTCDate(cursor.getUTCDate() + 1);
	}
	return result;
};

const dayOffsetBetween = (from: string, to: string) => (
	Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)
) / 86_400_000;

export const findMatches = <T extends MetricDay>(
	days: T[],
	todayKey: string,
	metric: 'sunriseSeconds' | 'sunsetSeconds' | 'daylightSeconds',
	toleranceSeconds: number,
): MatchResult => {
	const today = days.find((day) => day.date === todayKey);
	const target = today?.[metric];
	if (typeof target !== 'number' || !Number.isFinite(target)) {
		return { dates: [], withinTolerance: false, exact: false };
	}

	const candidates = days
		.filter((day) => day.date !== todayKey && typeof day[metric] === 'number' && Number.isFinite(day[metric]))
		.map((day) => ({
			date: day.date,
			value: day[metric] as number,
			differenceSeconds: Math.abs((day[metric] as number) - target),
			dayOffset: dayOffsetBetween(todayKey, day.date),
		}));
	const inTolerance = candidates.filter(({ differenceSeconds }) => differenceSeconds <= toleranceSeconds);
	let dates = inTolerance;
	let withinTolerance = true;

	if (dates.length === 0) {
		withinTolerance = false;
		const before = candidates.filter(({ dayOffset }) => dayOffset < 0);
		const after = candidates.filter(({ dayOffset }) => dayOffset > 0);
		const closestOnSide = (list: Match[]) => {
			if (list.length === 0) return [];
			const min = Math.min(...list.map(({ differenceSeconds }) => differenceSeconds));
			return list.filter(({ differenceSeconds }) => Math.abs(differenceSeconds - min) < 1e-9);
		};
		dates = [...closestOnSide(before), ...closestOnSide(after)];
	}

	dates.sort((a, b) => a.date.localeCompare(b.date));
	return {
		dates,
		withinTolerance,
		exact: dates.length > 0 && dates.every(({ differenceSeconds }) => differenceSeconds < 1e-9),
	};
};

export const calculateYear = (city: City, todayKey: string, toleranceSeconds = 60) => {
	const year = Number(todayKey.slice(0, 4));
	const days = calculateCalendarYear(year, city);
	const today = days.find(({ date }) => date === todayKey);
	return {
		today,
		days,
		matches: {
			sunrise: findMatches(days, todayKey, 'sunriseSeconds', toleranceSeconds),
			sunset: findMatches(days, todayKey, 'sunsetSeconds', toleranceSeconds),
			daylight: findMatches(days, todayKey, 'daylightSeconds', toleranceSeconds),
		},
	};
};

export const formatLocalTime = (instant: Date | null, timeZone: string) => {
	if (!instant) return '—';
	const rounded = new Date(Math.round(instant.getTime() / 1000) * 1000);
	return new Intl.DateTimeFormat('ru-RU', {
		timeZone,
		hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
	}).format(rounded);
};

export const formatDuration = (seconds: number | null) => {
	if (seconds === null || !Number.isFinite(seconds)) return '—';
	const rounded = Math.round(seconds);
	const hours = Math.floor(rounded / 3600);
	const minutes = Math.floor((rounded % 3600) / 60);
	const remainingSeconds = rounded % 60;
	return `${hours} ч ${minutes} мин ${remainingSeconds} с`;
};

export const formatDate = (dateKey: string) => new Intl.DateTimeFormat('ru-RU', {
	day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
}).format(parseDateKey(dateKey));

export const formatWeekday = (dateKey: string) => new Intl.DateTimeFormat('ru-RU', {
	weekday: 'long', timeZone: 'UTC',
}).format(parseDateKey(dateKey));

export const formatTimeOfDay = (seconds: number) => {
	const rounded = Math.round(seconds) % 86_400;
	const hour = Math.floor(rounded / 3600);
	const minute = Math.floor((rounded % 3600) / 60);
	const second = rounded % 60;
	return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
};
