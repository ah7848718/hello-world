import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Clock, Lightbulb, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { AudioRecorder } from "@/components/AudioRecorder";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { submitExamAttempt } from "@/lib/api/exam-attempts";
import { createExamAttemptService } from "@/lib/services/exam-attempt.service";
import type { ExamAttempt, ExamQuestion, Exam } from "@/lib/types/exam";

function getSignedUrl(bucket: string, path: string): Promise<string | null> {
  return supabase.storage.from(bucket).createSignedUrl(path, 600).then(({ data }) => data?.signedUrl ?? null);
}

function getMediaUrl(val: string | null, bucket: string): string | null {
  if (!val) return null;
  if (val.startsWith("http://") || val.startsWith("https://")) return val;
  return null;
}

export const Route = createFileRoute("/_authenticated/exams/$examId")({
  component: TakeExamPage,
  head: () => ({ meta: [{ title: "حل امتحان" }] }),
});

function TakeExamPage() {
  const { examId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["take-exam-client", examId, user?.id],
    queryFn: async () => {
      try {
        const [{ data: exam, error: examErr }, questionsRes] = await Promise.all([
          supabase.from("exams").select("*").eq("id", examId).single(),
          supabase.from("questions").select("id, exam_id, text, type, points, order_index, image_url, audio_url, hint, model").eq("exam_id", examId).order("order_index"),
        ]);
        if (examErr || !exam) return { blocked: true, alreadyDone: true, blockReason: "الامتحان غير موجود." };

        const [completedRes, inProgressRes] = await Promise.all([
          supabase.from("exam_attempts").select("*").eq("exam_id", examId).eq("student_id", user!.id).in("status", ["submitted", "graded"]),
          supabase.from("exam_attempts").select("*").eq("exam_id", examId).eq("student_id", user!.id).eq("status", "in_progress").order("started_at", { ascending: false }).limit(1).maybeSingle(),
        ]);

        const allQuestions = (questionsRes.data ?? []) as ExamQuestion[];
        const completedAttempts = (completedRes.data ?? []) as ExamAttempt[];
        const inProgressAttempt = inProgressRes.data as ExamAttempt | null;

        const service = createExamAttemptService();
        const result = await service.startAttempt(exam as any, allQuestions, user!.id, completedAttempts, inProgressAttempt);

        if (result.blocked) return { blocked: true, alreadyDone: true, blockReason: result.blockReason };

        let attempt: ExamAttempt;
        if (inProgressAttempt) {
          attempt = inProgressAttempt;
        } else {
          const selectedModel = (result as any).selectedModel ?? null;
          const { data: newAttempt, error: createErr } = await supabase
            .from("exam_attempts")
            .insert({ exam_id: examId, student_id: user!.id, status: "in_progress", started_at: new Date().toISOString(), model: selectedModel })
            .select("*")
            .single();
          if (createErr || !newAttempt) return { blocked: true, alreadyDone: true, blockReason: "فشل إنشاء المحاولة." };
          attempt = newAttempt as ExamAttempt;
        }

        const answersRes = await supabase.from("student_answers").select("*").eq("attempt_id", attempt.id);

        const questions = result.questions as ExamQuestion[];
        const qIds = questions.map((q) => q.id);
        const { data: opts } = await supabase
          .from("question_options")
          .select("id, question_id, text, image_url, order_index")
          .in("question_id", qIds)
          .order("order_index");
        const optionsByQuestion: Record<string, any[]> = {};
        (opts ?? []).forEach((o: any) => { (optionsByQuestion[o.question_id] ||= []).push(o); });

        return { blocked: false, alreadyDone: false, exam, attempt, questions, answers: answersRes.data ?? [], optionsByQuestion };
      } catch (e: any) {
        return { blocked: true, alreadyDone: true, blockReason: e?.message || "حدث خطأ غير متوقع." };
      }
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (data?.alreadyDone && !data?.blocked) nav({ to: "/exams/$examId/result", params: { examId } });
  }, [data, examId, nav]);

  const enrichedQuestions = (data?.questions ?? []).map((q: any) => ({ ...q, question_options: data?.optionsByQuestion?.[q.id] ?? [] }));

  if (isLoading || !data) return <div className="min-h-[60dvh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (data.blocked) {
    return (
      <div className="container max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="text-6xl">🚫</div>
        <h1 className="text-2xl font-bold">غير مسموح بالمحاولة</h1>
        <p className="text-muted-foreground text-lg">{data.blockReason}</p>
        <a href="/exams" className={buttonVariants({ variant: "default" })}>العودة للامتحانات</a>
      </div>
    );
  }
  if (data.alreadyDone) return null;

  return (
    <ExamRunner
      exam={data.exam}
      questions={enrichedQuestions}
      attempt={data.attempt!}
      initialAnswers={data.answers ?? []}
    />
  );
}

