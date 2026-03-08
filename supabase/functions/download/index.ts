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

    // Build Cobalt API request
    // Cobalt API v7: https://github.com/imputnet/cobalt
    const cobaltBody: Record<string, unknown> = {
      url,
      filenameStyle: "pretty",
    };

    if (mode === "audio") {
      cobaltBody.downloadMode = "audio";
      cobaltBody.audioFormat = "mp3";
      // Cobalt uses audioBitrate as a string like "320", "256", etc.
      cobaltBody.audioBitrate = quality || "320";
    } else {
      cobaltBody.downloadMode = includeAudio ? "auto" : "mute";
      // Cobalt uses videoQuality as a string like "2160", "1080", etc.
      cobaltBody.videoQuality = quality || "1080";
    }

    console.log("Cobalt request:", JSON.stringify(cobaltBody));

    const cobaltResponse = await fetch("https://api.cobalt.tools", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cobaltBody),
    });

    const cobaltData = await cobaltResponse.json();
    console.log("Cobalt response:", JSON.stringify(cobaltData));

    // Cobalt returns { status: "tunnel"/"redirect"/"picker"/"error", url?, picker?, error? }
    if (cobaltData.status === "error") {
      return new Response(
        JSON.stringify({ error: cobaltData.error?.code || "Download failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(cobaltData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
