import { DateTime } from 'luxon';

export const WEEKDAYS_RU = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];

export const MONTHS_GEN_RU = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** «9 февраля 2026 года». */
export function formatDateRu(dateISO: string): string {
  const dt = DateTime.fromISO(dateISO);
  return `${dt.day} ${MONTHS_GEN_RU[dt.month - 1]} ${dt.year} года`;
}

/** «понедельник» (строчными). */
export function weekdayRuLower(dateISO: string): string {
  const dt = DateTime.fromISO(dateISO);
  return WEEKDAYS_RU[dt.weekday - 1].toLowerCase();
}

/** «9 февраля 2026 года, понедельник». */
export function formatFullDateRu(dateISO: string): string {
  return `${formatDateRu(dateISO)}, ${weekdayRuLower(dateISO)}`;
}

/** Секунды от полуночи → «HH:MM:SS». */
export function formatTimeOfDay(sec: number): string {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(rest)}`;
}

/** Длительность в секундах → «9 ч 40 мин 42 с». */
export function formatDuration(sec: number): string {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  if (h > 0) return `${h} ч ${m} мин ${rest} с`;
  if (m > 0) return `${m} мин ${rest} с`;
  return `${rest} с`;
}

/** Разница со знаком: «+24 с», «−18 с», «0 с». */
export function formatDiff(sec: number): string {
  const rounded = Math.round(sec);
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
  return `${sign}${Math.abs(rounded)} с`;
}

function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дня';
  return 'дней';
}

/** Смещение в днях → «через 3 дня» / «5 дней назад» / «сегодня». */
export function formatDayOffset(days: number): string {
  if (days === 0) return 'сегодня';
  if (days > 0) return `через ${days} ${pluralDays(days)}`;
  return `${Math.abs(days)} ${pluralDays(Math.abs(days))} назад`;
}

/** Флаг страны из двухбуквенного кода (для отображения). */
export function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
