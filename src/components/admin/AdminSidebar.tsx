import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import {
   LayoutDashboard, Users, BookOpen, PlayCircle, ClipboardList, FileQuestion,
   Library, CreditCard, Ticket, MessagesSquare, Bell, BarChart3,
   GraduationCap, LifeBuoy, Settings, Megaphone, Package, GraduationCap as Logo,
   Brain, Target, Award, QrCode, Wallet, CalendarCheck, UserCheck, Bot,
   Building2, Eye, Shield, Receipt, Palette,
 } from "lucide-react";

type Item = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };

const main: Item[] = [
  { title: "الرئيسية", url: "/admin", icon: LayoutDashboard },
  { title: "الطلاب", url: "/admin/students", icon: Users },
  { title: "الكورسات", url: "/admin/courses", icon: BookOpen },
  { title: "الباقات", url: "/admin/bundles", icon: Package },
  { title: "الحصص", url: "/admin/lessons", icon: PlayCircle },
  { title: "الواجبات", url: "/admin/homework", icon: ClipboardList },
  { title: "الامتحانات", url: "/admin/exams", icon: FileQuestion },
  { title: "اختبارات التقييم", url: "/admin/assessments", icon: Target },
  { title: "بنك الأسئلة", url: "/admin/questions", icon: Brain },
  { title: "الاشتراكات", url: "/admin/subscriptions", icon: CalendarCheck },
  { title: "الكتب", url: "/admin/books", icon: Library },
];

const business: Item[] = [
  { title: "المدفوعات", url: "/admin/payments", icon: CreditCard },
  { title: "الفواتير", url: "/admin/invoices", icon: Receipt },
  { title: "طلبات الكتب", url: "/admin/book-orders", icon: Package },
  { title: "الكوبونات", url: "/admin/coupons", icon: Ticket },
  { title: "أكواد الشحن", url: "/admin/recharge-codes", icon: QrCode },
  { title: "حركة المحفظة", url: "/admin/wallet", icon: Wallet },
  { title: "السنترات", url: "/admin/centers", icon: Building2 },
];

const learning: Item[] = [
  { title: "نتائج الطلاب", url: "/admin/student-results", icon: Award },
  { title: "تفاصيل المشاهدات", url: "/admin/viewing", icon: Eye },
  { title: "الامتحان الخاص", url: "/admin/personal-exams", icon: UserCheck },
];

const community: Item[] = [
  { title: "الأسئلة والاستفسارات", url: "/admin/qna", icon: MessagesSquare },
  { title: "أسئلة الـ AI", url: "/admin/ai-faq", icon: Bot },
  { title: "الإشعارات", url: "/admin/notifications", icon: Bell },
  { title: "إعلانات الموقع", url: "/admin/announcements", icon: Megaphone },
  { title: "التحليلات", url: "/admin/analytics", icon: BarChart3 },
];

const system: Item[] = [
  { title: "المدرسين المساعدين", url: "/admin/assistants", icon: GraduationCap },
  { title: "الدعم الفني", url: "/admin/support", icon: LifeBuoy },
  { title: "سجل الدخول", url: "/admin/login-audit", icon: Shield },
  { title: "التعديل على الموقع", url: "/admin/site-content", icon: Palette },
  { title: "الإعدادات", url: "/admin/settings", icon: Settings },
];

function Group({ label, items, currentPath }: { label: string; items: Item[]; currentPath: string }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = item.url === "/admin"
              ? currentPath === "/admin"
              : currentPath === item.url || currentPath.startsWith(item.url + "/");
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.title} className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold">
                  <Link to={item.url} className="flex items-center gap-3">
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span className="truncate text-[14px]">{item.title}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon" side="right" className="border-l">
      <SidebarHeader className="border-b px-3 py-4">
        <Link to="/admin" className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-sm">
            <Logo className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-[14px] font-bold">HATEM SIMIKA</span>
              <span className="text-[11px] text-muted-foreground">Admin Panel</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <Group label="الإدارة" items={main} currentPath={currentPath} />
        <Group label="الأعمال" items={business} currentPath={currentPath} />
        <Group label="التعليم" items={learning} currentPath={currentPath} />
        <Group label="المجتمع" items={community} currentPath={currentPath} />
        <Group label="النظام" items={system} currentPath={currentPath} />
      </SidebarContent>
    </Sidebar>
  );
}
