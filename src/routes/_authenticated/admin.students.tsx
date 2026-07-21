import { createFileRoute, useNavigate, Link, useRouterState, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, XCircle, Eye, Phone, School, MapPin, UserCog } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { impersonateStudent } from "@/lib/impersonate.functions";
import { useImpersonation } from "@/hooks/useImpersonation";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/students")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "لوحة الإدارة" }] }),
});

type Status = "pending" | "approved" | "rejected";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  father_phone: string;
  mother_phone: string;
  governorate: string;
  school: string;
  grade: string;
  gender: "male" | "female";
  national_id: string;
  id_card_url: string | null;
  status: Status;
  rejection_reason: string | null;
  created_at: string;
}

function AdminPage() {
  const [tab, setTab] = useState<Status>("pending");
  const matches = useRouterState({ select: (s) => s.matches });
  const isStudentProfile = matches.some((m) => m.routeId.endsWith("/students/$studentId"));
  if (isStudentProfile) return <Outlet />;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">الطلاب</h1>
        <p className="text-muted-foreground mt-1 text-sm">راجع طلبات التسجيل وقم بقبولها أو رفضها.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
        <TabsList>
          <TabsTrigger value="pending">قيد المراجعة</TabsTrigger>
          <TabsTrigger value="approved">مقبول</TabsTrigger>
          <TabsTrigger value="rejected">مرفوض</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-6"><RequestsList status="pending" /></TabsContent>
        <TabsContent value="approved" className="mt-6"><RequestsList status="approved" /></TabsContent>
        <TabsContent value="rejected" className="mt-6"><RequestsList status="rejected" /></TabsContent>
      </Tabs>
    </div>
  );
}

function RequestsList({ status }: { status: Status }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [rejectFor, setRejectFor] = useState<Profile | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  
  const { startImpersonation } = useImpersonation();

  const handleImpersonate = async (p: Profile) => {
    setImpersonatingId(p.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await impersonateStudent({ data: { studentId: p.id, token: session?.access_token } });
      if ((res as any)?.error) { toast.error((res as any).error); return; }
      await startImpersonation({
        studentId: p.id,
        studentName: p.full_name,
        studentEmail: p.email,
        tokenHash: res.tokenHash,
      });
      toast.success(`دخلت بحساب ${p.full_name}`);
      nav({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e?.message ?? "فشل الدخول لحساب الطالب");
    } finally {
      setImpersonatingId(null);
    }
  };


  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const mutate = useMutation({
    mutationFn: async ({ id, status: s, reason }: { id: string; status: Status; reason?: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status: s, rejection_reason: reason ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.status === "approved" ? "تم قبول الطالب" : "تم رفض الطلب");
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      setRejectFor(null);
      setRejectReason("");
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل العملية"),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!profiles?.length) {
    return <p className="text-center text-muted-foreground py-12">لا توجد طلبات في هذه الحالة.</p>;
  }

  return (
    <>
      <div className="grid gap-4">
        {profiles.map((p) => (
          <Card key={p.id} className="hover:shadow-elegant transition">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-[260px]">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold text-lg">{p.full_name}</h3>
                    <Badge variant={p.status === "pending" ? "secondary" : p.status === "approved" ? "default" : "destructive"}>
                      {p.status === "pending" ? "قيد المراجعة" : p.status === "approved" ? "مقبول" : "مرفوض"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>
                    <span className="flex items-center gap-1"><School className="h-3 w-3" />{p.school}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.governorate}</span>
                    <span>{p.grade}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" asChild className="gap-1">
                    <Link to="/admin/students/$studentId" params={{ studentId: p.id }}>
                      <Eye className="h-4 w-4" /> الملف الكامل
                    </Link>
                  </Button>
                  {p.status === "approved" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleImpersonate(p)}
                      disabled={impersonatingId === p.id}
                      className="gap-1"
                    >
                      {impersonatingId === p.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserCog className="h-4 w-4" />
                      )}
                      دخول بحسابه
                    </Button>
                  )}
                  {p.status !== "approved" && (
                    <Button size="sm" onClick={() => mutate.mutate({ id: p.id, status: "approved" })} className="gap-1 bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="h-4 w-4" /> قبول
                    </Button>
                  )}
                  {p.status !== "rejected" && (
                    <Button size="sm" variant="destructive" onClick={() => setRejectFor(p)} className="gap-1">
                      <XCircle className="h-4 w-4" /> رفض
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reject Dialog */}
      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>رفض الطلب</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">سبب الرفض (اختياري، هيظهر للطالب):</p>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} maxLength={500} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>إلغاء</Button>
            <Button
              variant="destructive"
              onClick={() => rejectFor && mutate.mutate({ id: rejectFor.id, status: "rejected", reason: rejectReason || undefined })}
              disabled={mutate.isPending}
            >
              {mutate.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


