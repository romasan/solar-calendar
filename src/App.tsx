import { useState } from 'react';
import type { City, Metric, ToleranceMode } from './types';
import { CitySearch } from './components/CitySearch';
import { TodayCard } from './components/TodayCard';
import { ResultCard } from './components/ResultCard';
import { ToleranceControl } from './components/ToleranceControl';
import { SunIcon, Spinner } from './components/Icons';
import { SUGGESTED_CITIES } from './lib/cities';
import { useSolarCalendar } from './hooks/useSolarCalendar';
import { countryFlag } from './lib/format';

const DEFAULT_TOLERANCE = 60;
const CARD_ORDER: Metric[] = ['sunset', 'sunrise', 'daylength'];

export default function App() {
  const [city, setCity] = useState<City | null>(null);
  const [mode, setMode] = useState<ToleranceMode>('practical');
  const [practicalTolerance, setPracticalTolerance] = useState(DEFAULT_TOLERANCE);

  const toleranceSec = mode === 'exact' ? 1 : practicalTolerance;
  const { data, metricResults, loading, error } = useSolarCalendar(city, toleranceSec);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <SunIcon />
        </div>
        <h1 className="app-title">Солнечный календарь</h1>
        <p className="app-subtitle">
          Найдите дни года с тем же временем восхода, заката и той же длительностью светового дня,
          что и сегодня в выбранном городе.
        </p>
      </header>

      <main className="app-main">
        <CitySearch onSelect={setCity} />

        {!city && (
          <div className="suggested">
            <span className="suggested-label">Популярные города:</span>
            <div className="suggested-list">
              {SUGGESTED_CITIES.map((c) => (
                <button key={c.id} type="button" className="chip" onClick={() => setCity(c)}>
                  <span aria-hidden="true">{countryFlag(c.countryCode)}</span> {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {city && (
          <>
            <div className="selected-bar">
              <span className="selected-bar-name">
                <span aria-hidden="true">{countryFlag(city.countryCode)}</span> {city.name}
              </span>
              <span className="selected-bar-tz">
                {city.admin1 ? `${city.admin1}, ` : ''}
                {city.country} · часовой пояс {city.timezone}
              </span>
              <button type="button" className="link-btn" onClick={() => setCity(null)}>
                Сменить город
              </button>
            </div>

            <ToleranceControl
              mode={mode}
              tolerance={practicalTolerance}
              onModeChange={setMode}
              onToleranceChange={setPracticalTolerance}
            />
          </>
        )}

        {loading && (
          <div className="status" role="status">
            <Spinner className="spin" /> Вычисляем солнечные дни на весь год…
          </div>
        )}
        {error && (
          <div className="status error" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && data && metricResults && city && (
          <>
            <TodayCard city={city} today={data.today} />
            <div className="results">
              {CARD_ORDER.map((m) => (
                <ResultCard key={m} result={metricResults[m]} />
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Восход/закат — по высоте центра Солнца −0,833° (NOAA-алгоритм, SunCalc). Часовые пояса и
          переходы на летнее время — база IANA (Luxon). Поиск городов — Open-Meteo (GeoNames), без API-ключа.
        </p>
      </footer>
    </div>
  );
}
