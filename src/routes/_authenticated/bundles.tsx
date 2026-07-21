import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/bundles")({
  component: BundlesPage,
  head: () => ({ meta: [{ title: "الباقات | مستر حاتم سميكه" }] }),
});

type Bundle = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  grade: string | null;
  bundle_type: string;
  term: string | null;
  months: string[] | null;
  price: number;
  discount_percent: number;
};

function BundlesPage() {
  const navigate = useNavigate();
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  const { data: bundles = [], isLoading } = useQuery({
    queryKey: ["bundles-page"],
    queryFn: async () => {
      const { data } = await supabase.from("bundles").select("*").eq("is_published", true).order("order_index");
      return (data ?? []) as Bundle[];
    },
  });

  const grades = useMemo(() => {
    const set = new Set<string>();
    bundles.forEach((b) => b.grade && set.add(b.grade));
    return Array.from(set);
  }, [bundles]);

  const filteredBundles = bundles.filter((b) => {
    if (gradeFilter !== "all" && b.grade !== gradeFilter) return false;
    return true;
  });

  if (isLoading) {
    return <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 pb-8 space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold">الباقات</h1>
        <p className="text-muted-foreground mt-2">وفّر فلوسك واختار الباقة المناسبة ليك.</p>
      </div>

      {grades.length > 0 && (
        <Tabs value={gradeFilter} onValueChange={setGradeFilter}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">الكل</TabsTrigger>
            {grades.map((g) => <TabsTrigger key={g} value={g}>{g}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      )}

      {filteredBundles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">لا توجد باقات مطابقة</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBundles.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent hover:shadow-xl transition-shadow">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary-glow/20 relative">
                  {b.cover_url ? (
                    <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-primary/40"><Package className="h-12 w-12" /></div>
                  )}
                  {b.discount_percent > 0 && (
                    <Badge className="absolute top-2 right-2 bg-amber-500">وفّر {b.discount_percent}%</Badge>
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold line-clamp-1">{b.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {b.bundle_type === "term" ? `باقة ${b.term ?? "ترم كامل"}` : `باقة ${(b.months ?? []).join(" + ")}`}
                    </p>
                  </div>
                  {b.description && <p className="text-sm text-muted-foreground line-clamp-2">{b.description}</p>}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-baseline gap-2">
                      {b.discount_percent > 0 ? (
                        <>
                          <span className="text-lg font-bold text-primary">{(b.price * (1 - b.discount_percent / 100)).toFixed(0)} ج</span>
                          <span className="text-xs text-muted-foreground line-through">{b.price} ج</span>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-primary">{b.price} ج</span>
                      )}
                    </div>
                    <Button asChild size="sm">
                      <Link to="/payments/new" search={{ bundleId: b.id } as any}>اشترك</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
