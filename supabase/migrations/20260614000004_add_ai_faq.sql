CREATE TABLE IF NOT EXISTS ai_faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ai_faq" ON ai_faq
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Public can read active ai_faq" ON ai_faq
  FOR SELECT USING (is_active = true);

CREATE INDEX IF NOT EXISTS idx_ai_faq_active ON ai_faq(is_active);
