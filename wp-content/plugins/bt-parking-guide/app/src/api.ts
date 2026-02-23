import { createLogger } from './logger';

const log = createLogger('api');

export interface ParkingGuideConfig {
  restUrl?: string;
  nonce?: string;
  isAdmin?: boolean;
  mapEndpoint?: string;
  debug?: boolean;
}

export interface ParkingMapResponse {
  id?: number;
  map?: unknown;
}

function getConfig(): ParkingGuideConfig {
  if (typeof window === 'undefined') return {};
  const win = window as Window & { BT_PARKING_GUIDE_CONFIG?: ParkingGuideConfig };
  const cfg = win.BT_PARKING_GUIDE_CONFIG;
  return cfg && typeof cfg === 'object' ? cfg : {};
}

function getRestBase(): string {
  const cfg = getConfig();
  if (typeof cfg.restUrl === 'string' && cfg.restUrl) return cfg.restUrl.replace(/\/$/, '');
  if (typeof window !== 'undefined') return `${window.location.origin}/wp-json`;
  return '/wp-json';
}

function getMapEndpoint(): string {
  const cfg = getConfig();
  if (typeof cfg.mapEndpoint === 'string' && cfg.mapEndpoint) return cfg.mapEndpoint;
  return `${getRestBase()}/bt-parking/v1/map`;
}

function getNonce(): string {
  const cfg = getConfig();
  return typeof cfg.nonce === 'string' ? cfg.nonce : '';
}

export function isAdminUser(): boolean {
  const cfg = getConfig();
  return Boolean(cfg.isAdmin);
}

export async function fetchParkingMap(): Promise<ParkingMapResponse> {
  const endpoint = getMapEndpoint();
  log.debug('fetch.start', { endpoint });
  const res = await fetch(endpoint, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': getNonce(),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Unable to load parking map (${res.status}): ${text}`);
  }
  return (await res.json()) as ParkingMapResponse;
}

export async function saveParkingMap(map: unknown): Promise<ParkingMapResponse> {
  const endpoint = getMapEndpoint();
  log.debug('save.start', { endpoint });
  const res = await fetch(endpoint, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': getNonce(),
    },
    body: JSON.stringify({ map }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Unable to save parking map (${res.status}): ${text}`);
  }

  return (await res.json()) as ParkingMapResponse;
}
