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

// ─── Queries ──────────────────────────────────────────────────────────────────

const ALLANIME_SEARCH_QUERY = `query($search: SearchInput, $limit: Int, $translationType: VaildTranslationTypeEnumType, $countryOrigin: VaildCountryOriginEnumType) {
  shows(search: $search, limit: $limit, translationType: $translationType, countryOrigin: $countryOrigin) {
    edges { _id name englishName malId aniListId availableEpisodesDetail }
  }
}`;

const ALLANIME_EPISODES_QUERY = `query ($showId: String!) {
  show(_id: $showId) { _id name availableEpisodesDetail malId aniListId }
}`;

const ANILIST_TITLE_QUERY = `query ($id: Int) {
  Media(id: $id, type: ANIME) { title { romaji english native } }
}`;

const EPISODE_QUERY = `query ($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) {
  episode(showId: $showId translationType: $translationType episodeString: $episodeString) {
    episodeString sourceUrls
  }
}`;

// ─── Decryption ───────────────────────────────────────────────────────────────

const ALLANIME_KEY = crypto.createHash('sha256').update('Xot36i3lK3:v1').digest();

function decrypt(blob) {
  try {
    const data = Buffer.from(String(blob), 'base64');
    if (data.length <= 29) return null;
    const iv = Buffer.concat([data.slice(1, 13), Buffer.from('00000002', 'hex')]);
    const ciphertext = data.slice(13, data.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-ctr', ALLANIME_KEY, iv);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

// ─── Provider ID decoder ──────────────────────────────────────────────────────

const DECODE_MAP = {
  '79':'A','7a':'B','7b':'C','7c':'D','7d':'E','7e':'F','7f':'G','70':'H','71':'I','72':'J','73':'K','74':'L','75':'M','76':'N','77':'O',
  '68':'P','69':'Q','6a':'R','6b':'S','6c':'T','6d':'U','6e':'V','6f':'W','60':'X','61':'Y','62':'Z',
  '59':'a','5a':'b','5b':'c','5c':'d','5d':'e','5e':'f','5f':'g','50':'h','51':'i','52':'j','53':'k','54':'l','55':'m','56':'n','57':'o',
  '48':'p','49':'q','4a':'r','4b':'s','4c':'t','4d':'u','4e':'v','4f':'w','40':'x','41':'y','42':'z',
  '08':'0','09':'1','0a':'2','0b':'3','0c':'4','0d':'5','0e':'6','0f':'7','00':'8','01':'9',
  '15':'-','16':'.','67':'_','46':'~','02':':','17':'/','07':'?','1b':'#','63':'[','65':']','78':'@',
  '19':'!','1c':'$','1e':'&','10':'(','11':')','12':'*','13':'+','14':',','03':';','05':'=','1d':'%',
};

function decodeProviderId(hex) {
  let r = '';
  for (let i = 0; i < hex.length; i += 2) r += DECODE_MAP[hex.substring(i, i + 2)] || '';
  return r.replace('/clock', '/clock.json');
}

// ─── Source line parser ───────────────────────────────────────────────────────

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
      if (!m) continue;
      const sourceUrl = unescapeSource(m[1]);
      const sourceName = m[2];
      if (sourceUrl.startsWith('--')) respLines.push({ sourceName, hex: sourceUrl.substring(2) });
      else if (sourceUrl.startsWith('http') || sourceUrl.startsWith('/')) respLines.push({ sourceName, directUrl: sourceUrl });
      else respLines.push({ sourceName, hex: sourceUrl });
    }
  };

  if (apiData?.data?._m?.length > 10) extractFromBlob(apiData.data._m);
  if (apiData?.data?.tobeparsed) extractFromBlob(apiData.data.tobeparsed);
  if (apiData?.tobeparsed) extractFromBlob(apiData.tobeparsed);

  if (apiData?.data?.episode?.sourceUrls) {
    const raw = unescapeSource(JSON.stringify(apiData.data.episode.sourceUrls));
    const parts = raw.replace(/[{}]/g, '\n').split('\n');
    for (const part of parts) {
      const m = part.match(/"sourceUrl":"([^"]*)".*"sourceName":"([^"]*)"/);
      if (!m) continue;
      const sourceUrl = m[1];
      const sourceName = m[2];
      if (sourceUrl.startsWith('--')) respLines.push({ sourceName, hex: sourceUrl.substring(2) });
      else if (sourceUrl.startsWith('http') || sourceUrl.startsWith('/')) respLines.push({ sourceName, directUrl: sourceUrl });
      else respLines.push({ sourceName, hex: sourceUrl });
    }
  }

  return respLines;
}

