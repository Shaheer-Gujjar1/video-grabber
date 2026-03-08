import { Progress } from "@/components/ui/progress";
import { Download, CheckCircle2, XCircle, FolderOpen, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DownloadItem {
  id: string;
  title: string;
  percent: number;
  speed: string;
  status: 'downloading' | 'completed' | 'error';
  path: string;
  url: string;
  thumbnail?: string;
  error?: string;
}

interface DownloadsListProps {
  downloads: DownloadItem[];
  onDelete: (id: string) => void;
  onRedownload: (url: string) => void;
}

const DownloadsList = ({ downloads, onDelete, onRedownload }: DownloadsListProps) => {
  const handleOpenFolder = (path: string) => {
    // @ts-ignore
    if (window.pywebview && window.pywebview.api) {
      // @ts-ignore
      window.pywebview.api.open_file_location(path);
    }
  };

  if (downloads.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-in fade-in zoom-in duration-500">
      <Download className="w-12 h-12 mb-4 opacity-20" />
      <p className="text-sm">Your download history is empty</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="grid grid-cols-1 gap-4">
        {downloads.map((dl) => (
          <div key={dl.id} className="p-5 rounded-[2rem] glass-card hover:bg-white/10 transition-all duration-500 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="flex items-start gap-6 relative z-10">
              {dl.thumbnail ? (
                <div className="shrink-0 w-32 h-20 rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-2xl relative group-hover:scale-105 transition-transform duration-500">
                  <img 
                    src={dl.thumbnail} 
                    alt="" 
                    className="w-full h-full object-cover absolute inset-0" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://www.youtube.com/favicon.ico';
                    }}
                  />
                  {dl.status === 'downloading' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="shrink-0 w-32 h-20 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                  <Download className="w-8 h-8 text-white/10" />
                </div>
              )}
              <div className="flex-1 min-w-0 pt-1">
                <h3 className="text-lg font-display font-bold text-white truncate leading-tight tracking-tight">{dl.title}</h3>
                <div className="flex items-center gap-3 mt-2">
                  {dl.status === 'downloading' ? (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{dl.speed}</span>
                    </div>
                  ) : dl.status === 'completed' ? (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Saved</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20">
                      <XCircle className="w-3.5 h-3.5 text-destructive" />
                      <span className="text-[10px] font-bold text-destructive uppercase tracking-widest">Failed</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-1">
                {dl.status === 'completed' && (
                  <Button
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleOpenFolder(dl.path)}
                    className="h-10 w-10 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary transition-all duration-300"
                    title="Reveal File"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </Button>
                )}
                
                {dl.status !== 'downloading' && (
                   <Button
                    variant="ghost" 
                    size="icon"
                    onClick={() => onRedownload(dl.url)}
                    className="h-10 w-10 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary transition-all duration-300"
                    title="Acquire Again"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                )}

                <Button
                  variant="ghost" 
                  size="icon"
                  onClick={() => onDelete(dl.id)}
                  className="h-10 w-10 rounded-xl bg-white/5 hover:bg-destructive/20 hover:text-destructive transition-all duration-300"
                  title="Expunge Record"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {dl.status === 'downloading' && (
              <div className="mt-6 space-y-2 relative z-10">
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div 
                        className="h-full premium-gradient transition-all duration-500 ease-out relative"
                        style={{ width: `${dl.percent}%` }}
                    >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">{dl.speed}</span>
                  <span className="text-xs font-mono text-primary font-bold">{Math.round(dl.percent)}%</span>
                </div>
              </div>
            )}
            
            {dl.error && <p className="text-xs text-destructive font-medium mt-3 px-1">{dl.error}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DownloadsList;
