import { useCallback, useEffect, useSyncExternalStore } from 'react';

interface Slot { id: string; name: string; hexColor: string | null; addedAt: number }
interface Toast { message: string; prevSlots: (Slot | null)[]; nextSlots: (Slot | null)[]; createdAt: number; expiresAt: number }
interface FlightState { slots: (Slot | null)[]; pendingReplace: Slot | null; toast: Toast | null }
interface BeerInput { id?: string | number | null; name?: string | null; hexColor?: string | null; hex?: string | null }

const STORAGE_KEY = 'bt_flight_v1';
const UNDO_KEY = 'bt_flight_undo_v1';
const PENDING_KEY = 'bt_flight_pending_v1';
const CAPACITY = 5;
const WRITE_DEBOUNCE = 200;
const TOAST_MS = 4000;

let persistTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
let state: FlightState = {
  slots: ensureSlots(loadSlots()),
  pendingReplace: loadPendingReplace(),
  toast: loadUndo(),
};
const listeners = new Set<(next: FlightState) => void>();

function getStorage(): Storage | null {
  if (typeof globalThis === 'undefined') return null;
  const candidate = globalThis.localStorage;
  return candidate ?? null;
}

function subscribe(listener: (value: FlightState) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): FlightState {
  return state;
}

function setState(updater: ((prev: FlightState) => FlightState) | FlightState) {
  const next = typeof updater === 'function' ? (updater as (prev: FlightState) => FlightState)(state) : updater;
  state = next;
  listeners.forEach((l) => l(state));
}

function createEmptySlots(): (Slot | null)[] {
  return Array.from({ length: CAPACITY }, () => null);
}

function ensureSlots(slots: (Slot | null)[] | null | undefined = []): (Slot | null)[] {
  const next = Array.isArray(slots) ? [...slots] : [];
  while (next.length < CAPACITY) next.push(null);
  return next.slice(0, CAPACITY);
}

function coerceSlot(raw: unknown): Slot | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const idVal = 'id' in obj && (typeof obj.id === 'string' || typeof obj.id === 'number') ? String(obj.id) : null;
  const nameVal = 'name' in obj && typeof obj.name === 'string' ? obj.name : null;
  if (!idVal || !nameVal) return null;
  const hexVal = 'hexColor' in obj && typeof obj.hexColor === 'string'
    ? obj.hexColor
    : 'hex' in obj && typeof obj.hex === 'string'
      ? obj.hex
      : null;
  const addedAtVal = 'addedAt' in obj && typeof obj.addedAt === 'number' ? obj.addedAt : Date.now();
  return { id: idVal, name: nameVal, hexColor: hexVal, addedAt: addedAtVal };
}

function loadSlots(): (Slot | null)[] {
  const storage = getStorage();
  if (!storage) return createEmptySlots();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createEmptySlots();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return createEmptySlots();
    const entries: unknown[] = parsed;
    const slots = entries.map((item) => coerceSlot(item));
    return ensureSlots(slots);
  } catch (err) {
    globalThis.console?.warn('Flight: unable to read storage', err);
    return createEmptySlots();
  }
}

function loadUndo(): Toast | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(UNDO_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const toast = parsed && typeof parsed === 'object' ? (parsed as Toast) : null;
    if (!toast || typeof toast.expiresAt !== 'number') return null;
    const now = Date.now();
    if (now > toast.expiresAt) {
      storage.removeItem(UNDO_KEY);
      return null;
    }
    return toast;
  } catch (err) {
    globalThis.console?.warn('Flight: unable to read undo', err);
    return null;
  }
}

function persistSlots(slots: (Slot | null)[]) {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (persistTimer) {
      globalThis.clearTimeout(persistTimer);
    }
    persistTimer = globalThis.setTimeout(() => {
      storage.setItem(STORAGE_KEY, JSON.stringify(slots));
      persistTimer = null;
    }, WRITE_DEBOUNCE);
  } catch (err) {
    globalThis.console?.warn('Flight: unable to persist slots', err);
  }
}

