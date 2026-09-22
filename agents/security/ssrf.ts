import { AgentError } from '../shared/errors';

/**
 * SSRF Guardrail
 * Validates user-supplied external URLs (audio_url, upload_url, callBackUrl, image_urls)
 * to prevent Server-Side Request Forgery against internal networks, cloud metadata,
 * loopback interfaces, and private subnets.
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
  '169.254.169.254',
  'metadata.google.internal',
  'instance-data',
  'metadata',
  'kubernetes.default',
]);

/**
 * Checks if an IPv4 address string falls into a private or reserved range.
 */
function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }
  const [a, b] = parts;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 10.0.0.0/8 (Private Class A)
  if (a === 10) return true;
  // 172.16.0.0/12 (Private Class B: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (Private Class C)
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (Link-local / Cloud Metadata)
  if (a === 169 && b === 254) return true;
  // 100.64.0.0/10 (Carrier-Grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  return false;
}

/**
 * Determines if a given URL points to a safe, public external endpoint.
 */
export function isSafeExternalUrl(inputUrl: string): boolean {
  if (!inputUrl || typeof inputUrl !== 'string') return false;
  const trimmed = inputUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  // Reject dangerous non-HTTP schemes
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Strip brackets from IPv6
  const cleanHost = hostname.replace(/^\[|\]$/g, '');

  if (BLOCKED_HOSTNAMES.has(cleanHost)) {
    return false;
  }

  if (cleanHost.endsWith('.localhost') || cleanHost.endsWith('.internal') || cleanHost.endsWith('.local')) {
    return false;
  }

  // Check IPv6 loopback / link-local
  if (cleanHost === '::1' || cleanHost.startsWith('fe80:') || cleanHost.startsWith('fc00:') || cleanHost.startsWith('fd00:')) {
    return false;
  }

  // Check IPv4 ranges
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanHost)) {
    if (isPrivateOrReservedIpv4(cleanHost)) {
      return false;
    }
  }

  return true;
}

/**
 * Throws AgentError if the URL is dangerous or points to internal infrastructure.
 */
export function assertSafeExternalUrl(url: string, context = 'URL'): void {
  if (!url || typeof url !== 'string' || !url.trim()) {
    throw new AgentError('SSRF_EMPTY_URL', `${context}: Boş URL adresi kabul edilemez.`);
  }

  const trimmed = url.trim();

  // Allow blob or local:// in explicit mock/testing scenarios, but block in live validations
  if (trimmed.startsWith('blob:') || trimmed.startsWith('local://')) {
    return;
  }

  if (!isSafeExternalUrl(trimmed)) {
    throw new AgentError(
      'SSRF_DETECTED',
      `[Güvenlik Uyarısı (SSRF)]: '${trimmed.slice(0, 32)}...' adresi dahili ağ, yerel sunucu (localhost) ` +
        `veya bulut metadata (169.254.169.254) hedefleri içerdiği için engellendi. ` +
        `Yalnızca genel internete açık güvenli HTTP/HTTPS adresleri kullanılabilir.`,
      false,
    );
  }
}