// ─── URL type detection ───────────────────────────────────────────────────────

function detectUrlType(url) {
  if (!url) return 'unknown';
  const u = url.toLowerCase().split('?')[0];
  if (u.endsWith('.m3u8') || u.includes('.m3u8')) return 'm3u8';
  if (u.endsWith('.mp4') || u.includes('.mp4')) return 'mp4';
  if (u.endsWith('.mpd') || u.includes('.mpd')) return 'mpd';
  if (u.includes('/hls/') || u.includes('manifest')) return 'm3u8';
  return 'mp4'; // wixmp and most direct links are mp4
}

// ─── Filemoon decryption ──────────────────────────────────────────────────────

function b64urlToHex(b64url) {
  let p = b64url;
  const mod = p.length % 4;
  if (mod === 2) p += '==';
  else if (mod === 3) p += '=';
  return Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('hex');
}

async function getFilemoonLinks(providerPath) {
  const fetchUrl = providerPath.startsWith('http') ? providerPath : `https://${ALLANIME_BASE}${providerPath}`;
  const links = [];
  try {
    const { data } = await axios.get(fetchUrl, {
      headers: { 'User-Agent': HTTP_HEADERS['User-Agent'], Referer: YOUTU_CHAN_REFERER },
      timeout: 4000,
    });
    if (data?.iv && data?.payload && data?.key_parts) {
      const keyHex = b64urlToHex(data.key_parts[0]) + b64urlToHex(data.key_parts[1]);
      const ivHex = b64urlToHex(data.iv) + '00000002';
      let pb64 = data.payload;
      const pm = pb64.length % 4;
      if (pm === 2) pb64 += '==';
      else if (pm === 3) pb64 += '=';
      pb64 = pb64.replace(/-/g, '+').replace(/_/g, '/');
      const buf = Buffer.from(pb64, 'base64');
      const ct = buf.slice(0, buf.length - 16);
      const dec = crypto.createDecipheriv('aes-256-ctr', Buffer.from(keyHex, 'hex'), Buffer.from(ivHex, 'hex'));
      const plain = Buffer.concat([dec.update(ct), dec.final()]).toString('utf8');
      const parts = plain.replace(/[{}\[\]]/g, '\n').split('\n');
      for (const part of parts) {
        const m1 = part.match(/"url":"([^"]*)".*"height":(\d+)/);
        const m2 = part.match(/"height":(\d+).*"url":"([^"]*)"/);
        const [url, height] = m1 ? [m1[1], m1[2]] : m2 ? [m2[2], m2[1]] : [null, null];
        if (url) {
          const cleanUrl = url.replace(/\\u0026/g, '&').replace(/\\u003D/g, '=');
          links.push({ provider: 'Fm-mp4', type: detectUrlType(cleanUrl), resolution: height, url: cleanUrl });
        }
      }
    }
  } catch (e) {
    console.log('[FILEMOON] failed:', e.message);
  }
  return links;
}

// ─── Provider link fetchers ───────────────────────────────────────────────────

async function getMp4UploadLinks(pageUrl) {
  try {
    const { data: html } = await axios.get(pageUrl, {
      headers: { 'User-Agent': HTTP_HEADERS['User-Agent'], Referer: YOUTU_CHAN_REFERER },
      timeout: 25000,
      maxRedirects: 5,
    });
    const m = typeof html === 'string' && html.match(/(?:src|file):\s*"([^"]+\.mp4[^"]*)"/i);
    if (m) return [{ provider: 'Mp4', type: 'mp4', resolution: null, url: m[1].replace(/\\u0026/g, '&').replace(/\\/g, '') }];
  } catch (e) {
    console.log('[MP4UPLOAD] failed:', e.message);
  }
  return [];
}

