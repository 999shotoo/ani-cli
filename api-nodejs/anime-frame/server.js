const { Hono } = require('hono');
const { serve } = require('@hono/node-server');
const axios = require('axios');
const crypto = require('node:crypto');

const app = new Hono();

const PORT = process.env.PORT || 3001;
const ALLANIME_API = 'https://api.allanime.day/api';
const ANILIST_GRAPHQL_API = 'https://graphql.anilist.co';
const JIKAN_API = 'https://api.jikan.moe/v4';
const ALLANIME_BASE = 'allanime.day';
const ALLANIME_REFERER = 'https://allanime.day';
const YOUTU_CHAN_REFERER = 'https://youtu-chan.com';
const ALLANIME_EPISODE_QUERY_HASH = 'd405d0edd690624b66baba3068e0edc3ac90f1597d898a1ec8db4e5c43c00fec';

const HTTP_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/plain, */*',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0',
  Referer: YOUTU_CHAN_REFERER,
  Origin: YOUTU_CHAN_REFERER,
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'DNT': '1',
};

// ─── Queries ────────────────────────────────────────────────────────────────

const ALLANIME_SEARCH_QUERY = `query($search: SearchInput, $limit: Int, $translationType: VaildTranslationTypeEnumType, $countryOrigin: VaildCountryOriginEnumType) {
  shows(search: $search, limit: $limit, translationType: $translationType, countryOrigin: $countryOrigin) {
    edges {
      _id
      name
      englishName
      malId
      aniListId
      availableEpisodesDetail
    }
  }
}`;

const ALLANIME_EPISODES_QUERY = `query ($showId: String!) {
  show(_id: $showId) {
    _id
    name
    availableEpisodesDetail
    malId
    aniListId
  }
}`;

const ANILIST_TITLE_QUERY = `query ($id: Int) {
  Media(id: $id, type: ANIME) {
    title {
      romaji
      english
      native
    }
  }
}`;

// ─── Decryption ──────────────────────────────────────────────────────────────

const ALLANIME_KEY = crypto.createHash('sha256').update('Xot36i3lK3:v1').digest();

function decrypt(blob) {
  try {
    const data = Buffer.from(String(blob), 'base64');
    if (data.length <= 29) return null;
    const iv = Buffer.concat([data.slice(1, 13), Buffer.from('00000002', 'hex')]);
    const ciphertext = data.slice(13, data.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-ctr', ALLANIME_KEY, iv);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch (e) {
    return null;
  }
}

// ─── Provider ID decoder ──────────────────────────────────────────────────────

const decodeMapping = {
  '79': 'A', '7a': 'B', '7b': 'C', '7c': 'D', '7d': 'E', '7e': 'F', '7f': 'G',
  '70': 'H', '71': 'I', '72': 'J', '73': 'K', '74': 'L', '75': 'M', '76': 'N', '77': 'O',
  '68': 'P', '69': 'Q', '6a': 'R', '6b': 'S', '6c': 'T', '6d': 'U', '6e': 'V', '6f': 'W',
  '60': 'X', '61': 'Y', '62': 'Z',
  '59': 'a', '5a': 'b', '5b': 'c', '5c': 'd', '5d': 'e', '5e': 'f', '5f': 'g',
  '50': 'h', '51': 'i', '52': 'j', '53': 'k', '54': 'l', '55': 'm', '56': 'n', '57': 'o',
  '48': 'p', '49': 'q', '4a': 'r', '4b': 's', '4c': 't', '4d': 'u', '4e': 'v', '4f': 'w',
  '40': 'x', '41': 'y', '42': 'z',
  '08': '0', '09': '1', '0a': '2', '0b': '3', '0c': '4', '0d': '5', '0e': '6', '0f': '7',
  '00': '8', '01': '9',
  '15': '-', '16': '.', '67': '_', '46': '~', '02': ':', '17': '/', '07': '?',
  '1b': '#', '63': '[', '65': ']', '78': '@', '19': '!', '1c': '$', '1e': '&',
  '10': '(', '11': ')', '12': '*', '13': '+', '14': ',', '03': ';', '05': '=', '1d': '%',
};

function decodeProviderId(hex) {
  let result = '';
  for (let i = 0; i < hex.length; i += 2) {
    result += decodeMapping[hex.substring(i, i + 2)] || '';
  }
  return result.replace('/clock', '/clock.json');
}

// ─── Source line parser (ported from working GitHub version) ─────────────────

function unescapeSource(str) {
  return str
    .replace(/\\u002F/g, '/')
    .replace(/\\\//g, '/')
    .replace(/\\u0026/g, '&')
    .replace(/\\u003D/g, '=')
    .replace(/\\/g, '');
}

function parseSourceLines(apiData) {
  const respLines = [];

  const extractFromBlob = (blob) => {
    if (!blob || blob.length < 50) return;
    const plain = decrypt(blob);
    if (!plain) return;

    const parts = plain.replace(/[{}]/g, '\n').split('\n');
    for (const part of parts) {
      const m = part.match(/"sourceUrl":"([^"]*)".*"sourceName":"([^"]*)"/);
      if (m) {
        let sourceUrl = unescapeSource(m[1]);
        const sourceName = m[2];
        if (sourceUrl.startsWith('--')) {
          respLines.push({ sourceName, hex: sourceUrl.substring(2) });
        } else if (sourceUrl.startsWith('http') || sourceUrl.startsWith('/')) {
          respLines.push({ sourceName, directUrl: sourceUrl });
        } else {
          respLines.push({ sourceName, hex: sourceUrl });
        }
      }
    }
  };

  // Check all blob locations
  if (apiData?.data?._m && apiData.data._m.length > 10) {
    extractFromBlob(apiData.data._m);
  }
  if (apiData?.data?.tobeparsed) {
    extractFromBlob(apiData.data.tobeparsed);
  }
  if (apiData?.tobeparsed) {
    extractFromBlob(apiData.tobeparsed);
  }

  // Handle sourceUrls array directly
  if (apiData?.data?.episode?.sourceUrls) {
    const raw = JSON.stringify(apiData.data.episode.sourceUrls);
    const cleaned = unescapeSource(raw);
    const parts = cleaned.replace(/[{}]/g, '\n').split('\n');
    for (const part of parts) {
      const m = part.match(/"sourceUrl":"([^"]*)".*"sourceName":"([^"]*)"/);
      if (m) {
        let sourceUrl = m[1];
        const sourceName = m[2];
        if (sourceUrl.startsWith('--')) {
          respLines.push({ sourceName, hex: sourceUrl.substring(2) });
        } else if (sourceUrl.startsWith('http') || sourceUrl.startsWith('/')) {
          respLines.push({ sourceName, directUrl: sourceUrl });
        } else {
          respLines.push({ sourceName, hex: sourceUrl });
        }
      }
    }
  }

  return respLines;
}

// ─── Provider link fetchers ──────────────────────────────────────────────────

function b64urlToHex(b64url) {
  let padded = b64url;
  const mod = padded.length % 4;
  if (mod === 2) padded += '==';
  else if (mod === 3) padded += '=';
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('hex');
}

async function getFilemoonLinks(providerPath) {
  const allLinks = [];
  const fetchUrl = providerPath.startsWith('http') ? providerPath : `https://${ALLANIME_BASE}${providerPath}`;
  try {
    const response = await axios.get(fetchUrl, {
      headers: { 'User-Agent': HTTP_HEADERS['User-Agent'], Referer: YOUTU_CHAN_REFERER },
      timeout: 4000,
    });
    const fmData = response.data;
    if (fmData?.iv && fmData?.payload && fmData?.key_parts) {
      const keyHex = b64urlToHex(fmData.key_parts[0]) + b64urlToHex(fmData.key_parts[1]);
      const ivHex = b64urlToHex(fmData.iv) + '00000002';

      let payloadB64 = fmData.payload;
      const pMod = payloadB64.length % 4;
      if (pMod === 2) payloadB64 += '==';
      else if (pMod === 3) payloadB64 += '=';
      payloadB64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
      const payloadBuf = Buffer.from(payloadB64, 'base64');

      const ciphertext = payloadBuf.slice(0, payloadBuf.length - 16);
      const decipher = crypto.createDecipheriv('aes-256-ctr', Buffer.from(keyHex, 'hex'), Buffer.from(ivHex, 'hex'));
      const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');

      const parts = plain.replace(/[{}\[\]]/g, '\n').split('\n');
      for (const part of parts) {
        const m1 = part.match(/"url":"([^"]*)".*"height":(\d+)/);
        const m2 = part.match(/"height":(\d+).*"url":"([^"]*)"/);
        if (m1) {
          allLinks.push({ resolution: m1[2], url: m1[1].replace(/\\u0026/g, '&').replace(/\\u003D/g, '='), provider: 'Fm-mp4' });
        } else if (m2) {
          allLinks.push({ resolution: m2[1], url: m2[2].replace(/\\u0026/g, '&').replace(/\\u003D/g, '='), provider: 'Fm-mp4' });
        }
      }
    }
  } catch (e) {
    console.log('[FILEMOON] fetch failed:', e.message);
  }
  return allLinks;
}

async function getMp4UploadLinks(pageUrl) {
  try {
    const response = await axios.get(pageUrl, {
      headers: { 'User-Agent': HTTP_HEADERS['User-Agent'], Referer: YOUTU_CHAN_REFERER },
      timeout: 25000,
      maxRedirects: 5,
    });
    const html = typeof response.data === 'string' ? response.data : '';
    const m = html.match(/(?:src|file):\s*"([^"]+\.mp4[^"]*)"/i);
    if (m) {
      return [{ resolution: 'Mp4', url: m[1].replace(/\\u0026/g, '&').replace(/\\/g, ''), provider: 'Mp4' }];
    }
  } catch (e) {
    console.log('[MP4UPLOAD] fetch failed:', e.message);
  }
  return [];
}

async function getProviderLinks(providerPath, sourceName) {
  if (providerPath.includes('tools.fast4speed.rsvp')) {
    return [{ resolution: 'Yt', url: providerPath, provider: sourceName, needsReferer: true }];
  }
  if (providerPath.includes('mp4upload.com')) {
    return getMp4UploadLinks(providerPath);
  }

  const fetchUrl = providerPath.startsWith('http') ? providerPath : `https://${ALLANIME_BASE}${providerPath}`;
  const allLinks = [];

  try {
    const response = await axios.get(fetchUrl, {
      headers: { 'User-Agent': HTTP_HEADERS['User-Agent'], Referer: YOUTU_CHAN_REFERER },
      timeout: 4000,
    });
    const data = response.data || {};

    if (Array.isArray(data.links)) {
      for (const link of data.links) {
        if (!link.link) continue;
        const url = link.link;
        const res = link.resolutionStr || 'unknown';

        if (url.includes('repackager.wixmp.com')) {
          const cleaned = url.replace('repackager.wixmp.com/', '').replace(/\.urlset.*/, '');
          const qualitiesMatch = url.match(/\/,([^/]*),\/mp4/);
          if (qualitiesMatch) {
            for (const q of qualitiesMatch[1].split(',')) {
              allLinks.push({ resolution: q, url: cleaned.replace(/,[^/]*/, q), provider: sourceName });
            }
          } else {
            allLinks.push({ resolution: res, url, provider: sourceName });
          }
        } else {
          allLinks.push({ resolution: res, url, provider: sourceName });
        }
      }
    }

    if (data.hls?.url) {
      allLinks.push({ resolution: 'hls', url: data.hls.url, provider: sourceName });
    }

    if (Array.isArray(data.subtitles)) {
      // attach to first link as metadata (returned separately below)
      allLinks._subtitles = data.subtitles.map((s) => ({
        language: s.lang,
        label: s.label,
        url: s.src,
      }));
    }
  } catch (e) {
    console.log(`[PROVIDER:${sourceName}] fetch failed:`, e.message);
  }

  return allLinks;
}

