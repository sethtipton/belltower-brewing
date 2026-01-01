/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */

/** @typedef {{ id?: string; description?: string }} ColorEntry */
/** @typedef {{ items?: ColorEntry[] }} ColorPayload */
/** @typedef {{ hex: string; srm: number }} ColorResult */

/** @type {DedicatedWorkerGlobalScope} */
const ctx = /** @type {DedicatedWorkerGlobalScope} */ (self);

ctx.onmessage = (event /** @type {MessageEvent<ColorPayload>} */) => {
  /** @type {ColorPayload} */
  const payload = event.data ?? {};
  const items = Array.isArray(payload.items) ? payload.items : null;
  if (!items) {
    ctx.postMessage(null);
    return;
  }

  // Minimal color mapping: hash the description length to a pseudo color.
  /** @type {Record<string, ColorResult>} */
  const results = {};
  items.forEach((entry) => {
    const desc = String(entry.description ?? '');
    const id = String(entry.id ?? '');
    const hash = Math.max(0, Math.min(360, desc.length * 3.6));
    const hex = hslToHex(hash, 60, 75);
    results[id] = { hex, srm: Math.round((desc.length % 35) + 2) };
  });

  ctx.postMessage(results);
};

function hslToHex(h, s, l) {
  const sat = Number(s) / 100;
  const lig = Number(l) / 100;
  const k = (n) => (n + Number(h) / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
