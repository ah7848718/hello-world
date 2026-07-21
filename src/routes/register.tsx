import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";

export const Route = createFileRoute("/register")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: RegisterPage,
  head: () => ({ meta: [{ title: "إنشاء حساب | مستر حاتم سميكه" }] }),
});

const GOVERNORATES = [
  "القاهرة","الجيزة","الإسكندرية","القليوبية","الشرقية","الدقهلية","الغربية","المنوفية",
  "كفر الشيخ","البحيرة","دمياط","بورسعيد","الإسماعيلية","السويس","شمال سيناء","جنوب سيناء",
  "الفيوم","بني سويف","المنيا","أسيوط","سوهاج","قنا","الأقصر","أسوان","البحر الأحمر","مطروح","الوادي الجديد",
];

const GRADES = ["أولى ثانوي", "ثانية ثانوي", "ثالثة ثانوي"];

const schema = z.object({
  full_name: z.string().trim().min(7, "الاسم رباعي مطلوب (4 أسماء)").max(120),
  email: z.string().trim().email("بريد غير صحيح").max(255),
  password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل").max(72),
  phone: z.string().trim().regex(/^01[0-9]{9}$/, "رقم موبايل غير صحيح (11 رقم)"),
  father_phone: z.string().trim().regex(/^01[0-9]{9}$/, "رقم موبايل الأب غير صحيح"),
  mother_phone: z.string().trim().regex(/^01[0-9]{9}$/, "رقم موبايل الأم غير صحيح"),
  governorate: z.string().min(1, "اختر المحافظة"),
  school: z.string().trim().min(2, "اسم المدرسة مطلوب").max(150),
  grade: z.string().min(1, "اختر السنة الدراسية"),
  gender: z.enum(["male", "female"], { errorMap: () => ({ message: "اختر النوع" }) }),
  national_id: z.string().trim().regex(/^[0-9]{14}$/, "الرقم القومي 14 رقم"),
});

function RegisterPage() {
  const nav = useNavigate();
  const { data: contentSettings } = useQuery({
    queryKey: ["public-settings-registration"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "content")
        .maybeSingle();
      if (error) throw error;
      return data?.value ?? {};
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    father_phone: "",
    mother_phone: "",
    governorate: "",
    school: "",
    grade: "",
    gender: "" as "male" | "female" | "",
    national_id: "",
  });

  const set = (k: keyof typeof form) => (e: any) =>
    setForm((f) => ({ ...f, [k]: typeof e === "string" ? e : e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!idFile) {
      setError("صورة البطاقة مطلوبة");
      return;
    }
    if (idFile.size > 5 * 1024 * 1024) {
      setError("حجم صورة البطاقة لازم يكون أقل من 5 ميجا");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(idFile.type)) {
      setError("نوع الصورة لازم يكون JPG أو PNG أو WEBP");
      return;
    }

    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");
      return;
    }

    setLoading(true);
    try {
      // 1. signUp
      const { data: signUp, error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (signUpError) throw signUpError;
      const uid = signUp.user?.id;
      if (!uid) throw new Error("فشل إنشاء الحساب");

      // 2. upload ID card
      const ext = idFile.name.split(".").pop() ?? "jpg";
      const path = `${uid}/national-id.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("id-cards")
        .upload(path, idFile, { upsert: true, contentType: idFile.type });
      if (upErr) throw upErr;

      // 3. insert profile
      const { error: insErr } = await supabase.from("profiles").insert({
        id: uid,
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        father_phone: parsed.data.father_phone,
        mother_phone: parsed.data.mother_phone,
        governorate: parsed.data.governorate,
        school: parsed.data.school,
        grade: parsed.data.grade,
        gender: parsed.data.gender,
        national_id: parsed.data.national_id,
        id_card_url: path,
        status: "pending",
      });
      if (insErr) throw insErr;

      nav({ to: "/pending" });
    } catch (err: any) {
      setError(err.message ?? "حصل خطأ، حاول تاني");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-200px)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-3xl shadow-elegant">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-display">إنشاء حساب طالب جديد</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            املأ البيانات بدقّة. الحساب يتفعل بعد مراجعة الإدارة.
          </p>
        </CardHeader>
        <CardContent>
          {contentSettings?.registration_video_url ? (
            <div className="mb-4 text-center">
              <a
                href={contentSettings.registration_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition hover:bg-primary/90"
              >
                {contentSettings.registration_video_label_ar || "كيفية التسجيل على المنصة"}
              </a>
            </div>
          ) : null}
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label>الاسم رباعي *</Label>
              <Input value={form.full_name} onChange={set("full_name")} required placeholder="مثال: محمد أحمد علي حسن" />
            </div>

            <div className="space-y-2">
              <Label>البريد الإلكتروني *</Label>
              <Input type="email" value={form.email} onChange={set("email")} required dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور *</Label>
              <Input type="password" value={form.password} onChange={set("password")} required minLength={8} dir="ltr" />
            </div>

            <div className="space-y-2">
              <Label>رقم موبايلك *</Label>
              <Input value={form.phone} onChange={set("phone")} required dir="ltr" placeholder="01xxxxxxxxx" />
            </div>
            <div className="space-y-2">
              <Label>الرقم القومي *</Label>
              <Input value={form.national_id} onChange={set("national_id")} required dir="ltr" maxLength={14} />
            </div>

            <div className="space-y-2">
              <Label>رقم موبايل الأب *</Label>
              <Input value={form.father_phone} onChange={set("father_phone")} required dir="ltr" placeholder="01xxxxxxxxx" />
            </div>
            <div className="space-y-2">
              <Label>رقم موبايل الأم *</Label>
              <Input value={form.mother_phone} onChange={set("mother_phone")} required dir="ltr" placeholder="01xxxxxxxxx" />
            </div>

            <div className="space-y-2">
              <Label>المحافظة *</Label>
              <Select value={form.governorate} onValueChange={(v) => setForm((f) => ({ ...f, governorate: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                <SelectContent>
                  {GOVERNORATES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المدرسة *</Label>
              <Input value={form.school} onChange={set("school")} required />
            </div>

            <div className="space-y-2">
              <Label>السنة الدراسية *</Label>
              <Select value={form.grade} onValueChange={(v) => setForm((f) => ({ ...f, grade: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر السنة" /></SelectTrigger>
                <SelectContent>
                  {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>النوع *</Label>
              <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v as any }))}>
                <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">ذكر</SelectItem>
                  <SelectItem value="female">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>صورة البطاقة الشخصية *</Label>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-accent/40 transition">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {idFile ? idFile.name : "اضغط لرفع صورة البطاقة (JPG/PNG، أقل من 5MB)"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            {error && (
              <p className="md:col-span-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>
            )}

            <div className="md:col-span-2">
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                إنشاء الحساب وإرساله للمراجعة
              </Button>
            </div>
          </form>
          <p className="text-sm text-center mt-6 text-muted-foreground">
            عندك حساب؟{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">سجّل دخول</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
