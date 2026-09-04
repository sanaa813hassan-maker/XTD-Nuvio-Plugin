// Test harness: simulates Nuvio's JS runtime (fetch + atob only, CommonJS require)
// Run: node /home/z/my-project/xtd-plugin/test-provider.js

const path = require("path");

// Nuvio polyfills atob — provide same for node (node 16+ has atob globally, fine)
if (typeof globalThis.atob === "undefined") {
  globalThis.atob = (s) => Buffer.from(s, "base64").toString("binary");
}

const provider = require(path.join(__dirname, "providers", "xtd.js"));

const TESTS = [
  { label: "MOVIE multi-dub: Kung Fu Panda 4", query: "Kung Fu Panda 4", type: "movie" },
  { label: "MOVIE: Inception", query: "Inception", type: "movie", fixedId: "27205" },
  { label: "TV: Money Heist S1E1", query: "", type: "tv", fixedId: "71446", s: 1, e: 1 },
];

(async () => {
  for (const t of TESTS) {
    let id = t.fixedId;
    if (!id) {
      try {
        const r = await fetch("https://api.themoviedb.org/3/search/" + t.type + "?api_key=439c478a771f35c05022f9feabcca01c&query=" + encodeURIComponent(t.query));
        const d = await r.json();
        if (d.results && d.results.length) id = String(d.results[0].id);
      } catch (e) {}
    }
    if (!id) { console.log("\n=== " + t.label + " : no TMDB id, SKIPPED"); continue; }

    console.log("\n=== " + t.label + " (tmdb " + id + ") ===");
    const t0 = Date.now();
    const streams = await provider.getStreams(id, t.type, t.s, t.e);
    console.log("time:", ((Date.now() - t0) / 1000).toFixed(1) + "s | streams:", streams.length);
    for (const s of streams.slice(0, 20)) {
      console.log("  •", s.name, "|", s.quality, "|", s.size, "| lang:", s.language || "-");
    }
    if (streams.length > 20) console.log("  ... and", streams.length - 20, "more");
    if (streams.length && streams[0].subtitles.length) {
      console.log("  SUBS on first stream:", streams[0].subtitles.map(x => x.name).join(", "));
    }
    // validate the first Arabic-labeled stream if any, else first stream
    const pick = streams.find(s => s.language === "ar") || streams[0];
    if (pick) {
      try {
        const vr = await fetch(pick.url, { headers: { ...pick.headers, Range: "bytes=0-999" } });
        console.log("  VIDEO CHECK [" + pick.name + "]:", vr.status, "|", vr.headers.get("content-type"));
      } catch (e) { console.log("  VIDEO CHECK FAILED:", e.message); }
    }
  }
  console.log("\nDONE");
})().catch(e => { console.error("HARNESS ERROR:", e); process.exit(1); });
