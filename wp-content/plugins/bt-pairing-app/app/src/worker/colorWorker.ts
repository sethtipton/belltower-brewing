interface ColorEntry {
  id?: string;
  description?: string;
}

interface ColorPayload {
  items?: ColorEntry[];
}

interface ColorResult {
  hex: string;
  srm: number;
}

interface WorkerMessageEvent {
  data: unknown;
}

interface WorkerContext {
  onmessage: ((event: WorkerMessageEvent) => void) | null;
  postMessage: (data: unknown) => void;
}

const ctx = self as unknown as WorkerContext;

const toColorPayload = (value: unknown): ColorPayload => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const objectValue = value as Record<string, unknown>;
  const items = objectValue.items;
  if (!Array.isArray(items)) {
    return {};
  }

  return {
    items: items
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
      .map((entry) => ({
        id: typeof entry.id === 'string' ? entry.id : '',
        description: typeof entry.description === 'string' ? entry.description : '',
      })),
  };
};

ctx.onmessage = (event) => {
  const payload = toColorPayload(event.data);
  const items = payload.items;
  if (!items || !Array.isArray(items)) {
    ctx.postMessage(null);
    return;
  }

  const results: Record<string, ColorResult> = {};
  items.forEach((entry) => {
    const desc = String(entry.description ?? '');
    const id = String(entry.id ?? '');
    const hash = Math.max(0, Math.min(360, desc.length * 3.6));
    const hex = hslToHex(hash, 60, 75);
    results[id] = { hex, srm: Math.round((desc.length % 35) + 2) };
  });

  ctx.postMessage(results);
};

function hslToHex(h: number, s: number, l: number): string {
  const sat = Number(s) / 100;
  const lig = Number(l) / 100;
  const k = (n: number) => (n + Number(h) / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export {};
