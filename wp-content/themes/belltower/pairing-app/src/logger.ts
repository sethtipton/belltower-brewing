type LoggerFn = (event: string, data?: Record<string, unknown>) => void;

const getConsole = () => {
  if (typeof globalThis === 'undefined') return null;
  return globalThis.console ?? null;
};

const readDebugFlag = (): boolean => {
  if (typeof globalThis === 'undefined') return false;
  const win = globalThis as {
    PAIRING_APP?: { debug?: boolean };
    PAIRINGAPP?: { debug?: boolean };
    localStorage?: Storage;
  };
  const explicit = win.PAIRING_APP?.debug ?? win.PAIRINGAPP?.debug;
  if (typeof explicit === 'boolean') return explicit;
  try {
    const raw = win.localStorage?.getItem('bt_pairing_debug');
    if (!raw) return false;
    return raw === '1' || raw === 'true' || raw === 'yes';
  } catch {
    return false;
  }
};

const getTraceId = (): string => {
  if (typeof globalThis === 'undefined') return 'server';
  const win = globalThis as { sessionStorage?: Storage };
  const key = 'bt_pairing_trace_id';
  try {
    const existing = win.sessionStorage?.getItem(key);
    if (existing) return existing;
    const next = Math.random().toString(36).slice(2, 10);
    win.sessionStorage?.setItem(key, next);
    return next;
  } catch {
    return Math.random().toString(36).slice(2, 10);
  }
};

const TRACE_ID = getTraceId();
const DEBUG = readDebugFlag();
let EVENT_SEQ = 0;

const formatPrefix = (scope: string, event: string): string => `[PAIRING_APP] ${scope} ${event}`;

const logWithLevel = (level: 'debug' | 'info' | 'warn' | 'error', scope: string, event: string, data?: Record<string, unknown>) => {
  const logger = getConsole();
  if (!logger) return;
  if (level === 'debug' && !DEBUG) return;
  EVENT_SEQ += 1;
  const payload = { traceId: TRACE_ID, seq: EVENT_SEQ, ...data };
  const method = level === 'debug' ? 'log' : level;
  const fn = logger[method] ?? logger.log;
  fn.call(logger, formatPrefix(scope, event), payload);
};

export const createLogger = (scope: string): { debug: LoggerFn; info: LoggerFn; warn: LoggerFn; error: LoggerFn; isDebug: boolean; traceId: string } => ({
  debug: (event, data) => logWithLevel('debug', scope, event, data),
  info: (event, data) => logWithLevel('info', scope, event, data),
  warn: (event, data) => logWithLevel('warn', scope, event, data),
  error: (event, data) => logWithLevel('error', scope, event, data),
  isDebug: DEBUG,
  traceId: TRACE_ID,
});

export const getLoggerState = (): { isDebug: boolean; traceId: string } => ({ isDebug: DEBUG, traceId: TRACE_ID });
