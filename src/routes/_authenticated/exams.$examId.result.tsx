import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowRight, CheckCircle2, XCircle, Info, Lock, Brain, RefreshCw } from "lucide-react";
import { getExamForResult } from "@/lib/db/exam-attempts";

function loadSignedUrl(val: string | null, bucket: string): Promise<string | null> {
  if (!val) return Promise.resolve(null);
  if (val.startsWith("http://") || val.startsWith("https://")) return Promise.resolve(val);
  return supabase.storage.from(bucket).createSignedUrl(val, 600).then(({ data }) => data?.signedUrl ?? null);
}

export const Route = createFileRoute("/_authenticated/exams/$examId/result")({
  component: ResultPage,
  head: () => ({ meta: [{ title: "نتيجة الامتحان" }] }),
});

function ResultPage() {
  const { examId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "correct" | "wrong" | "skipped" | "answered">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["result", examId, user?.id],
    queryFn: async () => {
      return getExamForResult(examId, user!.id);
    },
    enabled: !!user?.id,
  });

  if (isLoading || !data) return <div className="min-h-[60dvh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!data.attempt) return <div className="container max-w-3xl mx-auto px-4 py-12 text-center">لم تحل هذا الامتحان بعد.</div>;

  const examCategory = (data.exam as any)?.exam_category ?? "regular";
  const endAt = data.exam!.end_at ? new Date(data.exam!.end_at) : null;
  const answersLocked = examCategory === "comprehensive" && (!endAt || endAt > new Date());

  const totalQuestions = data.questions.length;
  const answeredQuestions = data.questions.filter((q: any) => data.answers.some((a: any) => a.question_id === q.id));
  const skippedQuestions = data.questions.filter((q: any) => !data.answers.some((a: any) => a.question_id === q.id));
  const correctQuestions = data.questions.filter((q: any) => {
    const ans = data.answers.find((a: any) => a.question_id === q.id);
    return ans && ans.is_correct === true;
  });
  const wrongQuestions = data.questions.filter((q: any) => {
    const ans = data.answers.find((a: any) => a.question_id === q.id);
    return ans && ans.is_correct === false;
  });
  const percentage = totalQuestions > 0 ? Math.round((correctQuestions.length / totalQuestions) * 100) : 0;

  const filteredQuestions = data.questions.filter((q: any) => {
    const ans = data.answers.find((a: any) => a.question_id === q.id);
    if (filter === "all") return true;
    if (filter === "correct") return ans && ans.is_correct === true;
    if (filter === "wrong") return ans && ans.is_correct === false;
    if (filter === "skipped") return !ans;
    if (filter === "answered") return !!ans;
    return true;
  });

  return (
    <div className="container max-w-3xl mx-auto px-4 pb-8">
      <Button variant="ghost" className="mb-4 gap-1" onClick={() => navigate({ to: "/exams" })}><ArrowRight className="h-4 w-4" /> رجوع للامتحانات</Button>

      <h1 className="text-2xl font-display font-bold text-center mb-1">{data.exam!.title}</h1>
      <h2 className="text-lg text-muted-foreground text-center mb-6">الدرجات :</h2>

      <p className="text-center text-sm text-muted-foreground mb-4">
        👆 دوس على الاسئلة الصحيحة أو الخاطئة أو المحذوفة أو الغير محذوفة عشان تشوف الاسئلة دي بسرعة
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <button onClick={() => setFilter("all")}
          className={`rounded-xl p-4 text-center border transition ${filter === "all" ? "ring-2 ring-primary" : ""}`}>
          <p className="text-sm text-muted-foreground mb-1">عدد الاسئلة</p>
          <p className="text-3xl font-bold">{totalQuestions}</p>
        </button>

        <button onClick={() => setFilter("all")}
          className={`rounded-xl p-4 text-center border transition bg-emerald-900/20 ${filter === "all" ? "ring-2 ring-primary" : ""}`}>
          <p className="text-sm text-emerald-400 mb-1">النتيجة</p>
          <p className="text-3xl font-bold text-emerald-400">{percentage}%</p>
        </button>

        <button onClick={() => setFilter("skipped")}
          className={`rounded-xl p-4 text-center border transition ${filter === "skipped" ? "ring-2 ring-primary" : ""}`}>
          <p className="text-sm text-muted-foreground mb-1">الاسئلة المحذوفة</p>
          <p className="text-3xl font-bold text-orange-400">{skippedQuestions.length}</p>
        </button>

        <button onClick={() => setFilter("wrong")}
          className={`rounded-xl p-4 text-center border transition ${filter === "wrong" ? "ring-2 ring-primary" : ""}`}>
          <p className="text-sm text-muted-foreground mb-1">الاسئلة الخاطئة</p>
          <p className="text-3xl font-bold text-red-400">{wrongQuestions.length}</p>
        </button>

        <button onClick={() => setFilter("correct")}
          className={`rounded-xl p-4 text-center border transition bg-teal-900/20 ${filter === "correct" ? "ring-2 ring-primary" : ""}`}>
          <p className="text-sm text-teal-400 mb-1">الاسئلة الصحيحة</p>
          <p className="text-3xl font-bold text-teal-400">{correctQuestions.length}</p>
        </button>

        <button onClick={() => setFilter("answered")}
          className={`rounded-xl p-4 text-center border transition ${filter === "answered" ? "ring-2 ring-primary" : ""}`}>
          <p className="text-sm text-muted-foreground mb-1">الاسئلة الغير محذوفة</p>
          <p className="text-3xl font-bold">{answeredQuestions.length}</p>
        </button>
      </div>

      {filter !== "all" && (
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary" className="gap-1">
            تصفية: {filter === "correct" ? "الصحيحة" : filter === "wrong" ? "الخاطئة" : filter === "skipped" ? "المحذوفة" : "الغير محذوفة"}
            <button onClick={() => setFilter("all")} className="ms-1 hover:text-destructive">✕</button>
          </Badge>
        </div>
      )}

      {!answersLocked && wrongQuestions.length > 0 && (
        <PracticeMistakesBox wrongQuestions={wrongQuestions} />
      )}

      {answersLocked ? (
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <Lock className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="font-semibold">الإجابات النموذجية والتفسير هتظهرلك بعد ميعاد انتهاء الامتحان</p>
            {endAt && <p className="text-sm text-muted-foreground">{endAt.toLocaleString("ar-EG")}</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((q: any) => {
            const globalIndex = data.questions.findIndex((dq: any) => dq.id === q.id) + 1;
            const ans = data.answers.find((a: any) => a.question_id === q.id);
            return <ReviewCard key={q.id} q={q} ans={ans} index={globalIndex} />;
          })}
          {filteredQuestions.length === 0 && (
            <p className="text-center text-muted-foreground py-8">لا توجد أسئلة في هذا التصنيف</p>
          )}
        </div>
      )}
    </div>
  );
}

