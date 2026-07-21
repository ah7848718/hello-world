import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, BookOpen, Package, FileText, Loader2 } from "lucide-react";

const schema = z.object({
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(schema),
  component: SearchPage,
  head: () => ({ meta: [{ title: "بحث | مستر حاتم سميكه" }] }),
});

type Row = { id: string; title: string; description: string | null; type: "course" | "bundle" | "book"; href: string };

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const [value, setValue] = useState(q);
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => setValue(q), [q]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!q.trim()) { setRows([]); return; }
      setRows(null);
      const like = `%${q.trim()}%`;
      const [cs, bs, bk] = await Promise.all([
        supabase.from("courses").select("id,title,description").eq("is_published", true).eq("is_center_only", false).or(`title.ilike.${like},description.ilike.${like}`).limit(20),
        supabase.from("bundles").select("id,title,description").eq("is_published", true).or(`title.ilike.${like},description.ilike.${like}`).limit(20),
        supabase.from("books").select("id,title,description").eq("is_published", true).or(`title.ilike.${like},description.ilike.${like}`).limit(20),
      ]);
      if (cancelled) return;
      const out: Row[] = [
        ...((cs.data ?? []) as any[]).map((r) => ({ ...r, type: "course" as const, href: `/courses/${r.id}` })),
        ...((bs.data ?? []) as any[]).map((r) => ({ ...r, type: "bundle" as const, href: `/courses` })),
        ...((bk.data ?? []) as any[]).map((r) => ({ ...r, type: "book" as const, href: `/books/${r.id}` })),
      ];
      setRows(out);
    })();
    return () => { cancelled = true; };
  }, [q]);

  const grouped = useMemo(() => ({
    course: (rows ?? []).filter((r) => r.type === "course"),
    bundle: (rows ?? []).filter((r) => r.type === "bundle"),
    book: (rows ?? []).filter((r) => r.type === "book"),
  }), [rows]);

  return (
    <div className="container max-w-5xl mx-auto px-4 pt-28 pb-12 space-y-6">
      <h1 className="text-3xl font-display font-bold">نتائج البحث</h1>
      <form
        onSubmit={(e) => { e.preventDefault(); navigate({ search: { q: value.trim() } }); }}
        className="relative"
      >
        <SearchIcon className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ابحث عن كورس، باقة، ملزمة..."
          className="h-12 pe-10 text-base"
        />
      </form>

      {!q.trim() ? (
        <p className="text-muted-foreground">اكتب كلمة للبحث في الكورسات والباقات والملازم.</p>
      ) : rows === null ? (
        <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-10 text-center text-muted-foreground">مفيش نتائج لـ "{q}"</CardContent></Card>
      ) : (
        <div className="space-y-8">
          {([
            { key: "course", label: "الكورسات", Icon: BookOpen },
            { key: "bundle", label: "الباقات", Icon: Package },
            { key: "book", label: "الملازم", Icon: FileText },
          ] as const).map(({ key, label, Icon }) => grouped[key].length > 0 && (
            <section key={key} className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-bold"><Icon className="h-5 w-5 text-primary" />{label} ({grouped[key].length})</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {grouped[key].map((r) => (
                  <Link key={`${r.type}-${r.id}`} to={r.href as any} className="block">
                    <Card className="hover:shadow-md hover:border-primary/40 transition">
                      <CardContent className="p-4">
                        <h3 className="font-semibold line-clamp-1">{r.title}</h3>
                        {r.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{r.description}</p>}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
