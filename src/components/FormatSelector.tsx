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
    <div className="animate-slide-up space-y-5">
      <Tabs value={mode} onValueChange={onModeChange} className="w-full">
        <TabsList className="w-full bg-secondary border border-border h-12">
          <TabsTrigger
            value="video"
            className="flex-1 font-display data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground gap-2"
          >
            <Video className="w-4 h-4" /> Video
          </TabsTrigger>
          <TabsTrigger
            value="audio"
            className="flex-1 font-display data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground gap-2"
          >
            <Music className="w-4 h-4" /> MP3 Only
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === "video" && (
        <button
          onClick={() => onIncludeAudioChange(!includeAudio)}
          className="flex items-center gap-3 w-full p-3 rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition-colors font-body text-sm"
        >
          {includeAudio ? (
            <Volume2 className="w-5 h-5 text-primary" />
          ) : (
            <VolumeX className="w-5 h-5 text-muted-foreground" />
          )}
          <span className="text-foreground">
            {includeAudio ? "With audio" : "Video only (no audio)"}
          </span>
          <div
            className={`ml-auto w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${
              includeAudio ? "gradient-primary" : "bg-muted"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-foreground transition-transform ${
                includeAudio ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </div>
        </button>
      )}

      <div>
        <h4 className="font-display text-sm font-medium text-muted-foreground mb-3">
          {mode === "audio" ? "Audio Quality" : "Video Quality"}
        </h4>
        <RadioGroup value={quality} onValueChange={onQualityChange} className="space-y-2">
          {qualities.map((q) => (
            <Label
              key={q.value}
              htmlFor={q.value}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                quality === q.value
                  ? "border-primary bg-primary/10 shadow-glow"
                  : "border-border bg-secondary/30 hover:bg-secondary/60"
              }`}
            >
              <RadioGroupItem value={q.value} id={q.value} className="border-muted-foreground data-[state=checked]:border-primary data-[state=checked]:text-primary" />
              <span className="font-display font-semibold text-foreground text-sm">{q.label}</span>
              <span className="text-muted-foreground text-xs font-body ml-auto">{q.desc}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
};

export default FormatSelector;
