import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeHtml, assertPublicHost, isAllowedByRobots, normalizeUrl, ScanError } from '../src/lib/scanner';
import { parseCSV } from '../src/lib/csvUtils';

test('normalizeUrl adds https and rejects other schemes', () => {
  assert.equal(normalizeUrl('example.com').toString(), 'https://example.com/');
  assert.equal(normalizeUrl(' http://example.com/a ').protocol, 'http:');
  assert.throws(() => normalizeUrl('file:///etc/passwd'), ScanError);
  assert.throws(() => normalizeUrl('ftp://example.com'), ScanError);
  assert.throws(() => normalizeUrl('   '), ScanError);
});

test('assertPublicHost blocks local, private and metadata addresses', async () => {
  for (const host of ['localhost', 'app.localhost', '127.0.0.1', '10.0.0.5', '172.16.4.1', '192.168.1.20', '169.254.169.254', '100.64.0.1', '[::1]']) {
    await assert.rejects(() => assertPublicHost(host), ScanError, host);
  }
});

test('assertPublicHost allows a public IP literal', async () => {
  await assert.doesNotReject(() => assertPublicHost('93.184.216.34'));
});

const SAMPLE_HTML = `<!doctype html><html lang=en><head>
<title> Acme Plumbing </title>
<meta name="description" content="Fast local plumbers">
<meta name=viewport content="width=device-width, initial-scale=1">
<meta name="generator" content="WordPress 6.4">
<link rel="stylesheet" href="/wp-content/themes/acme/style.css">
</head><body>
<h1>Acme Plumbing</h1>
<img src="a.jpg" alt="Van"><img src="b.jpg"><img src="c.jpg" alt="">
<a href="mailto:Hello@Acme-Plumbing.com">Email us</a>
<a href="tel:+91 98450 12345">Call</a>
<form action="/contact"></form>
<script src="https://cdn.shopify.com/x.js"></script>
</body></html>`;

test('analyzeHtml extracts structure, technology and contacts', () => {
  const out = analyzeHtml(SAMPLE_HTML, new URL('https://acme.example/'), 200, new Headers({ server: 'nginx' }));
  assert.match(out, /Title: Acme Plumbing/);
  assert.match(out, /Meta description: Fast local plumbers/);
  assert.match(out, /WordPress/);
  assert.match(out, /Shopify/);
  assert.match(out, /server: nginx/);
  assert.match(out, /3 image\(s\) \(2 without alt text\)/);
  assert.match(out, /responsive viewport meta present/);
  assert.match(out, /language en/);
  assert.match(out, /has a form/);
  assert.match(out, /hello@acme-plumbing\.com/);
  assert.match(out, /98450 12345/);
});

test('analyzeHtml reports a plain page honestly', () => {
  const out = analyzeHtml('<html><body><p>Hi</p></body></html>', new URL('http://plain.example/'), 200, new Headers());
  assert.match(out, /no HTTPS/);
  assert.match(out, /nothing identifiable/);
  assert.match(out, /no responsive viewport meta/);
  assert.match(out, /email none; phone none/);
});

test('isAllowedByRobots follows the most specific rule', () => {
  const robots = ['User-agent: *', 'Disallow: /private', 'Allow: /private/public', '', 'User-agent: BadBot', 'Disallow: /'].join('\n');
  assert.equal(isAllowedByRobots(robots, '/'), true);
  assert.equal(isAllowedByRobots(robots, '/private/area'), false);
  assert.equal(isAllowedByRobots(robots, '/private/public/page'), true);
  assert.equal(isAllowedByRobots(robots, '/anything', 'badbot'), false);
  assert.equal(isAllowedByRobots('', '/x'), true);
});

test('isAllowedByRobots honours a group naming our bot over the wildcard group', () => {
  const robots = ['User-agent: *', 'Disallow: /', '', 'User-agent: AuditEagleBot', 'Allow: /'].join('\n');
  assert.equal(isAllowedByRobots(robots, '/page'), true);
});

test('parseCSV skips a header row and accepts scheme-less URLs', () => {
  const urls = parseCSV(['url', 'example.com', '"https://a.example/x"', '', 'not a url with spaces'].join('\n'));
  assert.deepEqual(urls.slice(0, 2), ['https://example.com/', 'https://a.example/x']);
});
