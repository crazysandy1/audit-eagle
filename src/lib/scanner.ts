import { lookup } from 'node:dns/promises';
import net from 'node:net';

const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 4;
const USER_AGENT = 'AuditEagleBot/1.0 (website audit tool)';

export class ScanError extends Error {}

/** Normalise user input into an http(s) URL. Adds https:// when the scheme is missing. */
export function normalizeUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) throw new ScanError('Empty URL.');
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new ScanError(`Invalid URL: ${input}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ScanError('Only http and https URLs can be scanned.');
  }
  return url;
}

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === '::1' || v === '::') return true;
  if (v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')) return true;
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateIPv4(mapped[1]) : false;
}

/** Block loopback, private, link-local and metadata addresses (SSRF protection). */
async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    throw new ScanError('Refusing to scan a local or internal host.');
  }
  const addresses = net.isIP(host)
    ? [{ address: host, family: net.isIP(host) }]
    : await lookup(host, { all: true }).catch(() => {
        throw new ScanError(`Could not resolve host: ${host}`);
      });
  for (const { address, family } of addresses) {
    if ((family === 4 && isPrivateIPv4(address)) || (family === 6 && isPrivateIPv6(address))) {
      throw new ScanError('Refusing to scan a private or internal address.');
    }
  }
}

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    total += value.length;
  }
  reader.cancel().catch(() => undefined);
  return Buffer.concat(chunks).toString('utf8');
}

async function fetchPage(start: URL): Promise<{ html: string; finalUrl: URL; status: number; headers: Headers }> {
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(current.hostname);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        current = normalizeUrl(new URL(res.headers.get('location')!, current).toString());
        continue;
      }
      const type = res.headers.get('content-type') ?? '';
      if (!/text\/html|application\/xhtml/i.test(type)) {
        throw new ScanError(`Not an HTML page (content-type: ${type || 'unknown'}).`);
      }
      return { html: await readCapped(res), finalUrl: current, status: res.status, headers: res.headers };
    } catch (err) {
      if (err instanceof ScanError) throw err;
      if ((err as Error).name === 'AbortError') throw new ScanError('Timed out fetching the page.');
      throw new ScanError(`Fetch failed: ${(err as Error).message}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new ScanError('Too many redirects.');
}

const TECH_SIGNATURES: Array<[string, RegExp]> = [
  ['WordPress', /wp-content|wp-includes|<meta[^>]+generator[^>]+wordpress/i],
  ['Shopify', /cdn\.shopify\.com|Shopify\.theme/i],
  ['Wix', /static\.wixstatic\.com|wix\.com/i],
  ['Squarespace', /squarespace\.com|static1\.squarespace/i],
  ['Webflow', /webflow\.com|data-wf-page/i],
  ['Next.js', /_next\/static|__NEXT_DATA__/i],
  ['React', /react(\.production|-dom)|data-reactroot|__REACT/i],
  ['Vue', /vue(\.runtime)?(\.min)?\.js|data-v-[a-f0-9]{6}/i],
  ['Angular', /ng-version=|angular(\.min)?\.js/i],
  ['Nuxt', /_nuxt\//i],
  ['jQuery', /jquery[.-]?[\d.]*(\.min)?\.js/i],
  ['Bootstrap', /bootstrap(\.min)?\.(css|js)|class="[^"]*\b(container-fluid|col-md-\d+)\b/i],
  ['Tailwind CSS', /tailwindcss|class="[^"]*\b(flex|grid)\b[^"]*\b(px-\d|py-\d|text-(sm|lg|xl))\b/i],
  ['Google Analytics', /googletagmanager\.com|google-analytics\.com|gtag\(/i],
  ['Cloudflare', /cdnjs\.cloudflare\.com|cf-ray/i],
];

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAttrs(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    attrs[m[1].toLowerCase()] = (m[2] ?? m[3] ?? m[4] ?? '').trim();
  }
  return attrs;
}

function metaContent(html: string, attr: 'name' | 'property', value: string): string | undefined {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = parseAttrs(tag);
    if (attrs[attr]?.toLowerCase() === value && attrs.content) return attrs.content;
  }
  return undefined;
}

