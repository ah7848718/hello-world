import { Clock, MapPin, ArrowLeft, ArrowRight } from "lucide-react";
import { useApp } from "@/lib/providers";
import { Button } from "@/components/ui/button";
import studyImg from "@/assets/study-anywhere.png";

export function Motivation() {
  const { lang } = useApp();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  const headline1 = lang === "ar" ? "ذاكر في أي وقت" : "Study anytime";
  const headline2 = lang === "ar" ? "من أي" : "from any";
  const goldWord = lang === "ar" ? "مكان" : "place";
  const para =
    lang === "ar"
      ? "محاضرات أونلاين، امتحانات تفاعلية، وملازم PDF تقدر تفتحها من موبايلك أو لابتوبك في أي وقت. مفيش حاجة اسمها فاتك الدرس تاني."
      : "Online lectures, interactive exams and PDF notes you can open from your phone or laptop anytime. You will never miss a lesson again.";

  const features = [
    {
      icon: Clock,
      label: lang === "ar" ? "24/7 متاح" : "Available 24/7",
    },
    {
      icon: MapPin,
      label: lang === "ar" ? "من أي مكان" : "Anywhere",
    },
  ];

  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="relative rounded-[2.5rem] bg-gradient-to-br from-[color:var(--royal)] to-[color:var(--navy)] overflow-hidden p-8 md:p-14 lg:p-16">

          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            {/* Illustration */}
            <div className="order-2 lg:order-1 relative flex justify-center">
              <div className="absolute inset-0 rounded-3xl bg-white/10" aria-hidden="true" />
              <img
                src={studyImg}
                alt={lang === "ar" ? "ذاكر في أي وقت ومن أي مكان" : "Study anywhere"}
                width={1024}
                height={1024}
                loading="lazy"
                className="relative w-72 md:w-80 lg:w-[22rem] drop-shadow-2xl"
              />
            </div>

            {/* Copy */}
            <div className="order-1 lg:order-2 text-center lg:text-start">
              <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-xs font-semibold text-white tracking-wider mb-5">
                {lang === "ar" ? "تجربة تعلم بلا حدود" : "Learning without limits"}
              </span>

              <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.15]">
                {headline1}
                <br />
                {headline2}{" "}
                <span className="relative inline-block">
                  <span className="text-brand-gold">{goldWord}</span>
                  <svg
                    viewBox="0 0 160 14"
                    className="absolute -bottom-2 left-0 w-full h-3 text-brand-gold"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M2 10 C 40 2, 120 2, 158 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>
              </h2>

              <p className="mt-6 text-white/80 leading-relaxed max-w-lg mx-auto lg:mx-0">
                {para}
              </p>

              {/* Feature chips */}
              <div className="mt-7 flex flex-wrap justify-center lg:justify-start gap-2.5">
                {features.map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white text-sm font-medium"
                  >
                    <f.icon className="h-4 w-4 text-brand-gold" />
                    {f.label}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3 justify-center lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-7 rounded-full bg-brand-gold hover:bg-brand-gold/90 text-navy font-bold gap-2 shadow-elegant"
                >
                  <a href="#courses">
                    {lang === "ar" ? "ابدأ التعلم الآن" : "Start learning now"}
                    <Arrow className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 px-7 rounded-full bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
                >
                  <a href="#books">{lang === "ar" ? "حمّل الملازم" : "Download notes"}</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
