import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    // Use youtubei.js (Innertube API) - better at avoiding bot detection
    const { Innertube } = await import("npm:youtubei.js@^12");

    const yt = await Innertube.create({
      retrieve_player: true,
      generate_session_locally: true,
    });

    // Extract video ID from URL
    const videoIdMatch = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    );
    if (!videoIdMatch) {
      return new Response(
        JSON.stringify({ error: "Invalid YouTube URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const videoId = videoIdMatch[1];
    console.log("Fetching video:", videoId);

    const info = await yt.getBasicInfo(videoId);

    const videoDetails = {
      title: info.basic_info.title || "YouTube Video",
      channel: info.basic_info.author || "Unknown",
      duration: info.basic_info.duration || 0,
      thumbnail: info.basic_info.thumbnail?.[0]?.url || "",
    };

    // Get streaming data
    const streamingData = info.streaming_data;
    if (!streamingData) {
      return new Response(
        JSON.stringify({ error: "No streaming data available for this video" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Combine all available formats
    const allFormats = [
      ...(streamingData.formats || []),
      ...(streamingData.adaptive_formats || []),
    ];

    console.log("Available formats:", allFormats.length);

    let selectedFormat: any = null;

    if (mode === "audio") {
      // Filter audio-only formats
      const audioFormats = allFormats
        .filter((f: any) => f.mime_type?.startsWith("audio/"))
        .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

      const targetBitrate = (parseInt(quality) || 320) * 1000;
      selectedFormat = audioFormats.find((f: any) => (f.bitrate || 0) <= targetBitrate) || audioFormats[0];
    } else {
      if (includeAudio) {
        // Formats with both video + audio (muxed)
        const muxedFormats = allFormats
          .filter((f: any) => f.mime_type?.startsWith("video/") && f.has_audio)
          .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));

        const targetHeight = parseInt(quality) || 1080;
        selectedFormat = muxedFormats.find((f: any) => (f.height || 0) <= targetHeight) || muxedFormats[0];
      } else {
        // Video-only formats
        const videoFormats = allFormats
          .filter((f: any) => f.mime_type?.startsWith("video/") && !f.has_audio)
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

    // Get the download URL - decipher if needed
    let downloadUrl = selectedFormat.decipher?.(yt.session.player);
    if (!downloadUrl) {
      downloadUrl = selectedFormat.url;
    }

    if (!downloadUrl) {
      return new Response(
        JSON.stringify({ error: "Could not extract download URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Selected:", {
      quality: selectedFormat.quality_label || `${Math.round((selectedFormat.bitrate || 0) / 1000)}kbps`,
      mime: selectedFormat.mime_type,
      height: selectedFormat.height,
    });

    return new Response(
      JSON.stringify({
        status: "redirect",
        url: downloadUrl,
        format: {
          quality: selectedFormat.quality_label || `${Math.round((selectedFormat.bitrate || 0) / 1000)}kbps`,
          container: selectedFormat.mime_type?.split("/")[1]?.split(";")[0] || "mp4",
          hasAudio: !!selectedFormat.has_audio || mode === "audio",
          hasVideo: selectedFormat.mime_type?.startsWith("video/") || false,
          contentLength: selectedFormat.content_length,
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
