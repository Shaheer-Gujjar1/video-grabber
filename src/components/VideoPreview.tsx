import { Play } from "lucide-react";

interface VideoPreviewProps {
  videoId: string;
  title: string;
  duration: string;
  channel: string;
}

const VideoPreview = ({ videoId, title, duration, channel }: VideoPreviewProps) => (
  <div className="animate-slide-up rounded-lg overflow-hidden border border-border shadow-card">
    <div className="relative group">
      <img
        src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
        alt={title}
        className="w-full aspect-video object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }}
      />
      <div className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center shadow-glow">
          <Play className="w-7 h-7 fill-primary-foreground text-primary-foreground ml-1" />
        </div>
      </div>
      <span className="absolute bottom-2 right-2 bg-background/80 text-foreground text-xs font-body px-2 py-0.5 rounded">
        {duration}
      </span>
    </div>
    <div className="p-4 gradient-card">
      <h3 className="font-display font-semibold text-foreground line-clamp-2 text-sm">{title}</h3>
      <p className="text-muted-foreground text-xs mt-1 font-body">{channel}</p>
    </div>
  </div>
);

export default VideoPreview;
