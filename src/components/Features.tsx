import {
  BookOpenCheck,
  FileText,
  MessagesSquare,
  LineChart,
} from "lucide-react";
import { useApp } from "@/lib/providers";

const CARD_ITEMS = [
  {
    icon: BookOpenCheck,
    titleKey: "w1.title",
    descKey: "w1.desc",
    highlightIndex: [4, 5, 6, 7, 8],
  },
  {
    icon: FileText,
    titleKey: "w2.title",
    descKey: "w2.desc",
    highlightIndex: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  },
  {
    icon: MessagesSquare,
    titleKey: "w3.title",
    descKey: "w3.desc",
    highlightIndex: [0, 1, 2, 3, 4],
  },
  {
    icon: LineChart,
    titleKey: "w4.title",
    descKey: "w4.desc",
    highlightIndex: [0, 1, 2, 3, 4, 5, 6],
  },
];

function HighlightedTitle({ text, highlightIndices }: { text: string; highlightIndices: number[] }) {
  return (
    <h3 className="font-display font-bold text-xl lg:text-2xl text-foreground mb-3 leading-relaxed">
      {[...text].map((char, i) =>
        highlightIndices.includes(i) ? (
          <span key={i} className="relative">
            <span className="absolute inset-0 bg-brand-gold/50 -skew-x-6 rounded-sm" />
            <span className="relative">{char}</span>
          </span>
        ) : (
          <span key={i}>{char}</span>
        )
      )}
    </h3>
  );
}

export function Features() {
  const { t, lang } = useApp();

  const titleAr = t("why.title") as string;
  const titlePartsAr = titleAr.split(" ");
  const firstWordAr = titlePartsAr[0] || "";
  const restAr = titlePartsAr.slice(1).join(" ");

  return (
    <section className="relative py-24 lg:py-28 overflow-hidden">
      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-14">
          <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight">
            {lang === "ar" ? (
              <>
                <span className="text-foreground">{firstWordAr}</span>{" "}
                <span className="text-primary">{restAr}</span>
              </>
            ) : (
              <>
                <span className="text-foreground">Why</span>{" "}
                <span className="text-primary">Choose Our Platform?</span>
              </>
            )}
          </h2>
          {/* Decorative curved line */}
          <div className="flex justify-center mt-3">
            <svg width="120" height="16" viewBox="0 0 120 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 14 C30 -2 60 -2 118 6" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {CARD_ITEMS.map((item) => {
            const Icon = item.icon;
            const title = t(item.titleKey) as string;
            const desc = t(item.descKey) as string;
            return (
              <article
                key={item.titleKey}
                className="group bg-surface rounded-3xl p-8 flex flex-col items-center text-center shadow-sm hover:shadow-lg transition-shadow duration-300"
              >
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-6 shadow-sm text-primary">
                  <Icon className="h-8 w-8" strokeWidth={1.8} />
                </div>

                {/* Title with highlight */}
                <HighlightedTitle text={title} highlightIndices={item.highlightIndex} />

                {/* Description */}
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
