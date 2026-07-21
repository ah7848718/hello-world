import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Package, Plus, Pencil, Trash2, Loader2, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/bundles")({
  component: Page,
  head: () => ({ meta: [{ title: "إدارة الباقات | لوحة الإدارة" }] }),
});

type Bundle = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  grade: string | null;
  bundle_type: string;
  term: string | null;
  months: string[] | null;
  price: number;
  discount_percent: number;
  is_published: boolean;
  order_index: number;
};

type Course = { id: string; title: string; grade: string | null; term: string | null; month: string | null };

function Page() {
  const { user } = useAuth();
  const [bundles, setBundles] = useState<Bundle[] | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bundle | null>(null);

  const load = async () => {
    const [bsRes, csRes] = await Promise.all([
      supabase.from("bundles").select("*").order("order_index").order("created_at", { ascending: false }),
      supabase.from("courses").select("id, title, grade, term, month").order("title"),
    ]);
    if (bsRes.error) { toast.error(bsRes.error.message); return; }
    if (csRes.error) { toast.error(csRes.error.message); return; }
    setBundles((bsRes.data ?? []) as any);
    setCourses((csRes.data ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const onDelete = async (id: string) => {
    const { error } = await supabase.from("bundles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم حذف الباقة");
    load();
  };

  const togglePublish = async (b: Bundle) => {
    const { error } = await supabase.from("bundles").update({ is_published: !b.is_published }).eq("id", b.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">إدارة الباقات</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            باقات الترم أو باقات 3 شهور — اشتراك واحد يفتح كل الكورسات اللي جواها.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-1" /> باقة جديدة</Button>
          </DialogTrigger>
          <BundleDialog
            editing={editing}
            allCourses={courses}
            userId={user!.id}
            onSaved={() => { setOpen(false); setEditing(null); load(); }}
          />
        </Dialog>
      </div>

      {bundles === null ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : bundles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Package className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg">لا توجد باقات</h3>
            <p className="text-sm text-muted-foreground mt-1">ابدأ بإنشاء أول باقة كورسات.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bundles.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow border-border/60">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary-glow/20 relative">
                  {b.cover_url ? (
                    <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-primary/40">
                      <Package className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Badge variant={b.is_published ? "default" : "secondary"}>
                      {b.is_published ? "منشور" : "مسودة"}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold line-clamp-1">{b.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {b.grade || "—"} · {b.bundle_type === "term" ? `باقة ${b.term ?? "ترم"}` : "باقة شهور"}
                    </p>
                  </div>
                  <div className="text-sm font-bold text-primary">
                    {b.price} جنيه
                    {b.discount_percent > 0 && (
                      <span className="text-xs text-muted-foreground font-normal mr-2">خصم {b.discount_percent}%</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 pt-2 border-t">
                    <Button size="sm" variant="ghost" onClick={() => togglePublish(b)}>
                      {b.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(b); setOpen(true); }}>
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
                          <AlertDialogTitle>حذف الباقة؟</AlertDialogTitle>
                          <AlertDialogDescription>الكورسات نفسها مش هتتحذف، بس الباقة هتختفي.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(b.id)}>حذف</AlertDialogAction>
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

function BundleDialog({
  editing, allCourses, userId, onSaved,
}: {
  editing: Bundle | null;
  allCourses: Course[];
  userId: string;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [coverUrl, setCoverUrl] = useState(editing?.cover_url ?? "");
  const [grade, setGrade] = useState(editing?.grade ?? "");
  const [bundleType, setBundleType] = useState(editing?.bundle_type ?? "term");
  const [term, setTerm] = useState(editing?.term ?? "");
  const [months, setMonths] = useState<string>((editing?.months ?? []).join(", "));
  const [price, setPrice] = useState<number>(editing?.price ?? 0);
  const [discount, setDiscount] = useState<number>(editing?.discount_percent ?? 0);
  const [isPublished, setIsPublished] = useState(editing?.is_published ?? false);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!editing) { setSelectedCourses([]); return; }
    supabase.from("bundle_courses").select("course_id").eq("bundle_id", editing.id).then(({ data, error }) => {
      if (error) { toast.error(error.message); return; }
      setSelectedCourses((data ?? []).map((r: any) => r.course_id));
    });
  }, [editing]);

  const filteredCourses = allCourses.filter((c) => !grade || c.grade === grade);

  const onUpload = async (file: File) => {
    setUploading(true);
    try { const r = await uploadToCloudinary(file, "course-covers"); setCoverUrl(r.secure_url); } catch (e: any) { toast.error(e?.message); }
    setUploading(false);
  };

  const save = async () => {
    if (!title.trim()) return toast.error("اكتب اسم الباقة");
    if (selectedCourses.length === 0) return toast.error("اختر كورسات للباقة");
    setSaving(true);
    const monthsArr = months.split(",").map((m) => m.trim()).filter(Boolean);
    const payload = {
      title: title.trim(),
      description: description || null,
      cover_url: coverUrl || null,
      grade: grade || null,
      bundle_type: bundleType,
      term: bundleType === "term" ? (term || null) : null,
      months: bundleType === "monthly_pack" ? monthsArr : null,
      price: Number(price) || 0,
      discount_percent: Number(discount) || 0,
      is_published: isPublished,
    };

    let bundleId: string;
    if (editing) {
      const { error } = await supabase.from("bundles").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      bundleId = editing.id;
    } else {
      const { data, error } = await supabase.from("bundles").insert({ ...payload, created_by: userId }).select("id").single();
      if (error || !data) { toast.error(error?.message ?? "خطأ"); setSaving(false); return; }
      bundleId = data.id;
    }

    // Sync bundle_courses — read existing first so we can roll back on failure
    const { data: oldCourses } = await supabase
      .from("bundle_courses").select("course_id").eq("bundle_id", bundleId);
    const oldCourseIds = (oldCourses ?? []).map((r: any) => r.course_id);

    const { error: delErr } = await supabase.from("bundle_courses").delete().eq("bundle_id", bundleId);
    if (delErr) { toast.error(delErr.message); setSaving(false); return; }

    let insertOk = true;
    if (selectedCourses.length > 0) {
      const rows = selectedCourses.map((cid) => ({ bundle_id: bundleId, course_id: cid }));
      const { error: bcErr } = await supabase.from("bundle_courses").insert(rows);
      if (bcErr) {
        // Rollback: restore old courses
        if (oldCourseIds.length > 0) {
          const restoreRows = oldCourseIds.map((cid: string) => ({ bundle_id: bundleId, course_id: cid }));
          await supabase.from("bundle_courses").insert(restoreRows);
        }
        toast.error(bcErr.message); setSaving(false); return;
      }
      insertOk = true;
    }

    toast.success(editing ? "اتحفظت" : "تم إنشاء الباقة");
    setSaving(false);
    onSaved();
  };

  const toggleCourse = (id: string) => {
    setSelectedCourses((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editing ? "تعديل الباقة" : "باقة جديدة"}</DialogTitle>
        <DialogDescription>
          الطالب لما يشترك في الباقة هيتفتح له كل الكورسات اللي جواها.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>اسم الباقة *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>الوصف</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>الصف</Label>
            <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="أولى ثانوي / تانية ثانوي / تالتة ثانوي" />
          </div>
          <div>
            <Label>نوع الباقة</Label>
            <Select value={bundleType} onValueChange={setBundleType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="term">باقة ترم كامل</SelectItem>
                <SelectItem value="monthly_pack">باقة 3 شهور</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {bundleType === "term" ? (
            <div>
              <Label>الترم</Label>
              <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="ترم أول / ترم ثاني" />
            </div>
          ) : (
            <div>
              <Label>الشهور (مفصولة بفاصلة)</Label>
              <Input value={months} onChange={(e) => setMonths(e.target.value)} placeholder="سبتمبر, أكتوبر, نوفمبر" />
            </div>
          )}
          <div>
            <Label>السعر (جنيه)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
          <div>
            <Label>نسبة الخصم %</Label>
            <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
          </div>
        </div>
        <div>
          <Label>صورة الغلاف</Label>
          <div className="flex items-center gap-3 mt-1">
            {coverUrl && <img src={coverUrl} alt="" className="h-16 w-24 object-cover rounded border" />}
            <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
        </div>
        <div>
          <Label>الكورسات داخل الباقة *</Label>
          <div className="mt-2 border rounded-lg p-3 max-h-56 overflow-y-auto space-y-2">
            {filteredCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد كورسات{grade ? ` للصف "${grade}"` : ""}</p>
            ) : filteredCourses.map((c) => (
              <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded">
                <Checkbox checked={selectedCourses.includes(c.id)} onCheckedChange={() => toggleCourse(c.id)} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{c.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {[c.grade, c.term, c.month].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{selectedCourses.length} كورس مختار</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          <Label>منشور</Label>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin ml-1" />} حفظ
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