async function getProviderLinks(providerPath, sourceName) {
  // fast4speed: direct mp4 that needs a Referer header to play
  if (providerPath.includes('tools.fast4speed.rsvp')) {
    return [{ provider: sourceName, type: 'mp4', resolution: null, url: providerPath, headers: { Referer: YOUTU_CHAN_REFERER } }];
  }

  if (providerPath.includes('mp4upload.com')) {
    return getMp4UploadLinks(providerPath);
  }

  const fetchUrl = providerPath.startsWith('http') ? providerPath : `https://${ALLANIME_BASE}${providerPath}`;
  const links = [];

  try {
    const { data } = await axios.get(fetchUrl, {
      headers: { 'User-Agent': HTTP_HEADERS['User-Agent'], Referer: YOUTU_CHAN_REFERER },
      timeout: 4000,
    });

    if (Array.isArray(data?.links)) {
      for (const link of data.links) {
        if (!link.link) continue;
        const url = link.link;
        const res = link.resolutionStr || null;

        if (url.includes('repackager.wixmp.com')) {
          // wixmp repackager: one URL per quality, all mp4
          const cleaned = url.replace('repackager.wixmp.com/', '').replace(/\.urlset.*/, '');
          const qMatch = url.match(/\/,([^/]*),\/mp4/);
          if (qMatch) {
            for (const q of qMatch[1].split(',')) {
              if (q) links.push({ provider: sourceName, type: 'mp4', resolution: q, url: cleaned.replace(/,[^/]*/, q) });
            }
          } else {
            links.push({ provider: sourceName, type: detectUrlType(url), resolution: res, url });
          }
        } else {
          links.push({ provider: sourceName, type: detectUrlType(url), resolution: res, url });
        }
      }
    }

    if (data?.hls?.url) {
      links.push({ provider: sourceName, type: 'm3u8', resolution: null, url: data.hls.url });
    }

    // Subtitles are returned separately via the _subtitles property trick
    if (Array.isArray(data?.subtitles)) {
      links._subtitles = data.subtitles.map(s => ({ language: s.lang, label: s.label, url: s.src }));
    }
  } catch (e) {
    console.log(`[PROVIDER:${sourceName}] failed:`, e.message);
  }

  return links;
}

// ─── Episode API request ──────────────────────────────────────────────────────

const EPISODE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0',
  Referer: YOUTU_CHAN_REFERER,
  Origin: YOUTU_CHAN_REFERER,
};

function hasUsableData(data) {
  if (!data) return false;
  const raw = JSON.stringify(data);
  return raw.includes('sourceUrls') || raw.includes('tobeparsed') || raw.includes('"_m"');
}

async function requestAllanimeEpisodeSources(showId, mode, episode) {
  const variables = { showId, translationType: mode, episodeString: String(episode) };
  const extensions = { persistedQuery: { version: 1, sha256Hash: ALLANIME_EPISODE_QUERY_HASH } };
  const uaFF = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0';
  const uaCR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  for (const [ua, ref] of [[uaFF, YOUTU_CHAN_REFERER], [uaFF, 'https://allanime.day'], [uaCR, 'https://allmanga.to']]) {
    try {
      const res = await axios.get(ALLANIME_API, {
        params: { variables: JSON.stringify(variables), extensions: JSON.stringify(extensions) },
        headers: { 'User-Agent': ua, Referer: ref, Origin: ref },
        timeout: 8000,
      });
      console.log(`[REQUEST] GET ${ref} -> ${res.status} | ${JSON.stringify(res.data).substring(0, 100)}`);
      if (hasUsableData(res.data)) return res.data;
    } catch (e) {
      console.log(`[REQUEST] GET ${ref} failed: ${e.response?.status || e.message}`);
    }
  }

  let lastData = null;
  for (const [ua, ref] of [[uaFF, YOUTU_CHAN_REFERER], [uaCR, 'https://allmanga.to'], [uaFF, 'https://allanime.day']]) {
    try {
      const res = await axios.post(ALLANIME_API, { variables, query: EPISODE_QUERY }, {
        headers: { 'User-Agent': ua, Referer: ref, Origin: ref, 'Content-Type': 'application/json' },
        timeout: 8000,
      });
      console.log(`[REQUEST] POST ${ref} -> ${res.status} | ${JSON.stringify(res.data).substring(0, 100)}`);
      lastData = res.data;
      if (hasUsableData(res.data)) return res.data;
    } catch (e) {
      console.log(`[REQUEST] POST ${ref} failed: ${e.response?.status || e.message}`);
      if (e.response?.data) lastData = e.response.data;
    }
  }

  return lastData || { errors: [{ message: 'All request strategies failed' }] };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeMode(mode) {
  return ['sub', 'dub', 'raw'].includes(mode) ? mode : 'sub';
}

function buildCandidateTitles(values) {
  return [...new Set(values.filter(Boolean).map(v => v.trim()).filter(Boolean))];
}

function formatShow(show) {
  return { allanimeId: show._id, name: show.name, englishName: show.englishName, aniListId: show.aniListId, malId: show.malId };
}

async function allanimeSearchByTitle(title, mode = 'sub') {
  const res = await axios.post(ALLANIME_API, {
    query: ALLANIME_SEARCH_QUERY,
    variables: { search: { allowAdult: false, allowUnknown: true, query: title }, limit: 50, translationType: normalizeMode(mode), countryOrigin: 'ALL' },
  }, { headers: HTTP_HEADERS });
  return res.data?.data?.shows?.edges || [];
}

async function getAniListTitles(aniListId) {
  const id = Number.parseInt(String(aniListId), 10);
  if (Number.isNaN(id)) throw new Error('AniList ID must be a number');
  const res = await axios.post(ANILIST_GRAPHQL_API, { query: ANILIST_TITLE_QUERY, variables: { id } }, { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } });
  const media = res.data?.data?.Media;
  if (!media) throw new Error('AniList media not found');
  return buildCandidateTitles([media.title?.romaji, media.title?.english, media.title?.native]);
}

