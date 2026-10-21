import type { City } from '../types';

/**
 * Геокодер Open-Meteo (на базе GeoNames): бесплатный, без API-ключа,
 * поддерживает русские названия и отдаёт IANA-часовой пояс города.
 * CORS-заголовки присутствуют, поэтому запрос выполняется прямо из браузера.
 */
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

interface RawResult {
  id: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
}

export class GeocodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeocodeError';
  }
}

/** Поиск городов по названию. Возвращает до `count` результатов. */
export async function searchCities(query: string, signal?: AbortSignal): Promise<City[]> {
  const q = query.trim();
  if (!q) return [];

  const url = `${GEOCODE_URL}?name=${encodeURIComponent(q)}&count=10&language=ru&format=json`;

  let res: Response;
  try {
    res = await fetch(url, {
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new GeocodeError('Не удалось выполнить запрос к геокодеру. Проверьте подключение к интернету.');
  }

  if (!res.ok) {
    throw new GeocodeError(`Геокодер вернул ошибку (${res.status}). Попробуйте ещё раз позже.`);
  }

  const data = (await res.json()) as { results?: RawResult[] };
  const results = data.results ?? [];

  return results
    .filter(
      (r): r is RawResult & { name: string; latitude: number; longitude: number; timezone: string } =>
        typeof r.name === 'string' &&
        typeof r.latitude === 'number' &&
        typeof r.longitude === 'number' &&
        typeof r.timezone === 'string' &&
        r.timezone.length > 0,
    )
    .map((r) => ({
      id: r.id,
      name: r.name,
      country: r.country ?? '',
      countryCode: r.country_code ?? '',
      admin1: r.admin1 ?? null,
      latitude: r.latitude,
      longitude: r.longitude,
      timezone: r.timezone,
    }));
}

/** Создаёт контроллер с тайм-аутом для ограничения времени запроса. */
export function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    cancel: () => {
      clearTimeout(timer);
      controller.abort();
    },
  };
}
