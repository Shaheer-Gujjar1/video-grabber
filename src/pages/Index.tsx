import { useState, useCallback } from "react";
import { Download, Link2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VideoPreview from "@/components/VideoPreview";
import FormatSelector from "@/components/FormatSelector";
import { toast } from "sonner";

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

const Index = () => {
  const [url, setUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("video");
  const [quality, setQuality] = useState("1080");
  const [includeAudio, setIncludeAudio] = useState(true);

  const handleFetch = useCallback(() => {
    const id = extractVideoId(url.trim());
    if (!id) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }
    setLoading(true);
    // Simulate fetching video info
    setTimeout(() => {
      setVideoId(id);
      setLoading(false);
    }, 800);
  }, [url]);

  const handleDownload = () => {
    const fmt = mode === "audio" ? "mp3" : "mp4";
    const q = mode === "audio" ? `${quality}kbps` : `${quality}p`;
    const audio = mode === "video" ? (includeAudio ? " with audio" : " no audio") : "";
    toast.success(`Starting download: ${fmt.toUpperCase()} ${q}${audio}`, {
      description: "Backend API integration required for actual downloads.",
    });
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
      {videoId && (
        <div className="max-w-2xl mx-auto px-4 pb-20 space-y-6">
          <VideoPreview
            videoId={videoId}
            title="YouTube Video"
            duration="--:--"
            channel="Channel Name"
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
            className="w-full h-14 gradient-primary text-primary-foreground font-display font-bold text-lg hover:opacity-90 transition-opacity shadow-glow animate-pulse-glow"
          >
            <Download className="w-5 h-5 mr-2" />
            Download {mode === "audio" ? "MP3" : "MP4"}
          </Button>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50 border border-border text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              This is a UI demo. Connect a backend API (e.g., yt-dlp) to enable actual downloads.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
