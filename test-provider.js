// Test harness: simulates Nuvio's JS runtime (fetch + atob only, CommonJS require)
// Run: node /home/z/my-project/xtd-plugin/test-provider.js

const path = require("path");

// Nuvio polyfills atob — provide same for node (node 16+ has atob globally, fine)
if (typeof globalThis.atob === "undefined") {
  globalThis.atob = (s) => Buffer.from(s, "base64").toString("binary");
}

const provider = require(path.join(__dirname, "providers", "xtd.js"));

const TESTS = [
  { label: "MOVIE: Inception (tmdb 27205)", id: "27205", type: "movie" },
  { label: "MOVIE: El Hareefa 2 (tmdb 1292292?)", id: "search-hareefa", type: "movie" },
  { label: "TV: La Casa de Papel S1E1 (tmdb 71446)", id: "71446", type: "tv", s: 1, e: 1 },
];

(async () => {
  // resolve El Hareefa 2 tmdb id via TMDB search
  try {
    const r = await fetch("https://api.themoviedb.org/3/search/movie?api_key=439c478a771f35c05022f9feabcca01c&query=" + encodeURIComponent("El Hareefa 2: El Remontada"));
    const d = await r.json();
    if (d.results && d.results.length) TESTS[1].id = String(d.results[0].id);
  } catch (e) { console.log("TMDB search failed, skipping hareefa test"); TESTS[1].id = ""; }

  for (const t of TESTS) {
    if (!t.id) { console.log("\n=== " + t.label + " : SKIPPED"); continue; }
    console.log("\n=== " + t.label + " ===");
    const t0 = Date.now();
    const streams = await provider.getStreams(t.id, t.type, t.s, t.e);
    console.log("time:", ((Date.now() - t0) / 1000).toFixed(1) + "s | streams:", streams.length);
    for (const s of streams.slice(0, 5)) {
      console.log("  •", s.name, "|", s.quality, "|", s.size, "| subs:", s.subtitles.length, "| lang:", s.language || "-");
      console.log("     url:", s.url.slice(0, 85) + "...");
      console.log("     title:", s.title);
    }
    if (streams.length && streams[0].subtitles.length) {
      console.log("  SUBS:", streams[0].subtitles.map(x => x.name).join(", "));
      // validate first subtitle URL returns 200
      try {
        const sr = await fetch(streams[0].subtitles[0].url, { headers: { Referer: "https://videodownloader.site/" } });
        const body = await sr.text();
        console.log("  SUB CHECK:", sr.status, "| bytes:", body.length, "| sample:", JSON.stringify(body.slice(0, 40)));
      } catch (e) { console.log("  SUB CHECK FAILED:", e.message); }
    }
    // validate first stream URL (range request)
    if (streams.length) {
      try {
        const vr = await fetch(streams[0].url, { headers: { ...streams[0].headers, Range: "bytes=0-999" } });
        console.log("  VIDEO CHECK:", vr.status, "| type:", vr.headers.get("content-type"));
      } catch (e) { console.log("  VIDEO CHECK FAILED:", e.message); }
    }
  }
  console.log("\nDONE");
})().catch(e => { console.error("HARNESS ERROR:", e); process.exit(1); });
