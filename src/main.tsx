import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
	calculateYear,
	formatDate,
	formatDuration,
	formatLocalTime,
	formatTimeOfDay,
	formatWeekday,
	localDateKey,
	type City,
	type Match,
} from './calculations';
import { cityLabel, searchCities } from './geocoding';
import './styles.css';

type MetricKey = 'sunrise' | 'sunset' | 'daylight';

const SunIcon = ({ kind }: { kind: 'rise' | 'set' | 'day' }) => (
	<svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={`sun-icon sun-icon--${kind}`}>
		<circle cx="24" cy="24" r="7" />
		<path d="M24 4v5m0 30v5M4 24h5m30 0h5M9.86 9.86l3.54 3.54m21.2 21.2 3.54 3.54m0-28.28-3.54 3.54m-21.2 21.2-3.54 3.54" />
		{kind === 'rise' && <path d="M7 34h34M12 29l12-12 12 12" />}
		{kind === 'set' && <path d="M7 34h34M12 20l12 12 12-12" />}
	</svg>
);

const DateCard = ({
	title,
	kind,
	metric,
	results,
	todayValue,
	tolerance,
}: {
	title: string;
	kind: 'rise' | 'set' | 'day';
	metric: MetricKey;
	results: ReturnType<typeof calculateYear>['matches'][MetricKey] | null;
	todayValue: number | null;
	tolerance: number;
}) => {
	return (
		<section className="result-card" aria-label={title}>
			<div className="result-card__heading">
				<span className="icon-wrap"><SunIcon kind={kind} /></span>
				<div>
					<h2>{title}</h2>
					<p>{results?.withinTolerance ? (tolerance === 0 ? 'Точные совпадения' : `Совпадения в допуске ±${tolerance} с`) : 'Ближайшие даты'}</p>
				</div>
			</div>
			{!results ? (
				<div className="empty-result">Для этого дня нет данных: Солнце не восходит и не заходит.</div>
			) : results.dates.length === 0 ? (
				<div className="empty-result">В этом году нет других дат с таким значением.</div>
			) : (
				<>
					{!results.withinTolerance && (
										<p className="nearest-note">Нет совпадений в допуске. Показаны ближайшие доступные даты; у границы года одна сторона может отсутствовать.</p>
					)}
					<ol className="date-list">
						{results.dates.map((match) => (
							<li key={match.date}>
								<MatchRow match={match} metric={metric} todayValue={todayValue} />
							</li>
						))}
					</ol>
				</>
			)}
		</section>
	);
};

const MatchRow = ({ match, metric, todayValue }: {
	match: Match;
	metric: MetricKey;
	todayValue: number | null;
}) => {
	const valueText = metric === 'daylight'
		? formatDuration(match.value)
		: formatTimeOfDay(match.value);
	const comparison = todayValue === null || Math.abs(match.value - todayValue) < 0.5
		? 'точное совпадение'
		: metric === 'daylight'
			? (match.value < todayValue ? 'короче' : 'длиннее')
			: (match.value < todayValue ? 'раньше' : 'позже');
	const days = Math.abs(match.dayOffset);
	const dayText = match.dayOffset < 0 ? `${days} дн. до сегодня` : `${days} дн. после сегодня`;
	return (
		<div className="match-row">
			<div className="match-row__date-line">
				<span className="match-row__date">{formatDate(match.date)}</span>
				<span className="match-row__weekday">{formatWeekday(match.date)}</span>
			</div>
			<div className="match-row__value-line">
				<strong>{valueText}</strong>
				<span>{metric === 'daylight' ? 'световой день' : metric === 'sunrise' ? 'восход' : 'закат'}</span>
			</div>
			<div className="match-row__meta">
				<span>Δ {match.differenceSeconds < 0.5 ? '0' : match.differenceSeconds.toFixed(0)} с · {comparison}</span>
				<span>{dayText}</span>
			</div>
		</div>
	);
};

