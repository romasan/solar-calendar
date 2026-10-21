import type { ComponentType, SVGProps } from 'react';
import type { Metric } from '../types';
import type { MetricResult } from '../lib/matcher';
import { formatDayOffset, formatDiff, formatDuration, formatFullDateRu, formatTimeOfDay } from '../lib/format';
import { SunriseIcon, SunsetIcon, DaylightIcon } from './Icons';

interface Props {
  result: MetricResult;
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const META: Record<Metric, { title: string; todayLabel: string; icon: IconComponent }> = {
  sunset: { title: 'Закат в то же время', todayLabel: 'Сегодня закат', icon: SunsetIcon },
  sunrise: { title: 'Восход в то же время', todayLabel: 'Сегодня восход', icon: SunriseIcon },
  daylength: { title: 'Такая же продолжительность дня', todayLabel: 'Сегодня день длится', icon: DaylightIcon },
};

function valueLabel(metric: Metric, sec: number): string {
  return metric === 'daylength' ? formatDuration(sec) : formatTimeOfDay(sec);
}

export function ResultCard({ result }: Props) {
  const meta = META[result.metric];
  const Icon = meta.icon;
  const tolerance = result.toleranceSec;

  const metricNoun = result.metric === 'daylength' ? 'продолжительность дня' : result.metric === 'sunrise' ? 'время восхода' : 'время заката';

  return (
    <section className={`result-card accent-${result.metric}`} aria-label={meta.title}>
      <header className="result-card-header">
        <span className="result-card-icon"><Icon /></span>
        <h3 className="result-card-title">{meta.title}</h3>
      </header>

      {result.applicable && result.todayValueSec !== null ? (
        <p className="result-today">
          {meta.todayLabel}: <strong>{valueLabel(result.metric, result.todayValueSec)}</strong>
        </p>
      ) : (
        <p className="result-polar">
          {result.metric === 'daylength'
            ? 'Солнце сегодня не пересекает горизонт.'
            : 'Сегодня восход/закат не происходят — сравнивать не с чем.'}
        </p>
      )}

      {!result.applicable ? (
        <p className="result-empty">Для этого показателя нет дат для сравнения.</p>
      ) : result.matches.length > 0 ? (
        <>
          <p className="result-note">
            {result.hasExactMatch
              ? 'Найдено точное совпадение:'
              : `Точного совпадения нет — показаны даты в пределах допуска ±${tolerance} с:`}
          </p>
          <ul className="match-list">
            {result.matches.map((m) => (
              <li key={m.dateISO} className={`match ${m.exact ? 'match-exact' : ''}`}>
                <div className="match-main">
                  <span className="match-date">{formatFullDateRu(m.dateISO)}</span>
                  <span className="match-value">{valueLabel(result.metric, m.valueSec)}</span>
                </div>
                <div className="match-meta">
                  <span className={`match-diff ${m.exact ? 'exact' : ''}`}>
                    {m.exact ? 'точное совпадение' : `разница ${formatDiff(m.diffSec)}`}
                  </span>
                  <span className={`match-offset ${m.dayOffset < 0 ? 'past' : 'future'}`}>
                    {formatDayOffset(m.dayOffset)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : result.closest ? (
        <div className="result-closest">
          <p className="result-note">
            В пределах допуска ±{tolerance} с совпадений нет. Показана <strong>ближайшая</strong> дата:
          </p>
          <div className="match">
            <div className="match-main">
              <span className="match-date">{formatFullDateRu(result.closest.dateISO)}</span>
              <span className="match-value">{valueLabel(result.metric, result.closest.valueSec)}</span>
            </div>
            <div className="match-meta">
              <span className="match-diff">разница {formatDiff(result.closest.diffSec)}</span>
              <span className={`match-offset ${result.closest.dayOffset < 0 ? 'past' : 'future'}`}>
                {formatDayOffset(result.closest.dayOffset)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <p className="result-empty">Нет других дат с сопоставимым значением {metricNoun} в этом году.</p>
      )}
    </section>
  );
}
