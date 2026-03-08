import { Progress } from "@/components/ui/progress";
import { Download, CheckCircle2, XCircle, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

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

interface DownloadsListProps {
  downloads: DownloadItem[];
}

const DownloadsList = ({ downloads }: DownloadsListProps) => {
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
    <div className="space-y-4 animate-slide-up">
      <div className="space-y-3">
        {downloads.map((dl) => (
          <div key={dl.id} className="p-4 rounded-lg border border-border bg-secondary/30 space-y-3 hover:bg-secondary/50 transition-colors group">
            <div className="flex items-start gap-4">
              {dl.thumbnail && (
                <div className="shrink-0 w-24 h-16 rounded overflow-hidden bg-background border border-border/50 shadow-sm relative">
                  <img src={dl.thumbnail} alt="" className="w-full h-full object-cover absolute inset-0" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-foreground truncate pr-8">{dl.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  {dl.status === 'downloading' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      Downloading • {dl.speed}
                    </>
                  ) : dl.status === 'completed' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      Completed
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-destructive" />
                      Error
                    </>
                  )}
                </p>
              </div>
              
              {dl.status === 'completed' && (
                <Button
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleOpenFolder(dl.path)}
                  className="shrink-0 h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Open in Folder"
                >
                  <FolderOpen className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            {dl.status === 'downloading' && (
              <div className="space-y-1.5">
                <Progress value={dl.percent} className="h-1.5 bg-background" />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{dl.speed}</span>
                  <span className="text-[10px] font-mono text-primary font-bold">{Math.round(dl.percent)}%</span>
                </div>
              </div>
            )}
            
            {dl.error && <p className="text-xs text-destructive">{dl.error}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DownloadsList;
