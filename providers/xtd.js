/**
 * XTD - Nuvio Provider
 * Direct MP4 streams for Movies / Series / Anime via the videodownloader.site
 * (aoneroom) catalog API — reverse-engineered & verified working.
 *
 * Features:
 *  - Direct HTTP MP4 links (no torrents) — plays natively on Nuvio mobile
 *  - ALL audio versions exposed as separate sources: Original Audio,
 *    Arabic dub, French dub, Hindi dub, hardsub versions (Arabic sub,
 *    Kurdish sub, ...) — sorted Arabic-first
 *  - Multiple qualities per version (360p → 1080p, when available)
 *  - Arabic + English .srt subtitles attached automatically
 *  - Optional CDN relay fallback (for networks/players rejected by the CDN)
 *
 * Repo: https://github.com/sanaa813hassan-maker/XTD
 */

// ─── Constants ────────────────────────────────────────────────────────
var API_BASE = "https://h5-api.aoneroom.com";
var SITE_URL = "https://videodownloader.site/";
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var DEFAULT_RELAY = "https://xt-cdn-relay.fly.dev";

var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Content-Type": "application/json",
  "Origin": SITE_URL.replace(/\/$/, ""),
  "Referer": SITE_URL,
  "x-client-info": JSON.stringify({ timezone: "Africa/Cairo" }),
  "x-site-domain": ""
};