const App = () => {
	const [query, setQuery] = useState('');
	const [cities, setCities] = useState<City[]>([]);
	const [selectedCity, setSelectedCity] = useState<City | null>(null);
	const [isSearching, setIsSearching] = useState(false);
	const [searchError, setSearchError] = useState('');
	const [activeIndex, setActiveIndex] = useState(0);
	const [toleranceInput, setToleranceInput] = useState('60');
	const tolerance = Math.min(3600, Math.max(0, Number(toleranceInput) || 0));
	const [now, setNow] = useState(() => new Date());

	useEffect(() => {
		const timer = window.setInterval(() => setNow(new Date()), 30_000);
		return () => window.clearInterval(timer);
	}, []);

	useEffect(() => {
		const value = query.trim();
		setCities([]);
		setSearchError('');
		if (selectedCity && value === cityLabel(selectedCity)) {
			setIsSearching(false);
			setCities([]);
			setSearchError('');
			return;
		}
		if (value.length < 2) {
			setIsSearching(false);
			setCities([]);
			setSearchError('');
			return;
		}

		setIsSearching(true);
		const controller = new AbortController();
		const timer = window.setTimeout(async () => {
			setIsSearching(true);
			setSearchError('');
			try {
				const found = await searchCities(value, controller.signal);
				setCities(found);
				setActiveIndex(0);
			} catch (error) {
				if (!controller.signal.aborted) setSearchError(error instanceof Error ? error.message : 'Не удалось выполнить поиск.');
			} finally {
				if (!controller.signal.aborted) setIsSearching(false);
			}
		}, 300);

		return () => {
			window.clearTimeout(timer);
			controller.abort();
		};
	}, [query, selectedCity]);

	const todayKey = selectedCity ? localDateKey(now, selectedCity.timeZone) : '';
	const calculation = useMemo(() => selectedCity && todayKey
		? calculateYear(selectedCity, todayKey, tolerance)
		: null, [selectedCity, todayKey, tolerance]);
	const today = calculation?.today;
	const todayDateLabel = selectedCity && todayKey
		? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'full', timeZone: selectedCity.timeZone }).format(now)
		: '';

	const chooseCity = (city: City) => {
		setSelectedCity(city);
		setQuery(cityLabel(city));
		setCities([]);
		setSearchError('');
	};

	const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'ArrowDown' && cities.length) {
			event.preventDefault();
			setActiveIndex((index) => (index + 1) % cities.length);
		} else if (event.key === 'ArrowUp' && cities.length) {
			event.preventDefault();
			setActiveIndex((index) => (index + cities.length - 1) % cities.length);
		} else if (event.key === 'Enter' && cities[activeIndex]) {
			event.preventDefault();
			chooseCity(cities[activeIndex]);
		} else if (event.key === 'Escape') {
			setCities([]);
		}
	};

	const statusText = today?.status === 'polar-day'
		? 'Полярный день: Солнце не заходит за горизонт.'
		: today?.status === 'polar-night'
			? 'Полярная ночь: Солнце не поднимается над горизонтом.'
			: today?.status === 'unavailable'
				? 'Не удалось определить восход и закат для этой даты.'
				: '';

	return (
		<main className="page-shell">
			<div className="ambient ambient--one" />
			<div className="ambient ambient--two" />
			<div className="container">
				<header className="topbar">
					<a className="brand" href="#top" aria-label="Солнечный календарь — главная">
						<span className="brand-mark"><SunIcon kind="day" /></span>
						<span>солнечный<br />календарь</span>
					</a>
					<span className="topbar-note">Ритм света в течение года</span>
				</header>

				<section className="hero" id="top">
					<p className="eyebrow"><span /> НЕБО ПОМНИТ КАЖДЫЙ ДЕНЬ</p>
					<h1>У каждого дня<br />есть <em>солнечный двойник</em></h1>
					<p className="hero-copy">Узнайте, когда в вашем городе Солнце взойдёт или зайдёт в то же время, а день станет такой же длины.</p>
				</section>

				<section className="search-panel" aria-label="Выбор города">
					<label className="field-label" htmlFor="city-search">Город</label>
					<div className="search-wrap">
						<svg className="search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>
						<input
							id="city-search"
							role="combobox"
							aria-autocomplete="list"
							aria-expanded={cities.length > 0}
							aria-controls="city-results"
							aria-activedescendant={cities[activeIndex] ? `city-result-${activeIndex}` : undefined}
							value={query}
							placeholder="Начните вводить название города"
							autoComplete="off"
							onChange={(event) => {
								setQuery(event.target.value);
								if (selectedCity && event.target.value !== cityLabel(selectedCity)) setSelectedCity(null);
							}}
							onKeyDown={onSearchKeyDown}
						/>
						{isSearching && <span className="search-spinner" aria-label="Идёт поиск" />}
						{cities.length > 0 && (
							<ul className="suggestions" id="city-results" role="listbox">
								{cities.map((city, index) => (
						<li key={`${city.latitude},${city.longitude}`} role="presentation">
										<button type="button" role="option" aria-selected={index === activeIndex} id={`city-result-${index}`} onClick={() => chooseCity(city)}>
											<span>{city.name}</span><small>{[city.admin1, city.country].filter(Boolean).join(', ')}</small>
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
					<p className={`search-hint ${searchError ? 'search-hint--error' : ''}`} aria-live="polite">
						{searchError || (query.trim().length > 0 && query.trim().length < 2 ? 'Введите хотя бы два символа' : cities.length === 0 && query.trim().length >= 2 && !isSearching && !selectedCity ? 'Ничего не найдено — попробуйте другое написание' : 'Поиск работает на русском и других языках')}
					</p>
					{selectedCity && <div className="selected-city"><span className="location-dot" />{cityLabel(selectedCity)} <span>· {selectedCity.timeZone}</span></div>}
				</section>

				{selectedCity && calculation && today && (
					<>
						<section className="today-panel" aria-labelledby="today-title">
							<div className="today-panel__intro">
								<div>
									<p className="eyebrow eyebrow--muted">СЕГОДНЯ В ВАШЕМ ГОРОДЕ</p>
									<h2 id="today-title">{todayDateLabel}</h2>
								</div>
								<div className="tolerance-control">
									<label htmlFor="tolerance">Допуск совпадения</label>
									<div><input id="tolerance" type="number" min="0" max="3600" step="1" value={toleranceInput} onChange={(event) => setToleranceInput(event.target.value)} onBlur={() => setToleranceInput(String(tolerance))} /><span>сек.</span></div>
									<small>{tolerance === 0 ? 'точный режим' : 'практический режим'}</small>
								</div>
							</div>
							{statusText ? (
								<div className="solar-status" role="status"><span>i</span>{statusText}</div>
							) : (
								<div className="sun-summary">
									<div className="sun-summary__item"><SunIcon kind="rise" /><span>Восход</span><strong>{formatLocalTime(today.sunrise, selectedCity.timeZone)}</strong></div>
									<div className="sun-summary__divider" />
									<div className="sun-summary__item"><SunIcon kind="set" /><span>Закат</span><strong>{formatLocalTime(today.sunset, selectedCity.timeZone)}</strong></div>
									<div className="sun-summary__divider" />
									<div className="sun-summary__item sun-summary__item--duration"><span className="duration-mark">24</span><span>Световой день</span><strong>{formatDuration(today.daylightSeconds)}</strong></div>
								</div>
							)}
						</section>

						<section className="results-section" aria-labelledby="results-title">
							<div className="section-heading">
								<div><p className="eyebrow eyebrow--muted">ПОИСК ПО ВСЕМУ ГОДУ</p><h2 id="results-title">Три солнечных совпадения</h2></div>
								<span className="year-pill">{todayKey.slice(0, 4)}</span>
							</div>
							<div className="result-grid">
								<DateCard title="Закат в то же время" kind="set" metric="sunset" results={today.sunsetSeconds === null ? null : calculation.matches.sunset} todayValue={today.sunsetSeconds} tolerance={tolerance} />
								<DateCard title="Восход в то же время" kind="rise" metric="sunrise" results={today.sunriseSeconds === null ? null : calculation.matches.sunrise} todayValue={today.sunriseSeconds} tolerance={tolerance} />
								<DateCard title="Такая же длина дня" kind="day" metric="daylight" results={today.daylightSeconds === null ? null : calculation.matches.daylight} todayValue={today.daylightSeconds} tolerance={tolerance} />
							</div>
						</section>
					</>
				)}

				{!selectedCity && (
					<section className="welcome-panel">
						<div className="orbit-illustration"><span className="orbit orbit--outer" /><span className="orbit orbit--inner" /><span className="orbit-sun" /><span className="orbit-dot orbit-dot--one" /><span className="orbit-dot orbit-dot--two" /></div>
						<div><span className="welcome-kicker">ОДИН ГОРОД · ЦЕЛЫЙ ГОД</span><h2>Найдите день,<br />который звучит так же</h2><p>Введите название города выше. Мы рассчитаем солнечное время для каждого дня года с учётом координат и местного часового пояса.</p></div>
					</section>
				)}

				<footer className="footer"><span>Расчёт по солнечной модели SunCalc · высота Солнца −0,833°</span><span>Часовой пояс: IANA · Геопоиск: Open-Meteo</span></footer>
			</div>
		</main>
	);
};

createRoot(document.getElementById('root')!).render(<App />);
