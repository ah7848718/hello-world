import { supabase } from "@/integrations/supabase/client";
import type { ExamAttempt, ExamQuestion, StudentAnswer, Exam } from "@/lib/types/exam";

export async function getExamById(examId: string): Promise<Exam | null> {
  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("id", examId)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as Exam;
}

export async function getAllQuestions(examId: string): Promise<ExamQuestion[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("id, exam_id, text, type, points, order_index, image_url, audio_url, hint, model")
    .eq("exam_id", examId)
    .order("order_index");
  if (error) throw new Error(error.message);
  return (data ?? []) as ExamQuestion[];
}

export async function getQuestionsWithOptions(
  examId: string,
): Promise<ExamQuestion[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*, question_options(*)")
    .eq("exam_id", examId)
    .order("order_index");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ExamQuestion[];
}

export async function getCompletedAttempts(
  examId: string,
  studentId: string,
): Promise<ExamAttempt[]> {
  const { data, error } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("exam_id", examId)
    .eq("student_id", studentId)
    .in("status", ["submitted", "graded"]);
  if (error) throw new Error(error.message);
  return (data ?? []) as ExamAttempt[];
}

export async function getInProgressAttempt(
  examId: string,
  studentId: string,
): Promise<ExamAttempt | null> {
  const { data, error } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("exam_id", examId)
    .eq("student_id", studentId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ExamAttempt | null;
}

export async function getLastCompletedAttempt(
  examId: string,
  studentId: string,
): Promise<ExamAttempt | null> {
  const { data, error } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("exam_id", examId)
    .eq("student_id", studentId)
    .in("status", ["submitted", "graded"])
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ExamAttempt | null;
}

export async function getUsedModels(
  examId: string,
  studentId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("exam_attempts")
    .select("model")
    .eq("exam_id", examId)
    .eq("student_id", studentId)
    .in("status", ["submitted", "graded"])
    .not("model", "is", null);
  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((a: any) => a.model).filter(Boolean))];
}

export async function createAttempt(
  examId: string,
  studentId: string,
  model: string | null,
): Promise<ExamAttempt> {
  const { data, error } = await supabase
    .from("exam_attempts")
    .insert({ exam_id: examId, student_id: studentId, status: "in_progress", model })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ExamAttempt;
}

export async function getStudentAnswers(
  attemptId: string,
): Promise<StudentAnswer[]> {
  const { data, error } = await supabase
    .from("student_answers")
    .select("*")
    .eq("attempt_id", attemptId);
  if (error) throw new Error(error.message);
  return (data ?? []) as StudentAnswer[];
}

export async function getQuestionOptions(
  questionIds: string[],
): Promise<any[]> {
  if (questionIds.length === 0) return [];
  const { data, error } = await (
    supabase as any
  ).from("student_question_options")
    .select("id, question_id, text, image_url, order_index")
    .in("question_id", questionIds);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function rpcSubmitAttempt(
  attemptId: string,
): Promise<any> {
  const { data, error } = await (supabase as any).rpc("submit_exam_attempt", {
    _attempt_id: attemptId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getLatestAttempt(
  examId: string,
  studentId: string,
): Promise<ExamAttempt | null> {
  const { data, error } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("exam_id", examId)
    .eq("student_id", studentId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ExamAttempt | null;
}

export async function getExamForResult(
  examId: string,
  studentId: string,
): Promise<{ exam: Exam; attempt: ExamAttempt | null; questions: ExamQuestion[]; answers: StudentAnswer[] }> {
  const [exam, attempts, questionsResult] = await Promise.all([
    getExamById(examId),
    supabase
      .from("exam_attempts")
      .select("*")
      .eq("exam_id", examId)
      .eq("student_id", studentId)
      .order("started_at", { ascending: false })
      .limit(1),
    supabase
      .from("questions")
      .select("*, question_options(*)")
      .eq("exam_id", examId)
      .order("order_index"),
  ]);

  if (!exam) throw new Error("Exam not found");

  const attempt = ((attempts.data ?? [])[0] ?? null) as ExamAttempt | null;
  const questions = (questionsResult.data ?? []) as unknown as ExamQuestion[];
  const answers = attempt
    ? await getStudentAnswers(attempt.id)
    : [];

  return { exam, attempt, questions, answers };
}