// ─── Episode sources API request ──────────────────────────────────────────────

// Minimal headers that match ani-cli / the working GitHub script exactly.
// Extra headers (Accept-Encoding, DNT, Connection, Content-Type on GET) are
// what cause the API to respond with NEED_CAPTCHA.
const EPISODE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0',
  Referer: YOUTU_CHAN_REFERER,
  Origin: YOUTU_CHAN_REFERER,
};

async function requestAllanimeEpisodeSources(showId, mode, episode) {
  const variables = { showId, translationType: mode, episodeString: String(episode) };
  const extensions = {
    persistedQuery: { version: 1, sha256Hash: ALLANIME_EPISODE_QUERY_HASH },
  };

  // Try persisted-query GET first (bypasses captcha per ani-cli v4.14.0)
  try {
    const getResponse = await axios.get(ALLANIME_API, {
      params: {
        variables: JSON.stringify(variables),
        extensions: JSON.stringify(extensions),
      },
      headers: EPISODE_HEADERS,
      timeout: 8000,
    });

    const raw = JSON.stringify(getResponse.data);
    if (raw.includes('tobeparsed') || raw.includes('"_m"') || raw.includes('sourceUrls')) {
      console.log('[REQUEST] GET succeeded');
      return getResponse.data;
    }
    // If we got data but none of the expected keys, log it so we can debug
    console.log('[REQUEST] GET returned unexpected shape:', raw.substring(0, 200));
  } catch (e) {
    console.log('[REQUEST] GET failed:', e.message);
  }

  // POST fallback — use the same minimal headers, no extra Content-Type cruft
  console.log('[REQUEST] Falling back to POST...');
  const postResponse = await axios.post(
    ALLANIME_API,
    {
      variables,
      query: `query ($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) {
        episode(showId: $showId translationType: $translationType episodeString: $episodeString) {
          episodeString sourceUrls
        }
      }`,
    },
    {
      headers: {
        ...EPISODE_HEADERS,
        'Content-Type': 'application/json', // required for POST body
      },
      timeout: 8000,
    }
  );

  const raw = JSON.stringify(postResponse.data);
  console.log('[REQUEST] POST response shape:', raw.substring(0, 200));
  return postResponse.data;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeMode(mode) {
  return ['sub', 'dub', 'raw'].includes(mode) ? mode : 'sub';
}

function buildCandidateTitles(values) {
  return [...new Set(values.filter(Boolean).map((v) => v.trim()).filter(Boolean))];
}

function formatShow(show) {
  return {
    allanimeId: show._id,
    name: show.name,
    englishName: show.englishName,
    aniListId: show.aniListId,
    malId: show.malId,
  };
}

async function allanimeSearchByTitle(title, mode = 'sub') {
  const response = await axios.post(
    ALLANIME_API,
    {
      query: ALLANIME_SEARCH_QUERY,
      variables: {
        search: { allowAdult: false, allowUnknown: true, query: title },
        limit: 50,
        translationType: normalizeMode(mode),
        countryOrigin: 'ALL',
      },
    },
    { headers: HTTP_HEADERS }
  );
  return response.data?.data?.shows?.edges || [];
}

async function getAniListTitles(aniListId) {
  const parsedId = Number.parseInt(String(aniListId), 10);
  if (Number.isNaN(parsedId)) throw new Error('AniList ID must be a number');

  const response = await axios.post(
    ANILIST_GRAPHQL_API,
    { query: ANILIST_TITLE_QUERY, variables: { id: parsedId } },
    { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }
  );

  const media = response.data?.data?.Media;
  if (!media) throw new Error('AniList media not found');
  return buildCandidateTitles([media.title?.romaji, media.title?.english, media.title?.native]);
}

async function getMalTitles(malId) {
  const parsedId = Number.parseInt(String(malId), 10);
  if (Number.isNaN(parsedId)) throw new Error('MAL ID must be a number');

  const response = await axios.get(`${JIKAN_API}/anime/${parsedId}`);
  const anime = response.data?.data;
  if (!anime) throw new Error('MAL anime not found');
  return buildCandidateTitles([anime.title, anime.title_english, anime.title_japanese]);
}

async function mapByAniListId(aniListId, mode = 'sub') {
  const titles = await getAniListTitles(aniListId);
  for (const title of titles) {
    const results = await allanimeSearchByTitle(title, mode);
    const matched = results.find((show) => String(show.aniListId) === String(aniListId));
    if (matched) return { input: { type: 'anilist', id: String(aniListId), matchedTitle: title }, data: formatShow(matched) };
  }
  throw new Error('No AllAnime mapping found for this AniList ID');
}

async function mapByMalId(malId, mode = 'sub') {
  const titles = await getMalTitles(malId);
  for (const title of titles) {
    const results = await allanimeSearchByTitle(title, mode);
    const matched = results.find((show) => String(show.malId) === String(malId));
    if (matched) return { input: { type: 'mal', id: String(malId), matchedTitle: title }, data: formatShow(matched) };
  }
  throw new Error('No AllAnime mapping found for this MAL ID');
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/', (c) => {
  return c.json({
    name: 'anime-frame',
    version: '1.1.0',
    endpoints: {
      map: '/api/anime/:id?type=anilist|mal&mode=sub|dub|raw',
      episodes: '/api/allanime/:allanime_id/episodes?mode=sub|dub|raw',
      source: '/api/allanime/:allanime_id/source?episode=<ep>&mode=sub|dub|raw',
    },
  });
});

