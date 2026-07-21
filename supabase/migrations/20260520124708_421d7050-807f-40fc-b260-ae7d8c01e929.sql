DO $$ BEGIN CREATE TYPE qna_status AS ENUM ('open', 'answered', 'closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE public.qna_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  course_id uuid,
  lecture_id uuid,
  title text NOT NULL,
  body text NOT NULL,
  status qna_status NOT NULL DEFAULT 'open',
  is_pinned boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.qna_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage qna" ON public.qna_questions FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'assistant'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'assistant'));
CREATE POLICY "Students create own qna" ON public.qna_questions FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND is_approved_student(auth.uid()));
CREATE POLICY "Students view own or public qna" ON public.qna_questions FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR (is_public = true AND is_approved_student(auth.uid())));
CREATE POLICY "Students update own open qna" ON public.qna_questions FOR UPDATE TO authenticated
  USING (student_id = auth.uid() AND status = 'open')
  WITH CHECK (student_id = auth.uid());
CREATE TRIGGER qna_questions_updated_at BEFORE UPDATE ON public.qna_questions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.qna_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.qna_questions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  is_admin_reply boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.qna_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage qna replies" ON public.qna_replies FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'assistant'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'assistant'));
CREATE POLICY "Students view replies" ON public.qna_replies FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.qna_questions q WHERE q.id = qna_replies.question_id AND (q.student_id = auth.uid() OR q.is_public = true)));
CREATE POLICY "Students reply to own q" ON public.qna_replies FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.qna_questions q WHERE q.id = qna_replies.question_id AND q.student_id = auth.uid()));

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  subject text NOT NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  priority ticket_priority NOT NULL DEFAULT 'normal',
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage tickets" ON public.support_tickets FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'assistant'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'assistant'));
CREATE POLICY "Students create own tickets" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND is_approved_student(auth.uid()));
CREATE POLICY "Students view own tickets" ON public.support_tickets FOR SELECT TO authenticated
  USING (student_id = auth.uid());
CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  is_staff boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ticket messages" ON public.support_messages FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'assistant'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'assistant'));
CREATE POLICY "Students view own ticket messages" ON public.support_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = support_messages.ticket_id AND t.student_id = auth.uid()));
CREATE POLICY "Students send messages" ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND is_staff = false AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = support_messages.ticket_id AND t.student_id = auth.uid()));

CREATE TABLE public.assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  can_manage_qna boolean NOT NULL DEFAULT true,
  can_manage_homework boolean NOT NULL DEFAULT false,
  can_manage_support boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assistants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage assistants" ON public.assistants FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Assistants view own" ON public.assistants FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER assistants_updated_at BEFORE UPDATE ON public.assistants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_qna_status ON public.qna_questions(status, created_at DESC);
CREATE INDEX idx_qna_student ON public.qna_questions(student_id);
CREATE INDEX idx_qna_replies_question ON public.qna_replies(question_id);
CREATE INDEX idx_support_status ON public.support_tickets(status, created_at DESC);
CREATE INDEX idx_support_messages_ticket ON public.support_messages(ticket_id, created_at);