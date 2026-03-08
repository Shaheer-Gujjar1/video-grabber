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

function extractVideoId(url: string | undefined | null): string | null {
  if (!url) return null;
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
  url: string; // Add url for redownload
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

    // @ts-ignore
    if (window.pywebview && window.pywebview.api) {
      loadData();
    } else {
      window.addEventListener('pywebviewready', loadData);
    }
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
        url: url.trim(),
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

  const handleDeleteDownload = (id: string) => {
    setDownloads(prev => {
      const updated = prev.filter(dl => dl.id !== id);
      // @ts-ignore
      if (window.pywebview && window.pywebview.api) window.pywebview.api.save_history(updated);
      return updated;
    });
    toast.success("Download removed from history");
  };

  const handleRedownload = async (downloadUrl: string | undefined) => {
    if (!downloadUrl) {
      toast.error("Original URL not found in history");
      return;
    }
    setUrl(downloadUrl);
    setActiveTab("search");
    
    // Auto-fetch logic
    setTimeout(async () => {
      const id = extractVideoId(downloadUrl);
      if (!id) return;
      
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
        
        // Autonomously start fetch (the above setVideoInfo is the result of fetch)
        // No need to click fetch, we just did it.
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
    }, 100);
  };

  const handleModeChange = (m: string) => {
    setMode(m);
    setQuality(m === "audio" ? "320" : "1080");
  };

  return (
    <div className="min-h-screen bg-[#020205] text-foreground font-body pb-20 overflow-x-hidden relative">
      {/* Background Decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-float opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/10 blur-[120px] rounded-full animate-float opacity-30" style={{ animationDelay: '-5s' }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none mix-blend-overlay" />
      </div>

      {/* Floating Navbar */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl z-50">
        <div className="glass-navbar rounded-[2rem] px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-auto flex items-center justify-center hover:scale-110 transition-transform duration-500 cursor-default">
              <img src="Lumen-Lab-Logo-BG-Removed.png" alt="Lumen Lab Logo" className="h-full object-contain" />
            </div>
            <div className="hidden lg:block h-4 w-px bg-white/10" />
            <div className="hidden lg:block text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">
              Premium Video Suite
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList className="bg-white/5 border border-white/5 p-1 rounded-2xl">
              <TabsTrigger value="search" className="gap-2 rounded-xl h-10 px-5 data-[state=active]:premium-gradient data-[state=active]:text-white data-[state=active]:premium-glow transition-all duration-500">
                <Search className="w-4 h-4" /> <span className="hidden sm:inline font-bold">Download</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2 rounded-xl h-10 px-5 data-[state=active]:premium-gradient data-[state=active]:text-white data-[state=active]:premium-glow transition-all duration-500">
                <History className="w-4 h-4" /> <span className="hidden sm:inline font-bold">History</span>
                {downloads.filter(d => d.status === 'downloading').length > 0 && (
                  <span className="flex h-1.5 w-1.5 rounded-full bg-white animate-pulse ml-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2 rounded-xl h-10 px-5 data-[state=active]:premium-gradient data-[state=active]:text-white data-[state=active]:premium-glow transition-all duration-500">
                <Settings className="w-4 h-4" /> <span className="hidden sm:inline font-bold">Settings</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 pt-40 relative z-10">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* SEARCH TAB */}
          <TabsContent value="search" className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center space-y-4 max-w-xl mx-auto">
              <h1 className="font-display text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/40">
                Lumen Lab <br /> Video Grabber
              </h1>
              <p className="text-muted-foreground text-lg font-medium leading-relaxed opacity-70">
                Experience high-fidelity downloads with unparalleled speed and precision.
              </p>
            </div>

            <div className="flex gap-3 max-w-2xl mx-auto">
              <div className="relative flex-1 group">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                  placeholder="Paste YouTube Link..."
                  className="pl-12 h-16 bg-white/5 border-white/5 focus-visible:ring-primary/40 backdrop-blur-xl rounded-2xl text-lg font-medium transition-all"
                />
              </div>
              <Button
                onClick={handleFetch}
                disabled={loading || !url.trim()}
                className="h-16 px-10 premium-gradient premium-glow font-bold rounded-2xl text-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Fetch"}
              </Button>
            </div>

            {videoInfo && (
              <div className="max-w-2xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
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
                  className="w-full h-16 premium-gradient text-white font-display font-bold text-xl hover:scale-[1.01] active:scale-[0.99] transition-all rounded-2xl premium-glow"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                      {downloadStatus}
                    </>
                  ) : (
                    <>
                      <Download className="w-6 h-6 mr-3" />
                      Begin Acquisition
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="space-y-8 max-w-3xl mx-auto">
              <div className="flex items-end justify-between px-2">
                <div>
                  <h2 className="text-4xl font-display font-bold text-white">History</h2>
                  <p className="text-muted-foreground text-sm font-medium mt-1">Your recent media collections</p>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-4 py-2 rounded-xl border border-primary/20">
                  {downloads.length} Assets
                </div>
              </div>
              <DownloadsList 
                downloads={downloads} 
                onDelete={handleDeleteDownload}
                onRedownload={handleRedownload}
              />
            </div>
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="max-w-2xl mx-auto">
              <div className="glass-card rounded-[2.5rem] p-10 space-y-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                    <Settings className="w-40 h-40 text-white rotate-12" />
                </div>
                
                <div>
                    <h2 className="text-3xl font-display font-bold text-white mb-2">Preferences</h2>
                    <p className="text-muted-foreground font-medium">Configure your premium download engine.</p>
                </div>

                <div className="space-y-6 relative z-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-primary" />
                        <label className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Export Destination</label>
                    </div>
                    <div className="flex gap-3">
                      <Input 
                        readOnly 
                        value={defaultPath || "Awaiting path selection..."} 
                        className="bg-white/5 border-white/5 font-mono text-xs h-14 rounded-2xl px-5"
                      />
                      <Button variant="secondary" onClick={handleSetPath} className="h-14 px-8 rounded-2xl gap-3 font-bold hover:bg-white/10 transition-colors">
                        Change
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium italic opacity-60 ml-1">
                      System-wide default for all media acquisition tasks.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