// ─── Pure-JS MD5 (no crypto module needed inside Nuvio runtime) ───────
function md5(str) {
  function rl(n, c) { return (n << c) | (n >>> (32 - c)); }
  function au(x, y) {
    var l = (x & 0xFFFF) + (y & 0xFFFF), m = (x >> 16) + (y >> 16) + (l >> 16);
    return (m << 16) | (l & 0xFFFF);
  }
  function cmn(q, a, b, x, s, t) { return au(rl(au(au(a, q), au(x, t)), s), b); }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }

  function toBytes(input) {
    // UTF-8 encode
    var out = [], i, c;
    for (i = 0; i < input.length; i++) {
      c = input.charCodeAt(i);
      if (c < 128) out.push(c);
      else if (c < 2048) { out.push(192 | (c >> 6), 128 | (c & 63)); }
      else if (c < 55296 || c >= 57344) { out.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63)); }
      else {
        i++;
        c = 65536 + (((c & 1023) << 10) | (input.charCodeAt(i) & 1023));
        out.push(240 | (c >> 18), 128 | ((c >> 12) & 63), 128 | ((c >> 6) & 63), 128 | (c & 63));
      }
    }
    return out;
  }

  var bytes = toBytes(String(str));
  var origLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  // little-endian 64-bit length
  var lo = origLen >>> 0, hi = Math.floor(origLen / 4294967296);
  bytes.push(lo & 0xFF, (lo >>> 8) & 0xFF, (lo >>> 16) & 0xFF, (lo >>> 24) & 0xFF);
  bytes.push(hi & 0xFF, (hi >>> 8) & 0xFF, (hi >>> 16) & 0xFF, (hi >>> 24) & 0xFF);

  var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  var i, x = new Array(16);

  for (var off = 0; off < bytes.length; off += 64) {
    for (i = 0; i < 16; i++) {
      x[i] = bytes[off + i * 4] | (bytes[off + i * 4 + 1] << 8) | (bytes[off + i * 4 + 2] << 16) | (bytes[off + i * 4 + 3] << 24);
    }
    var oa = a, ob = b, oc = c, od = d;
    a = ff(a, b, c, d, x[0], 7, -680876936);   d = ff(d, a, b, c, x[1], 12, -389564586);
    c = ff(c, d, a, b, x[2], 17, 606105819);   b = ff(b, c, d, a, x[3], 22, -1044525330);
    a = ff(a, b, c, d, x[4], 7, -176418897);   d = ff(d, a, b, c, x[5], 12, 1200080426);
    c = ff(c, d, a, b, x[6], 17, -1473231341); b = ff(b, c, d, a, x[7], 22, -45705983);
    a = ff(a, b, c, d, x[8], 7, 1770035416);   d = ff(d, a, b, c, x[9], 12, -1958414417);
    c = ff(c, d, a, b, x[10], 17, -42063);     b = ff(b, c, d, a, x[11], 22, -1990404162);
    a = ff(a, b, c, d, x[12], 7, 1804603682);  d = ff(d, a, b, c, x[13], 12, -40341101);
    c = ff(c, d, a, b, x[14], 17, -1502002290); b = ff(b, c, d, a, x[15], 22, 1236535329);
    a = gg(a, b, c, d, x[1], 5, -165796510);   d = gg(d, a, b, c, x[6], 9, -1069501632);
    c = gg(c, d, a, b, x[11], 14, 643717713);  b = gg(b, c, d, a, x[0], 20, -373897302);
    a = gg(a, b, c, d, x[5], 5, -701558691);   d = gg(d, a, b, c, x[10], 9, 38016083);
    c = gg(c, d, a, b, x[15], 14, -660478335); b = gg(b, c, d, a, x[4], 20, -405537848);
    a = gg(a, b, c, d, x[9], 5, 568446438);    d = gg(d, a, b, c, x[14], 9, -1019803690);
    c = gg(c, d, a, b, x[3], 14, -187363961);  b = gg(b, c, d, a, x[8], 20, 1163531501);
    a = gg(a, b, c, d, x[13], 5, -1444681467); d = gg(d, a, b, c, x[2], 9, -51403784);
    c = gg(c, d, a, b, x[7], 14, 1735328473);  b = gg(b, c, d, a, x[12], 20, -1926607734);
    a = hh(a, b, c, d, x[5], 4, -378558);      d = hh(d, a, b, c, x[8], 11, -2022574463);
    c = hh(c, d, a, b, x[11], 16, 1839030562); b = hh(b, c, d, a, x[14], 23, -35309556);
    a = hh(a, b, c, d, x[1], 4, -1530992060);  d = hh(d, a, b, c, x[4], 11, 1272893353);
    c = hh(c, d, a, b, x[7], 16, -155497632);  b = hh(b, c, d, a, x[10], 23, -1094730640);
    a = hh(a, b, c, d, x[13], 4, 681279174);   d = hh(d, a, b, c, x[0], 11, -358537222);
    c = hh(c, d, a, b, x[3], 16, -722521979);  b = hh(b, c, d, a, x[6], 23, 76029189);
    a = hh(a, b, c, d, x[9], 4, -640364487);   d = hh(d, a, b, c, x[12], 11, -421815835);
    c = hh(c, d, a, b, x[15], 16, 530742520);  b = hh(b, c, d, a, x[2], 23, -995338651);
    a = ii(a, b, c, d, x[0], 6, -198630844);   d = ii(d, a, b, c, x[7], 10, 1126891415);
    c = ii(c, d, a, b, x[14], 15, -1416354905); b = ii(b, c, d, a, x[5], 21, -57434055);
    a = ii(a, b, c, d, x[12], 6, 1700485571);  d = ii(d, a, b, c, x[3], 10, -1894986606);
    c = ii(c, d, a, b, x[10], 15, -1051523);   b = ii(b, c, d, a, x[1], 21, -2054922799);
    a = ii(a, b, c, d, x[8], 6, 1873313359);   d = ii(d, a, b, c, x[15], 10, -30611744);
    c = ii(c, d, a, b, x[6], 15, -1560198380); b = ii(b, c, d, a, x[13], 21, 1309151649);
    a = ii(a, b, c, d, x[4], 6, -145523070);   d = ii(d, a, b, c, x[11], 10, -1120210379);
    c = ii(c, d, a, b, x[2], 15, 718787259);   b = ii(b, c, d, a, x[9], 21, -343485551);
    a = au(a, oa); b = au(b, ob); c = au(c, oc); d = au(d, od);
  }

  function hex(n) {
    var s = "", j, byte;
    for (j = 0; j < 4; j++) {
      byte = (n >>> (j * 8)) & 0xFF;
      s += (byte < 16 ? "0" : "") + byte.toString(16);
    }
    return s;
  }
  return hex(a) + hex(b) + hex(c) + hex(d);
}

