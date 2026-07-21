import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AppProvider } from "@/lib/providers";
import { AuthProvider } from "@/hooks/useAuth";
import { ImpersonationProvider } from "@/hooks/useImpersonation";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

import { Toaster } from "@/components/ui/sonner";
import { SupportWidget } from "@/components/SupportWidget";
import { RealtimeSync } from "@/components/RealtimeSync";


function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-elegant hover:opacity-95 transition"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const w = typeof window !== "undefined" ? (window as any) : null;
  const extraErrors = w?.__errors?.length ?? 0;
  const extra = extraErrors > 0 ? w?.__errors?.[0] : null;
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try refreshing.</p>
        <p className="mt-4 text-xs text-red-500 font-mono break-all whitespace-pre-wrap">{error.message}</p>
        {extra && <p className="mt-2 text-xs text-orange-400 font-mono break-all whitespace-pre-wrap">{extra.e || extra.m}</p>}
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-lg bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-elegant"
          >
            Try again
          </button>
          <a href="/" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MR. HATEM SIMIKA — English Learning Platform" },
      { name: "description", content: "منصة مستر حاتم سميكه لتعليم اللغة الإنجليزية لطلاب الثانوية العامة في مصر." },
      { name: "author", content: "Mr. Hatem Sameka" },
      { property: "og:title", content: "MR. HATEM SIMIKA — English Learning Platform" },
      { property: "og:description", content: "منصة مستر حاتم سميكه لتعليم اللغة الإنجليزية لطلاب الثانوية العامة في مصر." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "MR. HATEM SIMIKA — English Learning Platform" },
      { name: "twitter:description", content: "منصة مستر حاتم سميكه لتعليم اللغة الإنجليزية لطلاب الثانوية العامة في مصر." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ba32643e-4608-47d0-b917-d5eb55e81bb0/id-preview-b1bf7606--e45d8f45-87ce-4637-889e-b1e7328c00af.lovable.app-1779305164403.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ba32643e-4608-47d0-b917-d5eb55e81bb0/id-preview-b1bf7606--e45d8f45-87ce-4637-889e-b1e7328c00af.lovable.app-1779305164403.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@500;600;700;800&family=Cairo:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
        <script>{`window.__errors=[];window.onerror=(m,s,l,c,e)=>{window.__errors.push({m,s,l,c,e:""+(e?.stack||e)})};window.onunhandledrejection=e=>{window.__errors.push({m:"Unhandled Rejection",e:""+(e?.reason?.stack||e?.reason)})};`}</script>
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hideChrome = pathname.startsWith("/admin") || pathname.startsWith("/dashboard");
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <AuthProvider>
          <ImpersonationProvider>
            <RealtimeSync />
            <div className="min-h-dvh flex flex-col bg-background">
              <ImpersonationBanner />
              {!hideChrome && <Navbar />}
              <main className="flex-1 pt-20 lg:pt-24">
                <Outlet />
              </main>
              {!hideChrome && <Footer />}
            </div>
            <Toaster richColors position="top-center" />
            {!hideChrome && <SupportWidget />}
          </ImpersonationProvider>
        </AuthProvider>
      </AppProvider>
    </QueryClientProvider>
  );

}
