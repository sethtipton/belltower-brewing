import { z } from 'zod';

const beerSchema = z.object({
  id: z
    .union([z.string(), z.number(), z.undefined()])
    .transform((v) => {
      if (v === undefined) {
        // fallback slug will be injected later using name
        return null;
      }
      return String(v);
    }),
  name: z.string().min(1),
  style: z.string().or(z.null()).optional().transform((v) => (v === undefined ? null : v)),
  abv: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => {
      if (v === null || v === undefined) return null;
      const num = typeof v === 'string' ? parseFloat(v.replace('%', '')) : Number(v);
      return Number.isFinite(num) ? num : null;
    }),
  ibu: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => {
      if (v === null || v === undefined) return null;
      const num = typeof v === 'string' ? parseFloat(v) : Number(v);
      return Number.isFinite(num) ? num : null;
    }),
  description: z.string().optional().transform((v) => v ?? ''),
  hexColor: z.string().optional().nullable(),
  srm: z.union([z.number(), z.null()]).optional().transform((v) => (v === undefined ? null : v)),
  btKey: z.string().optional().nullable(),
  pairingProfile: z.unknown().optional(),
});

export function normalizeBeer(raw) {
  const parsed = beerSchema.parse(raw);
  // Inject fallback id from name if missing.
  const id = parsed.id ?? slugify(parsed.name);
  return { ...parsed, id };
}

function slugify(str) {
  const safe = typeof str === 'string' ? str : String(str ?? '');
  const slug = safe
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `beer-${Math.random().toString(36).slice(2)}`;
}