// ─── Settings helper ──────────────────────────────────────────────────
function getSetting(key, fallback) {
  try {
    var s = (typeof global !== "undefined" && global.SCRAPER_SETTINGS) ||
            (typeof window !== "undefined" && window.SCRAPER_SETTINGS) || null;
    if (s && s[key] !== undefined && s[key] !== null && String(s[key]).trim() !== "") {
      return String(s[key]).trim();
    }
  } catch (e) {}
  return fallback;
}

function getRelayBase() {
  var enabled = String(getSetting("useRelay", "false")).toLowerCase() === "true";
  if (!enabled) return null;
  return String(getSetting("relayUrl", DEFAULT_RELAY)).replace(/\/+$/, "");
}

// ─── Auth (reverse-engineered aoneroom API) ───────────────────────────
// x-client-token = "<unixSeconds>,<md5(reverse(unixSeconds))>"
function clientToken() {
  var e = Math.floor(Date.now() / 1000);
  var t = String(e).split("").reverse().join("");
  return e + "," + md5(t);
}

var cachedJwt = null;
var cachedJwtExp = 0;

function decodeJwtExp(jwt) {
  try {
    var b64 = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    var payload = JSON.parse(atob(b64));
    return payload.exp || 0;
  } catch (e) {
    return 0;
  }
}

async function fetchGuestJwt() {
  var res = await fetch(API_BASE + "/wefeed-h5api-bff/subject/search-suggest", {
    method: "POST",
    headers: buildHeaders("ar"),
    body: JSON.stringify({ keyword: "a", perPage: 1 })
  });
  if (!res.ok) throw new Error("bootstrap " + res.status);
  var xUser = res.headers.get("x-user");
  if (!xUser) throw new Error("no x-user header");
  var parsed = JSON.parse(xUser);
  if (!parsed.token) throw new Error("no token in x-user");
  return parsed.token;
}

async function getJwt() {
  var now = Math.floor(Date.now() / 1000);
  if (cachedJwt && cachedJwtExp - now > 60) return cachedJwt;
  var jwt = await fetchGuestJwt();
  cachedJwt = jwt;
  cachedJwtExp = decodeJwtExp(jwt) || now + 86400;
  return jwt;
}

function buildHeaders(locale) {
  var h = {};
  for (var k in HEADERS) h[k] = HEADERS[k];
  h["x-client-token"] = clientToken();
  h["x-request-lang"] = locale || "ar";
  return h;
}

async function apiPost(path, body, locale) {
  var jwt = await getJwt();
  var headers = buildHeaders(locale);
  headers["authorization"] = "Bearer " + jwt;
  if (path.indexOf("/subject/search") !== -1) headers["x-source"] = "downloader";
  var res = await fetch(API_BASE + path, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body)
  });
  var json = await res.json();
  if (!json || json.code !== 0) {
    // JWT may be stale → refresh once and retry
    if (json && (json.message === "invalid token" || json.reason === "PARAMS_ERROR")) {
      cachedJwt = null; cachedJwtExp = 0;
      jwt = await getJwt();
      headers["authorization"] = "Bearer " + jwt;
      var retry = await fetch(API_BASE + path, {
        method: "POST", headers: headers, body: JSON.stringify(body)
      });
      json = await retry.json();
      if (!json || json.code !== 0) throw new Error((json && json.message) || "upstream error");
      return json.data;
    }
    throw new Error((json && json.message) || "upstream error");
  }
  return json.data;
}

async function apiGet(path, locale) {
  var jwt = await getJwt();
  var headers = buildHeaders(locale);
  headers["authorization"] = "Bearer " + jwt;
  var res = await fetch(API_BASE + path, { method: "GET", headers: headers });
  var json = await res.json();
  if (!json || json.code !== 0) {
    if (json && (json.message === "invalid token" || json.reason === "PARAMS_ERROR")) {
      cachedJwt = null; cachedJwtExp = 0;
      jwt = await getJwt();
      headers["authorization"] = "Bearer " + jwt;
      var retry = await fetch(API_BASE + path, { method: "GET", headers: headers });
      json = await retry.json();
      if (!json || json.code !== 0) throw new Error((json && json.message) || "upstream error");
      return json.data;
    }
    throw new Error((json && json.message) || "upstream error");
  }
  return json.data;
}

