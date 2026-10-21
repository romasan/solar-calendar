import type { DayResult } from './astronomy';

/**
 * Кэш результатов астрономических расчётов по (координаты, часовой пояс, год).
 * Слой в памяти — основной; localStorage — для ускорения повторных открытий.
 */
const LS_KEY = 'solcal.days.v1';
const LS_MAX_ENTRIES = 8;

const memory = new Map<string, DayResult[]>();

function keyFor(lat: number, lng: number, tz: string, year: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)},${tz},${year}`;
}

interface PersistedEntry {
  key: string;
  days: DayResult[];
}

function loadPersisted(): Map<string, DayResult[]> {
  const out = new Map<string, DayResult[]>();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return out;
    const entries = JSON.parse(raw) as PersistedEntry[];
    if (!Array.isArray(entries)) return out;
    for (const e of entries) {
      if (e && typeof e.key === 'string' && Array.isArray(e.days)) {
        out.set(e.key, e.days);
      }
    }
  } catch {
    // localStorage недоступен или повреждён — игнорируем.
  }
  return out;
}

function persist(): void {
  try {
    const entries: PersistedEntry[] = [];
    for (const [key, days] of memory.entries()) {
      entries.push({ key, days });
    }
    // Храним не более LS_MAX_ENTRIES последних городов.
    const trimmed = entries.slice(-LS_MAX_ENTRIES);
    localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
  } catch {
    // переполнение квоты — не критично.
  }
}

let hydrated = false;
function hydrate(): void {
  if (hydrated) return;
  for (const [key, days] of loadPersisted()) {
    if (!memory.has(key)) memory.set(key, days);
  }
  hydrated = true;
}

export function getCachedDays(lat: number, lng: number, tz: string, year: number): DayResult[] | undefined {
  hydrate();
  return memory.get(keyFor(lat, lng, tz, year));
}

export function setCachedDays(lat: number, lng: number, tz: string, year: number, days: DayResult[]): void {
  hydrate();
  memory.set(keyFor(lat, lng, tz, year), days);
  persist();
}
