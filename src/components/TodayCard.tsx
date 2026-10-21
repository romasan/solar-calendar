import type { City } from '../types';
import type { DayResult } from '../lib/astronomy';
import { countryFlag, formatDateRu, formatDuration, formatTimeOfDay, weekdayRuLower } from '../lib/format';
import { SunriseIcon, SunsetIcon, DaylightIcon } from './Icons';

interface Props {
  city: City;
  today: DayResult;
}

export function TodayCard({ city, today }: Props) {
  const polar = today.state !== 'normal';

  return (
    <section className="today-card" aria-label="Сегодняшние данные">
      <header className="today-card-header">
        <div className="today-city">
          <span className="today-flag">{countryFlag(city.countryCode)}</span>
          <div>
            <h2 className="today-city-name">{city.name}</h2>
            <p className="today-city-country">
              {[city.admin1, city.country].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
        <div className="today-date">
          <span className="today-date-main">{formatDateRu(today.dateISO)}</span>
          <span className="today-date-weekday">{weekdayRuLower(today.dateISO)}</span>
        </div>
      </header>

      <div className="today-grid">
        <div className="today-stat">
          <span className="today-stat-label">
            <SunriseIcon /> Восход
          </span>
          <span className="today-stat-value">
            {today.sunriseSec !== null ? formatTimeOfDay(today.sunriseSec) : '—'}
          </span>
          {today.sunriseSec === null && (
            <span className="today-stat-note">{today.state === 'polar-day' ? 'полярный день' : 'полярная ночь'}</span>
          )}
        </div>

        <div className="today-stat">
          <span className="today-stat-label">
            <DaylightIcon /> Длительность дня
          </span>
          <span className="today-stat-value">
            {polar ? (today.state === 'polar-day' ? '24 ч 0 мин' : '0 ч 0 мин') : formatDuration(today.dayLengthSec)}
          </span>
          {polar && <span className="today-stat-note">солнце не {today.state === 'polar-day' ? 'заходит' : 'восходит'}</span>}
        </div>

        <div className="today-stat">
          <span className="today-stat-label">
            <SunsetIcon /> Закат
          </span>
          <span className="today-stat-value">
            {today.sunsetSec !== null ? formatTimeOfDay(today.sunsetSec) : '—'}
          </span>
          {today.sunsetSec === null && (
            <span className="today-stat-note">{today.state === 'polar-day' ? 'полярный день' : 'полярная ночь'}</span>
          )}
        </div>
      </div>
    </section>
  );
}
