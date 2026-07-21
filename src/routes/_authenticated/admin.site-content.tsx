import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertSetting } from "@/lib/settings.functions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/site-content")({
  component: Page,
  head: () => ({ meta: [{ title: "التعديل على الموقع | لوحة الإدارة" }] }),
});

const defaults: Record<string, string> = {
  hero_title_ar: "تعلّم الإنجليزية مع مستر حاتم سميكه",
  hero_feature_1_ar: "شرح واضح ومنظّم لكل المنهج خطوة بخطوة",
  hero_feature_2_ar: "مذكرات وملخصات PDF جاهزة للتحميل",
  hero_feature_3_ar: "أسئلة وامتحانات تفاعلية لتثبيت المعلومة",
  hero_feature_4_ar: "محتوى مخصص لكل صف من الصفوف الثانوية",
  hero_desc_ar: "منصة تعليمية عملية مبنية لتجربة دراسة بسيطة وواضحة.",
  hero_cta_ar: "تصفح الكورسات",
  hero_cta2_ar: "اعرف أكثر",
  hero_title_en: "Learn English with Mr. Hatem Sameka",
  hero_feature_1_en: "Clear, organized lessons covering the full syllabus",
  hero_feature_2_en: "Ready-to-download PDF notes and summaries",
  hero_feature_3_en: "Interactive exams to lock the info",
  hero_feature_4_en: "Tailored content for every secondary grade",
  hero_desc_en: "A practical learning platform built for a simple, focused study experience.",
  hero_cta_en: "Browse Courses",
  hero_cta2_en: "Learn More",
  stats_tag_ar: "أرقام نفتخر بها",
  stats_title_ar: "رحلة تعليمية فيها آلاف الطلاب وصلوا للتفوّق",
  stats_tag_en: "Numbers we're proud of",
  stats_title_en: "Thousands of students reaching excellence",
  stats_label_1_ar: "طالب مشترك",
  stats_label_2_ar: "محاضرة",
  stats_label_3_ar: "نسبة النجاح",
  stats_label_4_ar: "سنوات خبرة",
  stats_label_1_en: "Students",
  stats_label_2_en: "Lectures",
  stats_label_3_en: "Success Rate",
  stats_label_4_en: "Years Experience",
  stats_number_1: "15000",
  stats_number_2: "320",
  stats_number_3: "95",
  stats_number_4: "8",
  stats_suffix_3: "%",
};

const fields: { key: string; label: string; ta?: boolean }[] = [
  { key: "hero_title_ar", label: "عنوان الهيرو (عربي)" },
  { key: "hero_feature_1_ar", label: "الميزة 1 (عربي)", ta: true },
  { key: "hero_feature_2_ar", label: "الميزة 2 (عربي)", ta: true },
  { key: "hero_feature_3_ar", label: "الميزة 3 (عربي)", ta: true },
  { key: "hero_feature_4_ar", label: "الميزة 4 (عربي)", ta: true },
  { key: "hero_desc_ar", label: "الوصف (عربي)", ta: true },
  { key: "hero_cta_ar", label: "زر CTA 1 (عربي)" },
  { key: "hero_cta2_ar", label: "زر CTA 2 (عربي)" },
  { key: "hero_title_en", label: "Hero Title (English)" },
  { key: "hero_feature_1_en", label: "Feature 1 (English)", ta: true },
  { key: "hero_feature_2_en", label: "Feature 2 (English)", ta: true },
  { key: "hero_feature_3_en", label: "Feature 3 (English)", ta: true },
  { key: "hero_feature_4_en", label: "Feature 4 (English)", ta: true },
  { key: "hero_desc_en", label: "Description (English)", ta: true },
  { key: "hero_cta_en", label: "CTA Button 1 (English)" },
  { key: "hero_cta2_en", label: "CTA Button 2 (English)" },
  { key: "stats_tag_ar", label: "وسم الإحصاءات (عربي)" },
  { key: "stats_title_ar", label: "عنوان الإحصاءات (عربي)" },
  { key: "stats_tag_en", label: "Stats Tag (English)" },
  { key: "stats_title_en", label: "Stats Title (English)" },
  { key: "stats_label_1_ar", label: "إحصاء 1 (عربي)" },
  { key: "stats_label_2_ar", label: "إحصاء 2 (عربي)" },
  { key: "stats_label_3_ar", label: "إحصاء 3 (عربي)" },
  { key: "stats_label_4_ar", label: "إحصاء 4 (عربي)" },
  { key: "stats_label_1_en", label: "Stat 1 (English)" },
  { key: "stats_label_2_en", label: "Stat 2 (English)" },
  { key: "stats_label_3_en", label: "Stat 3 (English)" },
  { key: "stats_label_4_en", label: "Stat 4 (English)" },
  { key: "stats_number_1", label: "رقم الإحصاء 1" },
  { key: "stats_number_2", label: "رقم الإحصاء 2" },
  { key: "stats_number_3", label: "رقم الإحصاء 3" },
  { key: "stats_number_4", label: "رقم الإحصاء 4" },
  { key: "stats_suffix_3", label: "لاحقة الإحصاء 3" },
  { key: "footer_about_ar", label: "نبذة الفوتر (عربي)", ta: true },
  { key: "footer_about_en", label: "Footer About (English)", ta: true },
  { key: "whatsapp", label: "رقم الواتساب" },
];

function Page() {
  const qc = useQueryClient();
    const { data } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("key, value");
      const m: Record<string, any> = {};
      (data ?? []).forEach((r: any) => { m[r.key] = r.value; });
      return m;
    },
  });

  const savedContent = { ...defaults, ...(data?.content ?? {}), ...(data?.social ?? {}) };

  const [vals, setVals] = useState<Record<string, string>>({});
  useEffect(() => {
    const init: Record<string, string> = {};
    fields.forEach((f) => { init[f.key] = savedContent[f.key] ?? ""; });
    setVals(init);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const content: Record<string, string> = {};
      fields.forEach((f) => { content[f.key] = vals[f.key] ?? ""; });
      const { data: { session } } = await supabase.auth.getSession();
      await upsertSetting({ data: { key: "content", value: JSON.stringify(content), token: session?.access_token } });
    },
    onSuccess: () => {
      toast.success("تم الحفظ");
      qc.invalidateQueries({ queryKey: ["platform-settings"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل الحفظ"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">التعديل على الموقع</h1>
        <p className="text-muted-foreground mt-1 text-sm">تعديل محتوى الصفحة الرئيسية والفوتر.</p>
      </div>

      <div className="space-y-5">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <label className="text-sm font-medium">{f.label}</label>
            {f.ta ? (
              <Textarea value={vals[f.key] ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} rows={3} />
            ) : (
              <Input value={vals[f.key] ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
            )}
          </div>
        ))}
      </div>

      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? <Loader2 className="h-4 w-4 ms-2 animate-spin" /> : <Save className="h-4 w-4 ms-2" />}
        حفظ الكل
      </Button>
    </div>
  );
}