function PracticeMistakesBox({ wrongQuestions }: { wrongQuestions: any[] }) {
  const [count, setCount] = useState(wrongQuestions.length);
  const [open, setOpen] = useState(false);

  const wrongCount = wrongQuestions.length;

  return (
    <>
      <Card className="mb-6 border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 shrink-0">
              <Brain className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg">تمرين على الأخطاء</h3>
              <p className="text-sm text-muted-foreground mt-1">
                أخطأت في <span className="text-destructive font-bold">{wrongCount}</span> {wrongCount === 1 ? "سؤال" : "أسئلة"}.
                اختر عدد الأسئلة اللي عايز تتمرن عليها:
              </p>
              <div className="flex items-end gap-3 mt-3 flex-wrap">
                <div className="w-32">
                  <Label htmlFor="practice-count" className="text-xs">عدد الأسئلة</Label>
                  <Input
                    id="practice-count"
                    type="number"
                    min={1}
                    max={wrongCount}
                    value={count}
                    onChange={(e) => setCount(Math.min(wrongCount, Math.max(1, Number(e.target.value) || 1)))}
                  />
                </div>
                <Button onClick={() => setOpen(true)} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> ابدأ التمرين
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-emerald-500" /> تمرين على الأخطاء
            </DialogTitle>
          </DialogHeader>
          <PracticeSession wrongQuestions={wrongQuestions} count={count} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function PracticeSession({ wrongQuestions, count }: { wrongQuestions: any[]; count: number }) {
  const [questions] = useState(() => {
    const shuffled = [...wrongQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  });
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [done, setDone] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  if (done) {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="text-4xl">{correctCount === questions.length ? "🎉" : "💪"}</div>
        <p className="font-bold text-lg">خلصت التمرين!</p>
        <p className="text-muted-foreground">
          أجبت صح على <span className="text-green-600 font-bold">{correctCount}</span> من <span className="font-bold">{questions.length}</span>
        </p>
        <Button variant="outline" onClick={() => { setCurrent(0); setSelected(null); setReveal(false); setDone(false); setCorrectCount(0); }} className="gap-2">
          <RefreshCw className="h-4 w-4" /> أعد التمرين
        </Button>
      </div>
    );
  }

  const q = questions[current];
  const isMcq = q.type === "mcq" || q.type === "true_false";
  const correctOpt = q.question_options?.find((o: any) => o.is_correct);
  const sortedOpts = [...(q.question_options ?? [])].sort((a, b) => a.order_index - b.order_index);
  const [qImg, setQImg] = useState<string | null>(null);
  const [qAudio, setQAudio] = useState<string | null>(null);

  useEffect(() => {
    setSelected(null);
    setReveal(false);
    setQImg(null);
    setQAudio(null);
    loadSignedUrl(q.image_url, "exam-media").then(setQImg);
    loadSignedUrl(q.audio_url, "exam-media").then(setQAudio);
  }, [q.id]);

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent(current + 1);
      setSelected(null);
      setReveal(false);
    } else {
      setDone(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="gap-1">
          سؤال {current + 1} من {questions.length}
        </Badge>
        <div className="flex gap-1">
          {questions.map((_: any, i: number) => (
            <div key={i} className={`h-1.5 w-5 rounded-full ${i < current ? "bg-emerald-500" : i === current ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-5 space-y-3">
          <p className="font-semibold text-lg whitespace-pre-wrap">{q.text}</p>
          {qImg && <img src={qImg} alt="" className="max-w-md rounded-md border" />}
          {qAudio && <audio controls src={qAudio} className="w-full max-w-sm" />}

          {isMcq ? (
            <div className="space-y-2">
              {sortedOpts.map((o: any) => {
                const showCorrect = reveal && o.is_correct;
                const showWrong = reveal && selected === o.id && !o.is_correct;
                return (
                  <label key={o.id}
                    className={`flex items-center gap-2 p-3 border rounded-md cursor-pointer transition
                      ${showCorrect ? "border-green-600 bg-green-50 dark:bg-green-950/30" : ""}
                      ${showWrong ? "border-destructive bg-red-50 dark:bg-red-950/30" : ""}
                      ${!reveal && selected === o.id ? "border-primary bg-primary/5" : "hover:bg-accent"}`}>
                    <input type="radio" name={`p-${q.id}`} checked={selected === o.id} disabled={reveal} onChange={() => setSelected(o.id)} className="h-4 w-4" />
                    <span>{o.text}</span>
                    {showCorrect && <CheckCircle2 className="h-4 w-4 text-green-600 ms-auto" />}
                    {showWrong && <XCircle className="h-4 w-4 text-destructive ms-auto" />}
                  </label>
                );
              })}
            </div>
          ) : null}

          {reveal && q.explanation && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-md flex gap-2 text-sm">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div><strong>التفسير:</strong> {q.explanation}</div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {!reveal ? (
              <Button disabled={!selected} onClick={() => {
                setReveal(true);
                if (selected === correctOpt?.id) setCorrectCount((c) => c + 1);
              }}>تأكيد الإجابة</Button>
            ) : (
              <Button onClick={handleNext}>
                {current < questions.length - 1 ? "التالي" : "إنهاء التمرين"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewCard({ q, ans, index }: any) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [qImg, setQImg] = useState<string | null>(null);
  const [qAudio, setQAudio] = useState<string | null>(null);
  const [ansAudio, setAnsAudio] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [expImg, setExpImg] = useState<string | null>(null);
  const [expAudio, setExpAudio] = useState<string | null>(null);
  const [expVideo, setExpVideo] = useState<string | null>(null);

  useEffect(() => {
    loadSignedUrl(ans?.answer_image_url, "exam-media").then(setImgUrl);
    loadSignedUrl(ans?.answer_audio_url, "exam-media").then(setAnsAudio);
    loadSignedUrl(q.image_url, "exam-media").then(setQImg);
    loadSignedUrl(q.audio_url, "exam-media").then(setQAudio);
    loadSignedUrl(q.explanation_image_url, "exam-media").then(setExpImg);
    loadSignedUrl(q.explanation_audio_url, "exam-media").then(setExpAudio);
    loadSignedUrl(q.explanation_video_url, "exam-media").then(setExpVideo);
  }, [ans?.answer_image_url, ans?.answer_audio_url, q.image_url, q.audio_url, q.explanation_image_url, q.explanation_audio_url, q.explanation_video_url]);

  const isMcq = q.type === "mcq" || q.type === "true_false";
  const correctOpt = q.question_options?.find((o: any) => o.is_correct);
  const studentOpt = q.question_options?.find((o: any) => o.id === ans?.selected_option_id);
  const isCorrect = ans?.is_correct;

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge>س{index}</Badge>
            <Badge variant="outline">{ans?.awarded_points ?? 0}/{q.points}</Badge>
          </div>
          {isCorrect === true && <Badge className="bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" /> صح</Badge>}
          {isCorrect === false && <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> غلط</Badge>}
        </div>
        <p className="font-semibold">{q.text}</p>
        {qImg && <img src={qImg} alt="" className="max-w-md rounded-md border" />}
        {qAudio && <audio controls src={qAudio} className="w-full max-w-sm" />}

        {isMcq ? (
          <div className="space-y-1 text-sm">
            <p>إجابتك: <span className={studentOpt?.is_correct ? "text-green-600 font-bold" : "text-destructive font-bold"}>{studentOpt?.text ?? "لم تجب"}</span></p>
            <p>الصحيح: <span className="text-green-600 font-bold">{correctOpt?.text}</span></p>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            {ans?.answer_text && <div className="p-3 bg-muted rounded-md whitespace-pre-wrap">{ans.answer_text}</div>}
            {imgUrl && <img src={imgUrl} alt="إجابة" className="max-w-md rounded-md border" />}
            {ansAudio && <audio controls src={ansAudio} className="w-full max-w-sm" />}
          </div>
        )}

        {(q.explanation || expImg || expAudio || expVideo) && (
          <div>
            {!showExplanation ? (
              <Button size="sm" variant="outline" onClick={() => setShowExplanation(true)} className="gap-1">
                <Info className="h-3.5 w-3.5" /> عرض الشرح
              </Button>
            ) : (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-md space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-300">
                    <Info className="h-4 w-4" /> الشرح
                  </div>
                  <button onClick={() => setShowExplanation(false)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
                </div>
                {q.explanation && <p className="whitespace-pre-wrap">{q.explanation}</p>}
                {expImg && <img src={expImg} alt="شرح" className="max-w-md rounded-md border" />}
                {expAudio && <audio controls src={expAudio} className="w-full max-w-sm" />}
                {expVideo && <video controls src={expVideo} className="max-w-md rounded-md border" />}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
