import type { QueryClient } from "@tanstack/react-query";

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE";
export type RealtimeTableConfig = {
  table: string;
  events: RealtimeEvent[];
  filter?: string;
  invalidate: (qc: QueryClient, payload: any, userId: string) => void;
};

const q = (qc: QueryClient, ...keys: string[][]) => {
  for (const key of keys) {
    qc.invalidateQueries({ queryKey: key });
  }
};

export function getAdminSubscriptions(_userId: string): RealtimeTableConfig[] {
  return [
    {
      table: "homework_questions",
      events: ["INSERT", "UPDATE", "DELETE"],
      invalidate: (qc) => q(qc, ["hw-editor"], ["admin-homework"]),
    },
    {
      table: "homework_options",
      events: ["INSERT", "UPDATE", "DELETE"],
      invalidate: (qc) => q(qc, ["hw-editor"]),
    },
    {
      table: "questions",
      events: ["INSERT", "UPDATE", "DELETE"],
      invalidate: (qc) => q(qc, ["admin-questions"], ["exam-questions"], ["take-exam"]),
    },
    {
      table: "question_options",
      events: ["INSERT", "UPDATE", "DELETE"],
      invalidate: (qc) => q(qc, ["admin-questions"], ["exam-questions"]),
    },
    {
      table: "homework",
      events: ["INSERT", "UPDATE", "DELETE"],
      invalidate: (qc) => q(qc, ["admin-homework"]),
    },
    {
      table: "lessons",
      events: ["INSERT", "UPDATE", "DELETE"],
      invalidate: (qc) => q(qc, ["admin-lessons"]),
    },
    {
      table: "exam_attempts",
      events: ["INSERT", "UPDATE"],
      invalidate: (qc) =>
        q(qc, ["exam-attempts"], ["admin-personal-exams"], ["admin-results-exams"], ["admin-stats"]),
    },
    {
      table: "student_answers",
      events: ["INSERT", "UPDATE"],
      invalidate: (qc) => q(qc, ["attempt"]),
    },
    {
      table: "homework_submissions",
      events: ["INSERT", "UPDATE"],
      invalidate: (qc) => q(qc, ["admin-homework"], ["hw-editor"], ["admin-results-homework"]),
    },
    {
      table: "payments",
      events: ["INSERT", "UPDATE"],
      invalidate: (qc) =>
        q(qc, ["admin-payments"], ["admin-last-payments"], ["admin-wallet"], ["admin-stats"]),
    },
    {
      table: "qna_questions",
      events: ["INSERT", "UPDATE"],
      invalidate: (qc) => q(qc, ["admin-qna"]),
    },
    {
      table: "support_tickets",
      events: ["INSERT", "UPDATE"],
      invalidate: (qc) => q(qc, ["admin-tickets"]),
    },
    {
      table: "lecture_progress",
      events: ["INSERT", "UPDATE"],
      invalidate: (qc) => q(qc, ["admin-viewing"], ["course-content"]),
    },
    {
      table: "login_history",
      events: ["INSERT"],
      invalidate: (qc) => q(qc, ["admin-login-history"]),
    },
    {
      table: "profiles",
      events: ["UPDATE"],
      invalidate: (qc) => q(qc, ["admin-profiles"], ["admin-stats"], ["admin-last-registrations"], ["student-profile"]),
    },
  ];
}

export function getStudentSubscriptions(_userId: string): RealtimeTableConfig[] {
  return [
    {
      table: "exams",
      events: ["INSERT", "UPDATE", "DELETE"],
      invalidate: (qc) =>
        q(qc, ["admin-exams"], ["student-exams"], ["student-attempts"], ["exam"], ["take-exam"]),
    },
    {
      table: "questions",
      events: ["INSERT", "UPDATE", "DELETE"],
      invalidate: (qc) => q(qc, ["exam-questions"], ["take-exam"]),
    },
    {
      table: "question_options",
      events: ["INSERT", "UPDATE", "DELETE"],
      invalidate: (qc) => q(qc, ["exam-questions"]),
    },
    {
      table: "exam_attempts",
      events: ["UPDATE"],
      invalidate: (qc) =>
        q(qc, ["result"], ["exam-attempts"], ["student-exams"], ["student-attempts"]),
    },
    {
      table: "courses",
      events: ["INSERT", "UPDATE", "DELETE"],
      invalidate: (qc) =>
        q(qc, ["courses-light"], ["available-courses"], ["course-content"], ["student-courses"]),
    },
    {
      table: "units",
      events: ["INSERT", "UPDATE", "DELETE"],
      invalidate: (qc) => q(qc, ["course-content"]),
    },
    {
      table: "chapters",
      events: ["INSERT", "UPDATE", "DELETE"],
      invalidate: (qc) => q(qc, ["course-content"]),
    },
    {
      table: "lectures",
      events: ["INSERT", "UPDATE", "DELETE"],
      invalidate: (qc) => q(qc, ["course-content"]),
    },
    {
      table: "notifications",
      events: ["INSERT"],
      invalidate: (qc, _p, userId) => q(qc, ["notifications-feed", userId]),
    },
    {
      table: "site_announcements",
      events: ["INSERT", "UPDATE", "DELETE"],
      invalidate: (qc) => q(qc, ["site-announcements-active"]),
    },
    {
      table: "homework",
      events: ["INSERT", "UPDATE", "DELETE"],
      invalidate: (qc) => q(qc, ["admin-homework"]),
    },
    {
      table: "homework_questions",
      events: ["INSERT", "UPDATE", "DELETE"],
      invalidate: (qc) => q(qc, ["hw-editor"]),
    },
    {
      table: "homework_options",
      events: ["INSERT", "UPDATE", "DELETE"],
      invalidate: (qc) => q(qc, ["hw-editor"]),
    },
    {
      table: "profiles",
      events: ["UPDATE"],
      invalidate: (qc) =>
        q(qc, ["admin-profiles"], ["student-profile"], ["admin-stats"], ["admin-last-registrations"]),
    },
    {
      table: "enrollments",
      events: ["INSERT", "UPDATE"],
      invalidate: (qc) => q(qc, ["admin-subscriptions"], ["available-courses"], ["student-profile"], ["student-enrollments"]),
    },
    {
      table: "books",
      events: ["INSERT", "UPDATE", "DELETE"],
      invalidate: (qc) => q(qc, ["admin-books"], ["public-books"]),
    },
    {
      table: "platform_settings",
      events: ["UPDATE"],
      invalidate: (qc) =>
        q(qc, [
          "platform-settings",
          "public-settings-registration",
          "public-settings-content",
          "public-settings-footer",
          "public-settings-wa",
          "public-settings-payments",
        ]),
    },
    {
      table: "ai_faq",
      events: ["INSERT", "UPDATE", "DELETE"],
      invalidate: (qc) => q(qc, ["admin-ai-faq"]),
    },
    {
      table: "bundles",
      events: ["INSERT", "UPDATE", "DELETE"],
      invalidate: (qc) => q(qc, ["bundle-payment"], ["student-bundles"]),
    },
    {
      table: "homework_submissions",
      events: ["INSERT", "UPDATE"],
      invalidate: (qc) => q(qc, ["course-content"]),
    },
    {
      table: "lecture_progress",
      events: ["INSERT", "UPDATE"],
      invalidate: (qc) => q(qc, ["course-content"]),
    },
  ];
}
