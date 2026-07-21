import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/exams")({
  component: AdminExamsPage,
  head: () => ({ meta: [{ title: "إدارة الامتحانات" }] }),
});

type ExamRow = {
  id: string;
  title: string;
  description: string | null;
  type: "quiz" | "assignment" | "major";
  duration_minutes: number | null;
  is_published: boolean;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
};

function AdminExamsPage() {
  const { role, loading, user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isIndex = pathname === "/admin/exams";

  useEffect(() => {
    if (!loading && role !== "admin") nav({ to: "/dashboard" });
  }, [loading, role, nav]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as ExamRow[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-exams"] }); toast.success("تم الحذف"); },
    onError: (e: any) => toast.error(e?.message ?? "فشل الحذف"),
  });

  const togglePub = useMutation({
    mutationFn: async ({ id, val }: { id: string; val: boolean }) => {
      const { error } = await supabase.from("exams").update({ is_published: val }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-exams"] }),
  });

  if (!isIndex) {
    return <Outlet />;
  }

  if (loading || role !== "admin") {
    return <div className="min-h-[60dvh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">إدارة الامتحانات</h1>
          <p className="text-muted-foreground mt-1">أنشئ كويزات، واجبات، وامتحانات شاملة.</p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/admin/exams/new"><Plus className="h-4 w-4" /> امتحان جديد</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !data?.length ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">لسه مفيش امتحانات. ابدأ بإنشاء واحد.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {data.map((e) => (
            <Card key={e.id}>
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold">{e.title}</h3>
                      <Badge variant="outline">{e.type === "quiz" ? "كويز" : e.type === "assignment" ? "واجب" : "شامل"}</Badge>
                      {e.duration_minutes && <Badge variant="secondary">{e.duration_minutes} د</Badge>}
                    </div>
                    {e.description && <p className="text-sm text-muted-foreground line-clamp-1">{e.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-md border">
                    <Switch checked={e.is_published} onCheckedChange={(v) => togglePub.mutate({ id: e.id, val: v })} />
                    <span className="text-xs">{e.is_published ? "منشور" : "مخفي"}</span>
                  </div>
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <Link to="/admin/exams/$examId" params={{ examId: e.id }}><Pencil className="h-4 w-4" /> تعديل</Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>حذف الامتحان؟</AlertDialogTitle><AlertDialogDescription>لا يمكن التراجع عن الحذف.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => del.mutate(e.id)}>حذف</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


