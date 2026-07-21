import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertSetting } from "@/lib/settings.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: Page,
  head: () => ({ meta: [{ title: "الإعدادات | لوحة الإدارة" }] }),
});

type Settings = Record<string, any>;

function Page() {
  const qc = useQueryClient();
    const { data, isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("key, value");
      const map: Settings = {};
      (data ?? []).forEach((r: any) => { map[r.key] = r.value; });
      return map;
    },
  });

  const save = useMutation({
    mutationFn: async (payload: { key: string; value: any }) => {
      const { data: { session } } = await supabase.auth.getSession();
      await upsertSetting({ data: { key: payload.key, value: typeof payload.value === 'string' ? payload.value : JSON.stringify(payload.value), token: session?.access_token } });
    },
    onSuccess: () => {
      toast.success("تم الحفظ");
      qc.invalidateQueries({ queryKey: ["platform-settings"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل الحفظ"),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">الإعدادات</h1>
        <p className="text-muted-foreground mt-1 text-sm">إعدادات المنصة، السوشيال، SEO، طرق الدفع.</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="general">عام</TabsTrigger>
          <TabsTrigger value="social">السوشيال</TabsTrigger>
          <TabsTrigger value="content">المحتوى</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="payments">طرق الدفع</TabsTrigger>
          <TabsTrigger value="branding">الهوية</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <SettingsForm
            current={data?.general ?? {}}
            fields={[
              { key: "platform_name", label: "اسم المنصة", placeholder: "MR. HATEM SIMIKA" },
              { key: "tagline", label: "العنوان الفرعي", placeholder: "منصة تعلم اللغة الإنجليزية" },
              { key: "support_email", label: "بريد الدعم", placeholder: "info@hatemsimika.com" },
              { key: "support_phone", label: "هاتف الدعم", placeholder: "01000000000" },
            ]}
            onSave={(v) => save.mutate({ key: "general", value: v })}
            saving={save.isPending}
          />
        </TabsContent>

        <TabsContent value="social" className="mt-6">
          <SettingsForm
            current={data?.social ?? {}}
            fields={[
              { key: "facebook", label: "Facebook" },
              { key: "instagram", label: "Instagram" },
              { key: "youtube", label: "YouTube" },
              { key: "tiktok", label: "TikTok" },
              { key: "whatsapp", label: "WhatsApp" },
              { key: "telegram", label: "Telegram" },
            ]}
            onSave={(v) => save.mutate({ key: "social", value: v })}
            saving={save.isPending}
          />
        </TabsContent>

        <TabsContent value="content" className="mt-6">
          <SettingsForm
            current={data?.content ?? {}}
            fields={[
              { key: "hero_title_ar", label: "عنوان الهيرو (عربي)" },
              { key: "hero_subtitle_ar", label: "وصف الهيرو (عربي)", textarea: true },
              { key: "hero_cta_ar", label: "زر CTA الأول (عربي)" },
              { key: "hero_cta2_ar", label: "زر CTA الثاني (عربي)" },
              { key: "hero_feature_1_ar", label: "ميزة الهيرو 1 (عربي)" },
              { key: "hero_feature_2_ar", label: "ميزة الهيرو 2 (عربي)" },
              { key: "hero_feature_3_ar", label: "ميزة الهيرو 3 (عربي)" },
              { key: "hero_feature_4_ar", label: "ميزة الهيرو 4 (عربي)" },
              { key: "hero_title_en", label: "Hero Title (English)" },
              { key: "hero_subtitle_en", label: "Hero Subtitle (English)", textarea: true },
              { key: "hero_cta_en", label: "Hero CTA Button 1 (English)" },
              { key: "hero_cta2_en", label: "Hero CTA Button 2 (English)" },
              { key: "hero_feature_1_en", label: "Hero Feature 1 (English)" },
              { key: "hero_feature_2_en", label: "Hero Feature 2 (English)" },
              { key: "hero_feature_3_en", label: "Hero Feature 3 (English)" },
              { key: "hero_feature_4_en", label: "Hero Feature 4 (English)" },
              { key: "registration_video_url", label: "رابط فيديو شرح التسجيل" },
              { key: "registration_video_label_ar", label: "نص زر التسجيل (عربي)" },
              { key: "registration_video_label_en", label: "Registration button label (English)" },
              { key: "footer_about_ar", label: "نبذة الفوتر (عربي)", textarea: true },
              { key: "footer_about_en", label: "Footer About (English)", textarea: true },
              { key: "contact_address_ar", label: "عنوان التواصل (عربي)" },
              { key: "contact_address_en", label: "Contact Address (English)" },
            ]}
            onSave={(v) => save.mutate({ key: "content", value: v })}
            saving={save.isPending}
          />
        </TabsContent>

        <TabsContent value="seo" className="mt-6">
          <SettingsForm
            current={data?.seo ?? {}}
            fields={[
              { key: "meta_title", label: "Meta Title" },
              { key: "meta_description", label: "Meta Description", textarea: true },
              { key: "meta_keywords", label: "Keywords" },
              { key: "og_image", label: "Open Graph Image URL" },
            ]}
            onSave={(v) => save.mutate({ key: "seo", value: v })}
            saving={save.isPending}
          />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <SettingsForm
            current={data?.payments ?? {}}
            fields={[
              { key: "vcash_number", label: "رقم Vodafone Cash" },
              { key: "vcash_name", label: "الاسم على المحفظة" },
              { key: "instapay_handle", label: "InstaPay Handle" },
              { key: "instructions", label: "تعليمات الدفع", textarea: true },
            ]}
            onSave={(v) => save.mutate({ key: "payments", value: v })}
            saving={save.isPending}
          />
        </TabsContent>

        <TabsContent value="branding" className="mt-6">
          <SettingsForm
            current={data?.branding ?? {}}
            fields={[
              { key: "logo_url", label: "رابط اللوجو" },
              { key: "favicon_url", label: "رابط Favicon" },
              { key: "hero_banner", label: "بانر الهوم" },
              { key: "primary_color", label: "اللون الأساسي (oklch)" },
            ]}
            onSave={(v) => save.mutate({ key: "branding", value: v })}
            saving={save.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface Field { key: string; label: string; placeholder?: string; textarea?: boolean }

function SettingsForm({ current, fields, onSave, saving }: {
  current: Record<string, any>;
  fields: Field[];
  onSave: (v: Record<string, any>) => void;
  saving: boolean;
}) {
  const [state, setState] = useState<Record<string, string>>({});
  useEffect(() => {
    const init: Record<string, string> = {};
    fields.forEach((f) => { init[f.key] = current[f.key] ?? ""; });
    setState(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.key} className={`space-y-2 ${f.textarea ? "md:col-span-2" : ""}`}>
              <Label>{f.label}</Label>
              {f.textarea ? (
                <Textarea value={state[f.key] ?? ""} onChange={(e) => setState({ ...state, [f.key]: e.target.value })} rows={3} />
              ) : (
                <Input value={state[f.key] ?? ""} onChange={(e) => setState({ ...state, [f.key]: e.target.value })} placeholder={f.placeholder} />
              )}
            </div>
          ))}
        </div>
        <Button onClick={() => onSave(state)} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
          حفظ
        </Button>
      </CardContent>
    </Card>
  );
}