// ─── TMDB lookup ──────────────────────────────────────────────────────
async function tmdbFromImdb(imdbId, mediaType) {
  var url = TMDB_BASE_URL + "/find/" + imdbId + "?api_key=" + TMDB_API_KEY + "&external_source=imdb_id";
  try {
    var res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    var data = await res.json();
    var arr = mediaType === "tv" ? (data.tv_results || []) : (data.movie_results || []);
    return arr && arr.length ? arr[0].id : null;
  } catch (e) { return null; }
}

async function getTMDBDetails(tmdbId, mediaType) {
  var endpoint = mediaType === "tv" ? "tv" : "movie";
  var url = TMDB_BASE_URL + "/" + endpoint + "/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&append_to_response=external_ids,translations";
  try {
    var res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    var data = await res.json();
    var title = mediaType === "tv" ? data.name : data.title;
    var releaseDate = mediaType === "tv" ? data.first_air_date : data.release_date;
    var year = releaseDate ? parseInt(String(releaseDate).substring(0, 4), 10) : null;
    var imdbId = (data.external_ids && data.external_ids.imdb_id) || null;

    // Arabic title (used by the aoneroom catalog for Arabic content)
    var arTitle = null;
    try {
      var trs = (data.translations && data.translations.translations) || [];
      for (var i = 0; i < trs.length; i++) {
        if (trs[i].iso_639_1 === "ar") {
          var nm = mediaType === "tv" ? (trs[i].data && trs[i].data.name) : (trs[i].data && trs[i].data.title);
          if (nm) { arTitle = nm; break; }
        }
      }
    } catch (e) {}

    return { title: title, arTitle: arTitle, year: year, imdbId: imdbId };
  } catch (e) {
    return null;
  }
}

// ─── Catalog search + match ───────────────────────────────────────────
var ALLOWED_TYPES = [1, 2, 3]; // 1 movie, 2 series, 3 anime

var imdbFallbackTitle = null;

async function findSubject(title, arTitle, year, mediaType) {
  var queries = [];
  if (title) queries.push(title);
  if (arTitle && arTitle !== title) queries.push(arTitle);
  if (imdbFallbackTitle) queries.push(imdbFallbackTitle);

  var candidates = [];
  for (var q = 0; q < queries.length; q++) {
    try {
      var data = await apiPost("/wefeed-h5api-bff/subject/search", {
        keyword: queries[q], page: 1, perPage: 24, subjectType: 0
      }, "ar");
      var items = (data && (data.items || data.subjectList || data.list)) || [];
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (ALLOWED_TYPES.indexOf(it.subjectType) === -1) continue;
        if (mediaType === "movie" && it.subjectType !== 1) continue;
        if (mediaType === "tv" && it.subjectType === 1) continue;
        var itYear = it.releaseDate ? parseInt(String(it.releaseDate).substring(0, 4), 10) : null;
        candidates.push({
          item: it,
          yearScore: (year && itYear) ? Math.abs(year - itYear) : 5
        });
      }
      if (candidates.length) break; // first query that yields candidates is enough
    } catch (e) { /* try next query */ }
  }

  if (!candidates.length) return null;
  candidates.sort(function (a, b) { return a.yearScore - b.yearScore; });
  return candidates[0].item;
}

// ─── Helpers ──────────────────────────────────────────────────────────
function formatBytes(n) {
  var num = Number(n);
  if (!num || num <= 0) return "Unknown";
  var units = ["B", "KB", "MB", "GB", "TB"];
  var i = Math.floor(Math.log(num) / Math.log(1024));
  return (num / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0) + " " + units[i];
}

function streamHeaders() {
  return {
    "User-Agent": HEADERS["User-Agent"],
    "Referer": SITE_URL
  };
}

