import { ArrowLeft, GraduationCap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useApp } from "@/lib/providers";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function CountUp({ target, suffix = "", prefix = "+", duration = 2000, format }: { target: number; suffix?: string; prefix?: string; duration?: number; format?: (n: number) => string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const run = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(eased * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      run();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            run();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      run();
      io.disconnect();
    }

    return () => io.disconnect();
  }, [target, duration]);

  const display = format ? format(val) : val.toLocaleString();
  return <span ref={ref}>{prefix}{display}{suffix}</span>;
}

const BookIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);
const HeadphoneIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z" />
  </svg>
);
const GlobeIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
  </svg>
);
const PencilIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </svg>
);
const BulbIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" />
  </svg>
);
const GraduationIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 10L12 4 2 10l10 6 10-6z" />
    <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
  </svg>
);

const formatK = (n: number) => (n >= 1000 ? `${Math.floor(n / 1000)}K` : String(n));

const gradesData = {
  ar: [
    { key: "g1", tag: "1ث", name: "الصف الأول الثانوي", desc: "أساسيات قوية في القواعد والكلمات لبداية متميزة.", tone: "soft" as const },
    { key: "g2", tag: "2ث", name: "الصف الثاني الثانوي", desc: "بناء على ما تعلمته بأسلوب أعمق وتدريبات أقوى.", tone: "mid" as const },
    { key: "g3", tag: "3ث", name: "الصف الثالث الثانوي", desc: "استعداد كامل للثانوية العامة ومراجعات مكثفة.", featured: true },
  ],
  en: [
    { key: "g1", tag: "G1", name: "Grade 1 Secondary", desc: "Strong grammar & vocab foundations for a great start.", tone: "soft" as const },
    { key: "g2", tag: "G2", name: "Grade 2 Secondary", desc: "Build deeper skills with stronger practice.", tone: "mid" as const },
    { key: "g3", tag: "G3", name: "Grade 3 Secondary", desc: "Full prep for the final exams with intensive review.", featured: true },
  ],
};

