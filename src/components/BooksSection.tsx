import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/providers";

export function BooksSection() {
  const { t } = useApp();
  const books = [
    { key: "books.b1", pages: 142 },
    { key: "books.b2", pages: 96 },
    { key: "books.b3", pages: 180 },
  ];

  return (
    <section className="py-20 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground">
            {t("books.title")}
          </h2>
          <p className="mt-3 text-muted-foreground">{t("books.subtitle")}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {books.map((b) => (
            <div
              key={b.key}
              className="p-6 rounded-2xl bg-card border border-border hover:shadow-soft hover:border-primary/30 transition-all flex items-center gap-4"
            >
              <div className="h-16 w-12 rounded-md bg-gradient-to-b from-primary to-primary-glow flex items-center justify-center text-primary-foreground shrink-0 shadow-soft">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{t(b.key)}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{b.pages} pages · PDF</p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0">
                <Download className="me-1.5 h-4 w-4" />
                {t("books.download")}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
