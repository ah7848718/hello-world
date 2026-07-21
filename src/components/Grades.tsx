import { ArrowLeft, ArrowRight, GraduationCap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useApp } from "@/lib/providers";

export function Grades() {
  const { lang } = useApp();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  const title = lang === "ar" ? "اختر الصف" : "Choose your grade";
  const subtitle =
    lang === "ar"
      ? "ابدأ رحلتك مع مستر حاتم سميكه من الصف اللي يناسبك"
      : "Start your journey with Mr. Hatem Sameka from the grade that fits you";

  const grades = [
    {
      key: "g1",
      tag: lang === "ar" ? "1ث" : "G1",
      name: lang === "ar" ? "الصف الأول الثانوي" : "Grade 1 Secondary",
      desc:
        lang === "ar"
          ? "أساسيات قوية في القواعد والكلمات لبداية متميزة."
          : "Strong grammar & vocab foundations for a great start.",
    },
    {
      key: "g2",
      tag: lang === "ar" ? "2ث" : "G2",
      name: lang === "ar" ? "الصف الثاني الثانوي" : "Grade 2 Secondary",
      desc:
        lang === "ar"
          ? "بناء على ما تعلمته بأسلوب أعمق وتدريبات أقوى."
          : "Build deeper skills with stronger practice.",
    },
    {
      key: "g3",
      tag: lang === "ar" ? "3ث" : "G3",
      name: lang === "ar" ? "الصف الثالث الثانوي" : "Grade 3 Secondary",
      desc:
        lang === "ar"
          ? "استعداد كامل للثانوية العامة ومراجعات مكثفة."
          : "Full prep for the final exams with intensive review.",
      featured: true,
    },
  ];

  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4">
        {/* Header with curved underline */}
        <div className="text-center max-w-2xl mx-auto mb-14 relative">
          <h2 className="font-display text-4xl md:text-5xl font-extrabold text-foreground relative inline-block">
            {title}
            <svg
              viewBox="0 0 240 18"
              className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-[80%] h-4 text-brand-gold"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2 14 C 60 2, 180 2, 238 14"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </h2>
          <p className="mt-8 text-muted-foreground">{subtitle}</p>
        </div>

        {/* Grade cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {grades.map((g) => (
            <Link
              key={g.key}
              to="/grades/$gradeKey"
              params={{ gradeKey: g.key }}
              className={`group relative overflow-hidden rounded-3xl p-8 border transition-all hover:-translate-y-1 ${
                g.featured
                  ? "bg-primary text-primary-foreground border-primary shadow-elegant"
                  : "bg-card text-foreground border-border hover:border-primary/40 hover:shadow-card"
              }`}
            >
              {/* Decorative blob */}
              <div
                className={`absolute -top-12 -end-12 w-40 h-40 rounded-full blur-2xl ${
                  g.featured ? "bg-brand-gold/30" : "bg-primary/10"
                }`}
              />

              {/* Tag pill */}
              <div className="relative flex items-start justify-between mb-8">
                <span
                  className={`inline-flex items-center justify-center min-w-14 h-14 px-4 rounded-2xl font-display font-black text-2xl ${
                    g.featured
                      ? "bg-brand-gold text-navy"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {g.tag}
                </span>
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-[-4px] ${
                    g.featured
                      ? "bg-white/15 text-primary-foreground"
                      : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                  }`}
                >
                  <Arrow className="h-4 w-4" />
                </div>
              </div>

              <h3 className="relative font-display font-bold text-xl mb-2">
                {g.name}
              </h3>
              <p
                className={`relative text-sm leading-relaxed ${
                  g.featured ? "text-primary-foreground/85" : "text-muted-foreground"
                }`}
              >
                {g.desc}
              </p>

              <div
                className={`relative mt-6 inline-flex items-center gap-2 text-sm font-semibold ${
                  g.featured ? "text-brand-gold" : "text-primary"
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                {lang === "ar" ? "اعرض الكورسات" : "View courses"}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
