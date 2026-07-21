
-- Insert sample courses and bundles for all 3 grades so the grade pages look populated
DO $$
DECLARE
  admin_uid uuid;
BEGIN
  SELECT user_id INTO admin_uid FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  IF admin_uid IS NULL THEN
    SELECT id INTO admin_uid FROM public.profiles LIMIT 1;
  END IF;
  IF admin_uid IS NULL THEN
    RAISE EXCEPTION 'No user found to use as created_by';
  END IF;

  -- ========== الصف الأول الثانوي (g1) ==========
  INSERT INTO public.courses (title, slug, description, grade, term, month, price, discount_percent, is_published, is_featured, order_index, created_by) VALUES
    ('كورس الترم الأول — أولى ثانوي', 'g1-t1-full', 'شرح كامل لمنهج اللغة الإنجليزية للصف الأول الثانوي — الترم الأول مع تدريبات ومراجعات.', 'أولى ثانوي', 'الترم الأول', NULL, 600, 0, true, true, 1, admin_uid),
    ('Grammar Booster — الترم الأول', 'g1-t1-grammar', 'تأسيس قوي في القواعد الأساسية للترم الأول.', 'أولى ثانوي', 'الترم الأول', NULL, 250, 10, true, false, 2, admin_uid),
    ('Vocabulary & Reading — الترم الأول', 'g1-t1-vocab', 'إتقان الكلمات والقراءة بأسلوب مبسط.', 'أولى ثانوي', 'الترم الأول', NULL, 250, 0, true, false, 3, admin_uid),
    ('كورس الترم الثاني — أولى ثانوي', 'g1-t2-full', 'شرح كامل لمنهج الترم الثاني مع امتحانات شهرية.', 'أولى ثانوي', 'الترم الثاني', NULL, 600, 0, true, true, 4, admin_uid),
    ('Writing & Translation — الترم الثاني', 'g1-t2-writing', 'تدريب على الكتابة والترجمة بأمثلة محلولة.', 'أولى ثانوي', 'الترم الثاني', NULL, 250, 0, true, false, 5, admin_uid);

  INSERT INTO public.bundles (title, description, grade, bundle_type, term, months, price, discount_percent, is_published, order_index, created_by) VALUES
    ('باقة الترم الأول الكاملة — أولى ثانوي', 'كل كورسات الترم الأول مع بعض بسعر موفّر جدًا.', 'أولى ثانوي', 'term', 'الترم الأول', NULL, 900, 20, true, 1, admin_uid),
    ('باقة الترم الثاني الكاملة — أولى ثانوي', 'كل كورسات الترم الثاني مع بعض بسعر موفّر.', 'أولى ثانوي', 'term', 'الترم الثاني', NULL, 800, 15, true, 2, admin_uid),
    ('باقة السنة الكاملة — أولى ثانوي', 'الترمين كاملين بأكبر خصم على الإطلاق.', 'أولى ثانوي', 'term', 'السنة الكاملة', NULL, 1500, 25, true, 3, admin_uid);

  -- ========== الصف الثاني الثانوي (g2) ==========
  INSERT INTO public.courses (title, slug, description, grade, term, month, price, discount_percent, is_published, is_featured, order_index, created_by) VALUES
    ('شهر سبتمبر — تانية ثانوي', 'g2-sep', 'مقدمة المنهج وأهم القواعد لشهر سبتمبر.', 'تانية ثانوي', 'الترم الأول', 'سبتمبر', 200, 0, true, false, 10, admin_uid),
    ('شهر أكتوبر — تانية ثانوي', 'g2-oct', 'استكمال المنهج وتدريبات مكثفة.', 'تانية ثانوي', 'الترم الأول', 'أكتوبر', 200, 0, true, false, 11, admin_uid),
    ('شهر نوفمبر — تانية ثانوي', 'g2-nov', 'مراجعة شاملة قبل امتحانات الميد ترم.', 'تانية ثانوي', 'الترم الأول', 'نوفمبر', 200, 0, true, true, 12, admin_uid),
    ('شهر فبراير — تانية ثانوي', 'g2-feb', 'بداية الترم الثاني بأسلوب مميز.', 'تانية ثانوي', 'الترم الثاني', 'فبراير', 200, 0, true, false, 13, admin_uid),
    ('شهر مارس — تانية ثانوي', 'g2-mar', 'استكمال منهج الترم الثاني.', 'تانية ثانوي', 'الترم الثاني', 'مارس', 200, 0, true, false, 14, admin_uid);

  INSERT INTO public.bundles (title, description, grade, bundle_type, term, months, price, discount_percent, is_published, order_index, created_by) VALUES
    ('باقة الترم الأول — تانية ثانوي', 'سبتمبر + أكتوبر + نوفمبر بسعر موفّر.', 'تانية ثانوي', 'months', NULL, ARRAY['سبتمبر','أكتوبر','نوفمبر'], 500, 17, true, 10, admin_uid),
    ('باقة الترم الثاني — تانية ثانوي', 'فبراير + مارس + أبريل بسعر موفّر.', 'تانية ثانوي', 'months', NULL, ARRAY['فبراير','مارس','أبريل'], 500, 17, true, 11, admin_uid);

  -- ========== الصف الثالث الثانوي (g3) ==========
  INSERT INTO public.courses (title, slug, description, grade, term, month, price, discount_percent, is_published, is_featured, order_index, created_by) VALUES
    ('شهر سبتمبر — ثالثة ثانوي', 'g3-sep', 'بداية قوية لمنهج الثانوية العامة.', 'ثالثة ثانوي', 'الترم الأول', 'سبتمبر', 300, 0, true, true, 20, admin_uid),
    ('شهر أكتوبر — ثالثة ثانوي', 'g3-oct', 'استكمال المنهج وامتحانات مكثفة.', 'ثالثة ثانوي', 'الترم الأول', 'أكتوبر', 300, 0, true, false, 21, admin_uid),
    ('شهر نوفمبر — ثالثة ثانوي', 'g3-nov', 'مراجعة وتدريب على نماذج الامتحان.', 'ثالثة ثانوي', 'الترم الأول', 'نوفمبر', 300, 0, true, false, 22, admin_uid),
    ('شهر فبراير — ثالثة ثانوي', 'g3-feb', 'استكمال منهج الترم الثاني.', 'ثالثة ثانوي', 'الترم الثاني', 'فبراير', 300, 0, true, false, 23, admin_uid),
    ('مراجعة نهائية — ثالثة ثانوي', 'g3-final', 'مراجعة شاملة قبل امتحان الثانوية العامة.', 'ثالثة ثانوي', 'الترم الثاني', 'مايو', 350, 0, true, true, 24, admin_uid);

  INSERT INTO public.bundles (title, description, grade, bundle_type, term, months, price, discount_percent, is_published, order_index, created_by) VALUES
    ('باقة الترم الأول — ثالثة ثانوي', 'سبتمبر + أكتوبر + نوفمبر — جاهزية كاملة للميد ترم.', 'ثالثة ثانوي', 'months', NULL, ARRAY['سبتمبر','أكتوبر','نوفمبر'], 750, 17, true, 20, admin_uid),
    ('باقة الترم الثاني — ثالثة ثانوي', 'فبراير + مارس + أبريل بأكبر خصم.', 'ثالثة ثانوي', 'months', NULL, ARRAY['فبراير','مارس','أبريل'], 750, 17, true, 21, admin_uid),
    ('باقة المراجعة النهائية', 'كل المراجعات النهائية في باقة واحدة موفّرة.', 'ثالثة ثانوي', 'months', NULL, ARRAY['أبريل','مايو'], 600, 20, true, 22, admin_uid);
END $$;
