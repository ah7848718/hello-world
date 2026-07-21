import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
type Lang = "ar" | "en";

interface AppCtx {
  theme: Theme;
  toggleTheme: () => void;
  lang: Lang;
  toggleLang: () => void;
  t: (key: string) => string;
}

const translations: Record<Lang, Record<string, string>> = {
  ar: {
    "nav.home": "الرئيسية",
    "nav.courses": "الكورسات",
    "nav.books": "الكتب",
    "nav.qa": "أسئلة وأجوبة",
    "nav.contact": "تواصل معنا",
    "nav.login": "تسجيل الدخول",
    "nav.register": "إنشاء حساب",

    "hero.badge": "منصة مستر حاتم سميكه",
    "hero.title": "تعلّم اللغة الإنجليزية بثقة وسهولة",
    "hero.subtitle": "منصة متكاملة لطلاب الثانوية العامة في مصر — شرح واضح، مذكرات، أسئلة وأجوبة، وكل ما تحتاجه في مكان واحد.",
    "hero.cta": "ابدأ التعلم الآن",
    "hero.cta2": "تصفّح الكورسات",

    "stats.students": "طالب",
    "stats.courses": "كورس",
    "stats.lessons": "درس",
    "stats.rating": "تقييم",

    "courses.title": "الكورسات المميزة",
    "courses.subtitle": "اختر الكورس المناسب لمرحلتك وابدأ رحلتك",
    "courses.viewAll": "عرض كل الكورسات",
    "courses.lectures": "محاضرة",
    "courses.enroll": "اشترك الآن",
    "courses.c1.title": "Grade 3 — Final Revision",
    "courses.c1.desc": "مراجعة نهائية شاملة لطلاب الثانوية العامة.",
    "courses.c2.title": "Grade 2 — Full Course",
    "courses.c2.desc": "شرح كامل لمنهج تانية ثانوي بأسلوب مبسّط.",
    "courses.c3.title": "Grade 1 — Foundations",
    "courses.c3.desc": "أساسيات قوية في القواعد والمفردات لأولى ثانوي.",

    "grades.title": "اختر صفك الدراسي",
    "grades.subtitle": "محتوى مصمم خصيصًا لكل سنة دراسية",
    "g1": "أولى ثانوي",
    "g2": "ثانية ثانوي",
    "g3": "ثالثة ثانوي",
    "g.cta": "ابدأ الآن",

    "why.title": "لماذا تختار منصتنا؟",
    "why.subtitle": "تجربة تعليمية مصممة بعناية لتجعل التعلم أسهل وأمتع",
    "w1.title": "شرح واضح ومبسّط",
    "w1.desc": "كل درس مشروح خطوة بخطوة بأسلوب يصل لكل طالب.",
    "w2.title": "مذكرات وكتب PDF",
    "w2.desc": "حمّل أحدث المذكرات والكتب بضغطة زر.",
    "w3.title": "أسئلة وأجوبة",
    "w3.desc": "اسأل أي وقت واحصل على إجابة من المستر.",
    "w4.title": "متابعة تقدمك",
    "w4.desc": "تابع تقدمك في كل كورس بسهولة ووضوح.",

    "testimonials.title": "ماذا يقول طلابنا؟",
    "testimonials.subtitle": "آراء حقيقية من طلاب نجحوا معنا",
    "t1.name": "أحمد محمود",
    "t1.role": "ثالثة ثانوي",
    "t1.text": "أسلوب المستر حاتم في الشرح خرافي. فهمت حاجات كنت بعتبرها صعبة جدًا، ودرجاتي اتحسنت كتير.",
    "t2.name": "سارة علي",
    "t2.role": "ثانية ثانوي",
    "t2.text": "المنصة سهلة جدًا في الاستخدام، والمذكرات منظمة بشكل رائع. حسيت إن في حد بيمسك إيدي خطوة بخطوة.",
    "t3.name": "يوسف إبراهيم",
    "t3.role": "أولى ثانوي",
    "t3.text": "أحسن قرار اخدته إني اشتركت في المنصة. الفيديوهات قصيرة ومركّزة، والأسئلة بتثبّت المعلومة.",

    "books.title": "مذكرات وكتب جاهزة",
    "books.subtitle": "حمّل أحدث المذكرات بصيغة PDF",
    "books.download": "تحميل PDF",
    "books.b1": "Grammar Master",
    "books.b2": "Vocabulary Pack",
    "books.b3": "Final Revision",

    "faq.title": "أسئلة شائعة",
    "faq.subtitle": "كل ما تحتاج معرفته قبل الاشتراك",
    "faq.q1": "هل المنصة مناسبة لكل المراحل؟",
    "faq.a1": "نعم، المنصة تغطي الصفوف الأول والثاني والثالث الثانوي بمحتوى مصمم خصيصًا لكل صف.",
    "faq.q2": "كيف يتم الدفع والاشتراك؟",
    "faq.a2": "يمكنك الاشتراك بكل سهولة من خلال البطاقات البنكية أو المحافظ الإلكترونية، ويبدأ وصولك للمحتوى فور تأكيد الدفع.",
    "faq.q3": "هل أستطيع تحميل الفيديوهات؟",
    "faq.a3": "الفيديوهات متاحة للمشاهدة عبر المنصة فقط لضمان حقوق الملكية، لكن المذكرات يمكن تحميلها بصيغة PDF.",
    "faq.q4": "ماذا لو واجهت مشكلة فنية؟",
    "faq.a4": "فريق الدعم متاح يوميًا للرد على استفساراتك من خلال صفحة التواصل أو واتساب.",

    "cta.title": "جاهز لتبدأ رحلتك في تعلّم الإنجليزية؟",
    "cta.subtitle": "انضم لآلاف الطلاب الذين رفعوا درجاتهم مع مستر حاتم سميكه.",
    "cta.btn": "أنشئ حسابك مجانًا",

    "footer.about": "منصة تعليمية متخصصة في اللغة الإنجليزية لطلاب الثانوية العامة، بقيادة المستر حاتم سميكه.",
    "footer.links": "روابط سريعة",
    "footer.contact": "تواصل معنا",
    "footer.follow": "تابعنا",
    "footer.rights": "جميع الحقوق محفوظة",

    "page.courses.title": "الكورسات",
    "page.courses.subtitle": "اختر الكورس المناسب لمرحلتك الدراسية",
    "page.books.title": "الكتب والمذكرات",
    "page.books.subtitle": "تحميل أحدث المذكرات والكتب الدراسية",
    "page.qa.title": "أسئلة وأجوبة",
    "page.qa.subtitle": "اسأل أي سؤال واحصل على إجابة شاملة",
    "page.contact.title": "تواصل معنا",
    "page.contact.subtitle": "نحن هنا للإجابة على كل أسئلتك",
    "soon": "قريبًا",
  },
  en: {
    "nav.home": "Home",
    "nav.courses": "Courses",
    "nav.books": "Books",
    "nav.qa": "Q&A",
    "nav.contact": "Contact",
    "nav.login": "Login",
    "nav.register": "Register",

    "hero.badge": "Mr. Hatem Sameka Platform",
    "hero.title": "Learn English with confidence and ease",
    "hero.subtitle": "A complete platform for Egyptian high school students — clear lessons, notes, Q&A, and everything you need in one place.",
    "hero.cta": "Start Learning",
    "hero.cta2": "Browse Courses",

    "stats.students": "Students",
    "stats.courses": "Courses",
    "stats.lessons": "Lessons",
    "stats.rating": "Rating",

    "courses.title": "Featured Courses",
    "courses.subtitle": "Pick the course that fits your stage and start now",
    "courses.viewAll": "View all courses",
    "courses.lectures": "lectures",
    "courses.enroll": "Enroll now",
    "courses.c1.title": "Grade 3 — Final Revision",
    "courses.c1.desc": "Complete final revision for Thanaweya Amma students.",
    "courses.c2.title": "Grade 2 — Full Course",
    "courses.c2.desc": "Full second-year syllabus, explained simply.",
    "courses.c3.title": "Grade 1 — Foundations",
    "courses.c3.desc": "Strong grammar and vocabulary foundations.",

    "grades.title": "Pick your grade",
    "grades.subtitle": "Content tailored for each high school year",
    "g1": "Grade 1 Sec.",
    "g2": "Grade 2 Sec.",
    "g3": "Grade 3 Sec.",
    "g.cta": "Start now",

    "why.title": "Why choose our platform?",
    "why.subtitle": "A learning experience designed to make studying simpler and more enjoyable",
    "w1.title": "Clear, simple lessons",
    "w1.desc": "Every lesson broken down step by step for any student.",
    "w2.title": "Notes & PDF books",
    "w2.desc": "Download the latest notes and books in one click.",
    "w3.title": "Questions & answers",
    "w3.desc": "Ask anytime and get a direct answer from Mr. Hatem.",
    "w4.title": "Track your progress",
    "w4.desc": "Follow your progress in each course easily.",

    "testimonials.title": "What our students say",
    "testimonials.subtitle": "Real reviews from students who succeeded with us",
    "t1.name": "Ahmed Mahmoud",
    "t1.role": "Grade 3 Sec.",
    "t1.text": "Mr. Hatem's teaching style is amazing. I finally understood topics I thought were impossible, and my grades improved a lot.",
    "t2.name": "Sara Ali",
    "t2.role": "Grade 2 Sec.",
    "t2.text": "The platform is super easy to use, and the notes are perfectly organized. It felt like someone was guiding me step by step.",
    "t3.name": "Youssef Ibrahim",
    "t3.role": "Grade 1 Sec.",
    "t3.text": "Best decision I made. Videos are short and focused, and the quizzes lock the information in.",

    "books.title": "Ready notes & books",
    "books.subtitle": "Download the latest notes as PDF",
    "books.download": "Download PDF",
    "books.b1": "Grammar Master",
    "books.b2": "Vocabulary Pack",
    "books.b3": "Final Revision",

    "faq.title": "Frequently asked",
    "faq.subtitle": "Everything you need to know before enrolling",
    "faq.q1": "Is the platform suitable for all grades?",
    "faq.a1": "Yes, we cover grades 1, 2 and 3 of secondary school with content designed for each year.",
    "faq.q2": "How does payment & enrollment work?",
    "faq.a2": "You can subscribe easily via bank cards or e-wallets, and access starts immediately after payment.",
    "faq.q3": "Can I download videos?",
    "faq.a3": "Videos are streamed only to protect rights, but PDFs and notes can be downloaded.",
    "faq.q4": "What if I face a technical issue?",
    "faq.a4": "Our support team is available daily via the contact page or WhatsApp.",

    "cta.title": "Ready to begin your English journey?",
    "cta.subtitle": "Join thousands of students who improved with Mr. Hatem Sameka.",
    "cta.btn": "Create free account",

    "footer.about": "An educational platform specialized in English for high school students, led by Mr. Hatem Sameka.",
    "footer.links": "Quick Links",
    "footer.contact": "Contact",
    "footer.follow": "Follow us",
    "footer.rights": "All rights reserved",

    "page.courses.title": "Courses",
    "page.courses.subtitle": "Choose the right course for your level",
    "page.books.title": "Books & Notes",
    "page.books.subtitle": "Download the latest notes and books",
    "page.qa.title": "Q&A",
    "page.qa.subtitle": "Ask any question and get a complete answer",
    "page.contact.title": "Contact us",
    "page.contact.subtitle": "We're here to answer all your questions",
    "soon": "Coming soon",
  },
};

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [lang, setLang] = useState<Lang>("ar");

  useEffect(() => {
    const t = (localStorage.getItem("theme") as Theme) || "light";
    const l = (localStorage.getItem("lang") as Lang) || "ar";
    setTheme(t);
    setLang(l);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    root.setAttribute("lang", lang);
    localStorage.setItem("theme", theme);
    localStorage.setItem("lang", lang);
  }, [theme, lang]);

  const value: AppCtx = {
    theme,
    toggleTheme: () => setTheme((p) => (p === "dark" ? "light" : "dark")),
    lang,
    toggleLang: () => setLang((p) => (p === "ar" ? "en" : "ar")),
    t: (k) => translations[lang][k] ?? k,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
