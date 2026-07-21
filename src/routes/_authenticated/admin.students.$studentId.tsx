import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { impersonateStudent } from "@/lib/impersonate.functions";
import { useImpersonation } from "@/hooks/useImpersonation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight, BookOpen, CreditCard, FileQuestion, Loader2, UserCog, Mail, Phone, MapPin, School, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminUpdateStudentPassword, testPing } from "@/lib/admin-student-password.functions";

export const Route = createFileRoute("/_authenticated/admin/students/$studentId")({
  component: Page,
  head: () => ({ meta: [{ title: "ملف الطالب | لوحة الإدارة" }] }),
});

function Page() {
  const { studentId } = Route.useParams();
  const nav = useNavigate();
  
  const { startImpersonation } = useImpersonation();
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["student-profile", studentId],
    queryFn: async () => {
      const [{ data: profile }, { data: enrollments }, { data: payments }, { data: attempts }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", studentId).maybeSingle(),
        supabase.from("enrollments").select("id, status, started_at, course_id, courses(title, cover_url)").eq("student_id", studentId),
        supabase.from("payments").select("id, amount, method, status, created_at, courses(title)").eq("student_id", studentId).order("created_at", { ascending: false }),
        supabase.from("exam_attempts").select("id, score, max_score, status, submitted_at, exams(title)").eq("student_id", studentId).order("started_at", { ascending: false }),
      ]);
      return { profile, enrollments: enrollments ?? [], payments: payments ?? [], attempts: attempts ?? [] };
    },
  });

  const [idUrl, setIdUrl] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  useEffect(() => {
    if (!data?.profile?.id_card_url) { setIdUrl(null); return; }
    setIdError(null);
    if (data.profile.id_card_url.startsWith("http")) setIdUrl(data.profile.id_card_url);
    else supabase.storage.from("id-cards").createSignedUrl(data.profile.id_card_url, 300).then((res: any) => {
      if (res.error) { setIdError(res.error.message); setIdUrl(null); }
      else { setIdUrl(res.data?.signedUrl ?? null); }
    });
  }, [data?.profile?.id_card_url]);

  const handleImpersonate = async () => {
    if (!data?.profile) return;
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await impersonateStudent({ data: { studentId, token: session?.access_token } });
      if ((res as any)?.error) { toast.error((res as any).error); return; }
      await startImpersonation({
        studentId, studentName: data.profile.full_name,
        studentEmail: data.profile.email, tokenHash: res.tokenHash,
      });
      toast.success(`دخلت بحساب ${data.profile.full_name}`);
      nav({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e?.message ?? "فشل");
    } finally { setBusy(false); }
  };

  
  
  const testPingFn = async () => {
    const r = await testPing();
    console.log("testPing result", r);
    toast.success(JSON.stringify(r));
  };
  const [passOpen, setPassOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passBusy, setPassBusy] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { toast.error("كلمة المرور 8 أحرف على الأقل"); return; }
    if (newPassword !== confirmPassword) { toast.error("كلمتا المرور غير متطابقتين"); return; }
    setPassBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await adminUpdateStudentPassword({ data: { studentId, password: newPassword, token } });
      if ((res as any)?.error) { toast.error((res as any).error); return; }
      toast.success("تم تغيير كلمة المرور بنجاح");
      setPassOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast.error(e?.message ?? "فشل تغيير كلمة المرور");
    } finally { setPassBusy(false); }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data?.profile) return <p className="text-center text-muted-foreground py-12">الطالب غير موجود.</p>;

  const p = data.profile;
  const initials = p.full_name.split(" ").slice(0, 2).map((s: string) => s[0]).join("");
  const totalSpent = data.payments.filter((x: any) => x.status === "approved").reduce((sum: number, x: any) => sum + Number(x.amount), 0);
  const avgScore = data.attempts.length
    ? data.attempts.filter((a: any) => a.score != null && a.max_score).reduce((s: number, a: any) => s + (Number(a.score) / Number(a.max_score)) * 100, 0) / Math.max(1, data.attempts.filter((a: any) => a.score != null).length)
    : 0;

  return (
    <div className="space-y-6">
      <Link to="/admin/students" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="h-4 w-4" /> رجوع للطلاب
      </Link>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start gap-5">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-[240px] space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-display font-bold">{p.full_name}</h1>
                <Badge variant={p.status === "approved" ? "default" : p.status === "pending" ? "secondary" : "destructive"}>
                  {p.status === "approved" ? "مقبول" : p.status === "pending" ? "قيد المراجعة" : "مرفوض"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span>
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.father_phone}</span>
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.mother_phone}</span>
                <span className="flex items-center gap-1"><School className="h-3 w-3" />{p.school}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.governorate}</span>
                <span>{p.grade}</span>
                <span>{p.gender === "male" ? "ذكر" : "أنثى"}</span>
                <span>قومي: {p.national_id}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={testPingFn}>Test Ping</Button>
              <Dialog open={passOpen} onOpenChange={setPassOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <KeyRound className="h-4 w-4" />
                    تغيير كلمة المرور
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>تغيير كلمة مرور {p.full_name}</DialogTitle>
                    <DialogDescription>أدخل كلمة المرور الجديدة للطالب. يجب أن تكون 8 أحرف على الأقل.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>كلمة المرور الجديدة</Label>
                      <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} dir="ltr" minLength={8} />
                    </div>
                    <div className="space-y-2">
                      <Label>تأكيد كلمة المرور</Label>
                      <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} dir="ltr" />
                    </div>
                    <Button onClick={handleChangePassword} disabled={passBusy} className="w-full">
                      {passBusy && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                      حفظ
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              {p.status === "approved" && (
                <Button onClick={handleImpersonate} disabled={busy} variant="secondary" className="gap-2">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCog className="h-4 w-4" />}
                  دخول بحسابه
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<BookOpen className="h-5 w-5" />} label="كورسات مشترك" value={data.enrollments.length} />
        <Stat icon={<CreditCard className="h-5 w-5" />} label="إجمالي المدفوع" value={`${totalSpent} ج`} />
        <Stat icon={<FileQuestion className="h-5 w-5" />} label="محاولات امتحانات" value={data.attempts.length} />
        <Stat icon={<FileQuestion className="h-5 w-5" />} label="متوسط الدرجات" value={`${avgScore.toFixed(0)}%`} />
      </div>

      <Tabs defaultValue="enrollments">
        <TabsList>
          <TabsTrigger value="enrollments">الكورسات</TabsTrigger>
          <TabsTrigger value="payments">المدفوعات</TabsTrigger>
          <TabsTrigger value="exams">الامتحانات</TabsTrigger>
          <TabsTrigger value="id">البطاقة</TabsTrigger>
        </TabsList>

        <TabsContent value="enrollments" className="mt-4 space-y-3">
          {!data.enrollments.length ? (
            <EmptyText>لا توجد اشتراكات</EmptyText>
          ) : data.enrollments.map((e: any) => (
            <Card key={e.id}><CardContent className="p-4 flex items-center justify-between">
              <div><p className="font-medium">{e.courses?.title ?? "—"}</p>
                <p className="text-xs text-muted-foreground">بدأ: {new Date(e.started_at).toLocaleDateString("ar-EG")}</p></div>
              <Badge variant={e.status === "active" ? "default" : "secondary"}>{e.status}</Badge>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="payments" className="mt-4 space-y-3">
          {!data.payments.length ? <EmptyText>لا توجد مدفوعات</EmptyText> : data.payments.map((pm: any) => (
            <Card key={pm.id}><CardContent className="p-4 flex items-center justify-between">
              <div><p className="font-medium">{pm.courses?.title ?? "—"} · {pm.amount} ج</p>
                <p className="text-xs text-muted-foreground">{pm.method} · {new Date(pm.created_at).toLocaleDateString("ar-EG")}</p></div>
              <Badge variant={pm.status === "approved" ? "default" : pm.status === "pending" ? "secondary" : "destructive"}>{pm.status}</Badge>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="exams" className="mt-4 space-y-3">
          {!data.attempts.length ? <EmptyText>لا توجد محاولات</EmptyText> : data.attempts.map((a: any) => (
            <Card key={a.id}><CardContent className="p-4 flex items-center justify-between">
              <div><p className="font-medium">{a.exams?.title ?? "—"}</p>
                <p className="text-xs text-muted-foreground">الحالة: {a.status}</p></div>
              <p className="font-bold">{a.score ?? "-"} / {a.max_score ?? "-"}</p>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="id" className="mt-4">
          {idUrl ? (
            <a href={idUrl} target="_blank" rel="noreferrer"><img src={idUrl} alt="ID" className="max-w-md rounded-lg border" /></a>
          ) : idError ? (
            <EmptyText>خطأ في تحميل الصورة: {idError}</EmptyText>
          ) : <EmptyText>لا توجد صورة بطاقة</EmptyText>}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-muted-foreground flex items-center gap-2 text-xs">{icon}{label}</div>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </CardContent></Card>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <Card><CardContent className="p-8 text-center text-muted-foreground">{children}</CardContent></Card>;
}
