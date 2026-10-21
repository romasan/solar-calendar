import type { City } from './calculations';

const cache = new Map<string, City[]>();

export const searchCities = async (query: string, signal?: AbortSignal): Promise<City[]> => {
	const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU');
	if (normalizedQuery.length < 2) return [];
	const cached = cache.get(normalizedQuery);
	if (cached) return cached;

	const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
	url.search = new URLSearchParams({
		name: query.trim(),
		count: '8',
		language: 'ru',
		format: 'json',
	}).toString();

	let response: Response;
	const timeoutSignal = AbortSignal.timeout(8_000);
	const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
	try {
		response = await fetch(url, { signal: requestSignal, headers: { Accept: 'application/json' } });
	} catch (error) {
		if (signal?.aborted) throw error;
		if (timeoutSignal.aborted) throw new Error('Поиск занимает больше обычного. Попробуйте ещё раз.');
		throw new Error('Не удалось подключиться к поиску городов. Проверьте интернет и попробуйте ещё раз.');
	}

	if (!response.ok) {
		if (response.status === 429) throw new Error('Слишком много запросов. Попробуйте ещё раз через минуту.');
		throw new Error(`Сервис поиска городов ответил ошибкой (${response.status}).`);
	}

	const data = await response.json();
	const cities: City[] = (data.results || [])
		.filter((item: any) => item.timezone && Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
		.map((item: any) => ({
			name: item.name,
			country: item.country || '',
			admin1: item.admin1,
			latitude: item.latitude,
			longitude: item.longitude,
			timeZone: item.timezone,
		}));
	cache.set(normalizedQuery, cities);
	return cities;
};

export const cityLabel = (city: City) => [city.name, city.admin1, city.country]
	.filter((part, index, all) => part && all.indexOf(part) === index)
	.join(', ');
