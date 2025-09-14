export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Serve playlist
    if (url.pathname.endsWith("/stream.m3u8")) {
      const segmentDuration = 10;
      const now = Math.floor(Date.now() / 1000);
      const seq = Math.floor(now / segmentDuration);

      let playlist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:${segmentDuration}
#EXT-X-MEDIA-SEQUENCE:${seq}
`;

      for (let i = 0; i < 5; i++) {
        playlist += `#EXTINF:${segmentDuration},\n/segment/${seq + i}.mp3\n`;
      }

      return new Response(playlist, {
        headers: { "Content-Type": "application/vnd.apple.mpegurl" }
      });
    }

    // Serve segments
    if (url.pathname.startsWith("/segment/")) {
      // Fetch audio from assets binding
      try {
        const assetResponse = await env.ASSETS.fetch(new Request("/song.mp3"));
        return new Response(assetResponse.body, {
          headers: { "Content-Type": "audio/mpeg" }
        });
      } catch (err) {
        console.error("Failed to fetch audio from assets:", err);
        return new Response("Audio not found", { status: 404 });
      }
    }

    // Fallback: serve static assets
    try {
      return await env.ASSETS.fetch(request);
    } catch (err) {
      console.error("Asset fetch failed:", err);
      return new Response("Not found", { status: 404 });
    }
  }
};
