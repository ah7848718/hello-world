import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Video, Loader2, FileText } from "lucide-react";

type LectureRow = {
  id: string;
  title: string;
  is_free: boolean;
  pdf_url: string | null;
  video_provider: string | null;
  chapter_id: string;
  course_id?: string;
  course_title?: string;
  chapter_title?: string;
};

export const Route = createFileRoute("/_authenticated/admin/lectures")({
  component: Page,
  head: () => ({ meta: [{ title: "كل المحاضرات | لوحة الإدارة" }] }),
});

function Page() {
  const [rows, setRows] = useState<LectureRow[] | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data: lectures, error } = await supabase
      .from("lectures")
      .select("id, title, is_free, pdf_url, video_provider, chapter_id")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error(error.message);
      setRows([]);
      return;
    }
    const chapterIds = [...new Set((lectures ?? []).map((l: any) => l.chapter_id))];
    const { data: chapters } = chapterIds.length
      ? await supabase
          .from("chapters")
          .select("id, title, unit_id")
          .in("id", chapterIds)
      : { data: [] as Array<{ id: string; title: string; unit_id: string }> };
    const unitIds = [...new Set((chapters ?? []).map((c: any) => c.unit_id))];
    const { data: units } = unitIds.length
      ? await supabase
          .from("units")
          .select("id, course_id")
          .in("id", unitIds)
      : { data: [] as Array<{ id: string; course_id: string }> };
    const courseIds = [...new Set((units ?? []).map((u: any) => u.course_id))];
    const { data: courses } = courseIds.length
      ? await supabase.from("courses").select("id, title").in("id", courseIds)
      : { data: [] as Array<{ id: string; title: string }> };

    const chMap = new Map<string, any>((chapters ?? []).map((c: any) => [c.id, c]));
    const unitMap = new Map<string, any>((units ?? []).map((u: any) => [u.id, u]));
    const courseMap = new Map<string, any>((courses ?? []).map((c: any) => [c.id, c]));

    setRows(
      (lectures ?? []).map((l: any) => {
        const ch = chMap.get(l.chapter_id);
        const u = ch ? unitMap.get(ch.unit_id) : undefined;
        const c = u ? courseMap.get(u.course_id) : undefined;
        return {
          ...l,
          chapter_title: ch?.title,
          course_id: c?.id,
          course_title: c?.title,
        };
      }),
    );
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = (rows ?? []).filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.course_title?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">المحاضرات</h1>
          <p className="text-muted-foreground text-sm mt-1">
            كل المحاضرات في كل الكورسات. لإضافة/تعديل ادخل من صفحة الكورس.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ابحث في المحاضرات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9 w-72"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows === null ? (
            <div className="grid place-items-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Video className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">لا توجد محاضرات.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المحاضرة</TableHead>
                  <TableHead>الفصل</TableHead>
                  <TableHead>الكورس</TableHead>
                  <TableHead>المزود</TableHead>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Video className="h-4 w-4 text-primary" />
                      {l.title}
                      {l.pdf_url && (
                        <FileText className="h-3 w-3 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {l.chapter_title}
                    </TableCell>
                    <TableCell className="text-sm">{l.course_title}</TableCell>
                    <TableCell>
                      {l.video_provider && (
                        <Badge variant="outline">{l.video_provider}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {l.is_free && <Badge variant="secondary">مجاني</Badge>}
                    </TableCell>
                    <TableCell className="text-end">
                      {l.course_id && (
                        <Link
                          to="/admin/courses/$courseId"
                          params={{ courseId: l.course_id }}
                        >
                          <Button size="sm" variant="outline">
                            فتح
                          </Button>
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