function findEmails(html: string, text: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(/mailto:([^"'?\s>]+)/gi)) found.add(decodeURIComponent(m[1]).toLowerCase());
  for (const m of text.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)) found.add(m[0].toLowerCase());
  return [...found].filter((e) => !/\.(png|jpe?g|gif|svg|webp)$/.test(e) && !/@\dx\b/.test(e)).slice(0, 5);
}

function findPhones(html: string, text: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(/tel:([+\d\-().\s%]+)/gi)) found.add(decodeURIComponent(m[1]).trim());
  for (const m of text.matchAll(/(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?)\d{3,5}[\s-]?\d{3,5}/g)) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 13) found.add(m[0].trim());
  }
  return [...found].slice(0, 3);
}

/**
 * Fetches a page and returns a plain-text description of what was found.
 * The text is the input for the AI rating and contact-extraction steps.
 */
export async function scanWebsiteReal(input: string): Promise<string> {
  const start = normalizeUrl(input);
  const { html, finalUrl, status, headers } = await fetchPage(start);
  if (status >= 400) throw new ScanError(`The site answered with HTTP ${status}.`);

  const text = stripTags(html);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim();
  const description = metaContent(html, 'name', 'description');
  const generator = metaContent(html, 'name', 'generator');
  const viewport = metaContent(html, 'name', 'viewport');
  const ogImage = metaContent(html, 'property', 'og:image');
  const lang = parseAttrs(html.match(/<html\b[^>]*>/i)?.[0] ?? '').lang || undefined;
  const h1Count = (html.match(/<h1[\s>]/gi) ?? []).length;
  const images = html.match(/<img\b[^>]*>/gi) ?? [];
  const imagesMissingAlt = images.filter((tag) => !/\balt=["'][^"']+["']/i.test(tag)).length;
  const scriptCount = (html.match(/<script\b/gi) ?? []).length;
  const stylesheetCount = (html.match(/<link\b[^>]*>/gi) ?? []).filter((tag) => parseAttrs(tag).rel?.toLowerCase() === 'stylesheet').length;
  const hasForm = /<form\b/i.test(html);

  const haystack = `${html}\n${[...headers.entries()].map(([k, v]) => `${k}: ${v}`).join('\n')}`;
  const tech = TECH_SIGNATURES.filter(([, re]) => re.test(haystack)).map(([name]) => name);
  if (generator) tech.unshift(`Generator: ${generator}`);
  const server = headers.get('server');
  const poweredBy = headers.get('x-powered-by');

  const emails = findEmails(html, text);
  const phones = findPhones(html, text);

  const lines = [
    `Scanned ${finalUrl.toString()} (HTTP ${status}, ${finalUrl.protocol === 'https:' ? 'HTTPS' : 'no HTTPS'}).`,
    `Title: ${title || 'none'}. Meta description: ${description || 'none'}.`,
    `Detected technology: ${tech.length ? tech.join(', ') : 'nothing identifiable'}${server ? `; server: ${server}` : ''}${poweredBy ? `; powered by: ${poweredBy}` : ''}.`,
    `Page structure: ${h1Count} h1 heading(s), ${images.length} image(s) (${imagesMissingAlt} without alt text), ${scriptCount} script tag(s), ${stylesheetCount} stylesheet(s), ${hasForm ? 'has a form' : 'no form'}, ${viewport ? 'responsive viewport meta present' : 'no responsive viewport meta'}${lang ? `, language ${lang}` : ''}${ogImage ? ', social preview image set' : ''}.`,
    `Contact details found on the page: email ${emails.length ? emails.join(', ') : 'none'}; phone ${phones.length ? phones.join(', ') : 'none'}.`,
    `Visible text excerpt: ${text.slice(0, 700)}`,
  ];
  return lines.join('\n');
}
