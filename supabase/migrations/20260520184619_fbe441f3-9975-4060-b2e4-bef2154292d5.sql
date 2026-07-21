ALTER TABLE public.books ADD COLUMN IF NOT EXISTS discount_percent integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  CREATE TYPE public.book_order_status AS ENUM ('pending', 'approved', 'rejected', 'shipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.book_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL,
  student_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  full_name text NOT NULL,
  phone text NOT NULL,
  governorate text NOT NULL,
  address text NOT NULL,
  notes text,
  status public.book_order_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  total_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.book_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students create own orders" ON public.book_orders
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid() AND public.is_approved_student(auth.uid()));

CREATE POLICY "Students view own orders" ON public.book_orders
  FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "Admins manage all orders" ON public.book_orders
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER book_orders_touch_updated_at
  BEFORE UPDATE ON public.book_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();