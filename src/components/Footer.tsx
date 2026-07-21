import { Facebook, Instagram, Youtube, Mail, Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/providers";

const TikTokIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.66a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.09z" />
  </svg>
);



export function Footer() {
  const { lang } = useApp();
  const isAr = lang === "ar";
  const { data: settings } = useQuery({
    queryKey: ["public-settings-footer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("key,value")
        .in("key", ["general", "social", "content"]);
      if (error) throw error;
      const map: Record<string, any> = {};
      (data ?? []).forEach((row: any) => {
        map[row.key] = row.value ?? {};
      });
      return map;
    },
  });

  const aboutText = isAr
    ? settings?.content?.footer_about_ar
    : settings?.content?.footer_about_en;

  const contactEmail = settings?.general?.support_email || "info@hatemsimika.com";
  const contactPhone = settings?.general?.support_phone || settings?.general?.supportPhone || "+20 10 18699792";

  const socialLinks = [
    {
      href: settings?.social?.facebook || "https://www.facebook.com/share/14cpLcJ6Yx5/",
      icon: Facebook,
      label: "Facebook",
      color: "bg-[#1877F2]",
    },
    {
      href: settings?.social?.instagram || "https://www.instagram.com/hatemsimika?igsh=eHA1b3FlOHliZmhj",
      icon: Instagram,
      label: "Instagram",
      color: "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]",
    },
    {
      href: settings?.social?.tiktok || "https://www.tiktok.com/@hatem.simika?_r=1&_t=ZS-96ITC7fEcVs",
      icon: TikTokIcon,
      label: "TikTok",
      color: "bg-black border border-white/20",
    },
    {
      href: settings?.social?.youtube || "https://youtube.com/@hatem_simika?si=mP6yMz6MdCNx63jL",
      icon: Youtube,
      label: "YouTube",
      color: "bg-[#FF0000]",
    },
  ];

  return (
    <footer dir={isAr ? "rtl" : "ltr"} className="bg-navy py-6 px-4">
      <div className="max-w-6xl mx-auto bg-primary text-primary-foreground rounded-2xl shadow-2xl border border-white/10 overflow-hidden">

        <div className="px-8 pt-16 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
            {/* Column 1: Logo & About */}
            <div className="flex flex-col space-y-6">
              <div className="space-y-3">
                <Link to="/" aria-label="Mr. Hatem Sameka" className="flex items-center gap-3 group">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-[#C5A059]/30 overflow-hidden">
                    <img src={logo} alt="Mr. Hatem Sameka" className="w-12 h-auto transition-transform group-hover:scale-110" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-wide uppercase font-display">Mr. Hatem Sameka</h2>
                    <p className="text-[10px] text-[#C5A059] font-semibold tracking-[0.2em] uppercase mt-1">
                      English Learning Platform
                    </p>
                  </div>
                </Link>
                <p className="text-primary-foreground/60 text-sm leading-relaxed max-w-xs">
                  {aboutText || (isAr
                    ? "منصة تعليمية متكاملة تهدف لتطوير مهارات اللغة الإنجليزية وتهيئة الطالب لكافة جوانب الثانوية العامة وما بعدها."
                    : "An integrated educational platform to develop English skills and prepare students for high school and beyond.")}
                </p>
              </div>

            </div>

            {/* Column 2: Quick Links */}
            <div className={`flex flex-col ${isAr ? "md:items-center" : "md:items-center"}`}>
              <div className="w-fit">
                <h3 className="text-lg font-bold mb-6 relative inline-block">
                  {isAr ? "روابط سريعة" : "Quick Links"}
                  <span className={`absolute -bottom-2 ${isAr ? "right-0" : "left-0"} w-8 h-1 bg-[#C5A059] rounded-full`} />
                </h3>
                <ul className="space-y-4">
                  {[
                    { href: "/#courses", ar: "الكورسات", en: "Courses" },
                    { href: "/#grades", ar: "الصفوف الدراسية", en: "Grades" },
                    { href: "/#faq", ar: "الأسئلة والأجوبة", en: "FAQ" },
                    { href: "/#contact", ar: "تواصل معنا", en: "Contact" },
                  ].map((l) => (
                    <li key={l.href}>
                      <a
                        href={l.href}
                        className="text-primary-foreground/60 hover:text-[#C5A059] transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <span>•</span> {isAr ? l.ar : l.en}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Column 3: Contact Info */}
            <div className="flex flex-col items-start">
              <h3 className="text-lg font-bold mb-6 relative">
                {isAr ? "تواصل معنا" : "Get in touch"}
                <span className={`absolute -bottom-2 ${isAr ? "right-0" : "left-0"} w-8 h-1 bg-[#C5A059] rounded-full`} />
              </h3>
              <div className="space-y-5">
                {[
                  { icon: Mail, text: contactEmail, dir: "ltr" as const },
                  { icon: Phone, text: contactPhone, dir: "ltr" as const },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 group cursor-pointer">
                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-[#C5A059]/10 group-hover:border-[#C5A059]/30 transition-all">
                      <item.icon className="w-5 h-5 text-[#C5A059]" />
                    </div>
                    <span className="text-sm text-primary-foreground/70 group-hover:text-primary-foreground transition-colors" dir={item.dir}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
              </div>

              <div className="flex gap-3 pt-2">
                {socialLinks.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className={`w-10 h-10 rounded-full ${s.color} flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg`}
                  >
                    <s.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 bg-white/5 px-8 py-5">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-primary-foreground/50 text-[11px] font-medium tracking-[0.3em] uppercase font-display">
              ENGLISH · LEARNING · PLATFORM
            </p>
            <p className="text-primary-foreground/50 text-xs">
              {isAr ? "جميع الحقوق محفوظة" : "All rights reserved"} © {new Date().getFullYear()}{" "}
              <span className="text-[#C5A059] font-semibold">MR. HATEM SIMIKA</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
