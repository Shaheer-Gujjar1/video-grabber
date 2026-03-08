import { Play } from "lucide-react";

interface VideoPreviewProps {
  videoId: string;
  title: string;
  duration: string;
  channel: string;
}

const VideoPreview = ({ videoId, title, duration, channel }: VideoPreviewProps) => (
  <div className="animate-in fade-in zoom-in duration-500 rounded-2xl overflow-hidden glass-card">
    <div className="relative group">
      <img
        src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
        alt={title}
        className="w-full aspect-video object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }}
      />
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
        <div className="w-16 h-16 rounded-full premium-gradient flex items-center justify-center premium-glow scale-90 group-hover:scale-100 transition-transform duration-300">
          <Play className="w-7 h-7 fill-white text-white ml-1" />
        </div>
      </div>
      <span className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-mono tracking-widest px-2 py-1 rounded-lg border border-white/10 uppercase">
        {duration}
      </span>
    </div>
    <div className="p-5">
      <h3 className="font-display font-bold text-white line-clamp-2 text-base leading-tight">{title}</h3>
      <p className="text-muted-foreground text-xs mt-2 font-medium tracking-tight flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-primary/40" /> {channel}
      </p>
    </div>
  </div>
);

export default VideoPreview;
