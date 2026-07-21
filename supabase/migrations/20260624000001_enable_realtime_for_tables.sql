-- Enable Realtime for all tables needed for real-time sync between Admin and Student
-- This allows the frontend to subscribe to Postgres Changes via WebSocket

-- Exams & Questions
ALTER PUBLICATION supabase_realtime ADD TABLE public.exams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.question_options;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_attempts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_answers;

-- Courses & Content
ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.units;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chapters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lectures;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lecture_progress;

-- Homework
ALTER PUBLICATION supabase_realtime ADD TABLE public.homework;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homework_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homework_options;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homework_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homework_answers;

-- Users & Roles
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollments;

-- Payments & Finance
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;

-- Notifications & Announcements
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_announcements;

-- Q&A & Support
ALTER PUBLICATION supabase_realtime ADD TABLE public.qna_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.qna_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

-- Books
ALTER PUBLICATION supabase_realtime ADD TABLE public.books;
ALTER PUBLICATION supabase_realtime ADD TABLE public.book_orders;

-- Other
ALTER PUBLICATION supabase_realtime ADD TABLE public.bundles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bundle_courses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recharge_codes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.centers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_faq;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.login_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assistants;

-- Realtime RLS: allow authenticated users to subscribe to any channel they have access to
-- This is a broad policy; specific filtering is done client-side
CREATE OR REPLACE FUNCTION public.authorize_realtime_channel()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = auth.uid()
  );
$$;

-- Drop existing restrictive policies and add broader ones
DROP POLICY IF EXISTS "Allow authenticated to listen on active_sessions" ON realtime.messages;
DROP POLICY IF EXISTS "Allow authenticated to insert on active_sessions" ON realtime.messages;

-- Allow all authenticated users to subscribe to any realtime channel
CREATE POLICY "authenticated_can_listen"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to broadcast
CREATE POLICY "authenticated_can_broadcast"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (true);
