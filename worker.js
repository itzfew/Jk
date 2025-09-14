export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Log incoming request
    console.log(`Received request for: ${url.pathname}`);

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

        console.log(`Serving HLS playlist with sequence ${seq}`);
        return new Response(playlist, {
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Cache-Control": "no-cache",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (error) {
        console.error(`Error generating playlist: ${error.message}`);
        return new Response("Error generating playlist", { status: 500 });
      }
    }

    // Serve segments (.ts)
    if (url.pathname.startsWith("/segment/")) {
      try {
        const segmentDuration = 10;
        const segmentId = parseInt(url.pathname.split("/").pop().replace(".ts", ""));
        const startTime = segmentId * segmentDuration;

        // URL of audio file in public/
        const audioUrl = new URL("/song.mp3", request.url).toString();

        // Fetch audio file from static assets
        const res = await fetch(audioUrl);
        if (!res.ok) {
          console.error(`Failed to fetch audio file: ${res.status}`);
          return new Response("Audio file not found", { status: 404 });
        }

        const audioBuffer = await res.arrayBuffer();
        console.log(`Serving segment ${segmentId} for time ${startTime}s`);

        // Note: This is still a simplified approach, serving the full MP3
        // For true HLS segment slicing, external processing (e.g., FFmpeg) is needed
        return new Response(audioBuffer, {
          headers: {
            "Content-Type": "video/mp2t",
            "Cache-Control": "public, max-age=10",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (error) {
        console.error(`Error serving segment: ${error.message}`);
        return new Response("Error serving segment", { status: 500 });
      }
    }

    console.warn(`Resource not found: ${url.pathname}`);
    return new Response("Not found", { status: 404 });
  }
};
