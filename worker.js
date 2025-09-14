export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    console.log(`[INFO] Processing request for: ${url.pathname}`);

    // Serve HLS playlist (.m3u8)
    if (url.pathname.endsWith(".m3u8")) {
      try {
        const segmentDuration = 10; // seconds per segment
        const now = Math.floor(Date.now() / 1000);
        const seq = Math.floor(now / segmentDuration);

        let playlist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:${segmentDuration}
#EXT-X-MEDIA-SEQUENCE:${seq}
#EXT-X-PROGRAM-DATE-TIME:${new Date().toISOString()}
`;

        // Generate next 5 segments
        for (let i = 0; i < 5; i++) {
          playlist += `#EXTINF:${segmentDuration.toFixed(1)},\n/segment/${seq + i}.ts\n`;
        }

        console.log(`[INFO] Serving HLS playlist with sequence ${seq}`);
        return new Response(playlist, {
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Cache-Control": "no-cache",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD",
            "Access-Control-Allow-Headers": "Range"
          }
        });
      } catch (error) {
        console.error(`[ERROR] Failed to generate playlist: ${error.message}`);
        return new Response("Error generating playlist", { status: 500 });
      }
    }

    // Serve segments (.ts)
    if (url.pathname.startsWith("/segment/")) {
      try {
        const segmentDuration = 10;
        const segmentId = parseInt(url.pathname.split("/").pop().replace(".ts", ""));
        const startTime = segmentId * segmentDuration;

        // Attempt to fetch audio file using env.ASSETS
        let res;
        const assetUrl = new URL("/song.mp3", "http://localhost");
        console.log(`[INFO] Attempting to fetch audio file from ASSETS binding: ${assetUrl.pathname}`);

        try {
          res = await env.ASSETS.fetch(assetUrl);
          console.log(`[INFO] Successfully fetched audio file from ASSETS binding`);
        } catch (assetError) {
          console.warn(`[WARN] Failed to fetch from ASSETS: ${assetError.message}. Falling back to direct fetch.`);
          // Fallback to direct fetch since /song.mp3 works directly
          const directUrl = new URL("/song.mp3", request.url).toString();
          console.log(`[INFO] Attempting direct fetch from: ${directUrl}`);
          res = await fetch(directUrl, { cf: { cacheEverything: true } });
        }

        if (!res.ok) {
          console.error(`[ERROR] Failed to fetch audio file: ${res.status} ${res.statusText}`);
          return new Response(`Audio file not found`, { status: 404 });
        }

        const audioBuffer = await res.arrayBuffer();
        console.log(`[INFO] Serving segment ${segmentId} for time ${startTime}s`);

        // Note: Serving full MP3 as a segment (simplified approach)
        return new Response(audioBuffer, {
          headers: {
            "Content-Type": "video/mp2t",
            "Cache-Control": "public, max-age=10",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD",
            "Access-Control-Allow-Headers": "Range"
          }
        });
      } catch (error) {
        console.error(`[ERROR] Failed to serve segment: ${error.message}`);
        return new Response("Error serving segment", { status: 500 });
      }
    }

    // Serve static assets directly (e.g., song.mp3 for debugging)
    if (url.pathname === "/song.mp3") {
      try {
        const assetUrl = new URL("/song.mp3", "http://localhost");
        console.log(`[INFO] Serving static asset from ASSETS binding: ${assetUrl.pathname}`);
        const res = await env.ASSETS.fetch(assetUrl);
        if (!res.ok) {
          console.error(`[ERROR] Failed to fetch static asset: ${res.status} ${res.statusText}`);
          return new Response("Static asset not found", { status: 404 });
        }
        const audioBuffer = await res.arrayBuffer();
        return new Response(audioBuffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (error) {
        console.error(`[ERROR] Failed to serve static asset: ${error.message}`);
        return new Response("Error serving static asset", { status: 500 });
      }
    }

    console.warn(`[WARN] Resource not found: ${url.pathname}`);
    return new Response("Not found", { status: 404 });
  }
};
