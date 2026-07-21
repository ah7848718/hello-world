import type {
  Exam,
  ExamAttempt,
  ExamQuestion,
  ModelSelectionResult,
  AttemptStartResult,
  StartAttemptResult,
  BlockedAttemptResult,
  ExamCategory,
} from "@/lib/types/exam";

function getAvailableModels(questions: ExamQuestion[]): string[] {
  const models = new Set(
    questions.map((q) => q.model).filter((m): m is string => m != null),
  );
  return [...models];
}

function getUsedModelValues(attempts: ExamAttempt[]): Set<string> {
  return new Set(
    attempts.map((a) => a.model).filter((m): m is string => m != null),
  );
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function selectModel(
  availableModels: string[],
  usedModels: Set<string>,
  lastModel: string | null,
  cycleModels: boolean,
  excludeUsed: boolean,
): ModelSelectionResult {
  if (availableModels.length === 0) {
    return { model: null, blocked: true, blockReason: "لا توجد نماذج متاحة لهذا الامتحان." };
  }

  if (!excludeUsed) {
    // Comprehensive: pick from ALL models, avoiding consecutive same if possible
    const candidates = lastModel
      ? availableModels.filter((m) => m !== lastModel)
      : availableModels;

    if (candidates.length > 0) {
      return { model: pickRandom(candidates), blocked: false };
    }
    return { model: pickRandom(availableModels), blocked: false };
  }

  // Regular: exclude used models
  const unusedModels = availableModels.filter((m) => !usedModels.has(m));

  if (unusedModels.length > 0) {
    const candidates = lastModel
      ? unusedModels.filter((m) => m !== lastModel)
      : unusedModels;

    if (candidates.length > 0) {
      return { model: pickRandom(candidates), blocked: false };
    }

    return { model: pickRandom(unusedModels), blocked: false };
  }

  if (!cycleModels) {
    return {
      model: null,
      blocked: true,
      blockReason: "لا توجد نماذج متاحة للاختبار. تم استنفاذ جميع النماذج.",
    };
  }

  const candidates = lastModel
    ? availableModels.filter((m) => m !== lastModel)
    : availableModels;

  if (candidates.length > 0) {
    return { model: pickRandom(candidates), blocked: false };
  }

  return { model: pickRandom(availableModels), blocked: false };
}

function validateCanAttempt(
  exam: Exam,
  completedCount: number,
): { allowed: boolean; reason?: string } {
  if (!exam.allow_multiple_attempts) {
    if (completedCount > 0) {
      return {
        allowed: false,
        reason: "لقد قمت بإجراء هذا الامتحان من قبل ولا يُسمح بالمحاولة مرة أخرى.",
      };
    }
    return { allowed: true };
  }

  if (exam.max_attempts != null && completedCount >= exam.max_attempts) {
    return {
      allowed: false,
      reason: `لقد استنفذت عدد المحاولات المسموح بها (${exam.max_attempts}).`,
    };
  }

  return { allowed: true };
}

function isExcludeUsed(category: ExamCategory): boolean {
  return category === "regular";
}

export interface ExamAttemptService {
  startAttempt: (
    exam: Exam,
    allQuestions: ExamQuestion[],
    userId: string,
    completedAttempts: ExamAttempt[],
    inProgressAttempt: ExamAttempt | null,
  ) => Promise<AttemptStartResult>;

  getQuestionsForModel: (
    questions: ExamQuestion[],
    model: string | null,
  ) => ExamQuestion[];

  enrichWithOptions: (
    questions: ExamQuestion[],
    optionsByQuestion: Record<string, any[]>,
  ) => ExamQuestion[];
}

export function createExamAttemptService(): ExamAttemptService {
  return {
    async startAttempt(
      exam,
      allQuestions,
      userId,
      completedAttempts,
      inProgressAttempt,
    ) {
      const completedCount = completedAttempts.length;

      const validation = validateCanAttempt(exam, completedCount);
      if (!validation.allowed) {
        return {
          blocked: true,
          blockReason: validation.reason!,
        } as BlockedAttemptResult;
      }

      const availableModels = getAvailableModels(allQuestions);
      const allHaveNoModel = availableModels.length === 0;

      if (inProgressAttempt) {
        const model = inProgressAttempt.model;
        const filteredQuestions = (allHaveNoModel || !model)
          ? allQuestions
          : allQuestions.filter((q) => q.model === model);

        return {
          attempt: inProgressAttempt,
          questions: filteredQuestions,
          answers: [],
          blocked: false,
        } as StartAttemptResult;
      }

      const usedModels = getUsedModelValues(completedAttempts);
      const lastAttempt = completedAttempts.length > 0
        ? completedAttempts.reduce((latest, a) =>
            a.submitted_at! > latest.submitted_at! ? a : latest,
          )
        : null;
      const lastModel = lastAttempt?.model ?? null;
      const excludeUsed = isExcludeUsed(exam.exam_category);

      const selection = allHaveNoModel
        ? { model: null, blocked: false } as ModelSelectionResult
        : selectModel(availableModels, usedModels, lastModel, exam.cycle_models, excludeUsed);

      if (selection.blocked) {
        return {
          blocked: true,
          blockReason: selection.blockReason!,
        } as BlockedAttemptResult;
      }

      const { model: selectedModel } = selection;

      const filteredQuestions = (allHaveNoModel || !selectedModel)
        ? allQuestions
        : allQuestions.filter((q) => q.model === selectedModel);

      return {
        attempt: null as unknown as ExamAttempt,
        questions: filteredQuestions,
        answers: [],
        blocked: false,
        selectedModel,
      } as any;
    },

    getQuestionsForModel(questions, model) {
      return model
        ? questions.filter((q) => q.model === model)
        : questions;
    },

    enrichWithOptions(questions, optionsByQuestion) {
      return questions.map((q) => ({
        ...q,
        question_options: optionsByQuestion[q.id] ?? [],
      }));
    },
  };
}

export {
  selectModel, validateCanAttempt, getAvailableModels, getUsedModelValues, isExcludeUsed,
};
