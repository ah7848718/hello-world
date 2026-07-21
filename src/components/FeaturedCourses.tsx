import { ArrowLeft, ArrowRight, PlayCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useApp } from "@/lib/providers";
import cover from "@/assets/course-cover.jpg";

export function FeaturedCourses() {
  const { t, lang } = useApp();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  const courses = [
    { key: "c1", lectures: 48, price: 599, old: 799, badge: lang === "ar" ? "الأكثر طلبًا" : "Most popular" },
    { key: "c2", lectures: 36, price: 449, old: 599, badge: null },
    { key: "c3", lectures: 30, price: 349, old: 499, badge: lang === "ar" ? "جديد" : "New" },
  ];

  return (
    <section className="py-20 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground">
              {t("courses.title")}
            </h2>
            <p className="mt-3 text-muted-foreground">{t("courses.subtitle")}</p>
          </div>
          <a href="#courses" className="hidden sm:inline-flex items-center text-sm font-semibold text-primary hover:opacity-80 transition">
            {t("courses.viewAll")}
            <Arrow className="ms-1.5 h-4 w-4" />
          </a>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((c) => (
            <Link
              key={c.key}
              to="/courses"
              className="group block bg-card border border-border rounded-3xl overflow-hidden shadow-sm transition-all duration-300 ease-out hover:-translate-y-3 hover:shadow-[0_35px_90px_-40px_rgba(15,23,42,0.35)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                <img
                  src={cover}
                  alt=""
                  width={1024}
                  height={768}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {c.badge && (
                  <span className="absolute top-3 start-3 bg-brand-red text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                    {c.badge}
                  </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <PlayCircle className="h-14 w-14 text-white" strokeWidth={1.5} />
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span className="inline-flex items-center gap-1">
                    <PlayCircle className="h-3.5 w-3.5" />
                    {c.lectures} {t("courses.lectures")}
                  </span>
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground mb-2 line-clamp-1">
                  {t(`courses.${c.key}.title`)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  {t(`courses.${c.key}.desc`)}
                </p>

                <div className="mt-5 pt-5 border-t border-border flex items-center justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display font-bold text-xl text-foreground">{c.price}</span>
                    <span className="text-xs text-muted-foreground">EGP</span>
                    <span className="text-xs text-muted-foreground line-through">{c.old}</span>
                  </div>
                  <span className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors group-hover:bg-primary/90">
                    {t("courses.enroll")}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="sm:hidden mt-8 text-center">
          <a href="#courses" className="inline-flex items-center text-sm font-semibold text-primary">
            {t("courses.viewAll")}
            <Arrow className="ms-1.5 h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
