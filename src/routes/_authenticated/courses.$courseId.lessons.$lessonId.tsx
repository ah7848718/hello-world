import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { useAuth } from "@/hooks/useAuth";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight, ArrowLeft, Loader2, PlayCircle, BookOpen,
  ListVideo, ChevronDown, FileText,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/courses/$courseId/lessons/$lessonId")({
  component: Page,
  head: () => ({ meta: [{ title: "حصة | مستر حاتم سميكه" }] }),
});

type Lesson = {
  id: string; title: string; description: string | null;
  video_type: string; video_url: string | null; video_bunny_id: string | null;
  grade: string; order_index: number;
};

function Page() {
  const { courseId, lessonId } = Route.useParams();
  const { user } = useAuth();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [watermark, setWatermark] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: l } = await supabase
        .from("lessons")
        .select("id,title,description,video_type,video_url,video_bunny_id,grade,order_index")
        .eq("id", lessonId)
        .maybeSingle();
      setLesson(l as Lesson | null);

      if (user) {
        const { data: en } = await supabase
          .from("enrollments")
          .select("id")
          .eq("course_id", courseId)
          .eq("student_id", user.id)
          .eq("status", "active")
          .maybeSingle();
        setEnrolled(!!en);

        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name,phone")
          .eq("id", user.id)
          .maybeSingle();
        if (prof) {
          const phone = (prof as any).phone ?? "";
          const name = (prof as any).full_name ?? "";
          setWatermark([name, phone].filter(Boolean).join(" · "));
        }
      }

      const { data: allLs } = await supabase
        .from("lessons")
        .select("id,title,description,video_type,video_url,video_bunny_id,grade,order_index")
        .eq("course_id", courseId)
        .eq("is_published", true)
        .order("order_index")
        .order("created_at", { ascending: false });
      setAllLessons((allLs ?? []) as Lesson[]);

      setLoading(false);
    })();
  }, [courseId, lessonId, user?.id]);

  const { prev, next } = useMemo(() => {
    const idx = allLessons.findIndex((l) => l.id === lessonId);
    return {
      prev: idx > 0 ? allLessons[idx - 1] : null,
      next: idx >= 0 && idx < allLessons.length - 1 ? allLessons[idx + 1] : null,
    };
  }, [allLessons, lessonId]);

  const videoProvider = lesson?.video_type === "youtube" ? "youtube" as const
    : lesson?.video_type === "bunny" ? "bunny" as const
    : null;

  const videoId = lesson?.video_type === "bunny" ? lesson.video_bunny_id : null;

  const videoUrl = lesson?.video_type === "upload" && lesson?.video_url
    ? (lesson.video_url.startsWith("http") ? lesson.video_url : supabase.storage.from("lesson-media").getPublicUrl(lesson.video_url).data.publicUrl)
    : lesson?.video_type === "youtube" ? lesson.video_url
    : null;

  if (loading) {
    return <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!lesson) {
    return <div className="container max-w-3xl mx-auto px-4 py-12 text-center">الحصة غير موجودة</div>;
  }
  if (!enrolled) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-12">
        <Card><CardContent className="p-8 text-center space-y-3">
          <p>هذه الحصة غير متاحة. يجب الاشتراك في الكورس أولاً.</p>
          <Button asChild><Link to="/payments/new" search={{ courseId } as any}>اشترك الآن</Link></Button>
        </CardContent></Card>
      </div>
    );
  }

  const currentIdx = allLessons.findIndex((l) => l.id === lessonId);

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
      <div className="lg:hidden flex items-center justify-between px-4 py-2 border-b bg-background sticky top-0 z-10">
        <button
          onClick={() => setMobileSidebarOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <ListVideo className="h-4 w-4" />
          قائمة الحصص
          <ChevronDown className={`h-4 w-4 transition-transform ${mobileSidebarOpen ? "" : "-rotate-90"}`} />
        </button>
        <span className="text-xs text-muted-foreground">
          {currentIdx + 1} / {allLessons.length}
        </span>
      </div>

      {mobileSidebarOpen && (
        <div className="lg:hidden border-b max-h-[45vh] overflow-y-auto bg-background">
          <div className="p-2 space-y-0.5">
            {allLessons.map((l) => (
              <Link
                key={l.id}
                to="/courses/$courseId/lessons/$lessonId"
                params={{ courseId, lessonId: l.id }}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  l.id === lessonId
                    ? "bg-primary/10 text-primary font-bold"
                    : "hover:bg-accent text-muted-foreground hover:text-foreground"
                }`}
              >
                <PlayCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{l.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 px-4 pb-8 space-y-4 pt-4">
        <Link
          to="/courses/$courseId"
          params={{ courseId }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowRight className="h-4 w-4" /> العودة للكورس
        </Link>

        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold">{lesson.title}</h1>
          {lesson.description && <p className="text-muted-foreground mt-1 text-sm">{lesson.description}</p>}
        </div>

        <VideoPlayer
          provider={videoProvider}
          videoId={videoId}
          videoUrl={videoUrl}
          title={lesson.title}
          watermark={watermark || null}
        />
        <p className="text-xs text-muted-foreground -mt-2">
          محتوى محمي · تظهر بياناتك على الفيديو لحماية الحقوق
        </p>

        <div className="flex items-center justify-between gap-3">
          <div />
          <div className="flex items-center gap-2">
            {prev && (
              <Button asChild variant="outline" size="sm">
                <Link to="/courses/$courseId/lessons/$lessonId" params={{ courseId, lessonId: prev.id }}>
                  <ArrowRight className="h-4 w-4 ml-1" /> السابقة
                </Link>
              </Button>
            )}
            {next && (
              <Button asChild size="sm">
                <Link to="/courses/$courseId/lessons/$lessonId" params={{ courseId, lessonId: next.id }}>
                  التالية <ArrowLeft className="h-4 w-4 mr-1" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <aside className="hidden lg:block w-80 shrink-0 border-s">
        <div className="sticky top-0 h-screen flex flex-col bg-background">
          <div className="p-3 border-b">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-orange-500" />
              الحصص
            </h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {allLessons.map((l) => (
                <Link
                  key={l.id}
                  to="/courses/$courseId/lessons/$lessonId"
                  params={{ courseId, lessonId: l.id }}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    l.id === lessonId
                      ? "bg-orange-500/10 text-orange-600 font-bold"
                      : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <PlayCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{l.title}</span>
                </Link>
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>
    </div>
  );
}
