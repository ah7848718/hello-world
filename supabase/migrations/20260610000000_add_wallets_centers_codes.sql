-- Migration: Add wallets, centers, center_students, wallet_transactions, center_codes
-- Date: 2026-06-10

-- ==============================
-- Centers table
-- ==============================
CREATE TABLE IF NOT EXISTS public.centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;

-- ==============================
-- Center students (link student to center)
-- ==============================
CREATE TABLE IF NOT EXISTS public.center_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(student_id)
);

ALTER TABLE public.center_students ENABLE ROW LEVEL SECURITY;

-- ==============================
-- Wallets (student balance)
-- ==============================
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- ==============================
-- Wallet transactions (credit/debit history)
-- ==============================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  description TEXT,
  reference_type TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- ==============================
-- Center codes (recharge codes sold by centers)
-- ==============================
CREATE TABLE IF NOT EXISTS public.center_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  center_id UUID REFERENCES public.centers(id),
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  is_used BOOLEAN DEFAULT false,
  used_by UUID REFERENCES public.profiles(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.center_codes ENABLE ROW LEVEL SECURITY;

-- ==============================
-- RLS Policies
-- ==============================

-- Centers: anyone can read active centers
CREATE POLICY "Anyone can read active centers"
  ON public.centers FOR SELECT
  USING (is_active = true);

-- Center students: student can read own link
CREATE POLICY "Student can read own center link"
  ON public.center_students FOR SELECT
  USING (student_id = auth.uid());

-- Student can link themselves
CREATE POLICY "Student can link to center"
  ON public.center_students FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Student can update own link
CREATE POLICY "Student can update own center link"
  ON public.center_students FOR UPDATE
  USING (student_id = auth.uid());

-- Wallets: student can read own wallet
CREATE POLICY "Student can read own wallet"
  ON public.wallets FOR SELECT
  USING (student_id = auth.uid());

-- Wallet transactions: student can read own
CREATE POLICY "Student can read own transactions"
  ON public.wallet_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wallets w
      WHERE w.id = wallet_id AND w.student_id = auth.uid()
    )
  );

-- Center codes: anyone can read unused codes
CREATE POLICY "Anyone can validate codes"
  ON public.center_codes FOR SELECT
  USING (is_used = false);

-- Student can redeem a code (mark as used)
CREATE POLICY "Student can redeem code"
  ON public.center_codes FOR UPDATE
  USING (is_used = false)
  WITH CHECK (is_used = true AND used_by = auth.uid());

-- ==============================
-- Auto-create wallet on profile creation
-- ==============================
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (student_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (student_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_create_wallet ON public.profiles;
CREATE TRIGGER on_profile_created_create_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_wallet();

-- Also create wallet for existing profiles that don't have one
INSERT INTO public.wallets (student_id, balance)
SELECT id, 0 FROM public.profiles
WHERE id NOT IN (SELECT student_id FROM public.wallets)
ON CONFLICT (student_id) DO NOTHING;

-- ==============================
-- Admin policies (manage all)
-- ==============================
CREATE POLICY "Admin can manage centers"
  ON public.centers FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'));

CREATE POLICY "Admin can manage center_students"
  ON public.center_students FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'));

CREATE POLICY "Admin can manage wallets"
  ON public.wallets FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'));

CREATE POLICY "Admin can manage wallet_transactions"
  ON public.wallet_transactions FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'));

CREATE POLICY "Admin can manage center_codes"
  ON public.center_codes FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'));

-- ==============================
-- RPC: add_wallet_balance (used by recharge flow)
-- ==============================
CREATE OR REPLACE FUNCTION public.add_wallet_balance(p_student_id UUID, p_amount DECIMAL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.wallets
  SET balance = balance + p_amount, updated_at = now()
  WHERE student_id = p_student_id;
END;
$$;
