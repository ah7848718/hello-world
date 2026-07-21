import { z } from "zod";

export const startAttemptSchema = z.object({
  examId: z.string().uuid("معرف الامتحان غير صالح"),
  token: z.string().optional(),
});

export const submitAttemptSchema = z.object({
  attemptId: z.string().uuid("معرف المحاولة غير صالح"),
  token: z.string().optional(),
});

export const saveAnswerSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  selectedOptionId: z.string().uuid().nullable().optional(),
  answerText: z.string().nullable().optional(),
  answerImageUrl: z.string().nullable().optional(),
  answerAudioUrl: z.string().nullable().optional(),
});
