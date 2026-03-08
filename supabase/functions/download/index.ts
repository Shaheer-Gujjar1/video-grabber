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

// Generate random visitor data (mimics what YouTube sets as __Secure-YEC cookie)
function generateVisitorData(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Try multiple client types to get streaming data
async function getPlayerResponse(videoId: string) {
  const clients = [
    {
      name: "IOS",
      body: {
        videoId,
        context: {
          client: {
            clientName: "IOS",
            clientVersion: "19.45.4",
            deviceMake: "Apple",
            deviceModel: "iPhone16,2",
            hl: "en",
            gl: "US",
            utcOffsetMinutes: 0,
          },
        },
        playbackContext: {
          contentPlaybackContext: {
            html5Preference: "HTML5_PREF_WANTS",
            signatureTimestamp: 20073,
          },
        },
        contentCheckOk: true,
        racyCheckOk: true,
      },
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)",
        "X-Youtube-Client-Name": "5",
        "X-Youtube-Client-Version": "19.45.4",
      },
    },
    {
      name: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
      body: {
        videoId,
        context: {
          client: {
            clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
            clientVersion: "2.0",
            hl: "en",
            gl: "US",
            utcOffsetMinutes: 0,
          },
          thirdParty: {
            embedUrl: "https://www.youtube.com",
          },
        },
        playbackContext: {
          contentPlaybackContext: {
            html5Preference: "HTML5_PREF_WANTS",
            signatureTimestamp: 20073,
          },
        },
        contentCheckOk: true,
        racyCheckOk: true,
      },
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
        "X-Youtube-Client-Name": "85",
        "X-Youtube-Client-Version": "2.0",
      },
    },
  ];

  const visitorData = generateVisitorData();

  for (const client of clients) {
    try {
      console.log(`Trying client: ${client.name}`);

      // Add visitor data to context
      (client.body.context.client as any).visitorData = visitorData;

      const apiUrl = `https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false`;

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          ...client.headers,
          "X-Goog-Visitor-Id": visitorData,
        },
        body: JSON.stringify(client.body),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`${client.name} failed: ${res.status} - ${text.substring(0, 200)}`);
        continue;
      }

      const data = await res.json();

      if (data.playabilityStatus?.status === "OK" && data.streamingData) {
        console.log(`${client.name} succeeded!`);
        return data;
      }

      console.log(`${client.name}: status=${data.playabilityStatus?.status}, reason=${data.playabilityStatus?.reason || "none"}`);
    } catch (err) {
      console.error(`${client.name} error:`, err.message);
    }
  }

  throw new Error("All client attempts failed. The video may be restricted.");
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

    const vd = playerResponse.videoDetails || {};
    const videoDetails = {
      title: vd.title || "YouTube Video",
      channel: vd.author || "Unknown",
      duration: vd.lengthSeconds || "0",
      thumbnail: vd.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || "",
    };

    const streamingData = playerResponse.streamingData;
    const muxedFormats = streamingData.formats || [];
    const adaptiveFormats = streamingData.adaptiveFormats || [];

    console.log(`${muxedFormats.length} muxed + ${adaptiveFormats.length} adaptive formats`);

    let selectedFormat: any = null;

    if (mode === "audio") {
      const audioFormats = adaptiveFormats
        .filter((f: any) => f.mimeType?.startsWith("audio/") && f.url)
        .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

      const targetBitrate = (parseInt(quality) || 320) * 1000;
      selectedFormat = audioFormats.find((f: any) => (f.bitrate || 0) <= targetBitrate) || audioFormats[0];
    } else {
      if (includeAudio) {
        const videoFormats = muxedFormats
          .filter((f: any) => f.mimeType?.startsWith("video/") && f.url)
          .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));

        const targetHeight = parseInt(quality) || 1080;
        selectedFormat = videoFormats.find((f: any) => (f.height || 0) <= targetHeight) || videoFormats[0];
      } else {
        const videoFormats = adaptiveFormats
          .filter((f: any) => f.mimeType?.startsWith("video/") && f.url)
          .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));

        const targetHeight = parseInt(quality) || 1080;
        selectedFormat = videoFormats.find((f: any) => (f.height || 0) <= targetHeight) || videoFormats[0];
      }
    }

    if (!selectedFormat || !selectedFormat.url) {
      return new Response(
        JSON.stringify({ error: "No downloadable format found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const container = selectedFormat.mimeType?.split("/")[1]?.split(";")[0] || "mp4";
    const qualityLabel = selectedFormat.qualityLabel || `${Math.round((selectedFormat.bitrate || 0) / 1000)}kbps`;

    console.log("Selected:", { quality: qualityLabel, mime: selectedFormat.mimeType });

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
