import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { isBlockedAddress, linkTarget, parseIpv4, parseIpv6, resolvedVerdict } from '../recipe-text-read.ts';

/*
 * recipe-link-read fetches a URL somebody typed (AI audit 11-16, P-G7). The NAME was filtered; a public name that
 * RESOLVES to a private address went straight through. Now every name it fetches — the first and every redirect
 * hop — is resolved, and refused if any address is not plainly public. These pin the classifier (pure, the same
 * file the function inlines) and the function's wiring.
 */

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

test('IPv4: every private, reserved, loopback, link-local, CGNAT, test, multicast and broadcast range is refused', () => {
  for (const ip of [
    '0.0.0.0', '0.1.2.3', // this network — 0.0.0.0 reaches the local host on Linux
    '10.0.0.1', '10.255.255.255',
    '100.64.0.1', '100.100.100.200', '100.127.255.255', // carrier-grade NAT (and Alibaba's metadata IP)
    '127.0.0.1', '127.255.255.254',
    '169.254.169.254', '169.254.0.1', // link-local: the cloud metadata service
    '172.16.0.1', '172.31.255.255',
    '192.168.1.1',
    '192.0.0.1', '192.0.2.1', '192.88.99.1',
    '198.18.0.1', '198.19.255.255', '198.51.100.7', '203.0.113.9',
    '224.0.0.1', '239.255.255.250', '240.0.0.1', '255.255.255.255',
  ]) {
    assert.equal(isBlockedAddress(ip), true, ip);
  }
});

test('IPv4: the public internet — including the addresses right next to every blocked range — is allowed', () => {
  for (const ip of ['8.8.8.8', '1.1.1.1', '151.101.1.67', '104.18.32.7', '100.63.255.255', '100.128.0.1', '172.15.255.255', '172.32.0.1', '169.253.1.1', '192.169.0.1', '198.20.0.1', '223.255.255.255']) {
    assert.equal(isBlockedAddress(ip), false, ip);
  }
});

test('anything the classifier cannot read is refused — it fails closed', () => {
  for (const ip of ['010.0.0.1', '0x7f.0.0.1', '256.1.1.1', '1.2.3', '1.2.3.4.5', 'example.com', '', ' ', '1::2::3', '12345::', ':1:2:3:4:5:6:7', '1:2:3:4:5:6:7:8:9', 'g::1', '[::1', '::1.2.3']) {
    assert.equal(isBlockedAddress(ip), true, JSON.stringify(ip));
  }
  assert.equal(parseIpv4('010.0.0.1'), null, 'a leading zero is octal to some parsers');
});

test('IPv6: loopback, unspecified, IPv4-mapped / -compatible / translated, ULA, link- and site-local, multicast, discard — refused', () => {
  for (const ip of [
    '::', '::1', '[::1]', '0:0:0:0:0:0:0:1', '0000:0000:0000:0000:0000:0000:0000:0001',
    '::ffff:10.0.0.1', '::ffff:127.0.0.1', '::ffff:a00:1', '[::ffff:169.254.169.254]',
    '::ffff:8.8.8.8', // a mapped address is refused whatever it carries
    '::10.0.0.1', '::8.8.8.8', // IPv4-compatible (deprecated)
    '::ffff:0:10.0.0.1', // SIIT translated
    'fd00::', 'fd00::1', 'fc00::', '[fd12:3456:789a::1]', // ULA fc00::/7
    'fe80::1', 'fe80::1%eth0', 'febf::1', 'fec0::1', // link-local, site-local
    'ff02::1', 'ff05::1:3', // multicast
    '100::1', // discard
    '2001::1', '2001:0:4136:e378::', // Teredo
    '2001:db8::1', '2001:10::1', '2001:2::1', '3fff::1', // documentation, ORCHID, benchmarking, RFC 9637
    '64:ff9b::10.0.0.1', '64:ff9b::a9fe:a9fe', '64:ff9b:1::1', // NAT64 of a private IPv4; local-use NAT64
    '2002:0a00:0001::1', '2002:c0a8:0101::', '2002:7f00:1::', // 6to4 of 10.0.0.1, 192.168.1.1, 127.0.0.1
  ]) {
    assert.equal(isBlockedAddress(ip), true, ip);
  }
});

test('IPv6: global unicast is allowed, and NAT64 / 6to4 of a public IPv4 are judged by that IPv4', () => {
  for (const ip of ['2606:4700::6810:84e5', '2a04:4e42::81', '2001:4860:4860::8888', '[2606:4700::1]', '2600:1f18::1', '64:ff9b::808:808', '64:ff9b::8.8.8.8', '2002:0808:0808::1']) {
    assert.equal(isBlockedAddress(ip), false, ip);
  }
});

