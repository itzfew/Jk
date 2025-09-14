export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ✅ Serve playlist
    if (url.pathname.endsWith(".m3u8")) {
      const segmentDuration = 10; // seconds per segment
      const now = Math.floor(Date.now() / 1000);
      const seq = Math.floor(now / segmentDuration);

      let playlist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:${segmentDuration}
#EXT-X-MEDIA-SEQUENCE:${seq}
`;

      // Generate next 5 segments
      for (let i = 0; i < 5; i++) {
        playlist += `#EXTINF:${segmentDuration},\n/segment/${seq + i}.ts\n`;
      }

      return new Response(playlist, {
        headers: { "Content-Type": "application/vnd.apple.mpegurl" }
      });
    }

    // ✅ Serve segments
    if (url.pathname.startsWith("/segment/")) {
      const segmentDuration = 10;
      const segmentId = parseInt(url.pathname.split("/").pop().replace(".ts", ""));
      const startTime = segmentId * segmentDuration;

      // Your GitHub raw audio file
      const audioUrl = "https://raw.githubusercontent.com/<username>/<repo>/main/audio/song.mp3";

      // Fetch audio file from GitHub
      const res = await fetch(audioUrl);
      const audioBuffer = await res.arrayBuffer();

      // ⚠️ Simplified: Here we return full MP3 always.
      // For real slicing: needs ffmpeg (can’t run inside Workers).
      // But players will still “play” continuously if segmentId changes.

      return new Response(audioBuffer, {
        headers: { "Content-Type": "video/mp2t" } // HLS expects .ts
      });
    }

    return new Response("Not found", { status: 404 });
  }
};
