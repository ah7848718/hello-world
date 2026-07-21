import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/lib/providers";
import { supabase } from "@/integrations/supabase/client";
import s1 from "@/assets/student-1.png";
import s2 from "@/assets/student-2.png";
import s3 from "@/assets/student-3.png";


const slides = [
  { img: s1, blob: "var(--royal)" },
  { img: s2, blob: "var(--brand-red)" },
  { img: s3, blob: "var(--brand-gold)" },
];

export function Hero() {
  const { t, lang } = useApp();
  const { data: content } = useQuery({
    queryKey: ["public-settings-content"],
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

  const heroTitle = content?.[lang === "ar" ? "hero_title_ar" : "hero_title_en"];
  const heroSubtitle = content?.[lang === "ar" ? "hero_subtitle_ar" : "hero_subtitle_en"];
  const heroCta = content?.[lang === "ar" ? "hero_cta_ar" : "hero_cta_en"];
  const heroCta2 = content?.[lang === "ar" ? "hero_cta2_ar" : "hero_cta2_en"];
  const registrationVideoUrl = content?.registration_video_url;
  const registrationVideoLabel =
    content?.[lang === "ar" ? "registration_video_label_ar" : "registration_video_label_en"] ||
    (lang === "ar" ? "كيفية التسجيل على المنصة" : "How to register");
  const heroFeatures = useMemo(
    () => [
      content?.[lang === "ar" ? "hero_feature_1_ar" : "hero_feature_1_en"],
      content?.[lang === "ar" ? "hero_feature_2_ar" : "hero_feature_2_en"],
      content?.[lang === "ar" ? "hero_feature_3_ar" : "hero_feature_3_en"],
      content?.[lang === "ar" ? "hero_feature_4_ar" : "hero_feature_4_en"],
    ].filter(Boolean),
    [content, lang],
  );

  const fallbackHeroFeatures = lang === "ar" ? [
    "شرح واضح ومنظّم لكل المنهج خطوة بخطوة",
    "مذكرات وملخصات PDF جاهزة للتحميل",
    "أسئلة وامتحانات تفاعلية لتثبيت المعلومة",
    "محتوى مخصص لكل صف من الصفوف الثانوية",
  ] : [
    "Clear, organized lessons covering the full syllabus",
    "Ready-to-download PDF notes and summaries",
    "Interactive exams to lock the info",
    "Tailored content for every secondary grade",
  ];

  const features = heroFeatures.length > 0 ? heroFeatures : fallbackHeroFeatures;

  const heroDesc = content?.[lang === "ar" ? "hero_desc_ar" : "hero_desc_en"];

  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  const [idx, setIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(slides.length - 1);
  const idxRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      const current = idxRef.current;
      const next = (current + 1) % slides.length;
      setPrevIdx(current);
      setIdx(next);
      idxRef.current = next;
    }, 3500);
    return () => clearInterval(id);
  }, []);

  // Preload all student images on mount so swap is instant (no chunky loading)
  useEffect(() => {
    slides.forEach((s) => {
      const im = new Image();
      im.src = s.img;
    });
  }, []);

  return (
    <section id="home" className="relative overflow-hidden pt-28 lg:pt-32 pb-16 lg:pb-24 bg-background">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] dark:opacity-[0.15]"
        style={{
          backgroundImage:
            "radial-gradient(circle, color-mix(in oklab, var(--royal) 25%, transparent) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Copy */}
          <div className="text-center lg:text-start animate-fade-up order-2 lg:order-1">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.25] text-foreground">
              {heroTitle ? (
                heroTitle
              ) : lang === "ar" ? (
                <>
                  تعلّم{" "}
                  <span className="relative inline-block">
                    <span className="relative z-10">الإنجليزية</span>
                    <svg
                      className="absolute -bottom-1 start-0 w-full h-3 -z-0"
                      viewBox="0 0 200 12"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2,7 Q50,1 100,5 T198,6"
                        stroke="var(--brand-gold)"
                        strokeWidth="7"
                        strokeLinecap="round"
                        fill="none"
                        opacity="0.9"
                      />
                    </svg>
                  </span>{" "}
                  مع <span className="text-brand">مستر حاتم سميكه</span>
                </>
              ) : (
                <>
                  Learn{" "}
                  <span className="relative inline-block">
                    <span className="relative z-10">English</span>
                    <svg
                      className="absolute -bottom-1 left-0 w-full h-3 -z-0"
                      viewBox="0 0 200 12"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2,7 Q50,1 100,5 T198,6"
                        stroke="var(--brand-gold)"
                        strokeWidth="7"
                        strokeLinecap="round"
                        fill="none"
                        opacity="0.9"
                      />
                    </svg>
                  </span>{" "}
                  with <span className="text-brand">Mr. Hatem Sameka</span>
                </>
              )}
            </h1>

            <ul className="mt-7 space-y-3 max-w-lg mx-auto lg:mx-0">
              {(features.length > 0 ? features : fallbackHeroFeatures).map((item) => (
                <li key={item} className="flex items-start gap-3 text-base lg:text-lg font-semibold text-foreground/85">
                  <span className="mt-1 flex-shrink-0 h-6 w-6 rounded-full bg-brand-gold/20 text-brand-gold flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 text-sm text-foreground/80 max-w-xl">
              {heroDesc || (lang === "ar" ? "منصة تعليمية عملية مبنية لتجربة دراسة بسيطة وواضحة." : "A practical learning platform built for a simple, focused study experience.")}
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-8 text-base lg:text-lg rounded-full shadow-elegant group">
                <a href="#courses">
                  {heroCta || t("hero.cta")}
                  <Arrow className="ms-2 h-5 w-5 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 px-7 text-base rounded-full border-border">
                <a href="#why">{heroCta2 || t("hero.cta2")}</a>
              </Button>
              {registrationVideoUrl ? (
                <Button
                  asChild
                  size="lg"
                  className="h-14 px-7 text-base rounded-full border border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                >
                  <a href={registrationVideoUrl} target="_blank" rel="noopener noreferrer">
                    {registrationVideoLabel}
                  </a>
                </Button>
              ) : null}
            </div>

            {/* Dots */}
            <div className="mt-8 flex gap-2 justify-center lg:justify-start">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setPrevIdx(idx); setIdx(i); idxRef.current = i; }}
                  aria-label={`slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === idx ? "w-8 bg-primary" : "w-2 bg-border hover:bg-primary/40"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Visual: rotating students with colored blob */}
          <div className="relative order-1 lg:order-2">
            <div className="relative mx-auto max-w-md lg:max-w-lg aspect-square">
              <div className="absolute inset-0 rounded-[2rem] bg-primary/5 dark:bg-primary/10" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-6 z-10 text-center">
                <span className="inline-block bg-background/80 backdrop-blur-sm text-foreground font-display font-bold text-xl sm:text-2xl px-5 py-2 rounded-full shadow-elegant">
                  مستر حاتم سميكه
                </span>
              </div>
              {slides.map((slide, i) => {
                const isActive = i === idx;
                const isLeaving = i === prevIdx && i !== idx;
                // Active: settled in place. Leaving: floats up & fades. Waiting: hidden below.
                const transform = isActive
                  ? "translate-y-0 opacity-100 scale-100"
                  : isLeaving
                    ? "-translate-y-[40%] opacity-0 scale-95"
                    : "translate-y-[40%] opacity-0 scale-95";
                return (
                  <div
                    key={i}
                    className={`absolute inset-0 transition-all duration-700 ease-out will-change-transform ${transform}`}
                    aria-hidden={!isActive}
                  >
                    {/* Colored blob */}
                    <svg
                      viewBox="0 0 600 600"
                      className="absolute inset-0 w-full h-full"
                      style={{ color: slide.blob, opacity: 0.18 }}
                      aria-hidden="true"
                    >
                      <path
                        fill="currentColor"
                        d="M421.6,329.7Q399,409.4,322.8,448.6Q246.6,487.8,170.4,442.4Q94.2,397,73.4,313.2Q52.6,229.4,109.8,166.6Q167,103.8,250.5,86.3Q334,68.8,400.4,124.8Q466.8,180.8,455.2,265.4Q443.6,350,421.6,329.7Z"
                      />
                    </svg>

                    <img
                      src={slide.img}
                      alt=""
                      width={768}
                      height={768}
                      loading="eager"
                      decoding="async"
                      className="relative w-full h-full object-contain drop-shadow-[0_25px_25px_rgb(0_0_0/0.08)]"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
