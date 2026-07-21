import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Trash2, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { toast } from "sonner";

function isCloudinaryUrl(val: string): boolean {
  return val.startsWith("http://") || val.startsWith("https://");
}

interface Props {
  bucket: string;
  pathPrefix?: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}

export function AudioRecorder({ bucket, value, onChange, label = "إجابة صوتية" }: Props) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!value) { setAudioUrl(null); return; }
    if (isCloudinaryUrl(value)) { setAudioUrl(value); return; }
    supabase.storage.from(bucket).createSignedUrl(value, 600).then(({ data }) => setAudioUrl(data?.signedUrl ?? null));
  }, [value, bucket]);

  const upload = async (blob: Blob) => {
    setUploading(true);
    try {
      const result = await uploadToCloudinary(blob, bucket);
      setAudioUrl(result.secure_url);
      onChange(result.secure_url);
      toast.success("اترفع الصوت");
    } catch (e: any) {
      toast.error(e?.message ?? "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        upload(blob);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      toast.error("متقدرش توصل للمايك");
    }
  };

  const stopRec = () => {
    mediaRef.current?.stop();
    mediaRef.current = null;
    setRecording(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {!recording ? (
          <Button type="button" size="sm" variant="outline" onClick={startRec} disabled={uploading} className="gap-1">
            <Mic className="h-4 w-4" /> {label}
          </Button>
        ) : (
          <Button type="button" size="sm" variant="destructive" onClick={stopRec} className="gap-1 animate-pulse">
            <Square className="h-4 w-4" /> إيقاف التسجيل
          </Button>
        )}
        <label className="cursor-pointer inline-flex items-center gap-1 text-sm px-3 py-1.5 border rounded-md hover:bg-accent">
          <Upload className="h-4 w-4" /> رفع ملف صوتي
          <input type="file" accept="audio/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }} />
        </label>
        {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
        {value && !recording && (
          <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => onChange(null)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      {audioUrl && <audio controls src={audioUrl} className="w-full max-w-sm" />}
    </div>
  );
}
