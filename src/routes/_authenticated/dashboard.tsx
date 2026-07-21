import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LogOut, Shield, BookOpen, Brain, PlayCircle, ClipboardList, GraduationCap,
  Loader2, CheckCircle2, Clock, FileText, Activity, BarChart3,
  User, Wallet, Gift, Building2, Eye, Target, Receipt, CreditCard,
  History, Library, Smartphone, LayoutDashboard, ChevronLeft,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { UserProfileCard, WalletBalanceCard, RechargeCodeCard, CenterLinkCard, CenterSection, WalletSection } from "@/components/dashboard/UserWalletSection";
import { CoursesSection, ViewingDetailsSection, ExamResultsSection, AssessmentResultsSection, HomeworkResultsSection } from "@/components/dashboard/LearningSection";
import { InvoicesSection, SubscriptionsSection, WalletTransactionsSection } from "@/components/dashboard/FinanceSection";
import { SecuritySection, PersonalExamSection } from "@/components/dashboard/AccountSection";
import { QuestionBankSection } from "@/components/dashboard/QuestionBankSection";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "لوحة التحكم | مستر حاتم سميكه" }] }),
});

const WEEK_LABELS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const NAV_ITEMS = [
  { id: "profile", label: "الملف الشخصي", icon: User, color: "text-blue-500" },
  { id: "wallet", label: "المحفظة والرصيد", icon: Wallet, color: "text-emerald-500" },
  { id: "center", label: "ربط السنتر", icon: Building2, color: "text-orange-500" },
  { id: "courses", label: "الكورسات المسجلة", icon: BookOpen, color: "text-primary" },
  { id: "viewing", label: "تفاصيل المشاهدات", icon: Eye, color: "text-blue-600" },
  { id: "exams", label: "نتائج الامتحانات", icon: GraduationCap, color: "text-purple-500" },
  { id: "assessments", label: "اختبارات التقييم", icon: Target, color: "text-cyan-500" },
  { id: "homework", label: "نتائج الواجبات", icon: ClipboardList, color: "text-amber-500" },
  { id: "bank", label: "بنك الأسئلة", icon: Library, color: "text-teal-500" },
  { id: "invoices", label: "الفواتير", icon: Receipt, color: "text-orange-600" },
  { id: "subscriptions", label: "الاشتراكات", icon: CreditCard, color: "text-indigo-500" },
  { id: "transactions", label: "حركة المحفظة", icon: History, color: "text-emerald-600" },
  { id: "personal-exam", label: "امتحان خاص بيك", icon: Brain, color: "text-violet-500" },
  { id: "security", label: "الأمان والدخول", icon: Shield, color: "text-red-500" },
];

function Dashboard() {
  const { profile, role, signOut, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("profile");
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [activity, setActivity] = useState<{ day: string; minutes: number }[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);

      const [enrollRes, progRes] = await Promise.all([
        supabase.from("enrollments").select("course_id").eq("student_id", user.id).eq("status", "active"),
        supabase.from("lecture_progress").select("lecture_id, completed, watched_seconds, last_watched_at, lectures!inner(id, title, chapter_id, chapters!inner(unit_id, units!inner(course_id, courses!inner(id, title)))))").eq("student_id", user.id).order("last_watched_at", { ascending: false }),
      ]);

      const enrolled = ((enrollRes.data ?? []) as any[]).map((e: any) => e.course_id);
      setEnrolledCount(enrolled.length);

      const buckets: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
        buckets[d.toDateString()] = 0;
      }
      (progRes.data ?? []).forEach((r: any) => {
        const d = new Date(r.last_watched_at); d.setHours(0, 0, 0, 0);
        const k = d.toDateString();
        if (k in buckets) buckets[k] += Math.round((r.watched_seconds ?? 0) / 60);
      });
      setActivity(Object.entries(buckets).map(([k, minutes]) => {
        const date = new Date(k);
        return { day: WEEK_LABELS_AR[date.getDay()], minutes };
      }));

      setLoading(false);
    })();
  }, [user?.id]);

  const renderSection = () => {
    switch (activeSection) {
      case "profile": return <UserProfileCard onNavigateToWallet={() => setActiveSection("wallet")} />;
      case "wallet": return <WalletSection />;
      case "center": return <CenterSection />;
      case "courses": return <CoursesSection />;
      case "viewing": return <ViewingDetailsSection />;
      case "exams": return <ExamResultsSection />;
      case "assessments": return <AssessmentResultsSection />;
      case "homework": return <HomeworkResultsSection />;
      case "bank": return <QuestionBankSection />;
      case "invoices": return <InvoicesSection />;
      case "subscriptions": return <SubscriptionsSection />;
      case "transactions": return <WalletTransactionsSection />;
      case "personal-exam": return <PersonalExamSection />;
      case "security": return <SecuritySection />;
      default: return <UserProfileCard />;
    }
  };

  if (loading) {
    return <div className="min-h-[60dvh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const currentNav = NAV_ITEMS.find((n) => n.id === activeSection);

  return (
    <div className="flex flex-col lg:flex-row py-8">
      {/* Content area - centered left side */}
      <div className="flex-1 min-w-0 order-2">
        <div className="px-4 space-y-8">
          {activeSection === "profile" && (
            <>
              {/* Hero */}
              <Card className="shadow-elegant overflow-hidden">
                <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="h-6 w-6 text-primary shrink-0" />
                    <div>
                      <h1 className="text-2xl md:text-3xl font-display font-bold">
                        أهلاً {profile?.full_name?.split(" ")[0] ?? "بك"}
                      </h1>
                      <p className="text-muted-foreground mt-1">
                        {enrolledCount > 0
                          ? `عندك ${enrolledCount} كورس مسجل. تصفّح أقسام لوحة التحكم من الشريط الجانبي.`
                          : "حسابك مفعّل، استكشف المحتوى التعليمي."}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <Link to="/courses"><BookOpen className="h-4 w-4" /> الكورسات</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <Link to="/exams"><GraduationCap className="h-4 w-4" /> الامتحانات</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <Link to="/practice/mistakes"><Brain className="h-4 w-4" /> اختبر أخطاءك</Link>
                    </Button>
                    {role === "admin" && (
                      <Button asChild variant="secondary" size="sm" className="gap-2">
                        <Link to="/admin"><Shield className="h-4 w-4" /> الإدارة</Link>
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
                      <LogOut className="h-4 w-4" /> خروج
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Activity chart */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold">نشاطك خلال الأسبوع</h2>
                    <span className="text-xs text-muted-foreground">(دقائق المشاهدة)</span>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={activity} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs><linearGradient id="actFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`${v} دقيقة`, "المشاهدة"]} />
                        <Area type="monotone" dataKey="minutes" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#actFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <CoursesSection />
            </>
          )}

          {/* Section content */}
          <motion.div key={activeSection} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
            <div className="flex items-center gap-2 mb-6">
              {currentNav && (() => {
                const Icon = currentNav.icon;
                return <Icon className={`h-5 w-5 ${currentNav.color}`} />;
              })()}
              <h2 className="text-xl font-bold">{currentNav?.label ?? ""}</h2>
            </div>
            {renderSection()}
          </motion.div>
        </div>
      </div>

      {/* Right sidebar - far right edge */}
      <div className="lg:w-72 shrink-0 order-1">
        <div className="lg:sticky lg:top-24 space-y-1">
          <div className="flex items-center gap-2 px-1 mb-3">
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">الأقسام</span>
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-right ${
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? item.color : ""}`} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronLeft className="h-3.5 w-3.5 shrink-0 opacity-60" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
