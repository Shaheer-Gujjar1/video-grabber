import { Video, Music, Volume2, VolumeX } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface FormatSelectorProps {
  mode: string;
  onModeChange: (mode: string) => void;
  quality: string;
  onQualityChange: (q: string) => void;
  includeAudio: boolean;
  onIncludeAudioChange: (v: boolean) => void;
}

const videoQualities = [
  { value: "2160", label: "4K", desc: "2160p • Best quality" },
  { value: "1080", label: "1080p", desc: "Full HD" },
  { value: "720", label: "720p", desc: "HD" },
  { value: "480", label: "480p", desc: "Standard" },
  { value: "360", label: "360p", desc: "Low" },
];

const audioQualities = [
  { value: "320", label: "320 kbps", desc: "Best quality" },
  { value: "256", label: "256 kbps", desc: "High quality" },
  { value: "192", label: "192 kbps", desc: "Good quality" },
  { value: "128", label: "128 kbps", desc: "Standard" },
  { value: "64", label: "64 kbps", desc: "Low" },
];

const FormatSelector = ({
  mode,
  onModeChange,
  quality,
  onQualityChange,
  includeAudio,
  onIncludeAudioChange,
}: FormatSelectorProps) => {
  const qualities = mode === "audio" ? audioQualities : videoQualities;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <Tabs value={mode} onValueChange={onModeChange} className="w-full">
        <TabsList className="w-full bg-black/20 border border-white/5 h-14 p-1 rounded-2xl">
          <TabsTrigger
            value="video"
            className="flex-1 font-display rounded-xl data-[state=active]:premium-gradient data-[state=active]:text-white data-[state=active]:premium-glow gap-2 transition-all duration-300"
          >
            <Video className="w-4 h-4" /> Video
          </TabsTrigger>
          <TabsTrigger
            value="audio"
            className="flex-1 font-display rounded-xl data-[state=active]:premium-gradient data-[state=active]:text-white data-[state=active]:premium-glow gap-2 transition-all duration-300"
          >
            <Music className="w-4 h-4" /> MP3 Only
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === "video" && (
        <button
          onClick={() => onIncludeAudioChange(!includeAudio)}
          className="flex items-center gap-4 w-full p-4 rounded-2xl glass-card hover:bg-white/10 transition-all duration-300 group"
        >
          <div className={`p-2 rounded-xl transition-colors ${includeAudio ? "bg-primary/20" : "bg-white/5"}`}>
            {includeAudio ? (
              <Volume2 className="w-5 h-5 text-primary" />
            ) : (
              <VolumeX className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-white">Audio Settings</div>
            <div className="text-xs text-muted-foreground">
              {includeAudio ? "Including original audio track" : "Downloading video stream only"}
            </div>
          </div>
          <div
            className={`ml-auto w-12 h-6 rounded-full transition-all duration-500 flex items-center px-1 border border-white/10 ${
              includeAudio ? "premium-gradient" : "bg-white/5"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow-lg transition-transform duration-500 ease-out ${
                includeAudio ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </div>
        </button>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="w-1 h-3 rounded-full bg-primary" />
          <h4 className="font-display text-sm font-bold text-white uppercase tracking-widest">
            {mode === "audio" ? "Audio Resolution" : "Video Resolution"}
          </h4>
        </div>
        <RadioGroup value={quality} onValueChange={onQualityChange} className="grid grid-cols-1 gap-3">
          {qualities.map((q) => (
            <Label
              key={q.value}
              htmlFor={q.value}
              className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300 border ${
                quality === q.value
                  ? "border-primary/50 bg-primary/10 premium-glow"
                  : "border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10"
              }`}
            >
              <RadioGroupItem 
                value={q.value} 
                id={q.value} 
                className="border-white/20 data-[state=checked]:border-primary data-[state=checked]:text-primary" 
              />
              <div className="flex flex-col">
                <span className="font-display font-bold text-white text-base">{q.label}</span>
                <span className="text-muted-foreground text-[10px] uppercase tracking-tighter">{q.desc}</span>
              </div>
              <div className="ml-auto">
                <div className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    quality === q.value ? "bg-primary/20 border-primary/20 text-primary" : "bg-white/5 border-white/5 text-muted-foreground"
                }`}>
                  {q.value === "2160" ? "ULTRA HD" : q.value === "1080" ? "FULL HD" : "STANDARD"}
                </div>
              </div>
            </Label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
};

export default FormatSelector;
