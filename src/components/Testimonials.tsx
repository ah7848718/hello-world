import { Quote, Star } from "lucide-react";
import { useApp } from "@/lib/providers";

export function Testimonials() {
  const { t } = useApp();
  const items = ["t1", "t2", "t3"];

  return (
    <section className="py-20 lg:py-24 bg-surface">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground">
            {t("testimonials.title")}
          </h2>
          <p className="mt-3 text-muted-foreground">{t("testimonials.subtitle")}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {items.map((k) => (
            <figure
              key={k}
              className="relative p-7 rounded-3xl bg-card border border-border hover:shadow-soft transition-all"
            >
              <Quote className="absolute top-5 end-5 h-7 w-7 text-primary/15" />
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-brand-red text-brand-red" />
                ))}
              </div>
              <blockquote className="text-sm text-foreground/85 leading-relaxed">
                {t(`${k}.text`)}
              </blockquote>
              <figcaption className="mt-5 pt-5 border-t border-border flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold">
                  {t(`${k}.name`).charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground">{t(`${k}.name`)}</div>
                  <div className="text-xs text-muted-foreground">{t(`${k}.role`)}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
