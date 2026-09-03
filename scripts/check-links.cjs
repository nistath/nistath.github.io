#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { request } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, '_site', 'index.html');
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 12;
const MAX_ATTEMPTS = 3;
const HOST_CONCURRENCY = 4;
const GOOGLE_QUERY_CONCURRENCY = 3;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const GOOGLE_BLOCK_STATUS = new Set([403, 429, 500, 502, 503, 504]);
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36 nistath-link-check/1.0';
const GOOGLE_USER_AGENT = 'nistath-link-check/1.0 (+https://nistath.com)';
const EMBED_ARGUMENT = /initEmbed\((\[[\s\S]*\])\);\s*\}\s*function onApiLoad/;
const GOOGLE_CID = /^0x[0-9a-f]+:0x[0-9a-f]+$/i;
const GOOGLE_PLACE_ID = /^ChI[A-Za-z0-9_-]+$/;

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function decodeHtml(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function textContent(value) {
  return decodeHtml(String(value).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function describe(link) {
  const labels = [...link.labels]
    .filter(Boolean)
    .map((label) => (label.length > 90 ? `${label.slice(0, 87)}...` : label));
  return labels.length ? `"${labels.slice(0, 2).join(' / ')}" (${link.url})` : link.url;
}

function extractExternalLinks(html) {
  const links = new Map();

  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attributes = match[1];
    const href = attributes.match(/\bhref="([^"]+)"/i);
    if (!href) continue;

    const url = decodeHtml(href[1]);
    if (!/^https?:\/\//i.test(url)) continue;

    let link = links.get(url);
    if (!link) {
      link = { url, labels: new Set() };
      links.set(url, link);
    }

    const ariaLabel = attributes.match(/\baria-label="([^"]+)"/i);
    link.labels.add(textContent(match[2]) || (ariaLabel ? decodeHtml(ariaLabel[1]).trim() : ''));
  }

  return [...links.values()];
}

function isGoogleMapsShortUrl(url) {
  const parsed = new URL(url);
  return parsed.hostname === 'maps.app.goo.gl' || (parsed.hostname === 'goo.gl' && parsed.pathname.startsWith('/maps'));
}

function googleMapsQuery(url) {
  const parsed = new URL(url);
  if (!['google.com', 'www.google.com'].includes(parsed.hostname)) return null;
  if (!/^\/maps\/search\/?$/.test(parsed.pathname)) return null;
  return parsed.searchParams.get('query');
}

function validateGoogleMapsSearch(link, failures) {
  const parsed = new URL(link.url);
  const query = googleMapsQuery(link.url);

  if (parsed.searchParams.get('api') !== '1') {
    failures.push(`Google Maps search is missing api=1: ${describe(link)}`);
  }
  if (!query || !query.trim()) {
    failures.push(`Google Maps search has no query: ${describe(link)}`);
    return null;
  }

  return query.trim();
}

function requestHeaders({ body = false, useRange = true, googleMapsEmbed = false } = {}) {
  const headers = {
    Accept: body ? 'text/html,application/json;q=0.9,*/*;q=0.8' : 'text/html,application/pdf;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': googleMapsEmbed ? GOOGLE_USER_AGENT : USER_AGENT,
  };
  if (useRange && !body) headers.Range = 'bytes=0-0';
  return headers;
}

async function getWithRetries(context, url, options = {}) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await context.get(url, {
        failOnStatusCode: false,
        headers: requestHeaders(options),
        maxRedirects: MAX_REDIRECTS,
        timeout: REQUEST_TIMEOUT_MS,
      });

      if (response.status() === 416 && options.useRange !== false) {
        await response.dispose();
        return getWithRetries(context, url, { ...options, useRange: false });
      }

      if (!RETRYABLE_STATUS.has(response.status()) || attempt === MAX_ATTEMPTS) return { response };
      await response.dispose();
      await sleep(300 * 2 ** (attempt - 1));
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) break;
      await sleep(300 * 2 ** (attempt - 1));
    }
  }

  return { error: lastError || new Error('request failed') };
}

