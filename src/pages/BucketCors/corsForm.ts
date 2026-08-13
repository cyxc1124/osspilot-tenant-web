import type { CorsRule } from '../../api/bucketCors';

export interface CorsFormValues {
  cors_rules: CorsRule[];
}

export function defaultCorsRule(): CorsRule {
  return {
    allowed_origins: [window.location.origin],
    allowed_methods: ['GET', 'PUT', 'POST', 'HEAD'],
    allowed_headers: ['*'],
    expose_headers: ['ETag'],
    max_age_seconds: 3600,
  };
}

export function formatCorsRules(rules: CorsRule[]): string {
  return JSON.stringify(rules, null, 2);
}

export function parseCorsRules(text: string, invalidMessage: string): CorsRule[] {
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error(invalidMessage);
  }
  return parsed as CorsRule[];
}
