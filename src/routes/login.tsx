import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
  head: () => ({ meta: [{ title: "تسجيل الدخول | مستر حاتم سميكه" }] }),
});

function LoginPage() {
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("البريد أو كلمة المرور غير صحيحة");
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin") || email === "admin@gmail.com";
    window.location.href = isAdmin ? "/admin" : "/dashboard";
  };

  return (
    <div className="min-h-[calc(100dvh-200px)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-display">تسجيل الدخول</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">أهلاً بعودتك 👋</p>
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
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              دخول
            </Button>
          </form>
          <p className="text-sm text-center mt-6 text-muted-foreground">
            مالكش حساب؟{" "}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              سجّل دلوقتي
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