async function getMalTitles(malId) {
  const id = Number.parseInt(String(malId), 10);
  if (Number.isNaN(id)) throw new Error('MAL ID must be a number');
  const res = await axios.get(`${JIKAN_API}/anime/${id}`);
  const anime = res.data?.data;
  if (!anime) throw new Error('MAL anime not found');
  return buildCandidateTitles([anime.title, anime.title_english, anime.title_japanese]);
}

async function mapByAniListId(aniListId, mode = 'sub') {
  for (const title of await getAniListTitles(aniListId)) {
    const matched = (await allanimeSearchByTitle(title, mode)).find(s => String(s.aniListId) === String(aniListId));
    if (matched) return { input: { type: 'anilist', id: String(aniListId), matchedTitle: title }, data: formatShow(matched) };
  }
  throw new Error('No AllAnime mapping found for this AniList ID');
}

async function mapByMalId(malId, mode = 'sub') {
  for (const title of await getMalTitles(malId)) {
    const matched = (await allanimeSearchByTitle(title, mode)).find(s => String(s.malId) === String(malId));
    if (matched) return { input: { type: 'mal', id: String(malId), matchedTitle: title }, data: formatShow(matched) };
  }
  throw new Error('No AllAnime mapping found for this MAL ID');
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/', (c) => c.json({
  name: 'anime-frame',
  version: '1.2.0',
  endpoints: {
    map: '/api/anime/:id?type=anilist|mal&mode=sub|dub|raw',
    episodes: '/api/allanime/:allanime_id/episodes?mode=sub|dub|raw',
    source: '/api/allanime/:allanime_id/source?episode=<ep>&mode=sub|dub|raw',
  },
}));

app.get('/api/anime/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const type = c.req.query('type');
    const mode = normalizeMode(c.req.query('mode') || 'sub');
    if (type === 'anilist') return c.json({ success: true, ...(await mapByAniListId(id, mode)) });
    if (type === 'mal') return c.json({ success: true, ...(await mapByMalId(id, mode)) });
    try { return c.json({ success: true, ...(await mapByAniListId(id, mode)) }); }
    catch { return c.json({ success: true, ...(await mapByMalId(id, mode)) }); }
  } catch (e) {
    return c.json({ success: false, error: e.message || 'Failed to map ID' }, 404);
  }
});

app.get('/api/allanime/:allanime_id/episodes', async (c) => {
  try {
    const showId = c.req.param('allanime_id');
    const mode = normalizeMode(c.req.query('mode') || 'sub');
    const res = await axios.post(ALLANIME_API, { query: ALLANIME_EPISODES_QUERY, variables: { showId } }, { headers: HTTP_HEADERS });
    const show = res.data?.data?.show;
    if (!show) return c.json({ success: false, error: 'AllAnime show not found' }, 404);
    const episodes = Array.isArray(show.availableEpisodesDetail?.[mode])
      ? [...show.availableEpisodesDetail[mode]].sort((a, b) => parseFloat(a) - parseFloat(b))
      : [];
    return c.json({ success: true, data: { allanimeId: show._id, name: show.name, aniListId: show.aniListId, malId: show.malId, mode, count: episodes.length, episodes } });
  } catch (e) {
    return c.json({ success: false, error: e.message || 'Failed to fetch episodes' }, 500);
  }
});

// ─── Source route ─────────────────────────────────────────────────────────────

