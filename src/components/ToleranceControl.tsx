import type { ToleranceMode } from '../types';

interface Props {
  mode: ToleranceMode;
  tolerance: number;
  onModeChange: (mode: ToleranceMode) => void;
  onToleranceChange: (sec: number) => void;
}

const PRESETS = [30, 60, 120, 300];

export function ToleranceControl({ mode, tolerance, onModeChange, onToleranceChange }: Props) {
  return (
    <div className="tolerance">
      <div className="tolerance-label">Точность сравнения</div>
      <div className="tolerance-row">
        <div className="segmented" role="radiogroup" aria-label="Режим сравнения">
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'exact'}
            className={mode === 'exact' ? 'seg active' : 'seg'}
            onClick={() => onModeChange('exact')}
          >
            Точное совпадение
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'practical'}
            className={mode === 'practical' ? 'seg active' : 'seg'}
            onClick={() => onModeChange('practical')}
          >
            Практическое
          </button>
        </div>

        {mode === 'practical' ? (
          <div className="tolerance-controls">
            <input
              type="range"
              min={1}
              max={600}
              step={1}
              value={tolerance}
              aria-label="Допуск в секундах"
              onChange={(e) => onToleranceChange(Number(e.target.value))}
            />
            <div className="tolerance-value">
              <input
                type="number"
                min={1}
                max={86400}
                value={tolerance}
                aria-label="Допуск в секундах (число)"
                onChange={(e) => onToleranceChange(Math.max(1, Math.min(86400, Number(e.target.value) || 1)))}
              />
              <span>с</span>
            </div>
            <div className="tolerance-presets">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={tolerance === p ? 'preset active' : 'preset'}
                  onClick={() => onToleranceChange(p)}
                >
                  ±{p} с
                </button>
              ))}
            </div>
          </div>
        ) : (
          <span className="tolerance-hint">совпадение в пределах точности алгоритма (±1 с)</span>
        )}
      </div>
    </div>
  );
}
