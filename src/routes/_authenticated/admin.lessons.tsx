import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PlayCircle, Plus, Pencil, Trash2, Loader2, Eye, EyeOff, Video, Link2, Upload } from "lucide-react";

const extractYouTubeId = (url: string) => {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : url;
};

export const Route = createFileRoute("/_authenticated/admin/lessons")({
  component: Page,
  head: () => ({ meta: [{ title: "إدارة الحصص | لوحة الإدارة" }] }),
});

const GRADES = ["أولى ثانوي", "تانية ثانوي", "تالتة ثانوي"] as const;

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  video_type: string;
  video_url: string | null;
  video_bunny_id: string | null;
  grade: string;
  is_published: boolean;
  order_index: number;
  course_id: string | null;
};

type CourseRef = { id: string; title: string; grade: string };

function Page() {
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [courses, setCourses] = useState<CourseRef[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("lessons")
      .select("*")
      .order("order_index")
      .order("created_at", { ascending: false });
    setLessons((data ?? []) as Lesson[]);
  };

  const loadCourses = async () => {
    const { data } = await supabase
      .from("courses")
      .select("id, title, grade")
      .is("is_published", true)
      .order("title");
    setCourses(data ?? []);
  };

  useEffect(() => { load(); loadCourses(); }, []);

  const onDelete = async (id: string) => {
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم حذف الحصة");
    load();
  };

  const togglePublish = async (l: Lesson) => {
    const { error } = await supabase.from("lessons").update({ is_published: !l.is_published }).eq("id", l.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">إدارة الحصص</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            حصص فيديو مستقلة — أضف رابط من منصة باني أو رفع فيديو من الجهاز وحدد الصف.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-1" /> حصة جديدة</Button>
          </DialogTrigger>
          <LessonDialog
            key={editing?.id ?? "new"}
            editing={editing}
            courses={courses}
            onSaved={() => { setOpen(false); setEditing(null); load(); }}
          />
        </Dialog>
      </div>

      {lessons === null ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : lessons.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <PlayCircle className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg">لا توجد حصص</h3>
            <p className="text-sm text-muted-foreground mt-1">أضف أول حصة الآن.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((l, i) => (
            <motion.div key={l.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow border-border/60">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary-glow/20 relative grid place-items-center">
                  {l.video_type === "bunny" ? (
                    <Link2 className="h-12 w-12 text-primary/40" />
                  ) : l.video_type === "youtube" && l.video_url ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${extractYouTubeId(l.video_url)}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : l.video_url ? (
                    <video controls src={l.video_url?.startsWith("http") ? l.video_url : supabase.storage.from("lesson-media").getPublicUrl(l.video_url).data.publicUrl} className="w-full h-full object-cover" />
                  ) : (
                    <Video className="h-12 w-12 text-primary/40" />
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Badge variant={l.is_published ? "default" : "secondary"}>
                      {l.is_published ? "منشور" : "مسودة"}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold line-clamp-1">{l.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {l.grade}
                    </p>
                    {l.course_id && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {courses.find((c) => c.id === l.course_id)?.title ?? "كورس"}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {l.video_type === "bunny" ? "رابط باني" : l.video_type === "youtube" ? "يوتيوب" : "فيديو مرفوع"}
                  </div>
                  <div className="flex items-center gap-1 pt-2 border-t">
                    <Button size="sm" variant="ghost" onClick={() => togglePublish(l)}>
                      {l.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(l); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>حذف الحصة؟</AlertDialogTitle>
                          <AlertDialogDescription>لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(l.id)}>حذف</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function LessonDialog({
  editing, courses, onSaved,
}: {
  editing: Lesson | null;
  courses: CourseRef[];
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [videoType, setVideoType] = useState(editing?.video_type ?? "upload");
  const [videoUrl, setVideoUrl] = useState(editing?.video_url ?? "");
  const [videoBunnyId, setVideoBunnyId] = useState(editing?.video_bunny_id ?? "");
  const [grade, setGrade] = useState(editing?.grade ?? "أولى ثانوي");
  const [courseId, setCourseId] = useState(editing?.course_id ?? "__none__");
  const [isPublished, setIsPublished] = useState(editing?.is_published ?? false);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const handleVideoUpload = async (file: File) => {
    if (file.size > 200 * 1024 * 1024) { toast.error("الحجم أكبر من 200MB"); return; }
    setUploadingVideo(true);
    try { const r = await uploadToCloudinary(file, "lesson-media"); setVideoUrl(r.secure_url); toast.success("تم رفع الفيديو"); } catch (e: any) { toast.error(e?.message); }
    setUploadingVideo(false);
  };

  const save = async () => {
    if (!title.trim()) return toast.error("اكتب اسم الحصة");
    if (videoType === "upload" && !videoUrl) return toast.error("ارفع فيديو من الجهاز");
    if (videoType === "bunny" && !videoBunnyId.trim()) return toast.error("اكتب رابط باني");
    if (videoType === "youtube" && !videoUrl.trim()) return toast.error("اكتب رابط يوتيوب");
    setSaving(true);
    const payload: Record<string, any> = {
      title: title.trim(),
      description: description || null,
      video_type: videoType,
      video_url: videoType === "upload" || videoType === "youtube" ? (videoUrl || null) : null,
      video_bunny_id: videoType === "bunny" ? (videoBunnyId.trim() || null) : null,
      grade,
      course_id: courseId === "__none__" ? null : courseId,
      is_published: isPublished,
    };

    if (editing) {
      const { error } = await supabase.from("lessons").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("lessons").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }

    toast.success(editing ? "اتحفظت" : "تم إنشاء الحصة");
    setSaving(false);
    onSaved();
  };

  const uploadVideoUrl = videoUrl && videoType === "upload"
    ? (videoUrl.startsWith("http") ? videoUrl : supabase.storage.from("lesson-media").getPublicUrl(videoUrl).data.publicUrl)
    : null;

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editing ? "تعديل الحصة" : "حصة جديدة"}</DialogTitle>
        <DialogDescription>
          أضف حصة فيديو مستقلة — رابط من باني أو رفع فيديو من الجهاز.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>اسم الحصة *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>الوصف</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>الصف *</Label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GRADES.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>الكورس (اختياري)</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger><SelectValue placeholder="بدون كورس" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">بدون كورس</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>نوع الفيديو</Label>
            <Select value={videoType} onValueChange={setVideoType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="upload">
                  <div className="flex items-center gap-2"><Upload className="h-4 w-4" /> رفع من الجهاز</div>
                </SelectItem>
                <SelectItem value="bunny">
                  <div className="flex items-center gap-2"><Link2 className="h-4 w-4" /> رابط باني</div>
                </SelectItem>
                <SelectItem value="youtube">
                  <div className="flex items-center gap-2"><Video className="h-4 w-4" /> يوتيوب</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {videoType === "upload" ? (
          <div>
            <Label>رفع فيديو *</Label>
            <div className="flex items-center gap-3 mt-1">
              {uploadVideoUrl && (
                <video controls src={uploadVideoUrl} className="h-20 w-32 object-cover rounded border" />
              )}
              <Input type="file" accept="video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); }} />
              {uploadingVideo && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>
        ) : videoType === "youtube" ? (
          <div>
            <Label>رابط يوتيوب *</Label>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              dir="ltr"
            />
            {videoUrl && (
              <div className="mt-2 aspect-video rounded overflow-hidden border">
                <iframe
                  src={`https://www.youtube.com/embed/${extractYouTubeId(videoUrl)}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        ) : (
          <div>
            <Label>رابط باني *</Label>
            <Input
              value={videoBunnyId}
              onChange={(e) => setVideoBunnyId(e.target.value)}
              placeholder="https://player.mediadelivery.net/play/... أو المعرف"
              dir="ltr"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          <Label>منشور</Label>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving || uploadingVideo}>
          {(saving || uploadingVideo) && <Loader2 className="h-4 w-4 animate-spin ml-1" />} حفظ
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
