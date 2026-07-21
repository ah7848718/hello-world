import { useMemo, useRef, useState, useEffect } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

type Provider = "youtube" | "bunny" | "vdocipher" | null;

function extractBunnyId(value: string | null): string | null {
  if (!value) return null;
  const playMatch = value.match(/player\.mediadelivery\.net\/play\/([\w-]+\/[\w-]+)/);
  if (playMatch) return playMatch[1];
  const embedMatch = value.match(/iframe\.mediadelivery\.net\/embed\/([\w-]+\/[\w-]+)/);
  if (embedMatch) return embedMatch[1];
  return value;
}

function buildEmbedUrl(provider: Provider, videoId: string | null, videoUrl: string | null): string | null {
  if (provider === "youtube") {
    const id = videoId || extractYouTubeId(videoUrl);
    if (!id) return null;
    return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;
  }
  if (provider === "bunny" && videoId) {
    const id = extractBunnyId(videoId);
    if (!id) return null;
    return `https://iframe.mediadelivery.net/embed/${id}`;
  }
  if (provider === "vdocipher" && videoId) {
    return `https://player.vdocipher.com/v2/?video=${videoId}`;
  }
  return videoUrl || null;
}

function extractYouTubeId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function isVideoFileUrl(url: string) {
  return /\.(mp4|webm|mov|avi|mkv|ogg)(\?|#|$)/i.test(url);
}

export function VideoPlayer({
  provider,
  videoId,
  videoUrl,
  title,
  watermark,
}: {
  provider: Provider;
  videoId: string | null;
  videoUrl: string | null;
  title?: string;
  watermark?: string | null;
}) {
  const src = useMemo(() => buildEmbedUrl(provider, videoId, videoUrl), [provider, videoId, videoUrl]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFs = async () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  };

  if (!src) {
    return (
      <div className="aspect-video grid place-items-center bg-muted text-muted-foreground rounded-lg border border-dashed">
        لا يوجد فيديو متاح
      </div>
    );
  }

  const isDirectVideo = !provider && isVideoFileUrl(src);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-lg bg-black shadow-lg ${isFs ? "h-screen" : "aspect-video"}`}
    >
      {isDirectVideo ? (
        <video
          src={src}
          controls
          className="absolute inset-0 w-full h-full"
          playsInline
        />
      ) : (
        <iframe
          src={src}
          title={title || "محاضرة"}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
      {watermark && <Watermark text={watermark} />}

      <button
        type="button"
        onClick={toggleFs}
        className="absolute bottom-3 end-3 z-20 inline-flex items-center justify-center h-9 w-9 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-sm transition-colors"
        title={isFs ? "خروج من ملء الشاشة" : "ملء الشاشة"}
      >
        {isFs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

function Watermark({ text }: { text: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden select-none">
      {/* Tiled faint background — covers the whole frame, hard to crop out */}
      <div className="absolute inset-0 opacity-[0.10] text-white text-[12px] font-mono">
        <div className="grid grid-cols-3 gap-y-16 gap-x-6 p-6 rotate-[-18deg] scale-125">
          {Array.from({ length: 30 }).map((_, i) => (
            <span key={i} className="whitespace-nowrap">{text}</span>
          ))}
        </div>
      </div>

      {/* Drifting label 1 */}
      <span
        className="absolute text-white/60 text-sm md:text-base font-bold whitespace-nowrap drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
        style={{ animation: "wm-drift-1 23s linear infinite" }}
      >
        {text}
      </span>
      {/* Drifting label 2 */}
      <span
        className="absolute text-white/55 text-sm md:text-base font-bold whitespace-nowrap drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
        style={{ animation: "wm-drift-2 31s linear infinite" }}
      >
        {text}
      </span>
      {/* Drifting label 3 */}
      <span
        className="absolute text-white/50 text-sm md:text-base font-bold whitespace-nowrap drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
        style={{ animation: "wm-drift-3 19s linear infinite" }}
      >
        {text}
      </span>

      <style>{`
        @keyframes wm-drift-1 {
          0%   { top: 8%;  left: -25%; }
          50%  { top: 70%; left: 75%;  }
          100% { top: 8%;  left: -25%; }
        }
        @keyframes wm-drift-2 {
          0%   { top: 80%; left: 90%; }
          50%  { top: 20%; left: -15%; }
          100% { top: 80%; left: 90%; }
        }
        @keyframes wm-drift-3 {
          0%   { top: 45%; left: 50%; }
          25%  { top: 15%; left: 20%; }
          50%  { top: 60%; left: 85%; }
          75%  { top: 85%; left: 10%; }
          100% { top: 45%; left: 50%; }
        }
      `}</style>
    </div>
  );
}

