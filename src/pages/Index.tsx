import { useState, useCallback } from "react";
import { Download, Link2, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import VideoPreview from "@/components/VideoPreview";
import FormatSelector from "@/components/FormatSelector";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

interface VideoInfo {
  id: string;
  title: string;
  channel: string;
  duration: string;
}

const Index = () => {
  const [url, setUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string>("");
  const [mode, setMode] = useState("video");
  const [quality, setQuality] = useState("1080");
  const [includeAudio, setIncludeAudio] = useState(true);

  const handleFetch = useCallback(async () => {
    const id = extractVideoId(url.trim());
    if (!id) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }
    setLoading(true);
    try {
      // Use noembed to get video info (free, no API key needed)
      const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`);
      const data = await res.json();
      setVideoInfo({
        id,
        title: data.title || "YouTube Video",
        channel: data.author_name || "Unknown Channel",
        duration: "--:--",
      });
    } catch {
      setVideoInfo({
        id,
        title: "YouTube Video",
        channel: "Unknown Channel",
        duration: "--:--",
      });
    }
    setLoading(false);
  }, [url]);

  const handleDownload = async () => {
    if (!videoInfo) return;

    setDownloading(true);
    setDownloadStatus("Requesting download...");

    try {
      const { data, error } = await supabase.functions.invoke("download", {
        body: {
          url: url.trim(),
          mode,
          quality,
          includeAudio,
        },
      });

      if (error) {
        throw new Error(error.message || "Download request failed");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Handle different Cobalt response statuses
      if (data.status === "tunnel" || data.status === "redirect") {
        setDownloadStatus("Starting download...");
        // Open download URL
        const downloadUrl = data.url;
        if (downloadUrl) {
          // Create a temporary link to trigger download
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = "";
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast.success("Download started!", {
            description: `${videoInfo.title}`,
          });
        }
      } else if (data.status === "picker") {
        // Multiple options available (e.g., different audio/video streams)
        // Use the first one
        const firstOption = data.picker?.[0];
        if (firstOption?.url) {
          const a = document.createElement("a");
          a.href = firstOption.url;
          a.download = "";
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast.success("Download started!", {
            description: `${videoInfo.title}`,
          });
        }
      } else {
        throw new Error("Unexpected response from download service");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Download failed";
      toast.error("Download failed", { description: message });
    } finally {
      setDownloading(false);
      setDownloadStatus("");
    }
  };

  const handleModeChange = (m: string) => {
    setMode(m);
    setQuality(m === "audio" ? "320" : "1080");
  };

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(0_85%_55%/0.08),transparent_60%)]" />
        <div className="relative max-w-2xl mx-auto px-4 pt-20 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-secondary/50 text-xs text-muted-foreground font-body mb-6">
            <Download className="w-3 h-3" /> Free YouTube Downloader
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground tracking-tight leading-tight">
            Download YouTube
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-[hsl(350_90%_45%)]">
              Videos & Audio
            </span>
          </h1>
          <p className="mt-4 text-muted-foreground max-w-md mx-auto text-sm">
            Paste any YouTube link, choose your format and quality, then download instantly.
          </p>

          {/* URL Input */}
          <div className="mt-8 flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                placeholder="Paste YouTube URL here..."
                className="pl-10 h-12 bg-secondary border-border font-body text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
              />
            </div>
            <Button
              onClick={handleFetch}
              disabled={loading || !url.trim()}
              className="h-12 px-6 gradient-primary text-primary-foreground font-display font-semibold hover:opacity-90 transition-opacity shadow-glow"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Fetch"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {videoInfo && (
        <div className="max-w-2xl mx-auto px-4 pb-20 space-y-6">
          <VideoPreview
            videoId={videoInfo.id}
            title={videoInfo.title}
            duration={videoInfo.duration}
            channel={videoInfo.channel}
          />

          <FormatSelector
            mode={mode}
            onModeChange={handleModeChange}
            quality={quality}
            onQualityChange={setQuality}
            includeAudio={includeAudio}
            onIncludeAudioChange={setIncludeAudio}
          />

          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full h-14 gradient-primary text-primary-foreground font-display font-bold text-lg hover:opacity-90 transition-opacity shadow-glow"
          >
            {downloading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {downloadStatus || "Processing..."}
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Download {mode === "audio" ? "MP3" : "MP4"}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Index;
