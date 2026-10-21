import type { City } from '../types';

/**
 * Небольшой список популярных городов для быстрого выбора.
 * Не ограничивает приложение: геокодер находит любой город.
 * Координаты и часовые пояса зафиксированы для работы без сети.
 */
export const SUGGESTED_CITIES: City[] = [
  { id: 524901, name: 'Москва', country: 'Россия', countryCode: 'RU', admin1: 'Москва', latitude: 55.75204, longitude: 37.61781, timezone: 'Europe/Moscow' },
  { id: 498817, name: 'Санкт-Петербург', country: 'Россия', countryCode: 'RU', admin1: 'Санкт-Петербург', latitude: 59.9386, longitude: 30.3141, timezone: 'Europe/Moscow' },
  { id: 2147714, name: 'Сидней', country: 'Австралия', countryCode: 'AU', admin1: 'Новый Южный Уэльс', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
  { id: 5128581, name: 'Нью-Йорк', country: 'США', countryCode: 'US', admin1: 'Нью-Йорк', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' },
  { id: 2643743, name: 'Лондон', country: 'Великобритания', countryCode: 'GB', admin1: 'Англия', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
  { id: 2988507, name: 'Париж', country: 'Франция', countryCode: 'FR', admin1: 'Иль-де-Франс', latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris' },
  { id: 2017370, name: 'Тромсё', country: 'Норвегия', countryCode: 'NO', admin1: 'Тромс', latitude: 69.6492, longitude: 18.9553, timezone: 'Europe/Oslo' },
  { id: 1816670, name: 'Пекин', country: 'Китай', countryCode: 'CN', admin1: 'Пекин', latitude: 39.9042, longitude: 116.4074, timezone: 'Asia/Shanghai' },
  { id: 1273294, name: 'Дели', country: 'Индия', countryCode: 'IN', admin1: 'Дели', latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' },
  { id: 3448439, name: 'Сан-Паулу', country: 'Бразилия', countryCode: 'BR', admin1: 'Сан-Паулу', latitude: -23.5505, longitude: -46.6333, timezone: 'America/Sao_Paulo' },
];