function withRelay(url) {
  var relay = getRelayBase();
  if (!relay) return url;
  return relay + "/proxy?url=" + encodeURIComponent(url) + "&ref=" + encodeURIComponent(SITE_URL);
}

// ─── Stream extraction ────────────────────────────────────────────────
async function extractStreams(version, se, ep) {
  var subjectId = version.subjectId;
  var detailPath = version.detailPath;
  var label = version.lanName;
  var qs = "subjectId=" + encodeURIComponent(subjectId) +
    "&se=" + (se || 0) + "&ep=" + (ep || 0) +
    "&detailPath=" + encodeURIComponent(detailPath);
  var data = await apiGet("/wefeed-h5api-bff/subject/play?" + qs, "ar");
  var streams = (data && data.streams) || [];
  if (!streams.length) return [];

  // subtitles via caption endpoint (uses first stream id)
  var subtitles = [];
  try {
    var firstId = streams[0].id;
    if (firstId) {
      var cq = "format=" + encodeURIComponent((streams[0].format || "MP4")) +
        "&id=" + encodeURIComponent(firstId) +
        "&subjectId=" + encodeURIComponent(subjectId) +
        "&detailPath=" + encodeURIComponent(detailPath);
      var capData = await apiGet("/wefeed-h5api-bff/subject/caption?" + cq, "ar");
      var caps = (capData && capData.captions) || [];
      for (var i = 0; i < caps.length; i++) {
        var cp = caps[i];
        if (!cp.url) continue;
        var lan = cp.lan || cp.lanName || "en";
        if (lan === "in_id") lan = "id";
        subtitles.push({
          url: cp.url,
          language: lan,
          name: cp.lanName || lan,
          headers: streamHeaders()
        });
        if (subtitles.length >= 6) break;
      }
    }
  } catch (e) { /* captions optional */ }

  var out = [];
  for (var s = 0; s < streams.length; s++) {
    var st = streams[s];
    if (!st.url || st.vipLocked) continue;
    var res = Number(st.resolutions) || 0;
    var quality = res ? res + "p" : "Auto";
    out.push({
      name: "XTD • " + label,
      title: "XTD • " + label + " • " + quality + " • " + formatBytes(st.size) + " MP4",
      url: withRelay(st.url),
      quality: quality,
      size: formatBytes(st.size),
      language: version.lanCode || undefined,
      provider: "xtd",
      headers: streamHeaders(),
      subtitles: subtitles
    });
  }
  // highest quality first within this version
  out.sort(function (a, b) {
    var pa = parseInt(a.quality, 10) || 0, pb = parseInt(b.quality, 10) || 0;
    return pb - pa;
  });
  return out;
}

// ─── Audio versions (dubs & hardsubs) ─────────────────────────────
// The /detail endpoint carries the full version list: original + dubs
// (type 0) + hardsub versions (type 1), each with its own subjectId/detailPath.
async function getSubjectVersions(subject) {
  var versions = [];
  try {
    var detail = await apiGet("/wefeed-h5api-bff/detail?detailPath=" + encodeURIComponent(subject.detailPath), "ar");
    var dubs = (detail && detail.subject && detail.subject.dubs) || [];
    for (var i = 0; i < dubs.length; i++) {
      var d = dubs[i];
      if (!d || !d.subjectId || !d.detailPath) continue;
      if (d.type !== 0 && d.type !== 1) continue;
      versions.push({
        subjectId: d.subjectId,
        detailPath: d.detailPath,
        lanName: d.lanName || d.lanCode || "Unknown",
        lanCode: d.lanCode || "",
        original: !!d.original,
        type: d.type
      });
    }
  } catch (e) { /* fall back to original-only below */ }

  // ensure the matched subject itself is present
  var hasSelf = false;
  for (var j = 0; j < versions.length; j++) {
    if (versions[j].subjectId === subject.subjectId && versions[j].detailPath === subject.detailPath) hasSelf = true;
  }
  if (!hasSelf) {
    versions.unshift({
      subjectId: subject.subjectId,
      detailPath: subject.detailPath,
      lanName: "Original",
      lanCode: "",
      original: true,
      type: 0
    });
  }

  // dedupe
  var seen = {};
  versions = versions.filter(function (v) {
    var k = v.subjectId + "|" + v.detailPath;
    if (seen[k]) return false;
    seen[k] = true;
    return true;
  });

  // order: Arabic dub → Arabic sub (hardsub) → Original → other dubs → other subs
  function score(v) {
    var lan = (v.lanCode || "").toLowerCase();
    var nm = (v.lanName || "").toLowerCase();
    var isAr = lan === "ar" || nm.indexOf("arabic") !== -1 || (v.lanName || "").indexOf("عرب") !== -1;
    if (isAr && v.type === 0) return 0;
    if (isAr && v.type === 1) return 1;
    if (v.original) return 2;
    return 3 + (v.type === 1 ? 1000 : 0);
  }
  versions.sort(function (a, b) {
    var sa = score(a), sb = score(b);
    if (sa !== sb) return sa - sb;
    return String(a.lanName).localeCompare(String(b.lanName));
  });
  return versions;
}

