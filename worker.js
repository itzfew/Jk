export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Serve live playlist
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

    // Serve segments by returning the audio file from site
    if (url.pathname.startsWith("/segment/")) {
      // All segments point to the same MP3 for now
      return await env.__STATIC_CONTENT.fetch(new Request("/song.mp3"));
    }

    // Fallback: serve static site files
    return await env.__STATIC_CONTENT.fetch(request);
  }
};
