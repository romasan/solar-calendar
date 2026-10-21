import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchCities } from '../src/lib/geocode';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Геокодер', () => {
  it('Пустой запрос возвращает пустой список без обращения к сети', async () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    const cities = await searchCities('   ');
    expect(cities).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('Разбирает ответ и отбрасывает записи без часового пояса', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              id: 524901,
              name: 'Москва',
              latitude: 55.75204,
              longitude: 37.61781,
              country: 'Россия',
              country_code: 'RU',
              admin1: 'Москва',
              timezone: 'Europe/Moscow',
            },
            {
              id: 999,
              name: 'Без пояса',
              latitude: 0,
              longitude: 0,
              timezone: null,
            },
          ],
        }),
      }),
    );

    const cities = await searchCities('Москва');
    expect(cities).toHaveLength(1);
    expect(cities[0]).toMatchObject({
      id: 524901,
      name: 'Москва',
      country: 'Россия',
      countryCode: 'RU',
      timezone: 'Europe/Moscow',
    });
  });
});
