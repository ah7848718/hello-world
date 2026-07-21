import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, BookOpen, Loader2, Pencil, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { FileDropzone } from "@/components/admin/FileDropzone";

export const Route = createFileRoute("/_authenticated/admin/books")({
  component: Page,
  head: () => ({ meta: [{ title: "الكتب | لوحة الإدارة" }] }),
});

type Book = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  pdf_url: string | null;
  price: number;
  grade: string | null;
  is_published: boolean;
  order_index: number;
};

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: books, isLoading } = useQuery({
    queryKey: ["admin-books"],
    queryFn: async () => {
      const { data, error } = await supabase.from("books").select("*").order("order_index");
      if (error) throw error;
      return data as Book[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("اتحذف");
      qc.invalidateQueries({ queryKey: ["admin-books"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">الكتب</h1>
          <p className="text-muted-foreground mt-1 text-sm">إدارة الكتب والملفات التعليمية</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> كتاب جديد</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "تعديل الكتاب" : "كتاب جديد"}</DialogTitle></DialogHeader>
            <BookForm book={editing} userId={user!.id} onDone={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-books"] }); }} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      ) : !books?.length ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">لا توجد كتب بعد.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {books.map((b) => (
            <BookCard key={b.id} book={b} onEdit={() => { setEditing(b); setOpen(true); }} onDelete={() => setDeleteId(b.id)} />
          ))}
        </div>
      )}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>حذف الكتاب؟</AlertDialogTitle><AlertDialogDescription>لا يمكن التراجع عن الحذف.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { del.mutate(deleteId); setDeleteId(null); } }}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BookCard({ book, onEdit, onDelete }: { book: Book; onEdit: () => void; onDelete: () => void }) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!book.cover_url) return;
    if (book.cover_url.startsWith("http")) setCoverUrl(book.cover_url);
    else supabase.storage.from("books").createSignedUrl(book.cover_url, 600).then(({ data }: any) => setCoverUrl(data?.signedUrl ?? null));
  }, [book.cover_url]);

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition">
      <div className="aspect-[3/4] bg-muted relative">
        {coverUrl ? (
          <img src={coverUrl} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center"><BookOpen className="h-10 w-10 text-muted-foreground" /></div>
        )}
        <div className="absolute top-2 start-2 flex gap-1">
          {book.is_published ? <Badge>منشور</Badge> : <Badge variant="secondary">مسودة</Badge>}
        </div>
      </div>
      <CardContent className="p-3 space-y-2">
        <h3 className="font-bold text-sm line-clamp-2 min-h-[2.5rem]">{book.title}</h3>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{book.grade ?? "—"}</span>
          <span className="font-semibold text-foreground">{book.price > 0 ? `${book.price} ج.م` : "مجاني"}</span>
        </div>
        <div className="flex gap-1 pt-1">
          <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={onEdit}><Pencil className="h-3 w-3" /> تعديل</Button>
          <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BookForm({ book, userId, onDone }: { book: Book | null; userId: string; onDone: () => void }) {
  const [title, setTitle] = useState(book?.title ?? "");
  const [description, setDescription] = useState(book?.description ?? "");
  const [price, setPrice] = useState(String(book?.price ?? 0));
  const [grade, setGrade] = useState(book?.grade ?? "");
  const [isPublished, setIsPublished] = useState(book?.is_published ?? false);
  const [coverPath, setCoverPath] = useState<string | null>(book?.cover_url ?? null);
  const [pdfPath, setPdfPath] = useState<string | null>(book?.pdf_url ?? null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [saving, setSaving] = useState(false);

  const uploadCover = async (file: File) => {
    setUploadingCover(true);
    try { const r = await uploadToCloudinary(file, "books"); setCoverPath(r.secure_url); } catch (e: any) { toast.error(e?.message); }
    setUploadingCover(false);
  };
  const uploadPdf = async (file: File) => {
    setUploadingPdf(true);
    try { const r = await uploadToCloudinary(file, "books"); setPdfPath(r.secure_url); } catch (e: any) { toast.error(e?.message); }
    setUploadingPdf(false);
  };

  const save = async () => {
    if (!title) { toast.error("العنوان مطلوب"); return; }
    setSaving(true);
    const payload = {
      title, description: description || null, price: Number(price) || 0,
      grade: grade || null, is_published: isPublished,
      cover_url: coverPath, pdf_url: pdfPath, created_by: userId,
    };
    const res = book
      ? await supabase.from("books").update(payload).eq("id", book.id)
      : await supabase.from("books").insert(payload);
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("اتحفظ");
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2"><Label>العنوان *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></div>
      <div className="space-y-2"><Label>الشرح</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>السعر (ج.م)</Label><Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        <div className="space-y-2"><Label>الصف</Label><Input value={grade} onChange={(e) => setGrade(e.target.value)} maxLength={50} /></div>
      </div>
      <div className="space-y-2">
        <Label>الغلاف</Label>
        <FileDropzone accept="image/*" maxSize={5} uploading={uploadingCover} current={coverPath} preview="file" onFile={uploadCover} onClear={() => setCoverPath(null)} />
      </div>
      <div className="space-y-2">
        <Label>ملف PDF</Label>
        <FileDropzone accept="application/pdf" maxSize={50} uploading={uploadingPdf} current={pdfPath} preview="file" onFile={uploadPdf} onClear={() => setPdfPath(null)} />
      </div>
      <div className="flex items-center justify-between border rounded-lg p-3">
        <div><Label>منشور</Label><p className="text-xs text-muted-foreground">يظهر للطلاب</p></div>
        <Switch checked={isPublished} onCheckedChange={setIsPublished} />
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ
        </Button>
      </DialogFooter>
    </div>
  );
}