test('the IPv6 reader handles compression, a trailing dotted quad, brackets and a zone', () => {
  assert.deepEqual(parseIpv6('::ffff:10.0.0.1'), [0, 0, 0, 0, 0, 0xffff, 0x0a00, 0x0001]);
  assert.deepEqual(parseIpv6('[::1]'), [0, 0, 0, 0, 0, 0, 0, 1]);
  assert.deepEqual(parseIpv6('fe80::1%en0'), [0xfe80, 0, 0, 0, 0, 0, 0, 1]);
  assert.deepEqual(parseIpv6('2001:db8:0:0:1:0:0:1'), [0x2001, 0xdb8, 0, 0, 1, 0, 0, 1]);
  assert.deepEqual(parseIpv6('1::'), [1, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(parseIpv6('10.0.0.1'), null, 'not IPv6');
});

test('one blocked address is enough to refuse a name; no address at all is never fetched', () => {
  assert.equal(resolvedVerdict([]), 'unresolved');
  assert.equal(resolvedVerdict(['8.8.8.8']), 'ok');
  assert.equal(resolvedVerdict(['151.101.1.67', '2a04:4e42::81']), 'ok');
  assert.equal(resolvedVerdict(['8.8.8.8', '10.0.0.5']), 'private', 'an A record among public ones');
  assert.equal(resolvedVerdict(['2606:4700::1', '::1']), 'private', 'an AAAA record among public ones');
  assert.equal(resolvedVerdict(['8.8.8.8', 'not-an-ip']), 'private', 'an answer that is not an address');
});

test('IP literals in any spelling are refused by the name filter before anything resolves', () => {
  for (const url of ['http://[::1]/', 'http://[::ffff:10.0.0.1]/', 'http://0x7f000001/', 'http://2130706433/', 'http://127.1/', 'http://0177.0.0.1/', 'http://169.254.169.254/latest/meta-data/', 'http://0.0.0.0/', 'https://localhost/', 'https://metadata.google.internal/']) {
    assert.equal(linkTarget(url).kind, 'bad_url', url);
  }
  assert.equal(linkTarget('https://www.allrecipes.com/recipe/1/pie').kind, 'ok');
});

test('the function resolves the first URL and EVERY redirect hop, before it fetches, and refuses on any private address', () => {
  const SRC = read('supabase/functions/recipe-link-read/index.ts');
  const at = (s) => {
    const i = SRC.indexOf(s);
    assert.ok(i >= 0, s);
    return i;
  };
  const loop = SRC.slice(at('for (let hop = 0; hop <= MAX_HOPS; hop++) {'), at('// Read at most MAX_PAGE_BYTES'));
  // Top of the loop — so the first URL and every hop (`url = t.url; continue;`) pass through it.
  assert.ok(loop.indexOf('await checkAddresses(new URL(url).hostname)') < loop.indexOf('await fetch(url'), 'resolved before it is fetched');
  assert.match(loop, /if \(addresses === 'private'\) return \{ ok: false, reason: 'bad_url' \};/);
  assert.match(loop, /if \(addresses === 'unresolved'\) return \{ ok: false, reason: 'unreachable' \};/);
  assert.match(loop, /url = t\.url;\n\s+continue;/);
  // A and AAAA, both judged together.
  assert.match(SRC, /const \[a, aaaa\] = await Promise\.all\(\[lookup\('A'\), lookup\('AAAA'\)\]\);/);
  assert.match(SRC, /return resolvedVerdict\(\[\.\.\.\(a === 'denied' \? \[\] : a\), \.\.\.\(aaaa === 'denied' \? \[\] : aaaa\)\]\);/);
  // Unchecked ONLY when the API is missing or the platform denies it — never for a name that fails to resolve, and
  // never remembered across requests (so no request can switch the check off for the next one).
  assert.match(SRC, /if \(typeof resolve !== 'function'\) return unchecked\(\);/);
  assert.match(SRC, /if \(name === 'PermissionDenied' \|\| name === 'NotSupported'\) return 'denied';/);
  assert.match(SRC, /if \(a === 'denied' && aaaa === 'denied'\) return unchecked\(\);/);
  assert.doesNotMatch(SRC, /dnsUsable|let resolverOff/, 'no state that one request could set for the next');
  assert.match(SRC, /console\.warn\('\[recipe-link-read\] Deno\.resolveDns unavailable/);
});

test('the whole run ends inside the app’s 30 s (contract §3)', () => {
  const SRC = read('supabase/functions/recipe-link-read/index.ts');
  const total = Number(/const TOTAL_MS = ([\d_]+);/.exec(SRC)[1].replace(/_/g, ''));
  assert.ok(total <= 20_000, 'at least 10 s inside the app’s 30 s');
  assert.match(SRC, /const deadline = Date\.now\(\) \+ TOTAL_MS;/);
  assert.match(SRC, /if \(left <= 0\) return \{ ok: false, reason: 'unreachable' \};/);
  // The paste copy carries all of it (its freshness is pinned in recipe-text-read.test.mjs).
  const COPY = read('supabase/apply/deploy-recipe-link-read.ts');
  for (const s of ['function isBlockedAddress', 'function resolvedVerdict', 'async function checkAddresses', 'await checkAddresses(new URL(url).hostname)']) {
    assert.ok(COPY.includes(s), s);
  }
});
