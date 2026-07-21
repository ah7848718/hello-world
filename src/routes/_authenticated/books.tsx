import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, ImageIcon, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/books")({
  component: BooksPage,
  head: () => ({ meta: [{ title: "الكتب | مستر حاتم سميكه" }] }),
});

type Book = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  price: number;
  discount_percent: number;
  grade: string | null;
};

function BooksPage() {
  const { data: books, isLoading } = useQuery({
    queryKey: ["public-books"],
    queryFn: async () => {
      const { data } = await supabase
        .from("books")
        .select("id,title,description,cover_url,price,discount_percent,grade")
        .eq("is_published", true)
        .order("order_index");
      return (data ?? []) as Book[];
    },
  });

  if (isLoading) return <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="container max-w-7xl mx-auto px-4 pb-8 space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <BookOpen className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">كتب المدرس</h1>
          <p className="text-muted-foreground mt-1 text-sm">اطلع على الكتب واطلب نسختك.</p>
        </div>
      </div>

      {!books?.length ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">مفيش كتب متاحة دلوقتي.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {books.map((b, i) => {
            const finalPrice = b.price * (1 - (b.discount_percent ?? 0) / 100);
            return (
              <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow group h-full flex flex-col">
                  <Link to="/books/$bookId" params={{ bookId: b.id }} className="block">
                    <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                      {b.cover_url ? (
                        <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-muted-foreground"><ImageIcon className="h-12 w-12" /></div>
                      )}
                      {b.discount_percent > 0 && <Badge className="absolute top-2 right-2 bg-red-500">خصم {b.discount_percent}%</Badge>}
                    </div>
                  </Link>
                  <CardContent className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold line-clamp-2">{b.title}</h3>
                    {b.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.description}</p>}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t">
                      <div className="flex items-baseline gap-1">
                        {b.discount_percent > 0 ? (
                          <>
                            <span className="text-lg font-bold text-primary">{finalPrice.toFixed(0)} ج</span>
                            <span className="text-xs text-muted-foreground line-through">{b.price} ج</span>
                          </>
                        ) : (
                          <span className="text-lg font-bold text-primary">{b.price} ج</span>
                        )}
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/books/$bookId" params={{ bookId: b.id }}><ShoppingCart className="h-4 w-4 ml-1" />طلب</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
