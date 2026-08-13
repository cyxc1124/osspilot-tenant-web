export type ObjectAddressProtocol = 'http' | 'https';

function stripToHost(domainOrUrl: string): string {
  let host = domainOrUrl.trim().replace(/\/+$/, '');
  const schemeIdx = host.indexOf('://');
  if (schemeIdx >= 0) {
    host = host.slice(schemeIdx + 3);
  }
  return host.replace(/\/+$/, '');
}

function endpointScheme(url: string): ObjectAddressProtocol | null {
  const match = url.trim().match(/^(https?):\/\//i);
  if (!match) {
    return null;
  }
  return match[1]!.toLowerCase() as ObjectAddressProtocol;
}

function hasDotOnlySegment(objectKey: string): boolean {
  return objectKey.split('/').some((segment) => segment === '.' || segment === '..');
}

function encodeObjectKeyPath(objectKey: string): string {
  // Dot-only segments are normalized away by WHATWG URL parsers when kept as
  // separate path segments. Encoding the whole key as one segment keeps them
  // opaque and avoids colliding with literal "%2E" / "%2E%2E" key segments.
  if (hasDotOnlySegment(objectKey)) {
    return encodeURIComponent(objectKey);
  }
  // Preserve exact slash layout: S3 keys are opaque, so /a/b, a//b, and a/b differ.
  return objectKey.split('/').map(encodeURIComponent).join('/');
}

/** Strip scheme from a domain/URL and build path-style object address. */
export function buildObjectAddress(
  domainOrUrl: string,
  protocol: ObjectAddressProtocol,
  bucketName: string,
  objectKey: string,
): string {
  // A key that is only "." / ".." cannot be expressed as a stable HTTP path
  // (browsers normalize it away; S3/RGW also take the key from the path, not ?key=).
  // Use the opaque s3 URI form for these rare keys.
  if (objectKey === '.' || objectKey === '..') {
    return `s3://${bucketName}/${objectKey}`;
  }
  const host = stripToHost(domainOrUrl);
  return `${protocol}://${host}/${encodeURIComponent(bucketName)}/${encodeObjectKeyPath(objectKey)}`;
}

/** Protocols that have a configured domain (or a matching S3 endpoint scheme). */
export function availableObjectAddressProtocols(
  httpDomain: string | null | undefined,
  httpsDomain: string | null | undefined,
  s3Endpoint: string | null | undefined,
): ObjectAddressProtocol[] {
  const protocols: ObjectAddressProtocol[] = [];
  if (httpDomain?.trim()) {
    protocols.push('http');
  }
  if (httpsDomain?.trim()) {
    protocols.push('https');
  }
  if (protocols.length > 0) {
    return protocols;
  }

  const fallback = s3Endpoint?.trim();
  if (!fallback) {
    return [];
  }
  const scheme = endpointScheme(fallback);
  return scheme ? [scheme] : [];
}

/**
 * Prefer protocol-specific domain. Fall back to S3 endpoint only when its
 * scheme matches the selected protocol (never rewrite http↔https).
 */
export function resolveObjectAddressDomain(
  protocol: ObjectAddressProtocol,
  httpDomain: string | null | undefined,
  httpsDomain: string | null | undefined,
  s3Endpoint: string | null | undefined,
): string | null {
  const preferred = (protocol === 'https' ? httpsDomain : httpDomain)?.trim();
  if (preferred) {
    return preferred;
  }

  const fallback = s3Endpoint?.trim();
  if (!fallback) {
    return null;
  }
  return endpointScheme(fallback) === protocol ? fallback : null;
}
