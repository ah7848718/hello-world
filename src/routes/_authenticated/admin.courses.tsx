import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ImageIcon,
  Search,
  Star,
  Eye,
  EyeOff,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Course = Database["public"]["Tables"]["courses"]["Row"];

export const Route = createFileRoute("/_authenticated/admin/courses")({
  component: Page,
  head: () => ({ meta: [{ title: "إدارة الكورسات | لوحة الإدارة" }] }),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function Page() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setCourses(data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = (courses ?? []).filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()),
  );

  const pathname = useRouterState({ select: (s) => s.location?.pathname ?? "" });
  const isDetail = pathname.startsWith("/admin/courses/") && pathname !== "/admin/courses";
  if (isDetail) return <Outlet />;

  const onDelete = async (id: string) => {
    const { count } = await supabase.from("payments").select("*", { count: "exact", head: true }).eq("course_id", id);
    if (count && count > 0) {
      return toast.error("لا يمكن حذف الكورس، يوجد مدفوعات مرتبطة به");
    }
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم حذف الكورس");
    load();
  };

  const togglePublish = async (c: Course) => {
    const { error } = await supabase
      .from("courses")
      .update({ is_published: !c.is_published })
      .eq("id", c.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            إدارة الكورسات
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            إنشاء وتعديل الكورسات، الوحدات، الفصول، والمحاضرات.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن كورس..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9 w-64"
            />
          </div>
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-1" />
                كورس جديد
              </Button>
            </DialogTrigger>
            <CourseDialog
              editing={editing}
              onSaved={() => {
                setOpen(false);
                setEditing(null);
                load();
              }}
            />
          </Dialog>
        </div>
      </div>

      {courses === null ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg">لا توجد كورسات بعد</h3>
            <p className="text-sm text-muted-foreground mt-1">
              ابدأ بإنشاء أول كورس لإضافة محتواه التعليمي.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="overflow-hidden group hover:shadow-lg transition-shadow border-border/60">
                <Link
                  to="/admin/courses/$courseId"
                  params={{ courseId: c.id }}
                  className="block"
                >
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {c.cover_url ? (
                      <img
                        src={c.cover_url}
                        alt={c.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-muted-foreground">
                        <ImageIcon className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {c.is_featured && (
                        <Badge className="bg-amber-500 hover:bg-amber-500">
                          <Star className="h-3 w-3 ml-1" /> مميز
                        </Badge>
                      )}
                      <Badge variant={c.is_published ? "default" : "secondary"}>
                        {c.is_published ? "منشور" : "مسودة"}
                      </Badge>
                    </div>
                  </div>
                </Link>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold line-clamp-1">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.grade || "—"} · {c.term || "—"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-primary">
                      {(c as any).is_free ? "مجاني" : `${c.price} جنيه`}
                      {!((c as any).is_free) && c.discount_percent > 0 && (
                        <span className="text-xs text-muted-foreground font-normal mr-2">
                          خصم {c.discount_percent}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => togglePublish(c)}
                      title={c.is_published ? "إخفاء" : "نشر"}
                    >
                      {c.is_published ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(c);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>حذف الكورس؟</AlertDialogTitle>
                          <AlertDialogDescription>
                            سيتم حذف الكورس وكل وحداته ومحاضراته. لا يمكن التراجع.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(c.id)}>
                            حذف
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button asChild size="sm" variant="outline" className="ms-auto">
                      <Link to="/admin/courses/$courseId" params={{ courseId: c.id }}>
                        المحتوى
                      </Link>
                    </Button>
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

function CourseDialog({
  editing,
  onSaved,
}: {
  editing: Course | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [price, setPrice] = useState<number>(editing?.price ?? 0);
  const [discount, setDiscount] = useState<number>(editing?.discount_percent ?? 0);
  const [grade, setGrade] = useState(editing?.grade ?? "");
  const [term, setTerm] = useState(editing?.term ?? "");
  const [month, setMonth] = useState((editing as any)?.month ?? "");
  const [isPublished, setIsPublished] = useState(editing?.is_published ?? false);
  const [isFeatured, setIsFeatured] = useState(editing?.is_featured ?? false);
  const [isCenterOnly, setIsCenterOnly] = useState((editing as any)?.is_center_only ?? false);
  const [isFree, setIsFree] = useState((editing as any)?.is_free ?? false);
  const [coverUrl, setCoverUrl] = useState(editing?.cover_url ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadToCloudinary(file, "course-covers");
      setCoverUrl(result.secure_url);
    } catch (e: any) { toast.error(e?.message); }
    setUploading(false);
  };

  const save = async () => {
    if (!title.trim()) return toast.error("اكتب اسم الكورس");
    setSaving(true);
    const payload = {
      title: title.trim(),
      slug: slugify(title),
      description: description || null,
      price: Number(price) || 0,
      discount_percent: Number(discount) || 0,
      grade: grade || null,
      term: term || null,
      month: month || null,
      is_published: isPublished,
      is_featured: isFeatured,
      is_center_only: isCenterOnly,
      is_free: isFree,
      cover_url: coverUrl || null,
    };
    if (editing) {
      const { error } = await supabase
        .from("courses")
        .update(payload)
        .eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("تم حفظ التعديلات");
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("courses")
        .insert({ ...payload, created_by: user!.id });
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("تم إنشاء الكورس");
    }
    setSaving(false);
    onSaved();
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editing ? "تعديل الكورس" : "كورس جديد"}</DialogTitle>
        <DialogDescription>
          أدخل بيانات الكورس. يمكنك إضافة الوحدات والمحاضرات لاحقاً.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>اسم الكورس *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>الوصف</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>السعر (جنيه)</Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>نسبة الخصم %</Label>
            <Input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>الصف الدراسي</Label>
            <Input
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="مثل: 3 ثانوي"
            />
          </div>
          <div>
            <Label>الترم</Label>
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="ترم أول / ترم ثاني"
            />
          </div>
          <div>
            <Label>الشهر (لو شهري)</Label>
            <Input
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              placeholder="سبتمبر / أكتوبر / نوفمبر..."
            />
          </div>
        </div>
        <div>
          <Label>صورة الغلاف</Label>
          <div className="flex items-center gap-3 mt-1">
            {coverUrl && (
              <img
                src={coverUrl}
                alt=""
                className="h-16 w-24 object-cover rounded border"
              />
            )}
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
              }}
            />
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            <Label>منشور</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
            <Label>مميز</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isCenterOnly} onCheckedChange={setIsCenterOnly} />
            <Label>خاص بالسناتر</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isFree} onCheckedChange={setIsFree} />
            <Label>مجاني</Label>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin ml-1" />}
          حفظ
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
