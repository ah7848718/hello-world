import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ClipboardList, ArrowRight, Save, CheckCircle2, Clock, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { AudioRecorder } from "@/components/AudioRecorder";

export const Route = createFileRoute("/_authenticated/homework/$homeworkId")({
  component: HomeworkPage,
  head: () => ({ meta: [{ title: "حل الواجب | مستر حاتم سميكه" }] }),
});

function HomeworkPage() {
  const { homeworkId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [homework, setHomework] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [optionsByQ, setOptionsByQ] = useState<Record<string, any[]>>({});
  const [submission, setSubmission] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imgUrls, setImgUrls] = useState<Record<string, string>>({});
  const [qImgUrls, setQImgUrls] = useState<Record<string, string>>({});
  const [qAudioUrls, setQAudioUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data: hw, error: hwErr } = await supabase
          .from("homework")
          .select("*, courses!inner(id, title)")
          .eq("id", homeworkId)
          .eq("is_published", true)
          .single();
        if (hwErr || !hw) { toast.error("الواجب غير موجود أو غير منشور"); navigate({ to: "/dashboard" }); return; }
        setHomework(hw);

        const { data: en } = await supabase
          .from("enrollments")
          .select("id")
          .eq("course_id", hw.course_id)
          .eq("student_id", user.id)
          .eq("status", "active")
          .maybeSingle();
        if (!en) { toast.error("أنت غير مشترك في هذا الكورس"); navigate({ to: "/dashboard" }); return; }

        const { data: qs } = await supabase
          .from("homework_questions")
          .select("*")
          .eq("homework_id", homeworkId)
          .order("order_index");
        setQuestions(qs ?? []);

        if (qs?.length) {
          const { data: opts } = await supabase
            .from("homework_options")
            .select("*")
            .in("question_id", qs.map((q: any) => q.id))
            .order("order_index");
          const grouped: Record<string, any[]> = {};
          for (const o of opts ?? []) {
            if (!grouped[o.question_id]) grouped[o.question_id] = [];
            grouped[o.question_id].push(o);
          }
          setOptionsByQ(grouped);
        }

        let subId: string;
        const { data: sub } = await supabase
          .from("homework_submissions")
          .select("*")
          .eq("homework_id", homeworkId)
          .eq("student_id", user.id)
          .maybeSingle();

        if (sub) {
          setSubmission(sub);
          subId = sub.id;
        } else {
          const { data: newSub, error: subErr } = await supabase
            .from("homework_submissions")
            .insert({ homework_id: homeworkId, student_id: user.id, status: "draft", max_score: hw.total_points })
            .select()
            .single();
          if (subErr) throw subErr;
          setSubmission(newSub);
          subId = newSub.id;
        }

        if (subId) {
          const { data: ans } = await supabase
            .from("homework_answers")
            .select("*")
            .eq("submission_id", subId);
          const ansMap: Record<string, any> = {};
          for (const a of ans ?? []) ansMap[a.question_id] = a;
          setAnswers(ansMap);

          for (const a of ans ?? []) {
            if (a.answer_image_url) {
              const url = a.answer_image_url.startsWith("http") ? a.answer_image_url : null;
              if (url) setImgUrls((prev) => ({ ...prev, [a.question_id]: url }));
              else supabase.storage.from("homework-media").createSignedUrl(a.answer_image_url, 600).then(({ data }: any) => {
                if (data?.signedUrl) setImgUrls((prev) => ({ ...prev, [a.question_id]: data.signedUrl }));
              });
            }
          }
        }

        for (const q of qs ?? []) {
          if (q.image_url) {
            const url = q.image_url.startsWith("http") ? q.image_url : null;
            if (url) setQImgUrls((prev) => ({ ...prev, [q.id]: url }));
            else supabase.storage.from("homework-media").createSignedUrl(q.image_url, 600).then(({ data }: any) => {
              if (data?.signedUrl) setQImgUrls((prev) => ({ ...prev, [q.id]: data.signedUrl }));
            });
          }
          if (q.audio_url) {
            const url = q.audio_url.startsWith("http") ? q.audio_url : null;
            if (url) setQAudioUrls((prev) => ({ ...prev, [q.id]: url }));
            else supabase.storage.from("homework-media").createSignedUrl(q.audio_url, 600).then(({ data }: any) => {
              if (data?.signedUrl) setQAudioUrls((prev) => ({ ...prev, [q.id]: data.signedUrl }));
            });
          }
        }
      } catch (e: any) {
        toast.error(e?.message ?? "حدث خطأ");
      } finally {
        setLoading(false);
      }
    })();
  }, [homeworkId, user?.id]);

  const canEdit = submission?.status === "draft";

  const saveAnswer = async (questionId: string, patch: any) => {
    if (!canEdit || !submission) return;
    const existing = answers[questionId];
    if (existing) {
      await supabase.from("homework_answers").update(patch).eq("id", existing.id);
    } else {
      const { data } = await supabase.from("homework_answers")
        .insert({ submission_id: submission.id, question_id: questionId, ...patch })
        .select().single();
      if (data) setAnswers((prev) => ({ ...prev, [questionId]: data }));
    }
  };

  const handleOptionSelect = async (questionId: string, optionId: string) => {
    await saveAnswer(questionId, { selected_option_id: optionId });
    setAnswers((prev) => ({ ...prev, [questionId]: { ...(prev[questionId] ?? {}), selected_option_id: optionId } }));
  };

  const handleTextBlur = async (questionId: string, text: string) => {
    await saveAnswer(questionId, { answer_text: text });
  };

  const handleUploadImage = async (questionId: string, file: File) => {
    if (!canEdit || !submission || !user) return;
    try { const r = await uploadToCloudinary(file, "homework-media"); await saveAnswer(questionId, { answer_image_url: r.secure_url }); setAnswers((prev) => ({ ...prev, [questionId]: { ...(prev[questionId] ?? {}), answer_image_url: r.secure_url } })); setImgUrls((prev) => ({ ...prev, [questionId]: r.secure_url })); } catch (e: any) { toast.error(e?.message); }
  };

  const handleAudioAnswer = async (questionId: string, path: string) => {
    await saveAnswer(questionId, { answer_audio_url: path });
    setAnswers((prev) => ({ ...prev, [questionId]: { ...(prev[questionId] ?? {}), answer_audio_url: path } }));
  };

  const handleSubmit = async () => {
    if (!submission) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("homework_submissions")
        .update({ status: "submitted", submitted_at: new Date().toISOString() })
        .eq("id", submission.id);
      if (error) throw error;
      setSubmission((prev: any) => ({ ...prev, status: "submitted", submitted_at: new Date().toISOString() }));
      toast.success("تم تسليم الواجب بنجاح");
    } catch (e: any) { toast.error(e?.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-[60dvh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!homework) return null;

  const isReadOnly = !canEdit;

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <Button asChild variant="ghost" className="mb-4 gap-1">
        <Link to={`/courses/${homework.course_id}`}><ArrowRight className="h-4 w-4" /> رجوع للكورس</Link>
      </Button>

      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-8 w-1 rounded-full bg-amber-500" />
        <h1 className="text-2xl font-bold">{homework.title}</h1>
      </div>

      {homework.description && <p className="text-muted-foreground mb-4">{homework.description}</p>}

      <div className="flex flex-wrap gap-2 mb-8">
        <Badge variant="secondary">{homework.total_points} درجة</Badge>
        {homework.due_at && (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" /> حتى {new Date(homework.due_at).toLocaleDateString("ar-EG")}
          </Badge>
        )}
        <Badge variant={submission?.status === "submitted" ? "default" : submission?.status === "graded" ? "secondary" : "outline"}>
          {submission?.status === "draft" ? "مسودة" : submission?.status === "submitted" ? "تم التسليم" : "مصحح"}
        </Badge>
        {submission?.status === "graded" && submission?.score != null && (
          <Badge className="bg-green-600">النتيجة: {submission.score}/{submission.max_score}</Badge>
        )}
      </div>

      {submission?.feedback && (
        <Card className="mb-6 bg-amber-50 dark:bg-amber-950/20 border-amber-200">
          <CardContent className="p-4 text-sm whitespace-pre-wrap">{submission.feedback}</CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {questions.map((q, i) => {
          const opts = optionsByQ[q.id] ?? [];
          const ans = answers[q.id];
          const isMcq = q.type === "mcq" || q.type === "true_false";
          return (
            <Card key={q.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>س{i + 1}</Badge>
                  {q.type === "true_false" ? <Badge variant="outline">صح/خطأ</Badge> : q.type === "mcq" ? <Badge variant="outline">اختيار من متعدد</Badge> : q.type === "short" ? <Badge variant="outline">إجابة قصيرة</Badge> : <Badge variant="outline">مقالي</Badge>}
                  <Badge variant="secondary">{q.points} درجة</Badge>
                </div>
                <p className="font-semibold whitespace-pre-wrap">{q.text}</p>
                {qImgUrls[q.id] && <img src={qImgUrls[q.id]} alt="" className="max-w-md rounded-md border" />}
                {qAudioUrls[q.id] && <audio controls src={qAudioUrls[q.id]} className="w-full max-w-sm" />}

                {isMcq ? (
                  <div className="space-y-2">
                    {opts.map((o) => (
                      <label key={o.id} className={`flex items-center gap-2 p-3 border rounded-md cursor-pointer transition ${ans?.selected_option_id === o.id ? "border-primary bg-primary/5" : isReadOnly ? "" : "hover:bg-accent"}`}>
                        <input type="radio" name={`q-${q.id}`} checked={ans?.selected_option_id === o.id} onChange={() => handleOptionSelect(q.id, o.id)} disabled={isReadOnly} className="h-4 w-4" />
                        <span>{o.text}</span>
                        {isReadOnly && o.is_correct && <Badge className="bg-green-600 text-xs">الإجابة الصحيحة</Badge>}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Textarea
                      value={ans?.answer_text ?? ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: { ...(prev[q.id] ?? {}), answer_text: e.target.value } }))}
                      onBlur={(e) => handleTextBlur(q.id, e.target.value)}
                      placeholder="اكتب إجابتك هنا..."
                      rows={4}
                      disabled={isReadOnly}
                    />
                    {!isReadOnly && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Label htmlFor={`ans-img-${q.id}`} className="cursor-pointer inline-flex items-center gap-1 text-sm px-3 py-2 border rounded-md hover:bg-accent">
                          <ImageIcon className="h-4 w-4" /> {imgUrls[q.id] ? "تغيير الصورة" : "إرفاق صورة الإجابة"}
                        </Label>
                        <input id={`ans-img-${q.id}`} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUploadImage(q.id, e.target.files[0])} />
                        <AudioRecorder
                          bucket="homework-media"
                          pathPrefix={`${user?.id}/answers/${q.id}-audio`}
                          value={ans?.answer_audio_url}
                          onChange={(path) => handleAudioAnswer(q.id, path)}
                          label="تسجيل إجابة صوتية"
                        />
                      </div>
                    )}
                    {imgUrls[q.id] && <img src={imgUrls[q.id]} alt="الإجابة" className="max-w-md rounded-md border" />}
                  </div>
                )}

                {isReadOnly && ans && (ans.is_correct != null) && (
                  <div className="text-sm">
                    <Badge variant={ans.is_correct ? "secondary" : "destructive"}>
                      {ans.is_correct ? "إجابة صحيحة" : "إجابة خاطئة"}
                    </Badge>
                    {ans.awarded_points != null && <span className="mr-2 text-muted-foreground">({ans.awarded_points} نقطة)</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {canEdit && (
        <div className="flex gap-3 mt-8 justify-end">
          <Button onClick={() => { toast.success("تم حفظ المسودة"); }} disabled={saving} variant="outline" className="gap-2 min-w-[130px]">
            <Save className="h-4 w-4" /> حفظ المسودة
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2 min-w-[150px] bg-green-600 hover:bg-green-700">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            تسليم الواجب
          </Button>
        </div>
      )}

      {submission?.status === "submitted" && (
        <div className="mt-8 p-6 text-center bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-xl">
          <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="font-bold text-green-700 dark:text-green-400">تم تسليم الواجب</p>
          <p className="text-sm text-muted-foreground mt-1">في انتظار التصحيح من المشرف</p>
        </div>
      )}
    </div>
  );
}
