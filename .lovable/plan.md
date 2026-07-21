# خطة التنفيذ: تصنيف الكورسات + الباقات + Learning Path

## 1. تغييرات قاعدة البيانات (Migration)

### أ) جدول `courses`
- إضافة عمود `month` نصي (nullable) — قيم مثل: `september`, `october`, `november`, `december`...
- يُستخدم فقط لتانية وتالتة ثانوي

### ب) جدول جديد `bundles` (الباقات)
- `id`, `title`, `description`, `cover_url`
- `grade` (أولى/تانية/تالتة)
- `bundle_type` enum: `term` (ترم كامل) / `monthly_pack` (3 شهور)
- `term` (nullable), `months` (text[] nullable)
- `price`, `discount_percent`, `is_published`, `order_index`
- RLS: Admins manage, Students view published

### ج) جدول جديد `bundle_courses`
- `bundle_id`, `course_id` (composite PK)
- ربط N:M بين الباقة والكورسات

### د) جدول `payments`
- إضافة `bundle_id` (nullable, uuid) — الدفع يكون إما لكورس أو لباقة
- جعل `course_id` nullable
- Constraint: لازم واحد منهم مش null

### هـ) جدول `enrollments`
- إضافة `bundle_id` (nullable) — لتتبع المصدر
- عند الموافقة على دفع باقة → إنشاء enrollments لكل كورسات الباقة (يدوياً من الأدمن أو trigger)

### و) جداول `homework` و `exams`
- إضافة `lecture_id` (nullable, uuid) لربط الواجب/الامتحان بمحاضرة معينة
- لو null = مرتبط بالكورس عام (السلوك الحالي)

## 2. واجهة الأدمن

### صفحة جديدة: `/admin/bundles`
- CRUD للباقات
- اختيار الصف + النوع (ترم/شهور)
- إضافة/إزالة كورسات للباقة
- نشر/إخفاء، تسعير، خصم

### تعديل `/admin/courses`
- إضافة حقل "الشهر" في النموذج (يظهر فقط لو الصف = تانية أو تالتة)
- فلتر بالصف/الترم/الشهر

### تعديل `/admin/homework` و `/admin/exams`
- إضافة حقل "ربط بمحاضرة" (اختياري) في النموذج

### تعديل `/admin/payments`
- عرض اسم الباقة لو الدفع لباقة
- عند الموافقة على دفع باقة → enroll تلقائي في كل كورساتها

## 3. واجهة الطالب

### صفحة الكورسات (Dashboard)
- تبويبات/فلاتر حسب الصف
- **لأولى ثانوي**: تبويب "ترم أول" / "ترم ثاني" + سكشن "باقات الترم"
- **لتانية/تالتة ثانوي**: تبويبات شهرية + سكشن "باقة 3 شهور"
- بطاقات الباقات تظهر بشكل مميز (badge "وفّر X%")

### صفحة المحاضرة (Learning Path)
- قائمة موحدة بعناصر المحاضرة بالترتيب:
  - 🎥 الفيديو (المشغل)
  - 📄 ملفات PDF
  - 📝 الواجبات المرتبطة بالمحاضرة
  - 📊 الامتحانات المرتبطة بالمحاضرة
- كل عنصر له أيقونة + حالة (مكتمل/غير مكتمل)

## 4. الملفات المتأثرة

**ملفات جديدة:**
- `src/routes/_authenticated/admin.bundles.tsx`
- `src/routes/_authenticated/admin.bundles.$bundleId.tsx`
- `src/components/BundleCard.tsx`
- `src/components/LectureContentList.tsx`

**ملفات معدّلة:**
- `src/routes/_authenticated/dashboard.tsx` — فلاتر + باقات
- `src/routes/_authenticated/admin.courses.tsx` — حقل month
- `src/routes/_authenticated/admin.courses.$courseId.tsx` — حقل month
- `src/routes/_authenticated/admin.homework.tsx` — ربط محاضرة
- `src/routes/_authenticated/admin.exams.tsx` — ربط محاضرة
- `src/routes/_authenticated/admin.payments.tsx` — دعم bundle + auto-enroll
- `src/routes/_authenticated/admin.tsx` — لينك للباقات في القائمة
- صفحة المحاضرة الحالية — قائمة موحدة

## 5. ملاحظات
- الـ enums للشهور/الباقات تكون نصية (text) لمرونة أعلى
- الاشتراك في الباقة لا يلغي الاشتراك المنفصل في كورس واحد منها
- التنفيذ على مرحلتين: (1) Migration + Bundles admin + Student filters، (2) ربط الواجبات/الامتحانات بالمحاضرة + Learning Path UI
