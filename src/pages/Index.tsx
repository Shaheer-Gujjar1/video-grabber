import { useState, useCallback, useEffect } from "react";
import { Download, Link2, Loader2, AlertCircle, CheckCircle2, ChevronDown, Settings, FolderOpen, History, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import VideoPreview from "@/components/VideoPreview";
import FormatSelector from "@/components/FormatSelector";
import DownloadsList from "@/components/DownloadsList";
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

interface VideoInfo {
  id: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
}

interface DownloadItem {
  id: string;
  title: string;
  percent: number;
  speed: string;
  status: 'downloading' | 'completed' | 'error';
  path: string;
  thumbnail?: string;
  error?: string;
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
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [defaultPath, setDefaultPath] = useState<string>("");
  const [activeTab, setActiveTab] = useState("search");

  useEffect(() => {
    // @ts-ignore
    window.onDownloadProgress = (id: string, percent: number, speed: string, eta: number) => {
      setDownloads(prev => {
        const updated = prev.map(dl => 
          dl.id === id 
            ? { ...dl, percent, speed, status: (percent === 100 ? 'completed' : 'downloading') as 'completed' | 'downloading' } 
            : dl
        );
        if (percent === 100) {
          // @ts-ignore
          if (window.pywebview && window.pywebview.api) window.pywebview.api.save_history(updated);
        }
        return updated;
      });
    };

    const loadData = async () => {
      // @ts-ignore
      if (window.pywebview && window.pywebview.api) {
        // @ts-ignore
        const path = await window.pywebview.api.get_default_path();
        setDefaultPath(path);
        
        // Load history
        // @ts-ignore
        const history: DownloadItem[] = await window.pywebview.api.get_history();
        if (history && Array.isArray(history)) {
          // Mark interrupted downloads as error
          const cleanedHistory = history.map(h => 
            h.status === 'downloading' ? { ...h, status: 'error', error: 'Interrupted' } : h
          );
          setDownloads(cleanedHistory as DownloadItem[]);
        }
      }
    };
    loadData();
  }, []);

  const handleFetch = useCallback(async () => {
    const id = extractVideoId(url.trim());
    if (!id) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`);
      const data = await res.json();
      setVideoInfo({
        id,
        title: data.title || "YouTube Video",
        channel: data.author_name || "Unknown Channel",
        duration: "--:--",
        thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      });
    } catch {
      setVideoInfo({
        id,
        title: "YouTube Video",
        channel: "Unknown Channel",
        duration: "--:--",
        thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      });
    }
    setLoading(false);
  }, [url]);

  const handleSetPath = async () => {
    // @ts-ignore
    if (window.pywebview && window.pywebview.api) {
      // @ts-ignore
      const path = await window.pywebview.api.set_default_path();
      if (path) {
        setDefaultPath(path);
        toast.success("Download path updated");
      }
    }
  };

  const handleDownload = async () => {
    if (!videoInfo) return;

    setDownloading(true);
    setDownloadStatus("Starting...");

    try {
      // @ts-ignore
      if (!window.pywebview || !window.pywebview.api) {
        throw new Error("PyWebView API not found. Please run within app.py context.");
      }
      
      // @ts-ignore
      const result = await window.pywebview.api.download_video(
        url.trim(),
        mode,
        quality,
        includeAudio
      );

      if (result.error) {
        throw new Error(result.error);
      }

      const newDownload: DownloadItem = {
        id: result.id,
        title: videoInfo.title,
        percent: 0,
        speed: "0 MB/s",
        status: 'downloading',
        path: result.path,
        thumbnail: videoInfo.thumbnail,
      };
      setDownloads(prev => {
        const updated = [newDownload, ...prev];
        // @ts-ignore
        if (window.pywebview && window.pywebview.api) window.pywebview.api.save_history(updated);
        return updated;
      });
      toast.success("Download started!", { description: videoInfo.title });
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Download failed";
      toast.error("Download Error", { description: message });
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
    <div className="min-h-screen bg-background font-body pb-10">
      {/* Header with Navigation */}
      <div className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">VideoGrabber</span>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="search" className="gap-2">
                <Search className="w-4 h-4" /> <span className="hidden sm:inline">Download</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" /> <span className="hidden sm:inline">History</span>
                {downloads.filter(d => d.status === 'downloading').length > 0 && (
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse ml-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="w-4 h-4" /> <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 pt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* SEARCH TAB */}
          <TabsContent value="search" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
              <h1 className="font-display text-4xl font-bold tracking-tight">Ready to download?</h1>
              <p className="text-muted-foreground">Paste a YouTube link below to get started.</p>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                  placeholder="Paste YouTube URL here..."
                  className="pl-10 h-12 bg-secondary border-border focus-visible:ring-primary"
                />
              </div>
              <Button
                onClick={handleFetch}
                disabled={loading || !url.trim()}
                className="h-12 px-6 gradient-primary shadow-glow font-bold"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Fetch"}
              </Button>
            </div>

            {videoInfo && (
              <div className="space-y-6 animate-in zoom-in-95 duration-300">
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
                  className="w-full h-14 gradient-primary text-primary-foreground font-display font-bold text-lg hover:opacity-90 shadow-glow"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {downloadStatus}
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Download Now
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-display font-bold">Download History</h2>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                  {downloads.length} items
                </span>
              </div>
              <DownloadsList downloads={downloads} />
            </div>
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-border bg-card/50">
              <CardHeader>
                <CardTitle>Global Settings</CardTitle>
                <CardDescription>Configure your app preferences and download behavior.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Download Location</label>
                  <div className="flex gap-2">
                    <Input 
                      readOnly 
                      value={defaultPath || "Not set..."} 
                      className="bg-secondary/50 font-mono text-xs"
                    />
                    <Button variant="secondary" onClick={handleSetPath} className="gap-2">
                      <FolderOpen className="w-4 h-4" /> Change
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    All downloads will be saved to this folder automatically.
                  </p>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">About</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    VideoGrabber v1.0.0 (Desktop Edition)<br />
                    Powered by PyWebView and yt-dlp.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