app.get('/api/allanime/:allanime_id/source', async (c) => {
  try {
    const showId = c.req.param('allanime_id');
    const mode = normalizeMode(c.req.query('mode') || 'sub');
    const episode = c.req.query('episode');

    if (!episode) return c.json({ success: false, error: 'Query parameter "episode" is required' }, 400);

    const apiData = await requestAllanimeEpisodeSources(showId, mode, episode);

    if (apiData?.errors?.length > 0 && !hasUsableData(apiData)) {
      return c.json({ success: false, error: apiData.errors.map(e => e.message).join(', ') }, 502);
    }

    const respLines = parseSourceLines(apiData);
    console.log('[SOURCE] Parsed lines:', respLines.map(r => r.sourceName));

    if (respLines.length === 0) return c.json({ success: false, error: 'Episode source not found' }, 404);

    // Known providers and whether they use Filemoon encryption
    const PROVIDER_DEFS = [
      { name: 'Default',  filemoon: false },
      { name: 'Mp4',      filemoon: false },
      { name: 'Yt-mp4',   filemoon: false },
      { name: 'S-mp4',    filemoon: false },
      { name: 'Fm-mp4',   filemoon: true  },
      { name: 'Luf-Mp4',  filemoon: false },
    ];

    // Providers whose resolved path is an embed URL (not a clock.json endpoint)
    // These can't be resolved server-side and are returned as embeds instead
    const EMBED_PROVIDERS = new Set(['Luf-Mp4', 'Mp4']);

    const allSources = [];
    const allEmbeds = [];
    const allSubtitles = [];

    await Promise.all(PROVIDER_DEFS.map(async (prov) => {
      const entry = respLines.find(r => r.sourceName === prov.name);
      if (!entry) return;

      const resolvedPath = entry.directUrl || (entry.hex ? decodeProviderId(entry.hex) : null);
      if (!resolvedPath) return;

      console.log(`[SOURCE] ${prov.name} -> ${resolvedPath.substring(0, 80)}`);

      // If the resolved path is a full embed URL (not an allanime clock endpoint),
      // treat it as an embed rather than trying to fetch it
      const isClockEndpoint = resolvedPath.startsWith('/') || resolvedPath.includes(ALLANIME_BASE);
      const isEmbedProvider = EMBED_PROVIDERS.has(prov.name);

      if (!isClockEndpoint && isEmbedProvider) {
        allEmbeds.push({ provider: prov.name, url: resolvedPath });
        return;
      }

      // Fetch direct sources
      const links = prov.filemoon
        ? await getFilemoonLinks(resolvedPath)
        : await getProviderLinks(resolvedPath, prov.name);

      if (links._subtitles) allSubtitles.push(...links._subtitles);

      for (const link of links) {
        if (!link.url) continue;
        allSources.push(link);
      }
    }));

    // Sort sources: mp4 first (most compatible), then m3u8, then others
    // Within same type, sort by resolution descending
    const TYPE_PRIORITY = { mp4: 0, m3u8: 1, mpd: 2, unknown: 3 };
    allSources.sort((a, b) => {
      const tDiff = (TYPE_PRIORITY[a.type] ?? 3) - (TYPE_PRIORITY[b.type] ?? 3);
      if (tDiff !== 0) return tDiff;
      return (parseInt(b.resolution) || 0) - (parseInt(a.resolution) || 0);
    });

    // Dedup sources by url
    const seenUrls = new Set();
    const sources = allSources.filter(s => {
      if (seenUrls.has(s.url)) return false;
      seenUrls.add(s.url);
      return true;
    });

    // Group by type for a clean response
    const sourcesByType = {
      mp4:  sources.filter(s => s.type === 'mp4'),
      m3u8: sources.filter(s => s.type === 'm3u8'),
      mpd:  sources.filter(s => s.type === 'mpd'),
      other: sources.filter(s => !['mp4','m3u8','mpd'].includes(s.type)),
    };

    return c.json({
      success: true,
      data: {
        allanimeId: showId,
        mode,
        episode: apiData?.data?.episode?.episodeString || String(episode),
        // Flat list of all playable sources, sorted mp4 → m3u8 → other, best quality first
        sources,
        // Same sources broken out by container type
        sourcesByType,
        // Embed URLs that require a browser/iframe to play (can't be proxied server-side)
        embeds: allEmbeds,
        subtitles: allSubtitles,
      },
    });
  } catch (e) {
    console.error('[SOURCE] Error:', e.message);
    return c.json({ success: false, error: e.message || 'Failed to fetch episode sources' }, 500);
  }
});

serve({ fetch: app.fetch, port: Number(PORT) });
console.log(`anime-frame server running at http://localhost:${PORT}`);