// run async mapper with limited concurrency (avoid API burst)
async function mapLimit(items, limit, fn) {
  var out = new Array(items.length);
  var idx = 0;
  async function worker() {
    while (idx < items.length) {
      var my = idx++;
      out[my] = await fn(items[my], my);
    }
  }
  var workers = [];
  for (var w = 0; w < Math.min(limit, items.length); w++) workers.push(worker());
  await Promise.all(workers);
  return out;
}

// ─── Main entry ───────────────────────────────────────────────────────
async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  try {
    if (mediaType === undefined) mediaType = "movie";
    seasonNum = Number(seasonNum) || 0;
    episodeNum = Number(episodeNum) || 0;

    var meta = null;
    var id = String(tmdbId || "");

    if (id.indexOf("tt") === 0) {
      // IMDb id → resolve via TMDB find
      var resolved = await tmdbFromImdb(id, mediaType);
      if (resolved) {
        meta = await getTMDBDetails(resolved, mediaType);
      }
    } else {
      meta = await getTMDBDetails(id, mediaType);
    }

    if (!meta || !meta.title) return [];

    // search catalog
    var subject = await findSubject(meta.title, meta.arTitle, meta.year, mediaType);

    // last resort: query by IMDb id string
    if (!subject && meta.imdbId) {
      imdbFallbackTitle = meta.imdbId;
      subject = await findSubject(meta.imdbId, null, meta.year, mediaType);
      imdbFallbackTitle = null;
    }

    if (!subject) {
      console.log("[XTD] no catalog match for:", meta.title);
      return [];
    }

    var isTv = mediaType === "tv" && seasonNum > 0;
    var se = isTv ? seasonNum : 0;
    var ep = isTv ? episodeNum : 0;

    // ALL audio versions (original + dubs + hardsubs), Arabic-first ordering
    var versions = await getSubjectVersions(subject);

    var grouped = await mapLimit(versions, 4, function (v) {
      return extractStreams(v, se, ep).catch(function (e) {
        console.log("[XTD] version failed:", v.lanName, e && e.message);
        return [];
      });
    });

    var results = [];
    for (var g = 0; g < grouped.length; g++) {
      results = results.concat(grouped[g]);
    }

    console.log("[XTD] returning", results.length, "streams for", meta.title);
    return results;
  } catch (error) {
    console.error("[XTD] fatal:", error && error.message);
    return [];
  }
}

// ─── Settings UI ──────────────────────────────────────────────────────
function onSettings() {
  return Promise.resolve([
    { type: "header", label: "XTD Configuration" },
    {
      type: "toggle",
      key: "useRelay",
      label: "Use CDN relay",
      description: "Enable only if streams fail to open directly (routes via xt-cdn-relay.fly.dev which impersonates Chrome TLS)."
    },
    {
      type: "text",
      key: "relayUrl",
      label: "Relay URL",
      placeholder: DEFAULT_RELAY,
      description: "Custom relay base URL (GET /proxy?url=...&ref=...). Leave default unless you host your own."
    }
  ]);
}

module.exports = { getStreams: getStreams, onSettings: onSettings };