export function Stats() {
  const { lang } = useApp();
  const { data: content } = useQuery({
    queryKey: ["public-settings-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "content")
        .maybeSingle();
      if (error) throw error;
      return data?.value ?? {};
    },
  });

  const buildStats = (c: any, l: string) => [
    { n: Number(c?.[`stats_number_1`]) || 15000, suffix: c?.stats_suffix_1 ?? "", l: c?.[l === "ar" ? "stats_label_1_ar" : "stats_label_1_en"] || (l === "ar" ? "طالب مشترك" : "Students"), format: formatK },
    { n: Number(c?.[`stats_number_2`]) || 320, suffix: c?.stats_suffix_2 ?? "", l: c?.[l === "ar" ? "stats_label_2_ar" : "stats_label_2_en"] || (l === "ar" ? "محاضرة" : "Lectures") },
    { n: Number(c?.[`stats_number_3`]) || 95, suffix: c?.stats_suffix_3 ?? "%", l: c?.[l === "ar" ? "stats_label_3_ar" : "stats_label_3_en"] || (l === "ar" ? "نسبة النجاح" : "Success Rate") },
    { n: Number(c?.[`stats_number_4`]) || 8, suffix: c?.stats_suffix_4 ?? "", l: c?.[l === "ar" ? "stats_label_4_ar" : "stats_label_4_en"] || (l === "ar" ? "سنوات خبرة" : "Years Experience") },
  ];

  const items = buildStats(content, lang);

  const statsTag = content?.[lang === "ar" ? "stats_tag_ar" : "stats_tag_en"] || (lang === "ar" ? "أرقام نفتخر بها" : "Numbers we're proud of");
  const statsTitle = content?.[lang === "ar" ? "stats_title_ar" : "stats_title_en"] || (lang === "ar" ? "رحلة تعليمية فيها آلاف الطلاب وصلوا للتفوّق" : "Thousands of students reaching excellence");
  const statsSubtitle = content?.[lang === "ar" ? "stats_subtitle_ar" : "stats_subtitle_en"] || "";
  const grades = gradesData[lang];

  const doodleSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='380' height='380' viewBox='0 0 380 380' fill='none' stroke='white' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round' opacity='0.22'>
    <g transform='translate(15 20)'><path d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20'/><path d='M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'/></g>
    <g transform='translate(70 25)'><circle cx='12' cy='12' r='9'/><path d='M19 19l7 7'/></g>
    <g transform='translate(120 18)'><path d='M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z'/></g>
    <g transform='translate(170 22)'><circle cx='14' cy='14' r='12'/><path d='M14 6v8l5 3'/></g>
    <g transform='translate(225 20)'><path d='M14 4l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z'/></g>
    <g transform='translate(275 25)'><circle cx='12' cy='12' r='10'/><path d='M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20'/></g>
    <g transform='translate(325 22)'><path d='M12 19l7-7 3 3-7 7-3-3z'/><path d='M2 2l16 5-5 16z'/></g>
    <g transform='translate(20 105)'><rect x='2' y='4' width='20' height='16' rx='2'/><path d='M2 8h20M6 12h2M11 12h2M16 12h2M6 16h2M11 16h2M16 16h2'/></g>
    <g transform='translate(70 110)'><path d='M9 18V5l12-2v13'/><circle cx='6' cy='18' r='3'/><circle cx='18' cy='16' r='3'/></g>
    <g transform='translate(125 108)'><path d='M3 18v-6a9 9 0 0 1 18 0v6'/><path d='M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z'/></g>
    <g transform='translate(180 110)'><path d='M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M5 19l4-4M15 9l4-4'/></g>
    <g transform='translate(230 105)'><path d='M22 10L12 4 2 10l10 6 10-6z'/><path d='M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5'/></g>
    <g transform='translate(285 110)'><path d='M12 2a5 5 0 0 0-5 5v3H5v10h14V10h-2V7a5 5 0 0 0-5-5z'/></g>
    <g transform='translate(335 108)'><path d='M3 3h18v4H3zM5 7v14h14V7'/><path d='M9 11h6M9 15h6'/></g>
    <g transform='translate(15 195)'><path d='M2 22L12 2l10 20H2z'/><path d='M12 9v6'/></g>
    <g transform='translate(70 200)'><circle cx='12' cy='12' r='10'/><path d='M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01'/></g>
    <g transform='translate(125 198)'><path d='M5 3v18l7-4 7 4V3z'/></g>
    <g transform='translate(175 200)'><circle cx='12' cy='12' r='10'/><path d='M12 6v6l4 2'/></g>
    <g transform='translate(225 200)'><path d='M3 6l9-3 9 3v12l-9 3-9-3z'/><path d='M3 6l9 3 9-3M12 9v12'/></g>
    <g transform='translate(280 198)'><path d='M2 12l10-9 10 9-2 2v8H4v-8z'/></g>
    <g transform='translate(330 200)'><circle cx='12' cy='12' r='3'/><path d='M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2'/></g>
    <g transform='translate(25 285)'><path d='M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z'/></g>
    <g transform='translate(80 290)'><path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'/></g>
    <g transform='translate(135 288)'><path d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20'/><path d='M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'/></g>
    <g transform='translate(190 290)'><circle cx='12' cy='12' r='9'/><path d='M19 19l7 7'/></g>
    <g transform='translate(245 285)'><circle cx='12' cy='12' r='10'/><path d='M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20'/></g>
    <g transform='translate(300 290)'><path d='M22 10L12 4 2 10l10 6 10-6z'/><path d='M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5'/></g>
    <g transform='translate(345 288)'><path d='M12 19l7-7 3 3-7 7-3-3z'/><path d='M2 2l16 5-5 16z'/></g>
  </svg>`;

  return (
    <section
      className="relative overflow-hidden py-24 bg-navy bg-fixed"
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(doodleSvg)}")`,
        backgroundRepeat: "repeat",
        backgroundSize: "380px 380px",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Soft Gradient Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-[350px] h-[350px] bg-[color:var(--royal)]/25 rounded-full blur-3xl" />
        <div className="absolute -bottom-28 -right-24 w-[400px] h-[400px] bg-[color:var(--brand-red)]/20 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6">
        {/* Grade selector */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-xs font-semibold text-white/90 tracking-wider mb-4">
              {lang === "ar" ? "ابدأ من هنا" : "Start here"}
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
              {lang === "ar" ? "اختر الصف" : "Choose your grade"}
            </h2>
            <p className="mt-3 text-white/70 text-sm md:text-base">
              {lang === "ar"
                ? "ابدأ رحلتك مع مستر حاتم سميكه من الصف اللي يناسبك"
                : "Start your journey from the grade that fits you"}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {grades.map((g) => (
              <Link
                key={g.key}
                to="/grades/$gradeKey"
                params={{ gradeKey: g.key }}
                className={`group relative overflow-hidden rounded-3xl p-7 border transition-all hover:-translate-y-1 ${
                  g.featured
                    ? "bg-gradient-to-br from-[color:var(--brand-red)] via-[#b83a4a] to-[color:var(--royal)] border-[color:var(--brand-gold)]/60 shadow-[0_20px_60px_-15px_rgba(232,80,91,0.6)] ring-2 ring-[color:var(--brand-gold)]/40 md:scale-[1.04]"
                    : g.tone === "mid"
                    ? "bg-gradient-to-br from-white/15 via-white/8 to-[color:var(--royal)]/30 backdrop-blur-sm border-white/15 hover:border-white/30"
                    : "bg-gradient-to-br from-white/8 via-white/3 to-transparent backdrop-blur-sm border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between mb-6">
                  <span
                    className={`inline-flex items-center justify-center min-w-14 h-14 px-4 rounded-2xl font-black text-2xl ${
                      g.featured ? "bg-[color:var(--brand-gold)] text-navy shadow-lg" : "bg-white/10 text-white"
                    }`}
                  >
                    {g.tag}
                  </span>
                  <span className="h-10 w-10 rounded-full grid place-items-center bg-white/10 text-white group-hover:bg-white group-hover:text-navy transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                  </span>
                </div>
                <h4 className="font-display font-bold text-xl text-white mb-2">{g.name}</h4>
                <p className="text-sm leading-relaxed text-white/75">{g.desc}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <GraduationCap className="h-4 w-4" />
                  {lang === "ar" ? "اعرض الكورسات" : "View courses"}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Stats numbers */}
        <div className="mt-20">
          <div className="mb-10 text-center max-w-2xl mx-auto">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-xs font-semibold text-white/90 tracking-wider mb-4">
              {statsTag}
            </span>
            <h3 className="text-3xl md:text-4xl font-black text-white leading-tight">
              {statsTitle}
            </h3>
            {statsSubtitle && (
              <p className="mt-3 text-white/70 text-sm md:text-base">{statsSubtitle}</p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {items.map((s, i) => (
              <div
                key={i}
                className="space-y-3 rounded-2xl p-6 bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors"
              >
                <h3 className="text-5xl font-black text-white tracking-tight">
                  <CountUp target={s.n} suffix={s.suffix} prefix="+" format={(s as any).format} />
                </h3>
                <p className="text-white/80 text-base md:text-lg">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
