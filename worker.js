export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ✅ Serve dynamic playlist
    if (url.pathname.endsWith(".m3u8")) {
      const segmentDuration = 10; // seconds per segment
      const now = Math.floor(Date.now() / 1000);
      const seq = Math.floor(now / segmentDuration);

      let playlist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:${segmentDuration}
#EXT-X-MEDIA-SEQUENCE:${seq}
`;

      // Generate next 5 "fake" segments
      for (let i = 0; i < 5; i++) {
        playlist += `#EXTINF:${segmentDuration},\n/segment/${seq + i}.ts\n`;
      }

      return new Response(playlist, {
        headers: { "Content-Type": "application/vnd.apple.mpegurl" }
      });
    }

    // ✅ Serve segments (using your audio in /public)
    if (url.pathname.startsWith("/segment/")) {
      const segmentDuration = 10;
      const segmentId = parseInt(url.pathname.split("/").pop().replace(".ts", ""));
      const startTime = segmentId * segmentDuration;

      // URL of your audio file in `public/`
      const audioUrl = new URL("/song.mp3", request.url).toString();

      // Fetch audio file from static assets
      const res = await fetch(audioUrl);
      const audioBuffer = await res.arrayBuffer();

      // ⚠️ Simplified: always serves full MP3
      // (true slicing needs ffmpeg, can’t run inside Workers)
      // HLS player will still “feel” like live radio
      return new Response(audioBuffer, {
        headers: { "Content-Type": "video/mp2t" }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};
