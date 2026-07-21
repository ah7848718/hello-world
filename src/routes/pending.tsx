import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, XCircle, CheckCircle2, LogOut } from "lucide-react";

export const Route = createFileRoute("/pending")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", data.session.user.id)
      .maybeSingle();
    if (profile?.status === "approved") throw redirect({ to: "/dashboard" });
  },
  component: PendingPage,
  head: () => ({ meta: [{ title: "مراجعة الحساب | مستر حاتم سميكه" }] }),
});

function PendingPage() {
  const { profile, signOut, loading } = useAuth();

  if (loading) return null;

  const status = profile?.status ?? "pending";

  return (
    <div className="min-h-[calc(100dvh-200px)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg shadow-elegant text-center">
        <CardContent className="p-8 space-y-4">
          {status === "rejected" ? (
            <>
              <XCircle className="h-16 w-16 text-destructive mx-auto" />
              <h1 className="text-2xl font-display font-bold">تم رفض حسابك</h1>
              {profile?.rejection_reason && (
                <p className="text-sm text-muted-foreground bg-destructive/10 p-3 rounded-md">
                  السبب: {profile.rejection_reason}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                للاستفسار، يرجى التواصل مع الإدارة.
              </p>
            </>
          ) : status === "approved" ? (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
              <h1 className="text-2xl font-display font-bold">تم قبول حسابك!</h1>
              <Button asChild>
                <Link to="/dashboard">ادخل للوحة التحكم</Link>
              </Button>
            </>
          ) : (
            <>
              <Clock className="h-16 w-16 text-brand-gold mx-auto" />
              <h1 className="text-2xl font-display font-bold">حسابك تحت المراجعة</h1>
              <p className="text-muted-foreground">
                أهلاً {profile?.full_name?.split(" ")[0] ?? ""}،<br />
                تم استلام طلب التسجيل بنجاح. حسابك حالياً قيد المراجعة من إدارة المنصة.
                <br />
                هتلاقي رسالة هنا أول ما يتقبل.
              </p>
            </>
          )}
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
