import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useApp } from "@/lib/providers";

export function FAQ() {
  const { t } = useApp();
  const items = ["q1", "q2", "q3", "q4"];

  return (
    <section className="py-20 lg:py-24 bg-surface">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground">
            {t("faq.title")}
          </h2>
          <p className="mt-3 text-muted-foreground">{t("faq.subtitle")}</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {items.map((q) => (
              <AccordionItem
                key={q}
                value={q}
                className="bg-card border border-border rounded-2xl px-5 data-[state=open]:shadow-soft data-[state=open]:border-primary/30 transition"
              >
                <AccordionTrigger className="text-start font-semibold text-foreground hover:no-underline py-5">
                  {t(`faq.${q}`)}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                  {t(`faq.a${q.slice(1)}`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
