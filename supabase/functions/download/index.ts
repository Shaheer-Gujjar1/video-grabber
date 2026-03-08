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

async function getVideoInfo(videoId: string) {
  // Fetch the YouTube watch page
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(watchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch YouTube page: ${res.status}`);
  }

  const html = await res.text();

  // Extract ytInitialPlayerResponse
  const playerMatch = html.match(/var ytInitialPlayerResponse\s*=\s*({.+?})\s*;/s);
  if (!playerMatch) {
    throw new Error("Could not extract player response from YouTube page");
  }

  let playerResponse;
  try {
    playerResponse = JSON.parse(playerMatch[1]);
  } catch {
    throw new Error("Failed to parse player response JSON");
  }

  return playerResponse;
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

    const playerResponse = await getVideoInfo(videoId);

    // Extract video details
    const videoDetails = {
      title: playerResponse.videoDetails?.title || "YouTube Video",
      channel: playerResponse.videoDetails?.author || "Unknown",
      duration: playerResponse.videoDetails?.lengthSeconds || "0",
      thumbnail: playerResponse.videoDetails?.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || "",
    };

    // Check playability
    const playability = playerResponse.playabilityStatus;
    if (playability?.status !== "OK") {
      return new Response(
        JSON.stringify({ error: playability?.reason || "Video is not available" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const streamingData = playerResponse.streamingData;
    if (!streamingData) {
      return new Response(
        JSON.stringify({ error: "No streaming data available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Combine muxed formats (video+audio) and adaptive formats (separate streams)
    const muxedFormats = streamingData.formats || [];
    const adaptiveFormats = streamingData.adaptiveFormats || [];
    const allFormats = [...muxedFormats, ...adaptiveFormats];

    console.log(`Found ${muxedFormats.length} muxed + ${adaptiveFormats.length} adaptive formats`);

    let selectedFormat: any = null;

    if (mode === "audio") {
      // Audio-only from adaptive formats
      const audioFormats = adaptiveFormats
        .filter((f: any) => f.mimeType?.startsWith("audio/"))
        .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

      const targetBitrate = (parseInt(quality) || 320) * 1000;
      selectedFormat = audioFormats.find((f: any) => (f.bitrate || 0) <= targetBitrate) || audioFormats[0];
    } else {
      if (includeAudio) {
        // Use muxed formats (have both video + audio, max 720p typically)
        const videoFormats = muxedFormats
          .filter((f: any) => f.mimeType?.startsWith("video/"))
          .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));

        const targetHeight = parseInt(quality) || 1080;
        selectedFormat = videoFormats.find((f: any) => (f.height || 0) <= targetHeight) || videoFormats[0];
      } else {
        // Video-only from adaptive formats
        const videoFormats = adaptiveFormats
          .filter((f: any) => f.mimeType?.startsWith("video/"))
          .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));

        const targetHeight = parseInt(quality) || 1080;
        selectedFormat = videoFormats.find((f: any) => (f.height || 0) <= targetHeight) || videoFormats[0];
      }
    }

    if (!selectedFormat) {
      return new Response(
        JSON.stringify({ error: "No suitable format found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get download URL
    const downloadUrl = selectedFormat.url;

    if (!downloadUrl) {
      // Format requires signature deciphering (cipher/signatureCipher)
      // This happens with some videos - need to decode the cipher
      const cipher = selectedFormat.signatureCipher || selectedFormat.cipher;
      if (cipher) {
        return new Response(
          JSON.stringify({
            error: "This video requires signature deciphering which is not supported yet. Try a different video or lower quality.",
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Could not extract download URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const container = selectedFormat.mimeType?.split("/")[1]?.split(";")[0] || "mp4";
    const qualityLabel = selectedFormat.qualityLabel || `${Math.round((selectedFormat.bitrate || 0) / 1000)}kbps`;

    console.log("Selected:", { quality: qualityLabel, mime: selectedFormat.mimeType, height: selectedFormat.height });

    return new Response(
      JSON.stringify({
        status: "redirect",
        url: downloadUrl,
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