export function ExamRunner({ exam, questions, attempt, initialAnswers }: any) {
  const nav = useNavigate();
  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    const m: Record<string, any> = {};
    initialAnswers.forEach((a: any) => { m[a.question_id] = a; });
    return m;
  });
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const [submitting, setSubmitting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [viewed, setViewed] = useState<Set<string>>(() => new Set(questions.filter((q: any) => initialAnswers.some((a: any) => a.question_id === q.id)).map((q: any) => q.id)));
  const startMs = useMemo(() => new Date(attempt.started_at).getTime(), [attempt.started_at]);
  const totalMs = (exam?.duration_minutes ?? 0) * 60_000;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setViewed((prev) => { const next = new Set(prev); next.add(questions[currentIdx]?.id); return next; });
  }, [currentIdx, questions]);

  useEffect(() => {
    if (!totalMs || submitting) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [totalMs, submitting]);

  const remaining = totalMs ? Math.max(0, startMs + totalMs - now) : null;
  useEffect(() => {
    if (remaining === 0 && !submitting) handleSubmit();
  }, [remaining]);

  const saveAnswer = useCallback(async (q: any, patch: any) => {
    try {
      const existing = answersRef.current[q.id];
      let row;
      if (existing?.id) {
        const { data } = await supabase.from("student_answers").update(patch).eq("id", existing.id).select().single();
        row = data;
      } else {
        const { data } = await supabase.from("student_answers").insert({
          attempt_id: attempt.id, question_id: q.id, ...patch,
        }).select().single();
        row = data;
      }
      if (row) setAnswers((p) => ({ ...p, [q.id]: row }));
    } catch (e: any) {
      console.error("saveAnswer error", e);
    }
  }, [attempt.id]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const result = await submitExamAttempt<any>({ attemptId: attempt.id, token });
      if (!result || result.error) throw new Error(result?.error || "فشل التسليم");
      toast.success("اتسلم");
      setSubmitting(false);
      nav({ to: "/exams/$examId/result", params: { examId: exam?.id ?? attempt.exam_id } });
    } catch (e: any) {
      toast.error(e?.message ?? "فشل التسليم");
      setSubmitting(false);
    }
  };

  const handleSaveAndExit = async () => {
    toast.success("تم حفظ تقدمك");
    nav({ to: "/exams" });
  };

  const totalPoints = questions.reduce((s: number, q: any) => s + (q.points ?? 0), 0);
  const answeredCount = questions.filter((q: any) => {
    const a = answers[q.id];
    return a?.selected_option_id || a?.answer_text || a?.answer_image_url || a?.answer_audio_url;
  }).length;
  const skippedCount = questions.length - answeredCount;

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  const remainingMin = remaining !== null ? Math.floor(remaining / 60_000) : 0;
  const remainingSec = remaining !== null ? Math.floor((remaining % 60_000) / 1000) : 0;
  const isLowTime = remaining !== null && remaining < 300_000;

  const handleAnswer = useCallback((patch: any) => {
    saveAnswer(questions[currentIdx], patch);
  }, [saveAnswer, questions, currentIdx]);

  return (
    <div className="container max-w-3xl mx-auto px-4 flex flex-col min-h-dvh">
      <div className="py-3 -mx-4 px-4 border-b mb-4 shrink-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="font-bold text-lg">{exam?.title ?? "اختبار"}</h1>
          {remaining !== null && (
            <Badge variant={isLowTime ? "destructive" : "secondary"} className="gap-1 text-base px-3 py-1">
              <Clock className="h-4 w-4" /> {fmt(remaining)}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto mb-4">
        <QuestionCard
          q={questions[currentIdx]}
          index={currentIdx + 1}
          answer={answers[questions[currentIdx]?.id]}
          onAnswer={handleAnswer}
          attemptId={attempt.id}
          userId={attempt.student_id}
        />
      </div>

      <div className="shrink-0 border-t py-4 -mx-4 px-4 space-y-3">
        {remaining !== null && (
          <div className={`text-center py-3 rounded-xl text-white font-bold text-lg ${isLowTime ? "bg-red-500" : "bg-emerald-600"}`}>
            <p className="text-sm font-normal opacity-90">بقي من الزمن :</p>
            <p className="text-3xl">{String(remainingMin).padStart(2, "0")} : {String(remainingSec).padStart(2, "0")}</p>
          </div>
        )}

        <Button size="lg" onClick={handleSubmit} disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
          {submitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
          إنهاء الاختبار
        </Button>

        <Button size="lg" variant="outline" onClick={handleSaveAndExit} className="w-full border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20">
          استكمال الاختبار لاحقاً
        </Button>

        <Button size="lg" variant="outline" onClick={() => setShowReview(true)} className="w-full border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20">
          عرض الإجابات
        </Button>

        <div className="space-y-2 text-sm pt-1">
          <div className="flex justify-between"><span className="text-muted-foreground">اجمالي درجات الامتحان :</span><Badge variant="secondary">{totalPoints}</Badge></div>
          <div className="flex justify-between"><span className="text-muted-foreground">عدد الاسئلة :</span><Badge variant="secondary">{questions.length}</Badge></div>
          <div className="flex justify-between"><span className="text-muted-foreground">عدد الاسئلة التي تم فتحها :</span><Badge className="bg-amber-500">{viewed.size}</Badge></div>
          <div className="flex justify-between"><span className="text-muted-foreground">عدد الاسئلة غير المحذوفة :</span><Badge className="bg-red-500">{answeredCount}</Badge></div>
          <div className="flex justify-between"><span className="text-muted-foreground">عدد الاسئلة المحذوفة :</span><Badge className="bg-blue-500">{skippedCount}</Badge></div>
          <div className="flex justify-between border-t pt-2 mt-2"><span className="text-muted-foreground">السؤال الحالي :</span><Badge className="bg-red-500">{currentIdx + 1}</Badge></div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="lg" variant="outline" className="flex-1" onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))} disabled={currentIdx === 0}>
            السابق
          </Button>
          <Button size="lg" variant="outline" className="flex-1" onClick={() => setCurrentIdx((p) => Math.min(questions.length - 1, p + 1))} disabled={currentIdx === questions.length - 1}>
            التالي
          </Button>
        </div>
      </div>

      {showReview && (
        <ReviewSheet questions={questions} answers={answers} onClose={() => setShowReview(false)} onJump={(idx: number) => {
          setCurrentIdx(idx);
          setShowReview(false);
        }} />
      )}
    </div>
  );
}

