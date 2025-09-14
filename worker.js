export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ✅ Serve live playlist
    if (url.pathname.endsWith("/stream.m3u8")) {
      const segmentDuration = 10;
      const now = Math.floor(Date.now() / 1000);
      const seq = Math.floor(now / segmentDuration);

      let playlist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:${segmentDuration}
#EXT-X-MEDIA-SEQUENCE:${seq}
`;

      // Generate next 5 segments
      for (let i = 0; i < 5; i++) {
        playlist += `#EXTINF:${segmentDuration},\n/segment/${seq + i}.mp3\n`;
      }

      return new Response(playlist, {
        headers: { "Content-Type": "application/vnd.apple.mpegurl" }
      });
    }

    // ✅ Serve "fake live" segments using song.mp3
    if (url.pathname.startsWith("/segment/")) {
      // Instead of slicing, just return the MP3 (demo mode)
      const assetUrl = new URL("/song.mp3", request.url).toString();

      console.log("Serving segment from:", assetUrl);

      const res = await fetch(assetUrl);
      if (!res.ok) {
        return new Response("Audio not found", { status: 404 });
      }

      return new Response(res.body, {
        headers: { "Content-Type": "audio/mpeg" }
      });
    }

    // ✅ Fallback: serve static assets
    return env.ASSETS.fetch(request);
  }
};