app.get('/api/anime/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const type = c.req.query('type');
    const mode = normalizeMode(c.req.query('mode') || 'sub');

    if (type === 'anilist') return c.json({ success: true, ...(await mapByAniListId(id, mode)) });
    if (type === 'mal') return c.json({ success: true, ...(await mapByMalId(id, mode)) });

    try {
      return c.json({ success: true, ...(await mapByAniListId(id, mode)) });
    } catch {
      return c.json({ success: true, ...(await mapByMalId(id, mode)) });
    }
  } catch (error) {
    return c.json({ success: false, error: error.message || 'Failed to map input ID to AllAnime ID' }, 404);
  }
});

app.get('/api/allanime/:allanime_id/episodes', async (c) => {
  try {
    const showId = c.req.param('allanime_id');
    const mode = normalizeMode(c.req.query('mode') || 'sub');

    const response = await axios.post(
      ALLANIME_API,
      { query: ALLANIME_EPISODES_QUERY, variables: { showId } },
      { headers: HTTP_HEADERS }
    );

    const show = response.data?.data?.show;
    if (!show) return c.json({ success: false, error: 'AllAnime show not found' }, 404);

    const episodes = Array.isArray(show.availableEpisodesDetail?.[mode])
      ? [...show.availableEpisodesDetail[mode]].sort((a, b) => parseFloat(a) - parseFloat(b))
      : [];

    return c.json({
      success: true,
      data: { allanimeId: show._id, name: show.name, aniListId: show.aniListId, malId: show.malId, mode, count: episodes.length, episodes },
    });
  } catch (error) {
    return c.json({ success: false, error: error.message || 'Failed to fetch episodes' }, 500);
  }
});

