import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function extractVideoId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

// Use YouTube's internal Innertube API (player endpoint)
async function getPlayerResponse(videoId: string) {
  const apiUrl = "https://www.youtube.com/youtubei/v1/player";

  // Use the ANDROID client - it returns direct URLs without cipher
  // and is less likely to trigger bot detection
  const body = {
    videoId,
    context: {
      client: {
        clientName: "ANDROID",
        clientVersion: "19.09.37",
        androidSdkVersion: 30,
        hl: "en",
        gl: "US",
        utcOffsetMinutes: 0,
      },
    },
    playbackContext: {
      contentPlaybackContext: {
        html5Preference: "HTML5_PREF_WANTS",
      },
    },
    contentCheckOk: true,
    racyCheckOk: true,
  };

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
      "X-Youtube-Client-Name": "3",
      "X-Youtube-Client-Version": "19.09.37",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("YouTube API error:", res.status, text.substring(0, 500));
    throw new Error(`YouTube API returned ${res.status}`);
  }

  return await res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, mode, quality, includeAudio } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "Invalid YouTube URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing video:", videoId);

    const playerResponse = await getPlayerResponse(videoId);

    // Check playability
    const playability = playerResponse.playabilityStatus;
    if (playability?.status !== "OK") {
      const reason = playability?.reason || playability?.messages?.[0] || "Video is not available";
      console.error("Playability error:", reason);
      return new Response(
        JSON.stringify({ error: reason }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract video details
    const vd = playerResponse.videoDetails || {};
    const videoDetails = {
      title: vd.title || "YouTube Video",
      channel: vd.author || "Unknown",
      duration: vd.lengthSeconds || "0",
      thumbnail: vd.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || "",
    };

    const streamingData = playerResponse.streamingData;
    if (!streamingData) {
      return new Response(
        JSON.stringify({ error: "No streaming data available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const muxedFormats = streamingData.formats || [];
    const adaptiveFormats = streamingData.adaptiveFormats || [];

    console.log(`Found ${muxedFormats.length} muxed + ${adaptiveFormats.length} adaptive formats`);

    let selectedFormat: any = null;

    if (mode === "audio") {
      const audioFormats = adaptiveFormats
        .filter((f: any) => f.mimeType?.startsWith("audio/"))
        .filter((f: any) => f.url) // Only formats with direct URLs
        .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

      const targetBitrate = (parseInt(quality) || 320) * 1000;
      selectedFormat = audioFormats.find((f: any) => (f.bitrate || 0) <= targetBitrate) || audioFormats[0];
    } else {
      if (includeAudio) {
        // Muxed formats (video+audio), typically up to 720p
        const videoFormats = muxedFormats
          .filter((f: any) => f.mimeType?.startsWith("video/") && f.url)
          .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));

        const targetHeight = parseInt(quality) || 1080;
        selectedFormat = videoFormats.find((f: any) => (f.height || 0) <= targetHeight) || videoFormats[0];
      } else {
        // Video-only adaptive formats (up to 4K)
        const videoFormats = adaptiveFormats
          .filter((f: any) => f.mimeType?.startsWith("video/") && f.url)
          .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));

        const targetHeight = parseInt(quality) || 1080;
        selectedFormat = videoFormats.find((f: any) => (f.height || 0) <= targetHeight) || videoFormats[0];
      }
    }

    if (!selectedFormat || !selectedFormat.url) {
      return new Response(
        JSON.stringify({ error: "No downloadable format found. The video may be protected." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const container = selectedFormat.mimeType?.split("/")[1]?.split(";")[0] || "mp4";
    const qualityLabel = selectedFormat.qualityLabel || `${Math.round((selectedFormat.bitrate || 0) / 1000)}kbps`;

    console.log("Selected:", { quality: qualityLabel, mime: selectedFormat.mimeType, height: selectedFormat.height });

    return new Response(
      JSON.stringify({
        status: "redirect",
        url: selectedFormat.url,
        format: {
          quality: qualityLabel,
          container,
          hasAudio: mode === "audio" || !!selectedFormat.audioQuality,
          hasVideo: selectedFormat.mimeType?.startsWith("video/") || false,
          contentLength: selectedFormat.contentLength,
        },
        videoDetails,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process video" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