function isKnownAutomationBlock(link, status, finalUrl) {
  const hosts = [new URL(link.url).hostname, new URL(finalUrl).hostname];
  if (
    (status === 403 || status === 429) &&
    hosts.some((host) => host === 'google.com' || host === 'www.google.com')
  ) {
    return true;
  }
  if (status === 429 && hosts.some((host) => host === 'free-now.com' || host === 'www.free-now.com')) return true;
  /* LinkedIn answers automated clients with its non-standard 999 status. */
  if (status === 999 && hosts.some((host) => host === 'linkedin.com' || host.endsWith('.linkedin.com'))) return true;
  if (status === 403 && hosts.some((host) => host === 'culture.gov.gr' || host.endsWith('.culture.gov.gr'))) return true;
  return false;
}

async function checkRegularHostGroup(group, failures, warnings) {
  const context = await request.newContext();

  try {
    for (const link of group) {
      const result = await getWithRetries(context, link.url);
      if (result.error) {
        failures.push(`Could not reach ${describe(link)}: ${result.error.message.split('\n')[0]}`);
        continue;
      }

      const status = result.response.status();
      const finalUrl = result.response.url();
      await result.response.dispose();

      if (status >= 200 && status < 400) continue;
      if (isKnownAutomationBlock(link, status, finalUrl)) {
        warnings.push(`Automation was blocked while checking ${describe(link)} (HTTP ${status})`);
        continue;
      }

      failures.push(`HTTP ${status} for ${describe(link)}${finalUrl === link.url ? '' : ` -> ${finalUrl}`}`);
    }
  } finally {
    await context.dispose();
  }
}

async function runPool(items, concurrency, worker) {
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await worker(item);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
}

async function checkRegularLinks(links, failures, warnings) {
  const byHost = new Map();
  for (const link of links) {
    const host = new URL(link.url).hostname;
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(link);
  }

  await runPool([...byHost.values()], HOST_CONCURRENCY, (group) => checkRegularHostGroup(group, failures, warnings));
}

function normalizedWords(value) {
  return (
    String(value)
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) || []
  ).filter((word) => word.length >= 4);
}

