interface PredictiveStopper {
  stop: (actualMs?: number) => void;
  startedAt: number;
}

const STORAGE_KEY = 'bt_pairing_expected_ms';
const DEFAULT_EXPECTED = 3000;
const DEFAULT_EXPECTED_FIRST_RUN = 8000;
const MIN_EXPECTED = 1500;
const MAX_EXPECTED = 20000;
const ALPHA = 0.2;

const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const readExpected = (): number => {
  if (typeof window === 'undefined' || !window.localStorage) return DEFAULT_EXPECTED;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_EXPECTED_FIRST_RUN;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return DEFAULT_EXPECTED_FIRST_RUN;
    return clamp(parsed, MIN_EXPECTED, MAX_EXPECTED);
  } catch {
    return DEFAULT_EXPECTED_FIRST_RUN;
  }
};

const writeExpected = (value: number) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(clamp(value, MIN_EXPECTED, MAX_EXPECTED)));
  } catch {
    // ignore storage errors
  }
};

export const startPredictiveFill = (onTick: (fillLevel: number) => void): PredictiveStopper => {
  const expected = readExpected();
  const startedAt = now();
  let stopped = false;
  const creepDuration = expected * 4;

  const tick = () => {
    if (stopped) return;
    const elapsed = now() - startedAt;
    let fill = 0;
    if (elapsed <= expected) {
      fill = 0.9 * (elapsed / expected);
    } else {
      const creep = Math.min((elapsed - expected) / creepDuration, 1);
      fill = 0.9 + 0.05 * creep;
    }
    onTick(clamp(fill, 0, 0.95));
  };

  tick();
  const intervalId = window.setInterval(tick, 50);

  const stop = (actualMs?: number) => {
    stopped = true;
    window.clearInterval(intervalId);
    if (typeof actualMs === 'number' && Number.isFinite(actualMs)) {
      const prev = readExpected();
      const next = ALPHA * actualMs + (1 - ALPHA) * prev;
      writeExpected(next);
    }
  };

  return { stop, startedAt };
};
