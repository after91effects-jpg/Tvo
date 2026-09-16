type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  correlationId?: string;
  message: string;
  context?: Record<string, unknown>;
}

const SENSITIVE_KEYS = [
  'password', 'password_hash', 'token', 'secret', 'private_key',
  'firebase_uid', 'idToken', 'id_token', 'credential', 'api_key',
  'authorization', 'cookie', 'session',
];

function sanitizeContext(ctx: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!ctx) return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(ctx)) {
    const lk = key.toLowerCase();
    if (SENSITIVE_KEYS.some((sk) => lk.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeContext(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function logEvent(
  level: LogLevel,
  event: string,
  message: string,
  correlationId?: string,
  context?: Record<string, unknown>,
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    correlationId,
    message,
    context: sanitizeContext(context),
  };
  const output = JSON.stringify(entry);
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export function logInfo(event: string, message: string, correlationId?: string, context?: Record<string, unknown>): void {
  logEvent('info', event, message, correlationId, context);
}

export function logWarn(event: string, message: string, correlationId?: string, context?: Record<string, unknown>): void {
  logEvent('warn', event, message, correlationId, context);
}

export function logError(event: string, message: string, correlationId?: string, context?: Record<string, unknown>): void {
  logEvent('error', event, message, correlationId, context);
}

export function logDebug(event: string, message: string, correlationId?: string, context?: Record<string, unknown>): void {
  logEvent('debug', event, message, correlationId, context);
}

export function logStartup(event: string, message: string): void {
  logEvent('info', event, message, undefined, undefined);
}

export function withCorrelationId(header?: string | null): string {
  if (header && typeof header === 'string' && header.length > 0) return header;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