function persistUndo(toast: Toast | null) {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (!toast) {
      storage.removeItem(UNDO_KEY);
      return;
    }
    storage.setItem(UNDO_KEY, JSON.stringify(toast));
  } catch (err) {
    globalThis.console?.warn('Flight: unable to persist undo', err);
  }
}

function loadPendingReplace(): Slot | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const candidate = coerceSlot(parsed);
    return candidate;
  } catch (err) {
    globalThis.console?.warn('Flight: unable to read pending replace', err);
    return null;
  }
}

function persistPendingReplace(beer: Slot | null) {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (!beer) {
      storage.removeItem(PENDING_KEY);
      return;
    }
    storage.setItem(PENDING_KEY, JSON.stringify(beer));
  } catch (err) {
    globalThis.console?.warn('Flight: unable to persist pending replace', err);
  }
}

function announce(text: string) {
  if (!text) return;
  const doc = typeof globalThis !== 'undefined' ? globalThis.document : undefined;
  const el = doc ? doc.getElementById('flight-announcer') : null;
  if (!el) return;
  el.textContent = '';
  const raf = typeof globalThis !== 'undefined' ? globalThis.requestAnimationFrame : null;
  if (raf) {
    raf(() => {
      el.textContent = text;
    });
  } else {
    el.textContent = text;
  }
}

function slugify(str: string | number | null | undefined) {
  const raw = String(str ?? '');
  const base = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `beer-${Math.random().toString(36).slice(2)}`;
}

function normalizeBeer(beer: BeerInput | Slot | null | undefined): Slot | null {
  if (!beer) return null;
  const candidate = coerceSlot({
    id: beer.id ?? null,
    name: beer.name ?? null,
    hexColor: 'hexColor' in (beer as BeerInput) && (beer as BeerInput).hexColor !== undefined
      ? (beer as BeerInput).hexColor
      : 'hex' in (beer as BeerInput) && (beer as BeerInput).hex !== undefined
        ? (beer as BeerInput).hex
        : null,
    addedAt: Date.now(),
  });
  if (candidate) return candidate;
  const name = 'name' in (beer as BeerInput) && typeof (beer as BeerInput).name === 'string' ? (beer as BeerInput).name : 'Unknown beer';
  const hexColor = typeof (beer as BeerInput).hexColor === 'string'
    ? (beer as BeerInput).hexColor
    : typeof (beer as BeerInput).hex === 'string'
      ? (beer as BeerInput).hex
      : null;
  return {
    id: slugify(name ?? 'beer'),
    name: name ?? 'Unknown beer',
    hexColor,
    addedAt: Date.now(),
  };
}

function createToast(prevSlots: (Slot | null)[], nextSlots: (Slot | null)[], message: string): Toast {
  const createdAt = Date.now();
  return {
    message,
    prevSlots: ensureSlots(prevSlots),
    nextSlots: ensureSlots(nextSlots),
    createdAt,
    expiresAt: createdAt + TOAST_MS,
  };
}

function countFilled(slots: (Slot | null)[]) {
  return slots.filter(Boolean).length;
}

function setSlotsWithUndo(prevSlots: (Slot | null)[], nextSlots: (Slot | null)[], message: string) {
  const toast = createToast(prevSlots, nextSlots, message);
  setState((current) => ({
    ...current,
    slots: ensureSlots(nextSlots),
    toast,
    pendingReplace: null,
  }));
  persistSlots(nextSlots);
  persistUndo(toast);
  persistPendingReplace(null);
}

function addBeer(beer: BeerInput | Slot | null | undefined) {
  const normalized = normalizeBeer(beer);
  if (!normalized) return { success: false as const };
  const prevSlots = ensureSlots(state.slots);
  const emptyIndex = prevSlots.findIndex((slot) => !slot);
  if (emptyIndex === -1) {
    setState((current) => ({ ...current, pendingReplace: normalized }));
    persistPendingReplace(normalized);
    announce('Flight is full. Choose a slot to replace.');
    return { success: false as const, needsReplace: true as const };
  }
  const nextSlots = [...prevSlots];
  nextSlots[emptyIndex] = normalized;
  setSlotsWithUndo(prevSlots, nextSlots, `Added ${normalized.name} to flight`);
  announce(`Added ${normalized.name} to flight — ${countFilled(nextSlots)} of ${CAPACITY} slots filled.`);
  return { success: true as const, index: emptyIndex };
}

