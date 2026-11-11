/**
 * Meeting link detection (spec §3.2, §7.3).
 * Providers are matched by exact registered domain, never by substring,
 * so look-alikes such as `zoom.us.example.ru` are treated as unknown.
 */
export type ProviderId =
  | 'zoom'
  | 'meet'
  | 'teams'
  | 'webex'
  | 'skype'
  | 'jitsi'
  | 'whereby'
  | 'whatsapp';

export type Provider = { id: ProviderId; name: string; color: string; domains: string[] };

export const PROVIDERS: Provider[] = [
  { id: 'zoom', name: 'Zoom', color: '#2D6FE0', domains: ['zoom.us', 'zoom.com', 'zoomgov.com'] },
  { id: 'meet', name: 'Google Meet', color: '#16A34A', domains: ['meet.google.com'] },
  { id: 'teams', name: 'Teams', color: '#5B5FC7', domains: ['teams.microsoft.com', 'teams.live.com'] },
  { id: 'webex', name: 'Webex', color: '#0E7490', domains: ['webex.com'] },
  { id: 'skype', name: 'Skype', color: '#0284C7', domains: ['skype.com', 'join.skype.com'] },
  { id: 'jitsi', name: 'Jitsi', color: '#D97706', domains: ['meet.jit.si', '8x8.vc'] },
  { id: 'whereby', name: 'Whereby', color: '#DB2777', domains: ['whereby.com'] },
  { id: 'whatsapp', name: 'WhatsApp', color: '#15803D', domains: ['call.whatsapp.com', 'wa.me'] },
];

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const SAFE_SCHEMES = new Set(['https:', 'http:']);

function hostOf(url: string): string | null {
  const m = /^(https?):\/\/([^/?#:@]+)(?::\d+)?(?:[/?#]|$)/i.exec(url);
  return m ? m[2].toLowerCase().replace(/\.$/, '') : null;
}

/** True when `host` equals `domain` or is a subdomain of it. */
function matchesDomain(host: string, domain: string) {
  return host === domain || host.endsWith('.' + domain);
}

export function detectProvider(url: string): Provider | null {
  const host = hostOf(url);
  if (!host) return null;
  return PROVIDERS.find((p) => p.domains.some((d) => matchesDomain(host, d))) ?? null;
}

export function isSafeLink(url: string): boolean {
  const scheme = /^([a-z][a-z0-9+.-]*:)/i.exec(url.trim())?.[1]?.toLowerCase();
  return !!scheme && SAFE_SCHEMES.has(scheme) && hostOf(url) !== null;
}

/** Finds the first known-provider link in free text (calendar notes, location, url). */
export function findMeetingLink(...texts: (string | null | undefined)[]) {
  const links = texts.flatMap((t) => (t ? (t.match(URL_RE) ?? []) : [])).filter(isSafeLink);
  for (const url of links) {
    const provider = detectProvider(url);
    if (provider) return { url, provider };
  }
  return null;
}