// ─── Source route (fixed) ─────────────────────────────────────────────────────

app.get('/api/allanime/:allanime_id/source', async (c) => {
  try {
    const showId = c.req.param('allanime_id');
    const mode = normalizeMode(c.req.query('mode') || 'sub');
    const episode = c.req.query('episode');

    if (!episode) {
      return c.json({ success: false, error: 'Query parameter "episode" is required' }, 400);
    }

    const apiData = await requestAllanimeEpisodeSources(showId, mode, episode);
    console.log('[SOURCE] Raw API response keys:', Object.keys(apiData || {}));

    // Check for API-level errors (e.g. NEED_CAPTCHA)
    if (apiData?.errors?.length > 0) {
      const msg = apiData.errors.map((e) => e.message).join(', ');
      console.log('[SOURCE] API errors:', msg);
      return c.json({ success: false, error: msg }, 502);
    }

    // Parse source lines using the robust multi-blob parser
    const respLines = parseSourceLines(apiData);
    console.log('[SOURCE] Parsed source lines:', respLines.length, respLines.map((r) => r.sourceName));

    if (respLines.length === 0) {
      return c.json({ success: false, error: 'Episode source not found' }, 404);
    }

    // Provider definitions in priority order (matches ani-cli)
    const providerDefs = [
      { name: 'Default',  filemoon: false },
      { name: 'Mp4',      filemoon: false },
      { name: 'Yt-mp4',   filemoon: false },
      // { name: 'S-mp4',    filemoon: false },
      // { name: 'Fm-mp4',   filemoon: true  },
      // { name: 'Luf-Mp4',  filemoon: false },
    ];

    // Fetch all providers in parallel
    const allLinks = [];
    const allSubtitles = [];

    const providerResults = await Promise.all(
      providerDefs.map(async (prov) => {
        const entry = respLines.find((r) => r.sourceName === prov.name);
        if (!entry) return { links: [], subtitles: [] };

        const resolvedPath = entry.directUrl || (entry.hex ? decodeProviderId(entry.hex) : null);
        if (!resolvedPath) return { links: [], subtitles: [] };

        console.log(`[SOURCE] Fetching provider "${prov.name}" -> ${resolvedPath.substring(0, 80)}`);

        const links = prov.filemoon
          ? await getFilemoonLinks(resolvedPath)
          : await getProviderLinks(resolvedPath, prov.name);

        return { links, subtitles: links._subtitles || [] };
      })
    );

    for (const r of providerResults) {
      allLinks.push(...r.links);
      allSubtitles.push(...r.subtitles);
    }

    // Sort: non-referer first, then by resolution descending
    allLinks.sort((a, b) => {
      const aF = a.needsReferer ? 1 : 0;
      const bF = b.needsReferer ? 1 : 0;
      if (aF !== bF) return aF - bF;
      return (parseInt(b.resolution) || 0) - (parseInt(a.resolution) || 0);
    });

    // Dedup
    const seen = new Set();
    const sources = allLinks.filter((item) => {
      const key = `${item.provider}|${item.resolution}|${item.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Also expose raw provider list for consumers that want to pick themselves
    const providers = respLines.map((r) => ({
      name: r.sourceName,
      resolvedPath: r.directUrl || (r.hex ? decodeProviderId(r.hex) : null),
    }));

    const episodeString = apiData?.data?.episode?.episodeString || String(episode);

    return c.json({
      success: true,
      data: {
        allanimeId: showId,
        mode,
        episode: episodeString,
        providers,
        sources,
        subtitles: allSubtitles,
      },
    });
  } catch (error) {
    console.error('[SOURCE] Error:', error.message);
    return c.json({ success: false, error: error.message || 'Failed to fetch episode sources' }, 500);
  }
});

serve({ fetch: app.fetch, port: Number(PORT) });
console.log(`anime-frame server running at http://localhost:${PORT}`);