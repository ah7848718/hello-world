import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/providers";

export function CtaBand() {
  const { t } = useApp();
  return (
    <section className="py-20 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-[2rem] bg-primary p-10 lg:p-14 text-center">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -top-20 -start-20 w-80 h-80 rounded-full bg-primary-glow/40 blur-3xl" />
            <div className="absolute -bottom-20 -end-20 w-80 h-80 rounded-full bg-brand-red/30 blur-3xl" />
          </div>

          <div className="relative max-w-2xl mx-auto text-primary-foreground">
            <h2 className="font-display text-3xl lg:text-4xl font-bold leading-tight">
              {t("cta.title")}
            </h2>
            <p className="mt-4 text-primary-foreground/85 leading-relaxed">{t("cta.subtitle")}</p>
            <Button
              size="lg"
              className="mt-7 bg-white text-primary hover:bg-white/95 h-12 px-8 text-base shadow-elegant"
            >
              {t("cta.btn")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
