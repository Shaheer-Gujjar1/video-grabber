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

    // Use ytdl-core to get video info and download URLs
    const ytdlModule = await import("npm:@distube/ytdl-core@4");
    const ytdl = ytdlModule.default || ytdlModule;

    const validateURL = ytdl.validateURL || ytdlModule.validateURL;
    const filterFormats = ytdl.filterFormats || ytdlModule.filterFormats;
    const getInfo = ytdl.getInfo || ytdlModule.getInfo;

    if (validateURL && !validateURL(url)) {
      return new Response(
        JSON.stringify({ error: "Invalid YouTube URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const info = await getInfo(url);
    
    // Get video details
    const videoDetails = {
      title: info.videoDetails.title,
      channel: info.videoDetails.author.name,
      duration: info.videoDetails.lengthSeconds,
      thumbnail: info.videoDetails.thumbnails?.[info.videoDetails.thumbnails.length - 1]?.url || "",
    };

    let selectedFormat;

    if (mode === "audio") {
      // Find best audio format matching requested bitrate
      const audioFormats = filterFormats(info.formats, "audioonly");
      // Sort by bitrate descending
      audioFormats.sort((a: any, b: any) => (b.audioBitrate || 0) - (a.audioBitrate || 0));
      
      const targetBitrate = parseInt(quality) || 320;
      selectedFormat = audioFormats.find((f: any) => (f.audioBitrate || 0) <= targetBitrate) || audioFormats[0];
    } else {
      // Video mode
      if (includeAudio) {
        // Get formats with both video and audio
        const videoFormats = ytdl.filterFormats(info.formats, "videoandaudio");
        videoFormats.sort((a: any, b: any) => (b.height || 0) - (a.height || 0));
        
        const targetHeight = parseInt(quality) || 1080;
        selectedFormat = videoFormats.find((f: any) => (f.height || 0) <= targetHeight) || videoFormats[0];
      } else {
        // Video only (no audio)
        const videoFormats = ytdl.filterFormats(info.formats, "videoonly");
        videoFormats.sort((a: any, b: any) => (b.height || 0) - (a.height || 0));
        
        const targetHeight = parseInt(quality) || 1080;
        selectedFormat = videoFormats.find((f: any) => (f.height || 0) <= targetHeight) || videoFormats[0];
      }
    }

    if (!selectedFormat || !selectedFormat.url) {
      return new Response(
        JSON.stringify({ error: "No suitable format found for the requested quality" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Selected format:", {
      quality: selectedFormat.qualityLabel || selectedFormat.audioBitrate,
      container: selectedFormat.container,
      hasAudio: selectedFormat.hasAudio,
      hasVideo: selectedFormat.hasVideo,
    });

    return new Response(
      JSON.stringify({
        status: "redirect",
        url: selectedFormat.url,
        format: {
          quality: selectedFormat.qualityLabel || `${selectedFormat.audioBitrate}kbps`,
          container: selectedFormat.container,
          hasAudio: selectedFormat.hasAudio,
          hasVideo: selectedFormat.hasVideo,
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