const ReviewSheet = memo(function ReviewSheet({ questions, answers, onClose, onJump }: { questions: any[]; answers: Record<string, any>; onClose: () => void; onJump: (idx: number) => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-background w-full max-w-2xl max-h-[80dvh] rounded-t-2xl sm:rounded-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="font-bold text-lg">عرض الإجابات</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {questions.map((q: any, i: number) => {
            const ans = answers[q.id];
            const isMcq = q.type === "mcq" || q.type === "true_false";
            const selectedOpt = isMcq ? q.question_options?.find((o: any) => o.id === ans?.selected_option_id) : null;
            const hasAnswer = !!ans?.selected_option_id || !!ans?.answer_text || !!ans?.answer_image_url || !!ans?.answer_audio_url;
            return (
              <button key={q.id} onClick={() => onJump(i)} className="w-full text-right p-3 border rounded-lg hover:bg-accent transition flex items-start gap-3">
                <Badge className={hasAnswer ? "bg-green-600" : "bg-orange-500"}>س{i + 1}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{q.text}</p>
                  {isMcq ? (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedOpt ? <span className="text-foreground">{selectedOpt.text}</span> : <span className="text-orange-500">لم تجب</span>}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      {ans?.answer_text ? <span className="text-foreground truncate block">{ans.answer_text}</span> : ans?.answer_image_url || ans?.answer_audio_url ? <span className="text-foreground">📎 مرفق</span> : <span className="text-orange-500">لم تجب</span>}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

const QuestionCard = memo(function QuestionCard({ q, index, answer, onAnswer, userId }: any) {
  const [showHint, setShowHint] = useState(false);
  const [text, setText] = useState(answer?.answer_text ?? "");
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [questionImg, setQuestionImg] = useState<string | null>(null);
  const [questionAudio, setQuestionAudio] = useState<string | null>(null);

  useEffect(() => {
    if (!q.image_url) { setQuestionImg(null); return; }
    if (q.image_url.startsWith("http")) { setQuestionImg(q.image_url); return; }
    getSignedUrl("exam-media", q.image_url).then(setQuestionImg);
  }, [q.image_url]);
  useEffect(() => {
    if (!q.audio_url) { setQuestionAudio(null); return; }
    if (q.audio_url.startsWith("http")) { setQuestionAudio(q.audio_url); return; }
    getSignedUrl("exam-media", q.audio_url).then(setQuestionAudio);
  }, [q.audio_url]);

  useEffect(() => {
    if (!answer?.answer_image_url) { setImgUrl(null); return; }
    if (answer.answer_image_url.startsWith("http")) { setImgUrl(answer.answer_image_url); return; }
    getSignedUrl("exam-media", answer.answer_image_url).then(setImgUrl);
  }, [answer?.answer_image_url]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadToCloudinary(file, "exam-media");
      await onAnswer({ answer_image_url: result.secure_url });
      setImgUrl(result.secure_url);
    } catch (e: any) { toast.error(e?.message); } finally { setUploading(false); }
  };

  const sortedOpts = [...(q.question_options ?? [])].sort((a, b) => a.order_index - b.order_index);

  return (
    <Card id={`question-${q.id}`}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge>س{index}</Badge>
            <Badge variant="outline">{q.points} درجة</Badge>
          </div>
          {q.hint && (
            <Button size="sm" variant="ghost" onClick={() => setShowHint(!showHint)} className="gap-1">
              <Lightbulb className="h-4 w-4 text-amber-500" /> تلميح
            </Button>
          )}
        </div>
        <p className="font-semibold text-lg whitespace-pre-wrap">{q.text}</p>
        {questionImg && <img src={questionImg} alt="" className="max-w-md rounded-md border" />}
        {questionAudio && <audio controls src={questionAudio} className="w-full max-w-sm" />}
        {showHint && q.hint && <p className="text-sm p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md">{q.hint}</p>}

        {(q.type === "mcq" || q.type === "true_false") ? (
          <div className="space-y-2">
            {sortedOpts.map((o: any) => (
              <label key={o.id} className={`flex items-center gap-2 p-3 border rounded-md cursor-pointer transition ${answer?.selected_option_id === o.id ? "border-primary bg-primary/5" : "hover:bg-accent"}`}>
                <input type="radio" name={`q-${q.id}`} checked={answer?.selected_option_id === o.id} onChange={() => onAnswer({ selected_option_id: o.id })} className="h-4 w-4" />
                <span>{o.text}</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <Label>إجابتك (نص)</Label>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} onBlur={() => onAnswer({ answer_text: text })} rows={4} />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor={`ans-${q.id}`} className="cursor-pointer inline-flex items-center gap-1 text-sm px-3 py-2 border rounded-md hover:bg-accent">
                <ImageIcon className="h-4 w-4" /> {uploading ? "جاري الرفع..." : imgUrl ? "تغيير الصورة" : "إرفاق صورة الإجابة"}
              </Label>
              <input id={`ans-${q.id}`} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            </div>
            {imgUrl && <img src={imgUrl} alt="إجابة" className="max-w-md rounded-md border" />}
            <div>
              <Label className="mb-1 block">أو سجل إجابتك صوتياً</Label>
              <AudioRecorder
                bucket="exam-media"
                value={answer?.answer_audio_url}
                onChange={(url) => onAnswer({ answer_audio_url: url })}
                label="تسجيل إجابة صوتية"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
