export type AttemptStatus = "in_progress" | "submitted" | "graded";
export type ExamCategory = "regular" | "comprehensive";

export interface ExamAttempt {
  id: string;
  exam_id: string;
  student_id: string;
  model: string | null;
  score: number | null;
  max_score: number | null;
  status: AttemptStatus;
  started_at: string;
  submitted_at: string | null;
}

export interface ExamSettings {
  allow_multiple_attempts: boolean;
  max_attempts: number | null;
  instant_result: boolean;
  cycle_models: boolean;
  exam_category: ExamCategory;
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  text: string;
  type: "mcq" | "true_false" | "essay";
  points: number;
  order_index: number;
  image_url: string | null;
  audio_url: string | null;
  hint: string | null;
  model: string | null;
  question_options?: QuestionOption[];
}

export interface QuestionOption {
  id: string;
  question_id: string;
  text: string;
  image_url: string | null;
  order_index: number;
  is_correct?: boolean;
}

export interface StudentAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_id: string | null;
  answer_text: string | null;
  answer_image_url: string | null;
  answer_audio_url: string | null;
  is_correct: boolean | null;
  awarded_points: number | null;
}

export interface Exam {
  id: string;
  title: string;
  type: "quiz" | "assignment" | "major";
  duration_minutes: number | null;
  end_at: string | null;
  course_id: string | null;
  allow_multiple_attempts: boolean;
  max_attempts: number | null;
  instant_result: boolean;
  cycle_models: boolean;
  exam_category: ExamCategory;
}

export interface ModelSelectionResult {
  model: string | null;
  blocked: boolean;
  blockReason?: string;
}

export interface StartAttemptInput {
  examId: string;
  userId: string;
}

export interface StartAttemptResult {
  attempt: ExamAttempt;
  questions: ExamQuestion[];
  answers: StudentAnswer[];
  blocked: false;
  blockReason?: undefined;
}

export interface BlockedAttemptResult {
  attempt?: undefined;
  questions?: undefined;
  answers?: undefined;
  blocked: true;
  blockReason: string;
}

export type AttemptStartResult = StartAttemptResult | BlockedAttemptResult;
