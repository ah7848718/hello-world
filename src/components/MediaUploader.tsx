import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImageIcon, Mic, Square, Upload, Loader2, Trash2, Video, FileAudio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { toast } from "sonner";

function isCloudinary(val: string | null | undefined): boolean {
  if (!val) return false;
  return val.startsWith("http://") || val.startsWith("https://");
}

function getSupabasePublicUrl(bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function resolveUrl(bucket: string, val: string | null | undefined): string | null {
  if (!val) return null;
  if (isCloudinary(val)) return val;
  return getSupabasePublicUrl(bucket, val);
}

interface MediaValue {
  image?: string | null;
  audio?: string | null;
  video?: string | null;
}

interface Props {
  bucket: string;
  pathPrefix?: string;
  value: MediaValue;
  onChange: (val: MediaValue) => void;
  showImage?: boolean;
  showAudio?: boolean;
  showVideo?: boolean;
}

export function MediaUploader({ bucket, value, onChange, showImage = true, showAudio = true, showVideo = true }: Props) {
  const [uploadingImg, setUploadingImg] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const imgUrl = resolveUrl(bucket, value.image);
  const audioUrl = resolveUrl(bucket, value.audio);
  const videoUrl = resolveUrl(bucket, value.video);

  const uploadFile = async (file: Blob, folder: string) => {
    const result = await uploadToCloudinary(file, folder);
    return result.secure_url;
  };

  const handleImage = async (f: File) => {
    if (f.size > 5 * 1024 * 1024) { toast.error("الحجم أكبر من 5MB"); return; }
    setUploadingImg(true);
    try { onChange({ ...value, image: await uploadFile(f, bucket) }); }
    catch (e: any) { toast.error(e?.message ?? "فشل رفع الصورة"); }
    finally { setUploadingImg(false); }
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setUploadingAudio(true);
        try { onChange({ ...value, audio: await uploadFile(new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" }), bucket) }); }
        catch (e: any) { toast.error(e?.message ?? "فشل رفع الصوت"); }
        finally { setUploadingAudio(false); }
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch { toast.error("متقدرش توصل للمايك"); }
  };
  const stopRec = () => { mediaRef.current?.stop(); mediaRef.current = null; setRecording(false); };

  const handleAudioFile = async (f: File) => {
    if (f.size > 10 * 1024 * 1024) { toast.error("الحجم أكبر من 10MB"); return; }
    setUploadingAudio(true);
    try { onChange({ ...value, audio: await uploadFile(f, bucket) }); }
    catch (e: any) { toast.error(e?.message ?? "فشل رفع الصوت"); }
    finally { setUploadingAudio(false); }
  };

  const handleVideo = async (f: File) => {
    if (f.size > 100 * 1024 * 1024) { toast.error("الحجم أكبر من 100MB"); return; }
    setUploadingVideo(true);
    try { onChange({ ...value, video: await uploadFile(f, bucket) }); }
    catch (e: any) { toast.error(e?.message ?? "فشل رفع الفيديو"); }
    finally { setUploadingVideo(false); }
  };

  return (
    <div className="space-y-3">
      {showImage && (
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">صورة</Label>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="cursor-pointer inline-flex items-center gap-1 text-sm px-3 py-1.5 border rounded-md hover:bg-accent">
              <ImageIcon className="h-4 w-4" /> {value.image ? "تغيير" : "إضافة صورة"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); }} />
            </label>
            {uploadingImg && <Loader2 className="h-4 w-4 animate-spin" />}
            {imgUrl && (
              <div className="relative inline-block">
                <img src={imgUrl} alt="" className="h-14 w-14 object-cover rounded-md border" />
                <button type="button" onClick={() => onChange({ ...value, image: null })} className="absolute -top-1.5 -end-1.5 bg-destructive text-white rounded-full p-0.5 shadow">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showAudio && (
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">صوت</Label>
          <div className="flex items-center gap-2 flex-wrap">
            {!recording ? (
              <Button type="button" size="sm" variant="outline" onClick={startRec} disabled={uploadingAudio} className="gap-1">
                <Mic className="h-4 w-4" /> تسجيل
              </Button>
            ) : (
              <Button type="button" size="sm" variant="destructive" onClick={stopRec} className="gap-1 animate-pulse">
                <Square className="h-4 w-4" /> إيقاف
              </Button>
            )}
            <label className="cursor-pointer inline-flex items-center gap-1 text-sm px-3 py-1.5 border rounded-md hover:bg-accent">
              <FileAudio className="h-4 w-4" /> رفع ملف
              <input type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAudioFile(f); }} />
            </label>
            {uploadingAudio && <Loader2 className="h-4 w-4 animate-spin" />}
            {audioUrl && !recording && (
              <div className="flex items-center gap-1">
                <audio controls src={audioUrl} className="h-8 max-w-[160px]" />
                <button type="button" onClick={() => onChange({ ...value, audio: null })} className="text-destructive p-1"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            )}
          </div>
        </div>
      )}

      {showVideo && (
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">فيديو</Label>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="cursor-pointer inline-flex items-center gap-1 text-sm px-3 py-1.5 border rounded-md hover:bg-accent">
              <Video className="h-4 w-4" /> {value.video ? "تغيير" : "إضافة فيديو"}
              <input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideo(f); }} />
            </label>
            {uploadingVideo && <Loader2 className="h-4 w-4 animate-spin" />}
            {videoUrl && (
              <div className="flex items-center gap-1">
                <video controls src={videoUrl} className="h-14 w-20 object-cover rounded-md border" />
                <button type="button" onClick={() => onChange({ ...value, video: null })} className="text-destructive p-1"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