function compactText(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function levenshtein(left, right) {
  const distance = Array.from({ length: right.length + 1 }, (_value, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = distance[0];
    distance[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const previous = distance[rightIndex];
      distance[rightIndex] = Math.min(
        distance[rightIndex] + 1,
        distance[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
      diagonal = previous;
    }
  }

  return distance[right.length];
}

function nameMatchesQuery(query, name) {
  const compactQuery = compactText(query);
  const compactName = compactText(name);
  if (compactName.length >= 3 && (compactQuery.includes(compactName) || compactName.includes(compactQuery))) return true;

  return normalizedWords(query).some((queryWord) =>
    normalizedWords(name).some(
      (nameWord) => levenshtein(queryWord, nameWord) / Math.max(queryWord.length, nameWord.length) <= 0.35
    )
  );
}

function hasGooglePlaceResult(body, query) {
  const match = body.match(EMBED_ARGUMENT);
  if (!match) return false;

  let data;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return false;
  }

  const kind = data?.[5]?.[0]?.[0]?.[1];
  if (kind === 'spotlit') {
    const place = data?.[21]?.[3];
    return (
      GOOGLE_CID.test(place?.[0]?.[0] || '') &&
      GOOGLE_PLACE_ID.test(place?.[27] || '') &&
      nameMatchesQuery(query, place?.[1] || '')
    );
  }

  if (kind === 'categorical-search-results-injection') {
    const result = data?.[5]?.[3]?.[0];
    const score = result?.[12]?.[1];
    return (
      result?.[1] === query &&
      Array.isArray(result?.[4]) &&
      result[4].length > 0 &&
      Number.isFinite(score) &&
      score > 0
    );
  }

  return false;
}

function googleMapsEmbedUrl(query) {
  const lookup = new URL('https://maps.google.com/maps');
  lookup.search = new URLSearchParams({ q: query, output: 'embed' }).toString();
  return lookup.href;
}

async function getGooglePlaceResult(context, query) {
  let lastResult;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const result = await getWithRetries(context, googleMapsEmbedUrl(query), {
      body: true,
      useRange: false,
      googleMapsEmbed: true,
    });

    if (result.error) return { error: result.error };

    const status = result.response.status();
    if (GOOGLE_BLOCK_STATUS.has(status)) {
      await result.response.dispose();
      return { blocked: status };
    }
    if (status < 200 || status >= 400) {
      await result.response.dispose();
      return { status };
    }

    const body = await result.response.text();
    await result.response.dispose();
    lastResult = { found: hasGooglePlaceResult(body, query) };
    if (lastResult.found || attempt === MAX_ATTEMPTS) return lastResult;
    await sleep(300 * 2 ** (attempt - 1));
  }

  return lastResult || { found: false };
}

async function checkGoogleMapsQueries(queries, failures, warnings) {
  if (!queries.size) return;

  const context = await request.newContext();
  const entries = [...queries.entries()];
  const knownGood = ['Acropolis Museum Athens', 'Acropolis of Athens'];
  const knownBad = 'codex-link-check-7f3e2d9a9b1c4e5f-no-such-place';

  try {
    for (const query of knownGood) {
      const result = await getGooglePlaceResult(context, query);
      if (result.blocked) {
        warnings.push(
          `Google blocked live place-result checks (HTTP ${result.blocked}); ${queries.size} structurally valid map queries were inconclusive`
        );
        return;
      }
      if (result.error || result.status || !result.found) {
        failures.push(`Google Maps verifier did not recognize known-good query "${query}"`);
        return;
      }
    }

    const negative = await getGooglePlaceResult(context, knownBad);
    if (negative.blocked) {
      warnings.push(
        `Google blocked live place-result checks (HTTP ${negative.blocked}); ${queries.size} structurally valid map queries were inconclusive`
      );
      return;
    }
    if (negative.error || negative.status || negative.found) {
      failures.push('Google Maps verifier did not reject its known-invalid sentinel query');
      return;
    }

    let blockedStatus;
    await runPool(
      entries.filter(([query]) => !knownGood.includes(query)),
      GOOGLE_QUERY_CONCURRENCY,
      async ([query, links]) => {
        if (blockedStatus) return;
        const result = await getGooglePlaceResult(context, query);
        if (result.blocked) {
          blockedStatus = result.blocked;
          return;
        }
        if (result.error) {
          failures.push(`Could not verify Google Maps query "${query}": ${result.error.message.split('\n')[0]}`);
        } else if (result.status) {
          failures.push(`Google Maps lookup returned HTTP ${result.status} for "${query}"`);
        } else if (!result.found) {
          failures.push(`Google Maps returned no matching place or geographic feature for "${query}" (${describe(links[0])})`);
        }
      }
    );

    if (blockedStatus) {
      warnings.push(
        `Google blocked live place-result checks (HTTP ${blockedStatus}); remaining structurally valid map queries were inconclusive`
      );
    }
  } finally {
    await context.dispose();
  }
}

async function main() {
  if (!fs.existsSync(INDEX)) throw new Error('Missing _site/index.html; run npm run build first');

  const links = extractExternalLinks(fs.readFileSync(INDEX, 'utf8'));
  const failures = [];
  const warnings = [];
  const regularLinks = [];
  const mapQueries = new Map();

  for (const link of links) {
    if (isGoogleMapsShortUrl(link.url)) {
      failures.push(
        `Opaque Google Maps short URL is not durable or query-verifiable: ${describe(link)}; use the content map: shorthand`
      );
      continue;
    }

    const query = googleMapsQuery(link.url);
    if (query !== null) {
      const validatedQuery = validateGoogleMapsSearch(link, failures);
      if (validatedQuery) {
        if (!mapQueries.has(validatedQuery)) mapQueries.set(validatedQuery, []);
        mapQueries.get(validatedQuery).push(link);
      }
      continue;
    }

    regularLinks.push(link);
  }

  console.log(`Checking ${regularLinks.length} external URLs and ${mapQueries.size} Google Maps queries...`);
  await checkRegularLinks(regularLinks, failures, warnings);
  await checkGoogleMapsQueries(mapQueries, failures, warnings);

  for (const warning of warnings) console.warn(`Warning: ${warning}`);

  if (failures.length) {
    throw new Error(`Live link checks failed:\n- ${failures.join('\n- ')}`);
  }

  console.log(`Live link checks passed (${links.length} unique user-facing URLs).`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