function removeBeer(index: number) {
  const prevSlots = ensureSlots(state.slots);
  if (!prevSlots[index]) return { success: false as const };
  const removed = prevSlots[index];
  const nextSlots = [...prevSlots];
  nextSlots[index] = null;
  setSlotsWithUndo(prevSlots, nextSlots, `Removed ${removed?.name ?? 'beer'} from flight`);
  announce(`Removed ${removed?.name ?? 'beer'} — ${countFilled(nextSlots)} of ${CAPACITY} slots filled.`);
  return { success: true as const };
}

function replaceBeer(index: number, beer: BeerInput | Slot | null | undefined) {
  const normalized = normalizeBeer(beer);
  if (!normalized) return { success: false as const };
  const prevSlots = ensureSlots(state.slots);
  const replaced = prevSlots[index];
  const nextSlots = [...prevSlots];
  nextSlots[index] = normalized;
  const label = replaced ? `Replaced ${replaced.name} with ${normalized.name}` : `Added ${normalized.name}`;
  setSlotsWithUndo(prevSlots, nextSlots, label);
  persistPendingReplace(null);
  announce(`${label} — ${countFilled(nextSlots)} of ${CAPACITY} slots filled.`);
  return { success: true as const, replacedIndex: index, replaced };
}

function clearFlight() {
  const prevSlots = ensureSlots(state.slots);
  const nextSlots = createEmptySlots();
  setSlotsWithUndo(prevSlots, nextSlots, 'Cleared flight');
  persistPendingReplace(null);
  announce('Cleared flight.');
  return { success: true as const };
}

function undoLastAction() {
  const { toast } = state;
  if (!toast?.prevSlots) return false;
  setState((current) => ({
    ...current,
    slots: ensureSlots(toast.prevSlots),
    toast: null,
    pendingReplace: null,
  }));
  persistSlots(toast.prevSlots);
  persistUndo(null);
  persistPendingReplace(null);
  announce(`Undid: ${toast.message}`);
  return true;
}

function dismissToast() {
  setState((current) => ({ ...current, toast: null }));
  persistUndo(null);
}

function cancelPendingReplace() {
  setState((current) => ({ ...current, pendingReplace: null }));
  persistPendingReplace(null);
}

/**
 * Hook interface for the Flight tray.
 */
export default function useFlight() {
  const snapshot = useSyncExternalStore<FlightState>(subscribe, getSnapshot, getSnapshot);
  const { slots, toast, pendingReplace } = snapshot;

  // Cleanup expired toast (in case time elapsed while component mounted).
  useEffect(() => {
    if (toast?.expiresAt && Date.now() > toast.expiresAt) {
      dismissToast();
    }
  }, [toast]);

  const addBeerCb = useCallback((beer: BeerInput | Slot | null | undefined) => addBeer(beer), []);
  const removeBeerCb = useCallback((index: number) => removeBeer(index), []);
  const replaceBeerCb = useCallback((index: number, beer: BeerInput | Slot | null | undefined) => replaceBeer(index, beer), []);
  const clearFlightCb = useCallback(() => clearFlight(), []);
  const cancelPendingReplaceCb = useCallback(() => cancelPendingReplace(), []);
  const undoLastActionCb = useCallback(() => undoLastAction(), []);
  const dismissToastCb = useCallback(() => dismissToast(), []);

  const memoized = {
    slots: ensureSlots(slots),
    pendingReplace,
    toast,
    addBeer: addBeerCb,
    removeBeer: removeBeerCb,
    replaceBeer: replaceBeerCb,
    clearFlight: clearFlightCb,
    cancelPendingReplace: cancelPendingReplaceCb,
    undoLastAction: undoLastActionCb,
    dismissToast: dismissToastCb,
  };

  return memoized;
}
