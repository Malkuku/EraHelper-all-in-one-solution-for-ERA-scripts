import { eraLogger } from '../utils/MvuHelperLogger';

/** Sanitize before retaining diagnostics or passing them to a console formatter. */
export function diagnosticText(value: unknown, secret = ''): string {
  let text = typeof value === 'string' ? value : (JSON.stringify(value, null, 2) ?? String(value));
  if (secret)
    for (const encoded of new Set([secret, encodeURIComponent(secret), JSON.stringify(secret).slice(1, -1)])) {
      text = text.split(encoded).join('[已隐藏]');
    }
  return text
    .replace(/(Bearer\s+)[^\s"'\\,;<>]+/gi, '$1[已隐藏]')
    .replace(
      /((?:["']?(?:authorization|api[-_]?key|access[-_]?token|secret|password)["']?)\s*[:=]\s*["']?)[^"'\s,}&\\]+/gi,
      '$1[已隐藏]',
    )
    .replace(/(https?:\/\/)[^\s/"<>]+@/gi, '$1[已隐藏]@');
}

export function diagnosticEndpoint(address: string): string {
  try {
    const url = new URL(address);
    return `${url.origin}${url.pathname}`;
  } catch {
    return '(地址无效)';
  }
}

/** Logs must never affect request, settlement or result delivery. */
export function taskLog(level: 'info' | 'debug' | 'warn' | 'error', message: string, data: unknown, secret = '') {
  try {
    eraLogger[level](`[独立任务] ${message}`, diagnosticText(data, secret));
  } catch {
    /* Console implementations supplied by the host may fail. */
  }
}
