import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { validateCoupon } from "@/lib/payments-student.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({ courseId: z.string().uuid().optional(), bundleId: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/payments/new")({
  component: Page,
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "اشتراك في كورس" }] }),
});

function Page() {
  const { courseId: pre, bundleId: preBundle } = useSearch({ from: "/_authenticated/payments/new" });
  const { user } = useAuth();
  const nav = useNavigate();
  
  const [courseId, setCourseId] = useState<string>(pre ?? "");
  const [bundleId] = useState<string>(preBundle ?? "");
  const [method, setMethod] = useState<"vcash" | "instapay">("vcash");
  const [txRef, setTxRef] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponInfo, setCouponInfo] = useState<{ valid: boolean; discount?: number; reason?: string } | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = (courseId || bundleId) && txRef && receiptFile;

  const { data: courses } = useQuery({
    queryKey: ["available-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title, price, discount_percent").eq("is_published", true).eq("is_center_only", false);
      return data ?? [];
    },
  });

  const { data: bundle } = useQuery({
    queryKey: ["bundle-payment", bundleId],
    enabled: !!bundleId,
    queryFn: async () => {
      const { data } = await supabase.from("bundles").select("id, title, price, discount_percent").eq("id", bundleId).maybeSingle();
      return data;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["public-settings-payments"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("key, value").eq("key", "payments").maybeSingle();
      return (data?.value ?? {}) as any;
    },
  });

  const course = courses?.find((c: any) => c.id === courseId);
  const target: any = bundleId ? bundle : course;
  const base = target ? Number(target.price) : 0;
  const afterCourseDisc = target ? base * (1 - (target.discount_percent ?? 0) / 100) : 0;
  const couponPct = couponInfo?.valid ? (couponInfo.discount ?? 0) : 0;
  const finalAmount = afterCourseDisc * (1 - couponPct / 100);

  const checkCoupon = async () => {
    if (!couponCode || !courseId) return;
    try {
      const res = await validateFn({ data: { code: couponCode, courseId } });
      if (res.ok) setCouponInfo({ valid: true, discount: res.discountPercent });
      else setCouponInfo({ valid: false, reason: res.reason });
    } catch (e: any) {
      setCouponInfo({ valid: false, reason: e?.message ?? "خطأ" });
    }
  };

  const handleSubmit = async () => {
    if (!receiptFile || (!courseId && !bundleId) || !txRef || !user) {
      toast.error("اكمل جميع البيانات وارفع صورة الإيصال");
      return;
    }
    setSubmitting(true);
    setUploading(true);
    try {
      let receiptUrl: string;
      try { const r = await uploadToCloudinary(receiptFile, "payment-receipts"); receiptUrl = r.secure_url; } catch (e: any) { toast.error("فشل رفع الإيصال: " + (e?.message ?? "")); return; }
      setUploading(false);

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) { toast.error("جلسة منتهية، سجل دخول مرة أخرى"); return; }

      const res = await fetch("/api/payment/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId: courseId || undefined,
          bundleId: bundleId || undefined,
          method,
          transactionRef: txRef,
          receiptPath: receiptUrl,
          couponCode: couponCode || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) { toast.error(data.error ?? "فشل الإرسال"); return; }
      toast.success("تم إرسال طلب الاشتراك. سيتم مراجعته قريباً.");
      setTimeout(() => nav({ to: "/dashboard" }), 0);
    } catch (e: any) {
      toast.error(e?.message ?? "فشل الإرسال");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl pb-8 px-4 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">اشتراك في كورس</h1>
        <p className="text-muted-foreground mt-1 text-sm">ادفع وارفع إيصال للمراجعة من الإدارة.</p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-5">
          {bundleId && bundle ? (
            <div className="rounded-lg border bg-amber-500/10 p-4">
              <div className="text-sm text-muted-foreground">باقة</div>
              <div className="font-bold">{bundle.title}</div>
              <div className="text-sm text-primary mt-1">{bundle.discount_percent > 0 ? `${(bundle.price * (1 - bundle.discount_percent / 100)).toFixed(0)} ج (كان ${bundle.price} ج)` : `${bundle.price} ج`}</div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>الكورس</Label>
              <Select value={courseId || undefined} onValueChange={setCourseId}>
                <SelectTrigger><SelectValue placeholder="اختر الكورس" /></SelectTrigger>
                <SelectContent>
                  {(courses ?? []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.title} — {c.discount_percent > 0 ? `${(c.price * (1 - c.discount_percent / 100)).toFixed(0)} ج` : `${c.price} ج`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-3">
            <Label>طريقة الدفع</Label>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as any)} className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                <RadioGroupItem value="vcash" /> Vodafone Cash
              </label>
              <label className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                <RadioGroupItem value="instapay" /> InstaPay
              </label>
            </RadioGroup>
            {settings && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                {method === "vcash" && settings.vcash_number && <p>حوّل إلى: <strong>{settings.vcash_number}</strong> ({settings.vcash_name})</p>}
                {method === "instapay" && settings.instapay_handle && <p>InstaPay: <strong>{settings.instapay_handle}</strong></p>}
                {settings.instructions && <p className="text-muted-foreground">{settings.instructions}</p>}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>رقم العملية</Label>
            <Input value={txRef} onChange={(e) => setTxRef(e.target.value)} placeholder="مثال: 12345678" maxLength={200} />
          </div>

          <div className="space-y-2">
            <Label>كوبون خصم (اختياري)</Label>
            <div className="flex gap-2">
              <Input value={couponCode} onChange={(e) => { setCouponCode(e.target.value); setCouponInfo(null); }} placeholder="ENTER CODE" maxLength={60} />
              <Button type="button" variant="outline" onClick={checkCoupon} disabled={!couponCode || !courseId}>تحقق</Button>
            </div>
            {couponInfo && (couponInfo.valid
              ? <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> خصم {couponInfo.discount}%</p>
              : <p className="text-sm text-destructive flex items-center gap-1"><X className="h-4 w-4" /> {couponInfo.reason}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>صورة الإيصال</Label>
            <label className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-accent transition">
              <input type="file" accept="image/*,application/pdf" className="hidden"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
              <Upload className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">{receiptFile ? receiptFile.name : "اضغط لرفع الصورة"}</p>
              <p className="text-xs text-muted-foreground mt-1">JPG / PNG / PDF</p>
            </label>
          </div>

          {course && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-1 text-sm">
              <div className="flex justify-between"><span>السعر:</span><span>{base} ج</span></div>
              {course.discount_percent ? <div className="flex justify-between text-muted-foreground"><span>خصم الكورس:</span><span>-{course.discount_percent}%</span></div> : null}
              {couponInfo?.valid && <div className="flex justify-between text-green-600"><span>خصم الكوبون:</span><span>-{couponInfo.discount}%</span></div>}
              <div className="flex justify-between font-bold text-base pt-2 border-t mt-2"><span>الإجمالي:</span><span>{finalAmount.toFixed(2)} ج</span></div>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={submitting || !canSubmit} className="w-full">
            {submitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {uploading ? "جاري الرفع..." : "إرسال للمراجعة"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
