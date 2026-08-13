import { formatDateTime as formatDateTimeI18n, t } from '../i18n';

export function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value < 10 && index > 0 ? value.toFixed(1) : Math.round(value)} ${units[index]}`;
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return t('common.emDash');
  }
  return formatDateTimeI18n(value);
}

export function normalizePrefix(prefix: string): string {
  const trimmed = prefix.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

export function buildObjectKey(prefix: string, fileName: string): string {
  const normalized = normalizePrefix(prefix);
  return `${normalized}${fileName}`;
}

export interface PrefixBreadcrumbSegment {
  label: string;
  prefix: string;
}

export function prefixBreadcrumbSegments(prefix: string): PrefixBreadcrumbSegment[] {
  const normalized = normalizePrefix(prefix).replace(/\/$/, '');
  if (!normalized) {
    return [];
  }
  const parts = normalized.split('/');
  return parts.map((part, index) => ({
    label: part,
    prefix: `${parts.slice(0, index + 1).join('/')}/`,
  }));
}

export function folderDisplayName(fullPrefix: string, currentPrefix: string): string {
  const normalizedCurrent = normalizePrefix(currentPrefix);
  const relative = fullPrefix.startsWith(normalizedCurrent)
    ? fullPrefix.slice(normalizedCurrent.length)
    : fullPrefix;
  return relative.replace(/\/$/, '') || fullPrefix.replace(/\/$/, '');
}
