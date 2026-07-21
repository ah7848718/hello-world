import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, ImageIcon, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/books/$bookId")({
  component: BookDetailPage,
  head: () => ({ meta: [{ title: "تفاصيل الكتاب" }] }),
});

function BookDetailPage() {
  const { bookId } = Route.useParams();
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [book, setBook] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("books").select("*").eq("id", bookId).eq("is_published", true).maybeSingle().then(({ data }) => setBook(data));
  }, [bookId]);

  useEffect(() => {
    if (profile) {
      setFullName((profile as any).full_name ?? "");
      setPhone((profile as any).phone ?? "");
      setGovernorate((profile as any).governorate ?? "");
    }
  }, [profile]);

  if (!book) return <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const unitPrice = book.price * (1 - (book.discount_percent ?? 0) / 100);
  const total = unitPrice * qty;

  const handleSubmit = async () => {
    if (!fullName || !phone || !governorate || !address || qty < 1) {
      toast.error("اكمل بيانات الشحن");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("book_orders").insert({
        book_id: bookId,
        student_id: user!.id,
        quantity: qty,
        full_name: fullName,
        phone,
        governorate,
        address,
        notes: notes || null,
        total_amount: total,
      });
      if (error) throw error;
      toast.success("تم إرسال الطلب. هنتواصل معاك للتأكيد.");
      nav({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e?.message ?? "فشل الإرسال");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 pb-8 space-y-6" dir="rtl">
      <Button asChild variant="ghost" className="gap-1"><Link to="/books"><ArrowRight className="h-4 w-4" /> رجوع للكتب</Link></Button>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <div className="aspect-[3/4] bg-muted">
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-muted-foreground"><ImageIcon className="h-16 w-16" /></div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">{book.title}</h1>
            {book.grade && <Badge variant="outline" className="mt-2">{book.grade}</Badge>}
          </div>

          <div className="flex items-baseline gap-3">
            {book.discount_percent > 0 ? (
              <>
                <span className="text-3xl font-bold text-primary">{unitPrice.toFixed(0)} ج</span>
                <span className="text-lg text-muted-foreground line-through">{book.price} ج</span>
                <Badge variant="destructive">وفّر {book.discount_percent}%</Badge>
              </>
            ) : (
              <span className="text-3xl font-bold text-primary">{book.price} ج</span>
            )}
          </div>

          {book.description && <p className="text-muted-foreground whitespace-pre-wrap">{book.description}</p>}

          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="font-bold flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary" /> اطلب الكتاب</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>الكمية</Label>
                  <Input type="number" min={1} max={20} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} />
                </div>
                <div>
                  <Label>الإجمالي</Label>
                  <div className="h-9 flex items-center font-bold text-primary">{total.toFixed(0)} ج</div>
                </div>
              </div>

              <div>
                <Label>الاسم بالكامل</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>رقم الموبايل</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
                </div>
                <div>
                  <Label>المحافظة</Label>
                  <Input value={governorate} onChange={(e) => setGovernorate(e.target.value)} maxLength={80} />
                </div>
              </div>
              <div>
                <Label>العنوان بالتفصيل</Label>
                <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} maxLength={400} />
              </div>
              <div>
                <Label>ملاحظات (اختياري)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={400} />
              </div>

              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                إرسال الطلب
              </Button>
              <p className="text-xs text-muted-foreground text-center">الدفع عند الاستلام أو حسب الاتفاق مع الإدارة.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
